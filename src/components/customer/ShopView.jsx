import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ShoppingCart, Filter, Phone, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fmt, waLink, createOrder as apiCreateOrder, BRAND_NAME, listProductsPaged, getProductImages, getOrdersBySession } from "../../shared";
// ShortlistSheet not used in full-screen view anymore
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
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const loadStep = 20;
  const [preview, setPreview] = useState(null); // { product, index }
  const [imgIndexById, setImgIndexById] = useState({});
  const [imagesById, setImagesById] = useState({});
  const [descExpanded, setDescExpanded] = useState(new Set());
  const touchRef = useRef({ startX: 0, startY: 0, t: 0 });

  // lightweight session + phone persistence
  const [sessionId, setSessionId] = useState(()=> localStorage.getItem('ac_session_id') || `sess-${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36)}`);
  const [phone, setPhone] = useState(()=> localStorage.getItem('ac_phone') || "");
  const [phoneModal, setPhoneModal] = useState(false);
  const [orderBanner, setOrderBanner] = useState(null); // { id, when }
  const [pendingAddId, setPendingAddId] = useState(null);

useEffect(()=>localStorage.setItem("ac_shortlist", JSON.stringify(shortlist)), [shortlist]);
useEffect(()=>{ localStorage.setItem('ac_session_id', sessionId); }, [sessionId]);
useEffect(()=>{ if (phone) localStorage.setItem('ac_phone', phone); }, [phone]);

