import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listProducts as apiListProducts, getConfig } from "../shared";
import ShopView from "../components/customer/ShopView.jsx";

export default function CustomerApp(){
  const shouldPrefetch = (import.meta.env?.VITE_ENABLE_LEGACY_CATALOG_PREFETCH ?? "false") !== "false";
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ownerPhone, setOwnerPhone] = useState("");
  const [loading, setLoading] = useState(shouldPrefetch);

  useEffect(()=>{
    if (!shouldPrefetch) return;
    setLoading(true);
    apiListProducts()
      .then(setProducts)
      .catch(()=>toast.error("Failed to load products"))
      .finally(()=>setLoading(false));
  }, [shouldPrefetch]);
  useEffect(()=>{ getConfig().then(c=>setOwnerPhone(c.owner_phone||"")); }, []);

  return (
    <div>
      <ShopView isLoading={loading} products={products} onOrderCreate={(o)=>setOrders(prev=>[o, ...prev])} ownerPhone={ownerPhone} />
    </div>
  );
}
