import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ShoppingCart, Filter, Phone, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fmt, waLink, createOrder as apiCreateOrder, BRAND_NAME } from "../../shared";
import ShortlistSheet from "./ShortlistSheet.jsx";

export default function ShopView({ products, onOrderCreate, ownerPhone }){
  const [cat, setCat] = useState("All");
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [q, setQ] = useState("");
  const [shortlist, setShortlist] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("ac_shortlist")||"[]"); }catch{ return []; }
  });

  useEffect(()=>localStorage.setItem("ac_shortlist", JSON.stringify(shortlist)), [shortlist]);

  const cats = useMemo(()=>["All", ...Array.from(new Set(products.map(p=>p.category)))], [products]);
  const maxPrice = useMemo(()=>Math.max(5000, ...products.map(p=>p.price)), [products]);
  useEffect(()=>{ if (priceRange[1] < maxPrice) setPriceRange([0, maxPrice]); }, [maxPrice]);

  const filtered = products.filter(p => (
    (cat === "All" || p.category === cat) &&
    p.price >= priceRange[0] && p.price <= priceRange[1] &&
    (q.trim()==="" || p.title.toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase()))
  ));

  function toggleShortlist(id){ setShortlist(sl => sl.includes(id) ? sl.filter(x=>x!==id) : [...sl, id]); }

  async function sendOrder(phone){
    if (!shortlist.length) return toast.error("Shortlist is empty");
    try{
      const created = await apiCreateOrder(shortlist, phone);
      onOrderCreate(created);
      setShortlist([]);
      toast.success("Order request sent");
      const msg = `New order request ${created.id}%0AItems: ${created.items.join(", ")}%0ACustomer: ${phone}`;
      const url = waLink(ownerPhone, decodeURIComponent(msg));
      window.open(url, "_blank");
    }catch(e){ console.error(e); toast.error("Failed to send order"); }
  }

  return (
    <>
      <Card className="md:col-span-1 h-fit sticky top-4 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4"/> Filters</CardTitle>
          <CardDescription>Browse {BRAND_NAME} catalog on mobile web.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {cats.map(c=> <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Search</Label>
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search title or description" />
          </div>
          <div>
            <Label>Price Range</Label>
            <div className="py-2">
              <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={maxPrice} step={100} />
              <div className="text-sm text-neutral-600 mt-2">{fmt(priceRange[0])} – {fmt(priceRange[1])}</div>
            </div>
          </div>
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm text-neutral-500">Shortlist ({shortlist.length})</div>
            <ShortlistSheet shortlist={shortlist} products={products} onRemove={(id)=>toggleShortlist(id)} />
            <div className="flex flex-col sm:flex-row gap-2">
              <Input id="custPhoneSidebar" placeholder="Your WhatsApp (+91...)" />
              <Button onClick={()=>{ const el=document.getElementById("custPhoneSidebar"); const v=/** @type {HTMLInputElement} */(el)?.value?.trim(); if(!v) return toast.error("Enter WhatsApp number"); sendOrder(v); }}>
                <Phone className="mr-2 h-4 w-4"/> Send Order
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="md:col-span-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length===0 && (
          <div className="col-span-full text-center text-neutral-500 py-12">No products match your filters.</div>
        )}
        {filtered.map((p) => {
          const isAvailable = (p.available && (p.qty||0) > 0);
          return (
            <motion.div key={p.id} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}}>
              <Card className="shadow-sm overflow-hidden">
                <div className="aspect-square bg-neutral-100">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-neutral-400"><ImageIcon/></div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-1">{p.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between py-2">
                  <Badge variant="outline">{p.category}</Badge>
                  <div className="font-semibold">{fmt(p.price)}</div>
                </CardContent>
                <CardFooter className="justify-between">
                  <div className="text-xs text-neutral-500">{isAvailable ? `${p.qty} in stock` : "Not available"}</div>
                  <Button size="sm" disabled={!isAvailable} variant={isAvailable ? (shortlist.includes(p.id)?"secondary":"default") : "secondary"} onClick={()=>toggleShortlist(p.id)}>
                    <ShoppingCart className="mr-2 h-4 w-4"/>{shortlist.includes(p.id)?"Remove":"Shortlist"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
