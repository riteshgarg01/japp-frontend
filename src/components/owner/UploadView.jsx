import { useRef, useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Image as ImageIcon, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SHOPIFY_CATEGORIES, makeProductId, b64FromFile, fetchAIMetadata, createProduct as apiCreateProduct, updateProduct as apiUpdateProduct } from "../../shared";

export default function UploadView({ onAddProduct, editing, existing, onSaveEdit, onCancel }){
  const [images, setImages] = useState(existing?.images || []);
  const [category, setCategory] = useState(existing?.category || SHOPIFY_CATEGORIES[0]);
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [price, setPrice] = useState(existing?.price || 0);
  const [cost, setCost] = useState(existing?.cost || 0);
  const [qty, setQty] = useState(existing?.qty ?? 1);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showDesc, setShowDesc] = useState(editing ? false : true);
  const [shouldAutoMeta, setShouldAutoMeta] = useState(!editing);
  // Persist draft for non-editing flow so progress survives reloads
  const DRAFT_KEY = 'upload_draft_v1';
  // Load draft once for new upload
  useEffect(()=>{
    if (editing) return;
    try{
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d){
        setImages(d.images||[]);
        setCategory(d.category||SHOPIFY_CATEGORIES[0]);
        setTitle(d.title||'');
        setDescription(d.description||'');
        setPrice(d.price||0);
        setCost(d.cost||0);
        setQty(d.qty??1);
      }
    }catch{}
  }, []);
  // Save draft on change (throttled by React batching)
  useEffect(()=>{
    if (editing) return;
    try{
      const d = { images, category, title, description, price, cost, qty };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    }catch{}
  }, [editing, images, category, title, description, price, cost, qty]);
  function clearDraft(){ try{ localStorage.removeItem(DRAFT_KEY); }catch{} }
  const errors = useMemo(()=>{
    const errs = {};
    if (!images.length) errs.images = "Please add at least one image.";
    if (!category) errs.category = "Please select a category.";
    if (!title.trim()) errs.title = "Title is required.";
    if (!description.trim()) errs.description = "Description is required.";
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) errs.price = "Enter a valid price (> 0).";
    const c = Number(cost);
    if (!Number.isFinite(c) || c < 0) errs.cost = "Enter a valid cost (≥ 0).";
    return errs;
  }, [images, category, title, description, price, cost]);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  async function runAIMetadata(primary){
    if (!primary) return;
    try{
      setAiLoading(true);
      const meta = await fetchAIMetadata([primary]);
      setCategory(meta.category);
      setTitle(meta.title);
      setDescription(meta.description);
    } finally {
      setAiLoading(false);
      setShouldAutoMeta(false);
    }
  }

  async function handleFiles(fs){
    const files = Array.from(fs || []);
    if (!files.length) return;
    try{
      const resized = [];
      for (const file of files){
        const dataUrl = await b64FromFile(file, { maxDimension: 1600, quality: 0.82 });
        resized.push(dataUrl);
      }
      const nextImages = [...images, ...resized];
      setImages(nextImages);

      const shouldRun = (!editing) || shouldAutoMeta;
      if (shouldRun && nextImages.length){
        let aiPreview = resized[0] || nextImages[0];
        if (files[0]){
          try {
            aiPreview = await b64FromFile(files[0], { maxDimension: 640, quality: 0.75 });
          } catch (err) {
            console.warn('AI preview resize failed, falling back to primary image', err);
          }
        }
        await runAIMetadata(aiPreview);
      }
    }catch(err){
      console.error(err);
      toast.error('Failed to process image');
    }
  }

  async function handleRemoveImage(index){
    const next = images.filter((_,idx)=>idx!==index);
    setImages(next);
    if (!editing){
      if (next.length === 0){
        setShouldAutoMeta(true);
      }
      return;
    }
    if (index === 0){
      if (next.length){
        try {
          await runAIMetadata(next[0]);
        } catch (err) {
          console.error(err);
        }
      } else {
        setShouldAutoMeta(true);
      }
    }
  }

  async function save(){
    if (saving) return; // prevent double submits
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
      cost: Math.max(0, Math.floor(Number(cost)||0)),
      qty: Math.max(0, Math.floor(Number(qty)||0)),
      available: (existing?.available ?? true) && (Math.max(0, Math.floor(Number(qty)||0))>0),
      createdAt: existing?.createdAt || Date.now(),
    };
    try{
      setSaving(true);
      if (editing) {
        const updated = await apiUpdateProduct(base);
        onSaveEdit?.(updated);
        toast.success("Product updated");
      } else {
        const created = await apiCreateProduct(base);
        onAddProduct(created);
        toast.success("Product added to catalog");
      }
      if (!editing){
        setImages([]);
        setTitle("");
        setDescription("");
        setPrice(0);
        setCost(0);
        setQty(1);
        setCategory("");
        setSubmitted(false);
        setShouldAutoMeta(true);
        clearDraft();
      }
  }catch(e){ console.error(e); toast.error(e?.message || "Save failed"); }
  finally { setSaving(false); }
  }

  return (
    <Card className="shadow-sm">
      {!editing && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Upload Product
            {aiLoading && (
              <span className="inline-flex items-center text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                <Sparkles className="h-3 w-3 mr-1"/> AI filling…
              </span>
            )}
          </CardTitle>
          <CardDescription>Use camera or browse. AI will prefill details (editable).</CardDescription>
        </CardHeader>
      )}
      <CardContent className="grid md:grid-cols-2 gap-4">
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
                  <div key={i} className="relative">
                    <img src={src} alt="preview" loading="lazy" className="h-24 w-full object-cover rounded-xl"/>
                    <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7" onClick={()=>handleRemoveImage(i)}>×</Button>
                  </div>
                ))}
              </div>
            )}
            {submitted && errors.images && (
              <div className="text-xs text-red-600 mt-1">{errors.images}</div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {/* draft indicator removed per feedback */}
          {aiLoading && (
            <div className="flex items-center gap-2 text-purple-700 bg-purple-50 border border-purple-200 px-3 py-2 rounded">
              <Loader2 className="h-4 w-4 animate-spin"/>
              <div className="text-sm">AI is filling details…</div>
            </div>
          )}
          {/* Category & Qty right below camera box */}
          <div className={aiLoading ? 'opacity-60 pointer-events-none' : ''}>
            <Label>Category & Qty</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={category} onValueChange={setCategory} disabled={aiLoading}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>{SHOPIFY_CATEGORIES.map((c)=> <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" min={0} value={qty} onChange={(e)=>setQty(e.target.value)} placeholder="Qty" />
            </div>
            {submitted && errors.category && (<div className="text-xs text-red-600 mt-1">{errors.category}</div>)}
          </div>

          {/* Title */}
          <div className={aiLoading ? 'opacity-60 pointer-events-none' : ''}>
            <Label>Title (10–12 words)</Label>
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Elegant kundan earrings for festive wear" disabled={aiLoading} className={submitted && errors.title ? "border-red-300" : ""} />
            {submitted && errors.title && (
              <div className="text-xs text-red-600 mt-1">{errors.title}</div>
            )}
          </div>

          {/* Description: hidden when editing unless expanded */}
          <div className={aiLoading ? 'opacity-60 pointer-events-none' : ''}>
            <div className="flex items-center justify-between">
              <Label>Description (≤300 chars)</Label>
              {editing && (
                <button type="button" className="text-xs text-blue-600" onClick={()=>setShowDesc(v=>!v)}>
                  {showDesc ? 'Hide' : 'Edit description'}
                </button>
              )}
            </div>
            {(!editing || showDesc) && (
              <>
                <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={3} disabled={aiLoading} className={submitted && errors.description ? "border-red-300" : ""} />
                {submitted && errors.description && (
                  <div className="text-xs text-red-600 mt-1">{errors.description}</div>
                )}
              </>
            )}
          </div>

          {/* Price & Cost side-by-side with separate labels */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Price</Label>
              <Input type="number" min={1} value={price} onChange={(e)=>setPrice(e.target.value)} onFocus={()=>{ if(Number(price)===0) setPrice(""); }} placeholder="Price" className={submitted && errors.price ? "border-red-300" : ""} />
              {submitted && errors.price && (<div className="text-xs text-red-600 mt-1">{errors.price}</div>)}
            </div>
            <div>
              <Label>Cost <span className="text-neutral-400">(optional)</span></Label>
              <Input type="number" min={0} value={cost} onChange={(e)=>setCost(e.target.value)} onFocus={()=>{ if(Number(cost)===0) setCost(""); }} placeholder="Cost" className={submitted && errors.cost ? "border-red-300" : ""} />
              {submitted && errors.cost && (<div className="text-xs text-red-600 mt-1">{errors.cost}</div>)}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        {!editing && (
          <div className="w-full flex gap-2">
            <Button variant="outline" className="w-1/4" onClick={()=>{ setImages([]); setTitle(""); setDescription(""); setPrice(0); setCost(0); setQty(1); setCategory(""); setSubmitted(false); clearDraft(); }} disabled={aiLoading}>Cancel</Button>
            <Button className="w-3/4 flex items-center justify-center gap-2" onClick={save} disabled={aiLoading || saving}>
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin"/>Saving…</>) : (<><Plus className="h-4 w-4"/>{editing?"Save Changes":"Save to Catalog"}</>)}
            </Button>
          </div>
        )}
        {editing && (
          <div className="w-full flex gap-2">
            <Button variant="outline" className="w-1/4" onClick={()=> onCancel?.()} disabled={aiLoading || saving}>Cancel</Button>
            <Button className="w-3/4 flex items-center justify-center gap-2" onClick={save} disabled={aiLoading || saving}>
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin"/>Saving…</>) : (<><Plus className="h-4 w-4"/>Save Changes</>)}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
