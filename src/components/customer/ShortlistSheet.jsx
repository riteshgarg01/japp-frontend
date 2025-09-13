import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { fmt } from "../../shared";

export default function ShortlistSheet({ shortlist, products, onRemove }){
  const items = shortlist.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  return (
    <ScrollArea className="h-40 w-full rounded-xl border bg-white">
      <div className="p-2 space-y-2">
        {items.length===0 && <div className="text-sm text-neutral-500 p-2">Your shortlist is empty.</div>}
        {items.map((p)=> (
          <div key={p.id} className="flex items-center gap-2">
            <img src={p.images?.[0]} alt={p.title} className="h-10 w-10 rounded-md object-cover"/>
            <div className="flex-1">
              <div className="text-sm font-medium line-clamp-1">{p.title}</div>
              <div className="text-xs text-neutral-500">{fmt(p.price)}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={()=>onRemove(p.id)}><Trash2 className="h-4 w-4"/></Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
