/*
  OwnerShortlists renders the owner dashboard feed of carts/orders. It keeps a local catalog
  mirror, hydrates missing products on demand, and sorts status buckets so active carts rise to
  the top. Any change here should maintain that contract so other owner views inherit the cache.
*/
import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Eye, MessageCircle, CheckCircle2, Plus, X, ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { confirmOrder as apiConfirmOrder, cancelOrder as apiCancelOrder, listOrdersPaged, removeItemFromOrder, addItemToOrder, trackEvent, hydrateOwnerProducts, primeOwnerProductCache } from "../../shared";
import { formatDateTime, waLink } from "../../shared";

// Shortlists consumes orders + product catalog. Whenever an order references an unknown product
// we fetch it and merge into the shared catalog so other owner views stay in sync.
const STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ACTIVE_CART: 'ACTIVE_CART',
  ABANDONED_CART: 'ABANDONED_CART',
  CANCELLED: 'CANCELLED',
};

// Sort order ensures active carts bubble to the top, followed by pending/abandoned/etc.
const STATUS_PRIORITY = {
  [STATUS.ACTIVE_CART]: 0,
  [STATUS.PENDING]: 1,
  [STATUS.ABANDONED_CART]: 2,
  [STATUS.CONFIRMED]: 3,
  [STATUS.CANCELLED]: 4,
};

const STATUS_META = {
  [STATUS.PENDING]: { label: 'Pending', className: 'text-amber-700 border-amber-200 bg-amber-50' },
  [STATUS.ACTIVE_CART]: { label: 'Active Cart', className: 'text-blue-700 border-blue-200 bg-blue-50' },
  [STATUS.ABANDONED_CART]: { label: 'Abandoned Cart', className: 'text-neutral-700 border-neutral-200 bg-neutral-50' },
  [STATUS.CONFIRMED]: { label: 'Confirmed', className: 'text-green-700 border-green-200 bg-green-50' },
  [STATUS.CANCELLED]: { label: 'Cancelled', className: 'text-red-700 border-red-200 bg-red-50' },
};

