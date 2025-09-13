import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listProducts as apiListProducts, listOrders as apiListOrders } from "../shared";
import UploadView from "../components/owner/UploadView.jsx";
import OwnerOrders from "../components/owner/OwnerOrders.jsx";
import InventoryView from "../components/owner/InventoryView.jsx";

export default function OwnerApp(){
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(()=>{ apiListProducts().then(setProducts).catch(()=>toast.error("Failed to load products")); }, []);
  useEffect(()=>{ apiListOrders().then(setOrders).catch(()=>{}); }, []);

  return (
    <div className="space-y-6">
      <UploadView onAddProduct={(p)=>setProducts([p, ...products])} />
      <OwnerOrders products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} />
      <InventoryView products={products} setProducts={setProducts} />
    </div>
  );
}
