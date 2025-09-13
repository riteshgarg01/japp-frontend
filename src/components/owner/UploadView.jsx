import { useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Image as ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { SHOPIFY_CATEGORIES, makeProductId, b64FromFile, fetchAIMetadata, createProduct as apiCreateProduct, updateProduct as apiUpdateProduct } from "../../shared";

export default function UploadView({ onAddProduct, editing, existing, onSaveEdit }){
  const [images, setImages] = useState(existing?.images || []);
  const [category, setCategory] = useState(existing?.category || SHOPIFY_CATEGORIES[0]);
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [price, setPrice] = useState(existing?.price || 0);
  const [qty, setQty] = useState(existing?.qty ?? 1);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  async function handleFiles(fs){
    const list = Array.from(fs);
    const b64s = await Promise.all(list.map((f)=>b64FromFile(f)));
    setImages(prev=>[...prev, ...b64s]);
    const meta = await fetchAIMetadata(b64s);
    setCategory(meta.category);
    setTitle(meta.title);
    setDescription(meta.description);
  }

  async function save(){
    if (!images.length) return toast.error("Please add at least one image.");
    if (!title.trim()) return toast.error("Please enter a title.");
    if (!description.trim()) return toast.error("Please enter a description.");
    if (!price || price <= 0) return toast.error("Please enter a valid price.");
    const base = {
      id: existing?.id || makeProductId(category),
      images,
      title: title.trim(),
      description: description.trim(),
      category,
      price: Math.round(Number(price)),
      qty: Math.max(0, Math.floor(Number(qty)||0)),
      available: (existing?.available ?? true) && (Math.max(0, Math.floor(Number(qty)||0))>0),
      createdAt: existing?.createdAt || Date.now(),
    };
    try{
      if (editing) {
        const updated = await apiUpdateProduct(base);
        onSaveEdit?.(updated);
        toast.success("Product updated");
      } else {
        const created = await apiCreateProduct(base);
        onAddProduct(created);
        toast.success("Product added to catalog");
      }
      if (!editing){ setImages([]); setTitle(""); setDescription(""); setPrice(0); setQty(1); }
    }catch(e){ console.error(e); toast.error("Save failed"); }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{editing?"Edit Product":"Upload Product"}</CardTitle>
        <CardDescription>AI metadata via backend (editable). Use camera or browse to upload images.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div>
          <Label className="mb-2 block">Images</Label>
          <div className="border border-dashed rounded-2xl p-6 bg-neutral-50 space-y-3">
            <div className="text-sm text-neutral-500">Use camera or browse from device.</div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=> e.target.files && handleFiles(e.target.files)} />
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e)=> e.target.files && handleFiles(e.target.files)} />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={()=>cameraInputRef.current?.click()}>Use Camera</Button>
              <Button variant="outline" onClick={()=>fileInputRef.current?.click()}>Browse Files</Button>
            </div>
            {images.length>0 && (
              <div className="grid grid-cols-3 gap-2 mt-1">
                {images.map((src, i)=> (
                  <img key={i} src={src} alt="preview" className="h-24 w-full object-cover rounded-xl"/>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Category (Shopify style)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
              <SelectContent>
                {SHOPIFY_CATEGORIES.map((c)=> <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title (10–12 words)</Label>
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Elegant kundan earrings for festive wear" />
          </div>
          <div>
            <Label>Description (≤300 chars)</Label>
            <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price</Label>
              <Input type="number" min={0} value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="e.g. 2499" />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min={0} value={qty} onChange={(e)=>setQty(e.target.value)} />
            </div>
          </div>
          <div className="text-xs text-neutral-500">Product ID pattern: <code>{category || 'Category'}-123456</code> (auto on save).</div>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        {!editing && <Button variant="outline" onClick={()=>{ setImages([]); setTitle(""); setDescription(""); setPrice(0); setQty(1); }}>Reset</Button>}
        <Button onClick={save}><Plus className="mr-2 h-4 w-4"/>{editing?"Save Changes":"Save to Catalog"}</Button>
      </CardFooter>
    </Card>
  );
}
