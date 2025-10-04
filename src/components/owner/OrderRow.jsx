/*
  OrderRow renders a single pending shortlist card. It hydrates its own product cache so that
  remove/confirm actions always display thumbnails, even if the parent product list is stale.
*/
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { waLink, getOwnerProduct } from "../../shared";

// Each pending shortlist row hydrates its own product cache so actions (remove/confirm) always show
// accurate thumbnails even when the parent products array is stale.
export default function OrderRow({ order, products, ownerPhone, onRemove, onConfirm }){
  const [localProducts, setLocalProducts] = useState(()=> new Map(products.map(p=>[p.id,p])));
  const missingRef = useRef(new Set());
  const [removingId, setRemovingId] = useState(null);
  useEffect(()=>{ setLocalProducts(new Map(products.map(p=>[p.id,p]))); }, [products]);
  // Missing products are fetched on demand so we never render empty slots.
  useEffect(()=>{
    const map = localProducts;
    const toFetch = [];
    (order.items || []).forEach(id => {
      if (!id) return;
      if (map.has(id)) return;
      if (missingRef.current.has(id)) return;
      missingRef.current.add(id);
      toFetch.push(id);
    });
    if (!toFetch.length) return;
    let cancelled = false;
    (async ()=>{
      try{
        const results = await Promise.all(toFetch.map(id=> getOwnerProduct(id).catch(()=>null)));
        if (cancelled) return;
        const valid = results.filter(Boolean);
        if (valid.length){
          setLocalProducts(prev => {
            const next = new Map(prev);
            valid.forEach(prod => { if (prod?.id) next.set(prod.id, prod); });
            return next;
          });
        }
      }finally{
        toFetch.forEach(id=> missingRef.current.delete(id));
      }
    })();
    return ()=>{ cancelled = true; };
  }, [order.items, localProducts]);

  const items = order.items.map(id=> localProducts.get(id)).filter(Boolean);
  const message = `Hello, I am following up on shortlist ${order.id}. Could we confirm availability and pricing?`;
  const chatUrl = waLink(order.customer_phone, message);
  const [chatBusy, setChatBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const handleChat = () => {
    if (chatBusy) return;
    setChatBusy(true);
    try {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
      if (isMobile) {
        window.location.href = chatUrl;
      } else {
        const popup = window.open(chatUrl, '_blank');
        if (!popup) { window.location.href = chatUrl; }
      }
    } finally {
      setTimeout(() => setChatBusy(false), 1200);
    }
  };

  const handleConfirm = async () => {
    if (confirmBusy) return;
    setConfirmBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div className="border rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{order.id}</div>
        <Badge variant="outline">Pending</Badge>
      </div>
      <div className="text-sm text-neutral-500">Customer: {order.customer_phone}</div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {items.map(p => {
          if (!p) return null;
          const busy = removingId === p.id;
          return (
            <div key={p.id} className="relative">
              <img src={p.images?.[0]} alt={p.title} loading="lazy" className="h-20 w-full object-cover rounded-lg"/>
              <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7" disabled={busy} onClick={async()=>{
                if (busy) return;
                setRemovingId(p.id);
                try { await onRemove(p.id); }
                finally { setRemovingId(null); }
              }}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-3">
        <Button
          className="w-full sm:w-auto flex items-center justify-center gap-2"
          variant="outline"
          onClick={handleChat}
          disabled={chatBusy}
        >
          {chatBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : <MessageCircle className="h-4 w-4"/>}
          {chatBusy ? 'Opening...' : 'Chat on WhatsApp'}
        </Button>
        <Button
          className="w-full sm:w-auto flex items-center justify-center gap-2"
          onClick={handleConfirm}
          disabled={confirmBusy}
        >
          {confirmBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}
          {confirmBusy ? 'Confirming...' : 'Confirm Order'}
        </Button>
      </div>
    </div>
  );
}
