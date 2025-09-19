import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Eye, MessageCircle, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { confirmOrder as apiConfirmOrder, listOrdersPaged, removeItemFromOrder, addItemToOrder } from "../../shared";
import { formatDateTime, waLink } from "../../shared";

export default function OwnerShortlists({ products, orders, setOrders, setProducts }){
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState(null);
  const [catalogMap, setCatalogMap] = useState(()=> new Map(products.map(p=>[p.id,p])));
  const [nextOffset, setNextOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sentinel, setSentinel] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);

  useEffect(()=>{ setCatalogMap(new Map(products.map(p=>[p.id,p]))); }, [products]);

  useEffect(()=>{
    // initial page if orders empty
    if (!orders?.length){
      setInitialLoading(true);
      listOrdersPaged({ limit: 20, offset: 0 }).then(data=>{
        setOrders(data.items||[]); setNextOffset(data.next_offset ?? null);
      }).catch(()=>{}).finally(()=>setInitialLoading(false));
    }
  }, []);

  useEffect(()=>{
    if (!sentinel) return;
    const io = new IntersectionObserver((ents)=>{
      const [e] = ents; if (!e.isIntersecting) return;
      if (nextOffset==null) return;
      setLoadingMore(true);
      listOrdersPaged({ limit: 20, offset: nextOffset }).then(data=>{
        const existing = new Map(orders.map(o=>[o.id,o]));
        for (const it of (data.items||[])) existing.set(it.id, it);
        setOrders(Array.from(existing.values()));
        setNextOffset(data.next_offset ?? null);
      }).finally(()=>setLoadingMore(false));
    }, { rootMargin: '300px' });
    io.observe(sentinel);
    return ()=> io.disconnect();
  }, [sentinel, nextOffset, orders]);

  const map = catalogMap;
  const merged = useMemo(()=>{
    return orders.map(o=>({
      ...o,
      _status: o.status,
      _total: o.items.reduce((s,id)=> s + (map.get(id)?.price||0), 0),
    })).sort((a,b)=> (a._status==='pending'? -1:1));
  }, [orders, map]);
  const filtered = merged.filter(o=>{
    const text = `${o.customer_phone} ${o.items.join(' ')} ${o.id} ` + o.items.map(id=>map.get(id)?.title||'').join(' ');
    return text.toLowerCase().includes(q.toLowerCase());
  });

  async function confirm(o){
    try{
      const updated = await apiConfirmOrder(o.id);
      setOrders(prev=> prev.map(x=> x.id===o.id ? { ...x, status: 'confirmed' } : x));
      toast.success(`Order ${o.id} confirmed`);
    }catch(e){ console.error(e); toast.error("Failed to confirm order"); }
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b px-3 py-2">
        <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search by phone, product ID, name" className="text-base" />
      </div>
      {initialLoading && orders.length===0 && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({length:3}).map((_,i)=> (
            <div key={i} className="p-3 space-y-2 border rounded animate-pulse">
              <div className="h-4 bg-neutral-100 rounded w-1/3"/>
              <div className="h-3 bg-neutral-100 rounded w-1/2"/>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({length:3}).map((_,j)=>(<div key={j} className="h-24 bg-neutral-100 rounded"/>))}
              </div>
              <div className="h-8 bg-neutral-100 rounded w-full"/>
            </div>
          ))}
        </div>
      )}
      {filtered.map(o=> (
        <Card key={o.id} className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">{o.id}</div>
            {o._status==='pending' ? (
              <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">Pending</Badge>
            ) : (
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">Confirmed</Badge>
            )}
          </div>
          <div className="text-sm text-neutral-600">Customer: {o.customer_phone}</div>
          <div className="text-xs text-neutral-500">Created: {formatDateTime(o.created_at) || '-' } {o.confirmed_at ? `• Confirmed: ${formatDateTime(o.confirmed_at)}` : ''}</div>
          <div className="grid grid-cols-3 gap-2">
            {o.items.map(id=>{
              const p = map.get(id);
              if (!p) return null;
              return (
                <div key={id} className="relative">
                  <img src={p.images?.[0]} alt={p.title} loading="lazy" decoding="async" className="h-24 w-full object-cover rounded-lg" onClick={()=>setPreview({ url:p.images?.[0], product:p, order:o })} />
                  <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7" onClick={()=>setPreview({ url:p.images?.[0], product:p, order:o })}><Eye className="h-4 w-4"/></Button>
                </div>
              )
            })}
          </div>
          {o.removed_items?.length>0 && (
            <div className="mt-2">
              <div className="text-xs text-neutral-500 mb-1">Removed</div>
              <div className="grid grid-cols-3 gap-2">
                {o.removed_items.map(id=>{
                  const p = map.get(id);
                  return p ? (
                    <div key={id} className="relative">
                      <img src={p.images?.[0]} alt={p.title} loading="lazy" decoding="async" className="h-16 w-full object-cover rounded"/>
                      <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7" onClick={async()=>{
                        try{
                          const updated = await addItemToOrder(o.id, id);
                          setOrders(orders.map(x=> x.id===updated.id ? updated : x));
                          toast.success('Added back');
                        }catch(e){ console.error(e); toast.error('Failed to add back'); }
                      }}>
                        <Plus className="h-4 w-4"/>
                      </Button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <div className="text-neutral-500">Total</div>
            <div className="font-semibold">₹{o._total.toLocaleString('en-IN')}</div>
          </div>
          <div className="flex gap-2">
            <Button className="w-1/2 flex items-center justify-center gap-2" variant="outline" onClick={()=>{ window.open(waLink(o.customer_phone, `Hi about shortlist ${o.id}`), '_blank'); }}>
              <MessageCircle className="h-4 w-4"/>
              <span>Chat</span>
            </Button>
            {o._status==='pending' ? (
              <Button className="w-1/2 flex items-center justify-center gap-2" onClick={()=>confirm(o)}><CheckCircle2 className="h-4 w-4"/>Confirm Order</Button>
            ) : (
              <Button className="w-1/2 flex items-center justify-center gap-2" variant="secondary" disabled>Confirmed</Button>
            )}
          </div>
        </Card>
      ))}

      <Dialog open={!!preview} onOpenChange={()=>setPreview(null)}>
        <DialogContent className="max-w-md p-0">
          {preview && (
            <div className="flex flex-col">
              <div className="max-h-[70vh] grid place-items-center p-2">
                <img src={preview.url} alt="preview" className="max-h-[70vh] w-auto h-auto rounded-lg object-contain"/>
              </div>
              {(()=>{ const p = preview.product; return p ? (
                <div className="text-sm p-3 border-t bg-white sticky bottom-0">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-neutral-500">ID: {p.id} • ₹{(p.price||0).toLocaleString('en-IN')}</div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" onClick={()=>setPreview(null)} className="flex items-center justify-center">Close</Button>
                    <Button variant="destructive" onClick={async()=>{ try{ const updated = await removeItemFromOrder(preview.order.id, p.id); setOrders(orders.map(o=> o.id===updated.id? updated : o)); } finally { setPreview(null); } }} className="flex items-center justify-center">Remove from Shortlist</Button>
                  </div>
                </div>
              ) : null; })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Removed products now rendered within each card above; global list removed */}
      <div ref={setSentinel} className="h-10" />
      {loadingMore && <div className="text-center text-xs text-neutral-500 py-2">Loading more…</div>}
    </div>
  );
}
