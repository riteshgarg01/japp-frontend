/*
  OwnerOrders powers the split view of pending vs confirmed shortlists. It reuses the global
  product cache, re-fetches any missing catalog entries, and funnels confirm actions back into
  inventory updates so products stay in sync across owner tools.
*/
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { confirmOrder as apiConfirmOrder, hydrateOwnerProducts, primeOwnerProductCache } from "../../shared";
import OrderRow from "./OrderRow.jsx";

// OwnerOrders mirrors the pending/confirmed dashboards. We keep a local catalog cache so
// orders referencing unseen products still render thumbnails.
export default function OwnerOrders({ products, setProducts, orders, setOrders, ownerPhone, onInventoryChange }){
  const notifyInventoryChange = onInventoryChange || (()=>{});
  const [catalogMap, setCatalogMap] = useState(()=> new Map(products.map(p=>[p.id,p])));
  const missingRef = useRef(new Set());
  useEffect(()=>{ setCatalogMap(new Map(products.map(p=>[p.id,p]))); }, [products]);
  // Fetch any products referenced by orders that are missing from the local catalog and merge the
  // hydrated payload back into the shared cache so other owner views benefit immediately. Without
  // this shared hydrator the pending/confirmed columns would render placeholder boxes until the
  // owner manually opened Inventory (which happens to populate the cache as a side effect).
  useEffect(()=>{
    const map = catalogMap;
    const toFetch = [];
    orders.forEach(order => {
      if (!order) return;
      (order.items || []).forEach(id => {
        if (!id) return;
        if (map.has(id)) return;
        if (missingRef.current.has(id)) return;
        missingRef.current.add(id);
        toFetch.push(id);
      });
    });
    if (!toFetch.length) return;
    let cancelled = false;
    (async ()=>{
      try{
        const hydrated = await hydrateOwnerProducts(toFetch.slice(0, 25));
        if (cancelled || !hydrated.length) return;
        primeOwnerProductCache(hydrated);
        setCatalogMap(prev => {
          const next = new Map(prev);
          hydrated.forEach(prod => { if (prod?.id) next.set(prod.id, prod); });
          return next;
        });
        setProducts(prev => {
          const mapProd = new Map(prev.map(p=>[p.id,p]));
          hydrated.forEach(prod => {
            if (!prod?.id) return;
            const existing = mapProd.get(prod.id) || {};
            mapProd.set(prod.id, { ...existing, ...prod });
          });
          return Array.from(mapProd.values());
        });
      } finally {
        toFetch.forEach(id=> missingRef.current.delete(id));
      }
    })();
    return ()=>{ cancelled = true; };
  }, [orders, catalogMap, setProducts]);

  const pending = orders.filter(o=>o.status==='pending');
  const confirmed = orders.filter(o=>o.status==='confirmed');

  // When an order is confirmed we decrement local quantities so the UI matches the backend’s
  // atomic update that happens server-side. We also feed the shared cache so other components see
  // the new stock levels immediately.
  function updateInventoryForOrder(order){
    const newProducts = products.map(p=>{
      if (!order.items.includes(p.id)) return p;
      const newQty = Math.max(0, (p.qty||0) - 1);
      return { ...p, qty: newQty, available: newQty>0 && p.available };
    });
    setProducts(newProducts);
    primeOwnerProductCache(newProducts);
  }

  // Spot-confirm flow: persist to API, sync local catalog, raise toast, then notify parent so the
  // inventory stats badge refreshes.
  async function confirmOrder(order){
    try{
      await apiConfirmOrder(order.id);
      updateInventoryForOrder(order);
      setOrders(orders.map(o=>o.id===order.id?{...o,status:'confirmed'}:o));
      toast.success(`Order ${order.id} confirmed`);
      notifyInventoryChange();
    }catch(e){ console.error(e); toast.error("Failed to confirm order"); }
  }

  // Local removal keeps the UI responsive while higher-level flows (like re-adding items) operate
  // on the updated structure.
  function removeItemFromShortlist(orderId, productId){
    setOrders(orders.map(o=> o.id===orderId ? {...o, items: o.items.filter(id=>id!==productId)} : o));
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Pending Shortlists</CardTitle>
          <CardDescription>Open and chat with the customer on WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length===0 && <div className="text-sm text-neutral-500">No pending shortlists.</div>}
          {pending.map(o=> (
            <OrderRow key={o.id} order={o} products={products} onRemove={(pid)=>removeItemFromShortlist(o.id, pid)} ownerPhone={ownerPhone} onConfirm={()=>confirmOrder(o)} />
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Confirmed Orders</CardTitle>
          <CardDescription>Inventory auto-updates when you confirm.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {confirmed.length===0 && <div className="text-sm text-neutral-500">No confirmed orders yet.</div>}
          {confirmed.map(o=> (
            <div key={o.id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{o.id}</div>
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">Confirmed</Badge>
              </div>
              <div className="text-sm text-neutral-500">Customer: {o.customer_phone}</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {o.items.map(id=>{
                  const p = catalogMap.get(id);
                  if (!p){
                    return (
                      <div key={id} className="h-16 w-full border border-dashed border-neutral-300 rounded grid place-items-center text-[10px] text-neutral-500 bg-neutral-50">
                        Loading {id}
                      </div>
                    );
                  }
                  return <img key={id} src={p.images?.[0]} alt={p.title} className="h-16 w-full object-cover rounded-lg"/>;
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
