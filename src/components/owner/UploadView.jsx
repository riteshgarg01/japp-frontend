import { useRef, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Image as ImageIcon, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SHOPIFY_CATEGORIES, makeProductId, b64FromFile, fetchAIMetadata, createProduct as apiCreateProduct, updateProduct as apiUpdateProduct } from "../../shared";

export default function UploadView({ onAddProduct, editing, existing, onSaveEdit }){
  const [images, setImages] = useState(existing?.images || []);
  const [category, setCategory] = useState(existing?.category || SHOPIFY_CATEGORIES[0]);
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [price, setPrice] = useState(existing?.price || 0);
  const [qty, setQty] = useState(existing?.qty ?? 1);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const errors = useMemo(()=>{
    const errs = {};
    if (!images.length) errs.images = "Please add at least one image.";
    if (!category) errs.category = "Please select a category.";
    if (!title.trim()) errs.title = "Title is required.";
    if (!description.trim()) errs.description = "Description is required.";
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) errs.price = "Enter a valid price (> 0).";
    return errs;
  }, [images, category, title, description, price]);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  async function handleFiles(fs){
    const list = Array.from(fs);
    const b64s = await Promise.all(list.map((f)=>b64FromFile(f)));
    setImages(prev=>[...prev, ...b64s]);
    try{
      setAiLoading(true);
      const meta = await fetchAIMetadata(b64s);
      setCategory(meta.category);
      setTitle(meta.title);
      setDescription(meta.description);
    } finally { setAiLoading(false); }
  }

  async function save(){
    setSubmitted(true);
    if (Object.keys(errors).length > 0){
      return toast.error("Please fix the highlighted fields.");
    }
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
      if (!editing){ setImages([]); setTitle(""); setDescription(""); setPrice(0); setQty(1); setCategory(""); setSubmitted(false); }
    }catch(e){ console.error(e); toast.error(e?.message || "Save failed"); }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {editing?"Edit Product":"Upload Product"}
          {aiLoading && (
            <span className="inline-flex items-center text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
              <Sparkles className="h-3 w-3 mr-1"/> AI filling…
            </span>
          )}
        </CardTitle>
        <CardDescription>Use camera or browse images. Details auto-fill via AI and are fully editable.</CardDescription>
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
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1">
                {images.map((src, i)=> (
                  <img key={i} src={src} alt="preview" loading="lazy" className="h-24 w-full object-cover rounded-xl"/>
                ))}
              </div>
            )}
            {submitted && errors.images && (
              <div className="text-xs text-red-600 mt-1">{errors.images}</div>
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
            {submitted && errors.category && (
              <div className="text-xs text-red-600 mt-1">{errors.category}</div>
            )}
          </div>
          <div>
            <Label>Title (10–12 words)</Label>
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Elegant kundan earrings for festive wear" disabled={aiLoading} className={submitted && errors.title ? "border-red-300" : ""} />
            {submitted && errors.title && (
              <div className="text-xs text-red-600 mt-1">{errors.title}</div>
            )}
          </div>
          <div>
            <Label>Description (≤300 chars)</Label>
            <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={4} disabled={aiLoading} className={submitted && errors.description ? "border-red-300" : ""} />
            {submitted && errors.description && (
              <div className="text-xs text-red-600 mt-1">{errors.description}</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price</Label>
              <Input type="number" min={1} value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="e.g. 2499" className={submitted && errors.price ? "border-red-300" : ""} />
              {submitted && errors.price && (
                <div className="text-xs text-red-600 mt-1">{errors.price}</div>
              )}
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
        {!editing && <Button variant="outline" onClick={()=>{ setImages([]); setTitle(""); setDescription(""); setPrice(0); setQty(1); setCategory(""); setSubmitted(false); }} disabled={aiLoading}>Reset</Button>}
        <Button onClick={save} disabled={aiLoading}>
          <Plus className="mr-2 h-4 w-4"/>{editing?"Save Changes":"Save to Catalog"}
        </Button>
      </CardFooter>
    </Card>
  );
}
