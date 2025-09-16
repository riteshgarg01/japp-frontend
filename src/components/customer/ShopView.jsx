import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ShoppingCart, Filter, Phone, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fmt, waLink, createOrder as apiCreateOrder, BRAND_NAME } from "../../shared";
import ShortlistSheet from "./ShortlistSheet.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ShopView({ products, onOrderCreate, ownerPhone, isLoading }){
  const [cat, setCat] = useState("All");
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [q, setQ] = useState("");
  const [shortlist, setShortlist] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("ac_shortlist")||"[]"); }catch{ return []; }
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [custPhoneMobile, setCustPhoneMobile] = useState("");

  useEffect(()=>localStorage.setItem("ac_shortlist", JSON.stringify(shortlist)), [shortlist]);

  const cats = useMemo(()=>{
    const set = new Set(products.map(p=> p.category));
    return ["All", ...Array.from(set)];
  }, [products]);
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
      // Open a placeholder window immediately to avoid popup blockers on mobile Safari
      const w = window.open('about:blank', '_blank');
      const created = await apiCreateOrder(shortlist, phone);
      onOrderCreate(created);
      setShortlist([]);
      toast.success("Order request sent");
      const msg = `New order request ${created.id}%0AItems: ${created.items.join(", ")}%0ACustomer: ${phone}`;
      const url = waLink(ownerPhone, decodeURIComponent(msg));
      if (w && !w.closed) { w.location = url; } else { window.location.href = url; }
      setShortlistOpen(false);
    }catch(e){ console.error(e); toast.error("Failed to send order"); }
  }

  return (
    <>
      {/* Sticky top bar with filter icon, search input, and cart icon */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={()=>setFilterOpen(true)} aria-label="Filters">
            <Filter className="h-5 w-5" />
          </Button>
          <Input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            onFocus={(e)=>e.target.select()}
            onKeyDown={(e)=>{ if (e.key==='Enter') e.currentTarget.blur(); }}
            placeholder="Search products"
            className="flex-1 text-base"
          />
          <Button variant="ghost" size="icon" onClick={()=>setShortlistOpen(true)} aria-label="Shortlist">
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {shortlist.length>0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">
                  {shortlist.length}
                </span>
              )}
            </div>
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && (
          <>
            {Array.from({length:6}).map((_,i)=> (
              <div key={i} className="border rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-neutral-100"/>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-neutral-100 rounded w-3/4"/>
                  <div className="h-3 bg-neutral-100 rounded w-full"/>
                  <div className="h-3 bg-neutral-100 rounded w-2/3"/>
                  <div className="h-8 bg-neutral-100 rounded w-full mt-2"/>
                </div>
              </div>
            ))}
          </>
        )}
        {!isLoading && filtered.length===0 && (
          <div className="col-span-full text-center text-neutral-500 py-12">No products match your filters.</div>
        )}
        {!isLoading && filtered.map((p) => {
          const isAvailable = (p.available && (p.qty||0) > 0);
          return (
            <motion.div key={p.id} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}}>
              <Card className="shadow-sm overflow-hidden">
                <div className="aspect-square bg-neutral-100">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
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
                <CardFooter className="block">
                  <div className="flex items-center justify-between mb-2 text-xs text-neutral-500">
                    <div>{isAvailable ? `${p.qty} in stock` : "Not available"}</div>
                  </div>
                  <Button className="w-full flex items-center justify-center gap-2" size="sm" disabled={!isAvailable} variant={isAvailable ? (shortlist.includes(p.id)?"secondary":"default") : "secondary"} onClick={()=>toggleShortlist(p.id)}>
                    <ShoppingCart className="h-4 w-4"/> <span>{shortlist.includes(p.id)?"Remove":"Shortlist"}</span>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Filter dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label>Price Range</Label>
              <div className="py-2">
                <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={maxPrice} step={100} />
                <div className="text-sm text-neutral-600 mt-2">{fmt(priceRange[0])} – {fmt(priceRange[1])}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=>setFilterOpen(false)}>Close</Button>
              <Button onClick={()=>setFilterOpen(false)}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shortlist full-screen panel */}
      <Dialog open={shortlistOpen} onOpenChange={setShortlistOpen}>
        <DialogContent className="p-0 max-w-none w-[100vw] h-dvh">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-medium">Shortlist ({shortlist.length})</div>
              <Button variant="ghost" size="icon" onClick={()=>setShortlistOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {/* Sticky top controls to avoid bottom address bar issues */}
            <div className="px-4 py-3 border-b bg-white sticky top-0 z-10">
              <div className="flex gap-2">
                <Input
                  type="tel"
                  inputMode="tel"
                  value={custPhoneMobile}
                  onChange={(e)=>setCustPhoneMobile(e.target.value)}
                  onFocus={(e)=>{ e.currentTarget.select(); e.currentTarget.scrollIntoView({ block: 'center' }); }}
                  placeholder="Your WhatsApp (+91...)"
                  className="text-base"
                />
                <Button className="shrink-0" onClick={()=>{ const v=(custPhoneMobile||"").trim(); if(!v) return toast.error("Enter WhatsApp number"); sendOrder(v); }}>Send Order Request</Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {/* Bigger product entries for recall */}
              {shortlist.length===0 && (
                <div className="text-sm text-neutral-500">Your shortlist is empty.</div>
              )}
              <div className="space-y-3">
                {shortlist.map(id=>{
                  const p = products.find(pp=>pp.id===id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex items-center gap-3 border rounded-xl p-2">
                      <img src={p.images?.[0]} alt={p.title} loading="lazy" className="h-20 w-20 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium line-clamp-2">{p.title}</div>
                        <div className="text-sm text-neutral-600 mt-1">{fmt(p.price)}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={()=>toggleShortlist(id)}>Remove</Button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t bg-white">
              <div className="flex items-center justify-between text-sm">
                <div className="text-neutral-500">Total</div>
                <div className="font-semibold">{fmt(shortlist.reduce((sum,id)=>{ const p = products.find(pp=>pp.id===id); return sum + (p?.price||0); },0))}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
