import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateProduct as apiUpdateProduct, deleteProduct as apiDeleteProduct, fmt } from "../../shared";
import UploadView from "./UploadView.jsx";

export default function InventoryView({ products, setProducts }){
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

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

  function openEdit(p){ setEditing(p); setEditOpen(true); }
  function saveEdit(updated){ setProducts(products.map(p=> p.id===updated.id ? updated : p)); setEditOpen(false); setEditing(null); }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Inventory</CardTitle>
        <CardDescription>Add/remove items and update stock. Editing opens the Upload form.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p=> (
            <div key={p.id} className="border rounded-xl overflow-hidden">
              <img src={p.images?.[0]} alt={p.title} className="h-32 w-full object-cover"/>
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
                    <Button size="icon" variant="ghost" onClick={()=>openEdit(p)} title="Edit"><Pencil className="h-4 w-4"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>removeProduct(p.id)} title="Delete"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          {editing && (
            <UploadView editing existing={editing} onSaveEdit={saveEdit} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