// show last order banner (best-effort) when returning
useEffect(()=>{
  (async ()=>{
    try{
      const sid = localStorage.getItem('ac_session_id');
      if (!sid) return;
      const data = await getOrdersBySession(sid, 1);
      const last = (data.items||[])[0];
      if (last) setOrderBanner({ id: last.id, when: last.created_at });
    }catch{}
  })();
}, []);

  const [catalog, setCatalog] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchedOffsetsRef = useRef(new Set());

  const cats = useMemo(()=>{
    const set = new Set(catalog.map(p=> p.category));
    return ["All", ...Array.from(set)];
  }, [catalog]);
  const maxPrice = useMemo(()=>Math.max(5000, ...catalog.map(p=>p.price)), [catalog]);
  useEffect(()=>{ if (priceRange[1] < maxPrice) setPriceRange([0, maxPrice]); }, [maxPrice]);

  const filtered = catalog.filter(p => {
    const isAvailable = (p.available && (p.qty||0) > 0);
    return (
      (cat === "All" || p.category === cat) &&
      (!hideUnavailable || isAvailable) &&
      p.price >= priceRange[0] && p.price <= priceRange[1] &&
      (q.trim()==="" || p.title.toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase()))
    );
  });

  // Reset lazy display and server pagination when filters/search change
  useEffect(()=>{
    setDisplayCount(10);
    setCatalog([]);
    setTotal(0);
    setNextOffset(0);
  }, [cat, priceRange, q, hideUnavailable]);

  // Fetch page function
  async function fetchPage(limit, offset){
    if (loadingMore || fetchedOffsetsRef.current.has(offset)) return;
    if (offset === 0) setLoading(true); else setLoadingMore(true);
    fetchedOffsetsRef.current.add(offset);
    const params = {
      limit, offset,
      category: cat === 'All' ? undefined : cat,
      q: q.trim() || undefined,
      min_price: priceRange[0] || 0,
      max_price: priceRange[1] || undefined,
      only_available: hideUnavailable || undefined,
    };
    const data = await listProductsPaged(params);
    setCatalog(prev=>{
      const map = new Map(prev.map(p=>[p.id,p]));
      for (const it of (data.items||[])) map.set(it.id, it);
      return Array.from(map.values());
    });
    setTotal(data.total || 0);
    setNextOffset(data.next_offset ?? null);
    setLoading(false);
    setLoadingMore(false);
  }

  // Infinite scroll via IntersectionObserver
  const [sentinelRef, setSentinelRef] = useState(null);
  useEffect(()=>{
    if (!sentinelRef) return;
    const io = new IntersectionObserver((entries)=>{
      const [entry] = entries;
      if (entry.isIntersecting){
        if (nextOffset != null) {
          fetchPage(loadStep, nextOffset).catch(()=>{});
        } else {
          setDisplayCount((n)=> Math.min(filtered.length, n + loadStep));
        }
      }
    }, { rootMargin: '800px' });
    io.observe(sentinelRef);
    return ()=> io.disconnect();
  }, [sentinelRef, nextOffset, filtered.length]);

  // Initial page load and on filter changes
  useEffect(()=>{
    fetchedOffsetsRef.current.clear();
    fetchPage(10, 0).catch(()=>{});
  }, [cat, priceRange[0], priceRange[1], q, hideUnavailable]);

  function toggleShortlist(id){
    setShortlist(sl => {
      const has = sl.includes(id);
      if (!has && !phone){ setPendingAddId(id); setPhoneModal(true); return sl; }
      return has ? sl.filter(x=>x!==id) : [...sl, id];
    });
  }
  function isInCart(id){ return shortlist.includes(id); }

  async function ensureImages(p){
    if ((imagesById[p.id]?.length||0) > 1) return imagesById[p.id];
    try{
      const { images } = await getProductImages(p.id);
      setImagesById(prev=>({ ...prev, [p.id]: images }));
      return images;
    }catch{ return imagesById[p.id] || p.images || []; }
  }

  async function sendOrder(phoneVal){
    if (!shortlist.length) return toast.error("Shortlist is empty");
    try{
      // Open a placeholder window immediately to avoid popup blockers on mobile Safari
      const w = window.open('about:blank', '_blank');
      const created = await apiCreateOrder(shortlist, phoneVal, sessionId);
      onOrderCreate(created);
      setShortlist([]);
      toast.success("Order request sent");
      const msg = `New order request ${created.id}%0AItems: ${created.items.join(", ")}%0ACustomer: ${phoneVal}`;
      const url = waLink(ownerPhone, decodeURIComponent(msg));
      if (w && !w.closed) { w.location = url; } else { window.location.href = url; }
      setShortlistOpen(false);
      localStorage.setItem('ac_last_order_id', created.id);
    }catch(e){ console.error(e); toast.error("Failed to send order"); }
  }

  // Prefetch full image arrays for currently rendered products
  useEffect(()=>{
    const visible = filtered.slice(0, displayCount);
    (async ()=>{
      try{
        await Promise.all(visible.map(p=>{
          const cached = imagesById[p.id];
          if (cached && cached.length>1) return null;
          if ((p.images||[]).length<=1) return ensureImages(p);
          // if list already has multiple images, still ensure full-res
          return ensureImages(p);
        }));
      }catch{}
    })();
  }, [filtered, displayCount]);

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

      {orderBanner && (
        <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          We received your order {orderBanner.id}. We will get in touch shortly.
          <button className="float-right text-green-700" onClick={()=>setOrderBanner(null)}>×</button>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && catalog.length===0 && (
          <>
            <div className="col-span-full text-center text-sm text-neutral-600 mb-2">Loading catalog…</div>
            {Array.from({length:6}).map((_,i)=> (
              <div key={i} className="border rounded-xl overflow-hidden animate-pulse">
                <div className="h-72 bg-neutral-100"/>
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
        {!loading && filtered.length===0 && (
          <div className="col-span-full text-center text-neutral-500 py-12">No products match your filters.</div>
        )}
        {!loading && filtered.slice(0, displayCount).map((p) => {
          const isAvailable = (p.available && (p.qty||0) > 0);
          return (
            <motion.div key={p.id} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}}>
              <Card className="shadow-sm overflow-hidden">
                <div className="h-72 bg-neutral-100 relative">
                  {(imagesById[p.id]?.[0] || p.images?.[0]) ? (
                    <>
                      <img src={(imagesById[p.id] || p.images)[imgIndexById[p.id]||0] || (imagesById[p.id] || p.images)[0]} alt={p.title} loading="lazy" decoding="async" sizes="(max-width: 640px) 100vw, 33vw" className="h-full w-full object-contain" onClick={()=>{
                        // Open preview immediately using whatever images we have
                        setPreview({ product: p, index: imgIndexById[p.id]||0 });
                        // Kick off background fetch for full images (do not block UI)
                        if (!imagesById[p.id] && (!p.images || p.images.length<=1)) { ensureImages(p); }
                      }} />
                      {((imagesById[p.id] || p.images)?.length>1) && (
                        <>
                          <button
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white/90 rounded-full w-8 h-8 grid place-items-center"
                            onClick={(e)=>{
                              e.stopPropagation();
                              const imgs = (imagesById[p.id] || p.images || []);
                              const len = Math.max(1, imgs.length);
                              setImgIndexById(s=>({ ...s, [p.id]: ((s[p.id]||0) - 1 + len) % len }));
                              if (!imagesById[p.id] && (!p.images || p.images.length<=1)) { ensureImages(p); }
                            }}
                          >
                            ‹
                          </button>
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white/90 rounded-full w-8 h-8 grid place-items-center"
                            onClick={(e)=>{
                              e.stopPropagation();
                              const imgs = (imagesById[p.id] || p.images || []);
                              const len = Math.max(1, imgs.length);
                              setImgIndexById(s=>({ ...s, [p.id]: ((s[p.id]||0) + 1) % len }));
                              if (!imagesById[p.id] && (!p.images || p.images.length<=1)) { ensureImages(p); }
                            }}
                          >
                            ›
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="h-full w-full grid place-items-center text-neutral-400"><ImageIcon/></div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-1">{p.title}</CardTitle>
                  {descExpanded.has(p.id) ? (
                    <CardDescription>{p.description}</CardDescription>
                  ) : (
                    <CardDescription>
                      {(() => {
                        const text = p.description || '';
                        const max = 120; // approx two lines on mobile
                        if (text.length <= max) return text;
                        const cut = text.slice(0, max);
                        const lastSpace = cut.lastIndexOf(' ');
                        const head = cut.slice(0, lastSpace > 60 ? lastSpace : max);
                        return (
                          <>
                            {head}…{' '}
                            <button className="text-blue-600 text-xs" onClick={()=>{ const s=new Set(Array.from(descExpanded)); s.add(p.id); setDescExpanded(s); }}>See more</button>
                          </>
                        );
                      })()}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex items-center justify-between py-2">
                  <Badge variant="outline">{p.category}</Badge>
                  <div className="font-semibold">{fmt(p.price)}</div>
                </CardContent>
                <CardFooter className="block">
                  <Button className="w-full flex items-center justify-center gap-2" size="sm" disabled={!isAvailable} variant={isAvailable ? (isInCart(p.id)?"secondary":"default") : "secondary"} onClick={()=>toggleShortlist(p.id)}>
                    <ShoppingCart className="h-4 w-4"/> <span>{isAvailable ? (isInCart(p.id)?"Remove":"Add to Cart") : "Not available"}</span>
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
            <div className="flex items-center justify-between">
              <Label>Hide unavailable</Label>
              <Switch checked={hideUnavailable} onCheckedChange={setHideUnavailable} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=>setFilterOpen(false)}>Close</Button>
              <Button onClick={()=>setFilterOpen(false)}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone modal for first add-to-cart */}
      <Dialog open={phoneModal} onOpenChange={setPhoneModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter your phone number</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="e.g. 8884024446" inputMode="tel" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setPhoneModal(false)}>Cancel</Button>
              <Button onClick={()=>{ if(!phone.trim()) return; const v=phone.trim(); localStorage.setItem('ac_phone', v); setPhone(v); setPhoneModal(false); if (pendingAddId){ setShortlist(sl=> sl.includes(pendingAddId)? sl : [...sl, pendingAddId]); setPendingAddId(null); } }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sentinel for infinite scroll (always present) */}
      <div ref={setSentinelRef} className="h-10" />

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
              {phone ? (
                <div className="flex gap-2">
                  <Button className="shrink-0 flex items-center justify-center gap-2 w-full" onClick={()=>sendOrder(phone)}>
                    <Phone className="h-4 w-4"/>Send Order
                  </Button>
                </div>
              ) : (
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
                  <Button className="shrink-0 flex items-center justify-center gap-2" onClick={()=>{ const v=(custPhoneMobile||"").trim(); if(!v) return toast.error("Enter WhatsApp number"); setPhone(v); localStorage.setItem('ac_phone', v); sendOrder(v); }}>
                    <Phone className="h-4 w-4"/>Send Order
                  </Button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {/* Bigger product entries for recall */}
              {shortlist.length===0 && (
                <div className="text-sm text-neutral-500">Your shortlist is empty.</div>
              )}
              <div className="space-y-3">
              {shortlist.map(id=>{
                  const p = catalog.find(pp=>pp.id===id);
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
                <div className="font-semibold">{fmt(shortlist.reduce((sum,id)=>{ const p = catalog.find(pp=>pp.id===id); return sum + (p?.price||0); },0))}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product full-screen preview with carousel */}
      <Dialog open={!!preview} onOpenChange={()=>setPreview(null)}>
        <DialogContent className="p-0 max-w-none w-[100vw] h-dvh">
          {preview && (
            <div className="relative w-full h-full bg-black text-white flex flex-col overflow-hidden">
              <button className="absolute top-3 right-3 z-20 bg-white/10 hover:bg-white/20 rounded-full p-2" onClick={()=>setPreview(null)} aria-label="Close">
                <X className="h-5 w-5"/>
              </button>
              <div className="grid place-items-center relative h-[calc(100vh-96px)]"
                   onTouchStart={(e)=>{ const t=e.touches[0]; touchRef.current={ startX:t.clientX, startY:t.clientY, t:Date.now() }; }}
                   onTouchEnd={(e)=>{ const dx=(e.changedTouches[0].clientX - touchRef.current.startX); const dy=(e.changedTouches[0].clientY - touchRef.current.startY); const dt=Date.now()-touchRef.current.t; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && dt<800 && preview.product.images?.length>1){ setPreview(p=>({ ...p, index: (p.index + (dx<0?1:-1) + preview.product.images.length) % preview.product.images.length })); } }}>
                {/* Arrows */}
                {(imagesById[preview.product.id]?.length || preview.product.images?.length)>1 && (
                  <>
                    <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2" onClick={()=>setPreview(p=>{ const imgs=(imagesById[p.product.id]||p.product.images)||[]; const len=imgs.length||1; return { ...p, index: (p.index - 1 + len) % len }; })}>
                      ‹
                    </button>
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2" onClick={()=>setPreview(p=>{ const imgs=(imagesById[p.product.id]||p.product.images)||[]; const len=imgs.length||1; return { ...p, index: (p.index + 1) % len }; })}>
                      ›
                    </button>
                  </>
                )}
                <img src={(imagesById[preview.product.id] || preview.product.images)?.[preview.index] || (imagesById[preview.product.id] || preview.product.images)?.[0]} alt={preview.product.title} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="p-3 bg-black/90 sticky bottom-0">
                <Button className="w-full flex items-center justify-center gap-2" size="lg" disabled={!((preview.product.available)&&((preview.product.qty||0)>0))} variant={isInCart(preview.product.id)?"secondary":"default"} onClick={()=>toggleShortlist(preview.product.id)}>
                  <ShoppingCart className="h-5 w-5"/> <span>{((preview.product.available)&&((preview.product.qty||0)>0)) ? (isInCart(preview.product.id)?"Remove":"Add to Cart") : "Not available"}</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
