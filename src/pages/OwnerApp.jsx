import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listProducts as apiListProducts, listOrders as apiListOrders } from "../shared";
import UploadView from "../components/owner/UploadView.jsx";
import InventoryView from "../components/owner/InventoryView.jsx";
import OwnerShortlists from "../components/owner/Shortlists.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function OwnerApp(){
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
  );
}
