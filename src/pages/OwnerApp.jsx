import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listProducts as apiListProducts, listOrders as apiListOrders } from "../shared";
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
  useEffect(()=>{
    setProductsLoading(true);
    apiListProducts().then(setProducts).catch(()=>toast.error("Failed to load products")).finally(()=>setProductsLoading(false));
  }, []);
  useEffect(()=>{
    setOrdersLoading(true);
    apiListOrders().then(setOrders).catch(()=>{}).finally(()=>setOrdersLoading(false));
  }, []);

  const inventoryCount = useMemo(()=>products.reduce((s,p)=>s + (Number(p.qty)||0), 0), [products]);
  const pendingCount = useMemo(()=>orders.filter(o=>o.status==='pending').length, [orders]);

  return (
    <>
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid grid-cols-3 w-full sticky top-0 z-10 bg-white">
        <TabsTrigger value="upload">Upload</TabsTrigger>
        <TabsTrigger value="inventory">Inventory ({productsLoading ? '…' : inventoryCount})</TabsTrigger>
        <TabsTrigger value="shortlists">Shortlists ({ordersLoading ? '…' : pendingCount})</TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="mt-4">
        <UploadView onAddProduct={(p)=>setProducts([p, ...products])} />
      </TabsContent>

      <TabsContent value="inventory" className="mt-4">
        <InventoryView products={products} setProducts={setProducts} />
      </TabsContent>

      <TabsContent value="shortlists" className="mt-4">
        <OwnerShortlists products={products} orders={orders} setOrders={setOrders} setProducts={setProducts} />
      </TabsContent>
    </Tabs>
    </>
  );
}
