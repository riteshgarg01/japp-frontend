import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateProduct as apiUpdateProduct, deleteProduct as apiDeleteProduct, fmt, listOwnerProductsPaged, getProductImages } from "../../shared";
import UploadView from "./UploadView.jsx";

export default function InventoryView({ products, setProducts }){
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [displayCount, setDisplayCount] = useState(12);
  const loadStep = 24;
  const [sentinel, setSentinel] = useState(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchedOffsets = useState(new Set())[0];
  const [editLoadingId, setEditLoadingId] = useState(null);

  async function toggleAvailability(id){
    let target = products.find(p=>p.id===id);
    if (!target) return;
    const next = { ...target, available: !target.available };
    setProducts(products.map(p=> p.id===id ? next : p));
    try{ await apiUpdateProduct(next); }catch(e){ console.error(e); toast.error("Failed to update availability"); }
  }

  function updateField(id, field, value){
    let nextObj = null;
    setProducts(products.map(p=> {
      if (p.id!==id) return p;
      const next = { ...p, [field]: value };
      if (field==='qty') { next.qty = Math.max(0, Math.floor(Number(value)||0)); if (next.qty===0) next.available = false; }
      nextObj = next;
      return next;
    }));
    if (nextObj){ apiUpdateProduct(nextObj).catch((e)=>{ console.error(e); toast.error("Failed to update product"); }); }
  }

  async function removeProduct(id){
    const prev = products;
    setProducts(products.filter(p=>p.id!==id));
    try{ await apiDeleteProduct(id); toast.success("Deleted"); }
    catch(e){ console.error(e); toast.error("Delete failed"); setProducts(prev); }
  }

  async function openEdit(p){
    if (editLoadingId) return;
    setEditLoadingId(p.id);
    let nextEditing = { ...p };
    try {
      const full = await getProductImages(p.id);
      const imgs = Array.isArray(full?.images) && full.images.length ? full.images : (p.images || []);
      nextEditing = { ...p, images: imgs };
    } catch (e) {
      console.error(e);
      toast.error("Couldn't fetch full images; using cached preview.");
    } finally {
      setEditing(nextEditing);
      setEditOpen(true);
      setEditLoadingId(null);
    }
  }
  function saveEdit(updated){ setProducts(products.map(p=> p.id===updated.id ? updated : p)); setEditOpen(false); setEditing(null); }

  async function fetchPage(limit, offset){
    if (loadingMore || fetchedOffsets.has(offset)) return;
    if (offset===0) setLoading(true); else setLoadingMore(true);
    fetchedOffsets.add(offset);
    try{
      const data = await listOwnerProductsPaged({ limit, offset });
      setProducts(prev=>{
        const map = new Map(prev.map(p=>[p.id,p]));
        for (const it of (data.items||[])) map.set(it.id, it);
        return Array.from(map.values());
      });
      setNextOffset(data.next_offset ?? null);
    } catch (e) {
      fetchedOffsets.delete(offset);
      if (offset === 0) {
        toast.error("Failed to load inventory");
      }
      console.error(e);
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }

  useEffect(()=>{
    if (!sentinel) return;
    const io = new IntersectionObserver((entries)=>{
      const [entry] = entries;
      if (entry.isIntersecting){
        if (nextOffset != null) fetchPage(loadStep, nextOffset);
        else setDisplayCount((n)=> Math.min(products.length, n + loadStep));
      }
    }, { rootMargin: '800px' });
    io.observe(sentinel);
    return ()=> io.disconnect();
  }, [sentinel, products.length, nextOffset]);

  useEffect(()=>{ fetchPage(12, 0); }, []);

  return (
    <Card className="shadow-sm">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search by title, description, or ID" className="flex-1 text-base" />
        </div>
      </div>
      <CardContent>
        {/* Shimmer while first page loading */}
        {(loading || (products.length===0 && loadingMore)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length:9}).map((_,i)=>(
              <div key={i} className="border rounded-xl overflow-hidden animate-pulse">
                <div className="h-48 bg-neutral-100"/>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-neutral-100 rounded w-3/4"/>
                  <div className="h-3 bg-neutral-100 rounded w-full"/>
                  <div className="h-3 bg-neutral-100 rounded w-2/3"/>
                  <div className="h-8 bg-neutral-100 rounded w-full mt-2"/>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.filter(p=>{
            const text = `${p.id} ${p.title} ${p.description}`.toLowerCase();
            return text.includes(q.toLowerCase());
          }).slice(0, displayCount).map(p=> (
            <div key={p.id} className="border rounded-xl overflow-hidden">
              <img src={p.images?.[0]} alt={p.title} loading="lazy" decoding="async" sizes="(max-width: 1024px) 50vw, 33vw" className="h-48 w-full object-cover"/>
              <div className="p-3 space-y-2">
                <div className="text-sm font-medium line-clamp-1">{p.title}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{p.category}</Badge>
                  <div className="text-sm ml-auto">{fmt(p.price)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={0} value={p.qty} onChange={(e)=>updateField(p.id, 'qty', e.target.value)} />
                  </div>
                  <div className="flex items-end justify-between">
                    <Label className="text-xs">Available</Label>
                    <Switch checked={p.available} onCheckedChange={()=>toggleAvailability(p.id)} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-neutral-500">ID: {p.id}</div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={()=>openEdit(p)} title="Edit" disabled={editLoadingId === p.id}>
                      {editLoadingId === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Pencil className="h-4 w-4"/>}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={()=>removeProduct(p.id)} title="Delete"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div ref={setSentinel} className="h-10" />
        {loadingMore && <div className="text-center text-xs text-neutral-500 py-2">Loading more…</div>}
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="p-0 max-w-none w-[100vw] h-dvh overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit Product — ${editing.id}` : 'Edit Product'}</DialogTitle></DialogHeader>
          {editing && (
            <UploadView editing existing={editing} onSaveEdit={saveEdit} onCancel={()=>setEditOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
