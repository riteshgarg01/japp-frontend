import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listProducts as apiListProducts } from "../shared";
import ShopView from "../components/customer/ShopView.jsx";

export default function CustomerApp(){
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ownerPhone] = useState(localStorage.getItem("ac_owner_phone") || "+919999999999");

  useEffect(()=>{
    apiListProducts().then(setProducts).catch(()=>toast.error("Failed to load products"));
  }, []);

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <ShopView products={products} onOrderCreate={(o)=>setOrders(prev=>[o, ...prev])} ownerPhone={ownerPhone} />
    </div>
  );
}
