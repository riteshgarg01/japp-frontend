import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listProducts as apiListProducts, getConfig } from "../shared";
import ShopView from "../components/customer/ShopView.jsx";

export default function CustomerApp(){
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ownerPhone, setOwnerPhone] = useState("");

  useEffect(()=>{ apiListProducts().then(setProducts).catch(()=>toast.error("Failed to load products")); }, []);
  useEffect(()=>{ getConfig().then(c=>setOwnerPhone(c.owner_phone||"")); }, []);

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <ShopView products={products} onOrderCreate={(o)=>setOrders(prev=>[o, ...prev])} ownerPhone={ownerPhone} />
    </div>
  );
}