export default function OwnerShortlists({ products, orders, setOrders, setProducts, onInventoryChange }){
  const notifyInventoryChange = onInventoryChange || (()=>{});
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState(null);
  const [catalogMap, setCatalogMap] = useState(()=> new Map(products.map(p=>[p.id,p])));
  const [nextOffset, setNextOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sentinel, setSentinel] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [removingKey, setRemovingKey] = useState(null);
  const [restoringKey, setRestoringKey] = useState(null);

  // Keep a fast lookup map so renders are O(1) when referencing product metadata.
  useEffect(()=>{ setCatalogMap(new Map(products.map(p=>[p.id,p]))); }, [products]);

  // Orders may include products the owner has never viewed; hydrate those gaps here.
  useEffect(()=>{
    // Use the shared hydrator so Shortlists and other owner views coalesce their product lookups
    // and avoid duplicated network calls for unseen catalog entries. Many carts reference products
    // the owner has never scrolled to in Inventory; this keeps thumbnails populated without
    // requiring that detour.
    const map = catalogMap;
    const missingIds = [];
    orders.forEach(order => {
      if (!order) return;
      [...(order.items || []), ...(order.removed_items || [])].forEach(id => {
        if (!id) return;
        if (map.has(id)) return;
        missingIds.push(id);
      });
    });
    if (!missingIds.length) return;
    let cancelled = false;
    (async ()=>{
      try{
        const hydrated = await hydrateOwnerProducts(missingIds.slice(0, 25));
        if (cancelled || !hydrated.length) return;
        primeOwnerProductCache(hydrated);
        setCatalogMap(prev => {
          const next = new Map(prev);
          hydrated.forEach(prod => { if (prod?.id) next.set(prod.id, prod); });
          return next;
        });
        setProducts(prev => {
          const mapProd = new Map(prev.map(p=>[p.id,p]));
          hydrated.forEach(prod => {
            if (!prod?.id) return;
            const existing = mapProd.get(prod.id) || {};
            mapProd.set(prod.id, { ...existing, ...prod });
          });
          return Array.from(mapProd.values());
        });
      } catch (err){
        console.error(err);
      }
    })();
    return ()=>{ cancelled = true; };
  }, [orders, catalogMap, setProducts]);

  useEffect(()=>{
    // Bootstrap the first slice of orders so the owner immediately sees active carts even if the
    // parent did not pre-populate them.
    if (!orders?.length){
      setInitialLoading(true);
      listOrdersPaged({ limit: 20, offset: 0 }).then(data=>{
        setOrders(data.items||[]); setNextOffset(data.next_offset ?? null);
      }).catch(()=>{}).finally(()=>setInitialLoading(false));
    }
  }, []);

  // Infinite scroll loader similar to InventoryView: when the sentinel comes into view we either
  // fetch the next page or stop if we've exhausted the cursor.
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

  // Merge orders with catalog info and sort by status priority + recency.
  const merged = useMemo(()=>{
      return orders.map(o=>({
      ...o,
      _total: o.items.reduce((s,id)=> s + (map.get(id)?.price||0), 0),
      _updatedMs: Date.parse(o.updated_at || o.created_at || 0) || 0,
    })).sort((a,b)=>{
      const pa = STATUS_PRIORITY[a.status] ?? 99;
      const pb = STATUS_PRIORITY[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return (b._updatedMs || 0) - (a._updatedMs || 0);
    });
  }, [orders, map]);
  const filtered = merged.filter(o=>{
    const text = `${o.customer_phone} ${o.items.join(' ')} ${o.id} ` + o.items.map(id=>map.get(id)?.title||'').join(' ');
    return text.toLowerCase().includes(q.toLowerCase());
  });

  // Confirming an order updates the backend, patches local state, and notifies the parent so the
  // inventory badge reflects the new stock count without a reload.
  async function confirm(o){
    if (!o?.id) return;
    try{
      setConfirmingId(o.id);
      const updated = await apiConfirmOrder(o.id);
      setOrders(prev=> prev.map(x=> x.id===o.id ? updated : x));
      toast.success('Order ' + o.id + ' confirmed');
      notifyInventoryChange();
    }catch(e){ console.error(e); toast.error("Failed to confirm order"); }
    finally{
      setConfirmingId(null);
    }
  }

  // Cancelling mirrors confirm but leaves inventory untouched; we still update local state so the
  // row reflects the new status immediately.
  async function cancel(o){
    if (!o?.id) return;
    try{
      setCancelingId(o.id);
      const updated = await apiCancelOrder(o.id);
      setOrders(prev=> prev.map(x=> x.id===o.id ? updated : x));
      toast.success('Order ' + o.id + ' cancelled');
    }catch(e){ console.error(e); toast.error('Failed to cancel order'); }
    finally{
      setCancelingId(null);
    }
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
      {filtered.map((o) => {
        const statusMeta = STATUS_META[o.status] || { label: o.status || 'Unknown', className: 'text-neutral-700 border-neutral-200 bg-neutral-50' };
        const createdText = formatDateTime(o.created_at) || '-';
        const updatedText = formatDateTime(o.updated_at) || createdText;
        const timelineText = (() => {
          if (o.status === STATUS.CONFIRMED){
            const confirmed = formatDateTime(o.confirmed_at) || updatedText;
            return `Confirmed: ${confirmed}`;
          }
          if (o.status === STATUS.CANCELLED){
            return `Cancelled: ${updatedText}`;
          }
          return `Updated: ${updatedText}`;
        })();
        const isCart = o.status === STATUS.ACTIVE_CART || o.status === STATUS.ABANDONED_CART;
        const canConfirm = ![STATUS.CONFIRMED, STATUS.CANCELLED].includes(o.status);
        const canCancel = ![STATUS.CONFIRMED, STATUS.CANCELLED].includes(o.status);
        return (
        <Card
          key={o.id}
          className={`p-3 space-y-2 border ${isCart ? 'border-blue-200 bg-blue-50/60' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium">{o.id}</div>
            <Badge variant="outline" className={statusMeta.className}>{statusMeta.label}</Badge>
          </div>
          {isCart && (
            <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-100/70 px-2 py-1 text-xs text-blue-800">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>{o.status === STATUS.ACTIVE_CART ? 'Customer is still browsing this cart.' : 'Cart was abandoned; items remain for quick follow up.'}</span>
            </div>
          )}
          <div className="text-sm text-neutral-600">Customer: {o.customer_phone}</div>
          <div className="text-xs text-neutral-500">Created: {createdText} • {timelineText}</div>
          <div className="grid grid-cols-3 gap-2">
            {o.items.map(id=>{
              const p = map.get(id);
              if (!p){
                return (
                  <div key={id} className="h-24 w-full border border-dashed border-neutral-300 rounded-lg grid place-items-center text-[11px] text-neutral-500 bg-neutral-50">
                    Loading {id}…
                  </div>
                );
              }
              return (
                <div key={id} className="relative">
                  <img src={p.images?.[0]} alt={p.title} loading="lazy" decoding="async" className="h-24 w-full object-cover rounded-lg" onClick={()=>setPreview({ url:p.images?.[0], product:p, order:o })} />
                  <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7" onClick={()=>setPreview({ url:p.images?.[0], product:p, order:o })}><Eye className="h-4 w-4"/></Button>
                </div>
              );
            })}
          </div>
          {o.removed_items?.length>0 && (
            <div className="mt-2">
              <div className="text-xs text-neutral-500 mb-1">Removed</div>
              <div className="grid grid-cols-3 gap-2">
                {o.removed_items.map(id=>{
                  const p = map.get(id);
                  if (!p){
                    return (
                      <div key={id} className="h-16 w-full border border-dashed border-neutral-300 rounded grid place-items-center text-[10px] text-neutral-500 bg-neutral-50">
                        Loading {id}…
                      </div>
                    );
                  }
                  const key = `${o.id}|${id}`;
                  return (
                    <div key={id} className="relative">
                      <img src={p.images?.[0]} alt={p.title} loading="lazy" decoding="async" className="h-16 w-full object-cover rounded"/>
                      <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7" onClick={async()=>{
                        if (restoringKey) return;
                        setRestoringKey(key);
                        try{
                          const updated = await addItemToOrder(o.id, id);
                          setOrders(prev=> prev.map(x=> x.id===updated.id ? updated : x));
                          toast.success('Added back');
                        }catch(e){ console.error(e); toast.error('Failed to add back'); }
                        finally {
                          setRestoringKey(null);
                        }
                      }}>
                        {restoringKey===key ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <div className="text-neutral-500">Total</div>
            <div className="font-semibold">₹{o._total.toLocaleString('en-IN')}</div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 flex items-center justify-center gap-2" variant="outline" onClick={()=>{ window.open(waLink(o.customer_phone, 'Hi about shortlist ' + o.id), '_blank'); }}>
              <MessageCircle className="h-4 w-4"/>
              <span>Chat</span>
            </Button>
            {canCancel && (
              <Button className="flex-1 flex items-center justify-center gap-2" variant="destructive" disabled={cancelingId===o.id} onClick={()=> cancel(o)}>
                {cancelingId===o.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4"/>}
                <span>{cancelingId===o.id ? 'Cancelling...' : 'Cancel'}</span>
              </Button>
            )}
            {canConfirm && (
              <Button className="flex-1 flex items-center justify-center gap-2" variant="default" disabled={confirmingId===o.id} onClick={()=> confirm(o)}>
                {confirmingId===o.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}
                <span>{confirmingId===o.id ? 'Confirming...' : 'Confirm'}</span>
              </Button>
            )}
          </div>
        </Card>
        );
      })}

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
                    <Button variant="destructive" onClick={async()=>{
                      if (removingKey) return;
                      setRemovingKey(`${preview.order.id}|${p.id}`);
                      try{
                        const updated = await removeItemFromOrder(preview.order.id, p.id);
                        setOrders(prev=> prev.map(o=> o.id===updated.id ? updated : o));
                        toast.success('Removed from shortlist');
                      }catch(e){ console.error(e); toast.error('Failed to remove'); }
                      finally {
                        setRemovingKey(null);
                        setPreview(null);
                      }
                    }} className="flex items-center justify-center">
                      {removingKey===`${preview.order.id}|${p.id}` ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Remove from Shortlist'}
                    </Button>
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
