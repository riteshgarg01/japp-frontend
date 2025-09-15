import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { confirmOrder as apiConfirmOrder } from "../../shared";
import OrderRow from "./OrderRow.jsx";

export default function OwnerOrders({ products, setProducts, orders, setOrders, ownerPhone }){
  const pending = orders.filter(o=>o.status==='pending');
  const confirmed = orders.filter(o=>o.status==='confirmed');

  function updateInventoryForOrder(order){
    const newProducts = products.map(p=>{
      if (!order.items.includes(p.id)) return p;
      const newQty = Math.max(0, (p.qty||0) - 1);
      return { ...p, qty: newQty, available: newQty>0 && p.available };
    });
    setProducts(newProducts);
  }

  async function confirmOrder(order){
    try{
      await apiConfirmOrder(order.id);
      updateInventoryForOrder(order);
      setOrders(orders.map(o=>o.id===order.id?{...o,status:'confirmed'}:o));
      toast.success(`Order ${order.id} confirmed`);
    }catch(e){ console.error(e); toast.error("Failed to confirm order"); }
  }

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
                  const p = products.find(pp=>pp.id===id);
                  return p ? <img key={id} src={p.images?.[0]} alt={p.title} className="h-16 w-full object-cover rounded-lg"/> : null;
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
