import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { listOrders as apiListOrders, getOwnerInventoryStats, listOwnerProductsPaged, primeOwnerProductCache } from "../shared";
import UploadView from "../components/owner/UploadView.jsx";
import InventoryView from "../components/owner/InventoryView.jsx";
import OwnerShortlists from "../components/owner/Shortlists.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function OwnerApp(){
  const [adminToken, setAdminToken] = useState(()=>{ try{ return localStorage.getItem('admin_token') || ""; }catch{ return ""; } });
  const [entered, setEntered] = useState("");
  if (!adminToken) {
    return (
      <div className="max-w-sm mx-auto mt-10 border rounded-xl p-4">
        <div className="font-medium mb-2">Owner Access</div>
        <div className="text-sm text-neutral-600 mb-3">Enter admin token to access owner tools.</div>
        <div className="flex gap-2">
          <Input type="password" placeholder="Admin token" value={entered} onChange={(e)=>setEntered(e.target.value)} />
          <Button onClick={()=>{ if(!entered.trim()) return; try{ localStorage.setItem('admin_token', entered.trim()); }catch{} window.location.reload(); }}>Unlock</Button>
        </div>
      </div>
    );
  }
  // Owner state (loaded only after token present)
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [inventoryStatsLoading, setInventoryStatsLoading] = useState(true);
  const inventoryMountedRef = useRef(true);
  useEffect(()=>{
    // Track whether the component is still mounted before setting state inside async flows. The
    // stats refresh and bootstrap effects both await network calls and we do not want to trigger
    // React warnings when navigating away mid-request.
    inventoryMountedRef.current = true;
    return ()=>{ inventoryMountedRef.current = false; };
  }, []);
  useEffect(()=>{
    // Swap the initial load to the owner endpoint so we bring in cost/status/image metadata in
    // one go. The previous public endpoint only returned the customer-safe shape, which forced all
    // owner views to lazily hydrate missing fields. With this approach Inventory, Shortlists, and
    // Orders begin with the richer dataset and the shared cache stays coherent.
    let cancelled = false;
    setProductsLoading(true);
    (async ()=>{
      try{
        const merged = new Map();
        let offset = 0;
        const limit = 100;
        do {
          const page = await listOwnerProductsPaged({ limit, offset });
          (page.items || []).forEach(item => { if (item?.id) merged.set(item.id, item); });
          offset = page.next_offset ?? null;
        } while(offset != null && !cancelled);
        if (cancelled) return;
        const nextProducts = Array.from(merged.values());
        primeOwnerProductCache(nextProducts);
        setProducts(nextProducts);
      } catch (err){
        console.error(err);
        if (!cancelled) toast.error("Failed to load products");
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return ()=>{ cancelled = true; };
  }, []);
  useEffect(()=>{
    setOrdersLoading(true);
    apiListOrders().then(setOrders).catch(()=>{}).finally(()=>setOrdersLoading(false));
  }, []);
  // Pull just the aggregate inventory numbers from the backend so the Inventory tab badge shows
  // the same truth as the database without waiting for the paged product list to hydrate. Keeping
  // this isolated means occasional stats failures do not block the catalog UI from loading.
  const refreshInventoryStats = useCallback(async ()=>{
    setInventoryStatsLoading(true);
    try {
      const data = await getOwnerInventoryStats();
      if (inventoryMountedRef.current) setInventoryStats(data || null);
    } catch {
      if (inventoryMountedRef.current) setInventoryStats(null);
    } finally {
      if (inventoryMountedRef.current) setInventoryStatsLoading(false);
    }
  }, []);

  useEffect(()=>{
    refreshInventoryStats();
  }, [refreshInventoryStats]);

  const inventoryFallbackCount = useMemo(()=>products.reduce((s,p)=>s + (Number(p.qty)||0), 0), [products]);
  // Prefer the backend-ready quantity when available, but gracefully fall back to the locally
  // loaded list so the badge continues to update while offline or if the stats call hiccups.
  const inventoryCount = (inventoryStats && typeof inventoryStats.ready_qty === 'number')
    ? inventoryStats.ready_qty
    : inventoryFallbackCount;
  const inventoryCountLoading = inventoryStatsLoading && inventoryStats === null && productsLoading;
  const pendingCount = useMemo(()=>orders.filter(o=>o.status==='pending').length, [orders]);

  // Upload flow adds the new product to the head of state immediately and then refreshes counts so
  // the badge reflects the updated stock without a full reload.
  const handleAddProduct = useCallback((product)=>{
    primeOwnerProductCache([product]);
    setProducts(prev => [product, ...prev]);
    refreshInventoryStats();
  }, [refreshInventoryStats]);

  return (
    <>
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid grid-cols-3 w-full sticky top-0 z-10 bg-white">
        <TabsTrigger value="upload">Upload</TabsTrigger>
        <TabsTrigger value="inventory">Inventory ({inventoryCountLoading ? '…' : inventoryCount})</TabsTrigger>
        <TabsTrigger value="shortlists">Shortlists ({ordersLoading ? '…' : pendingCount})</TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="mt-4">
        <UploadView onAddProduct={handleAddProduct} />
      </TabsContent>

      <TabsContent value="inventory" className="mt-4">
        <InventoryView products={products} setProducts={setProducts} onInventoryChange={refreshInventoryStats} />
      </TabsContent>

      <TabsContent value="shortlists" className="mt-4">
        <OwnerShortlists products={products} orders={orders} setOrders={setOrders} setProducts={setProducts} onInventoryChange={refreshInventoryStats} />
      </TabsContent>
    </Tabs>
    </>
  );
}
