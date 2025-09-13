import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Trash2, CheckCircle2 } from "lucide-react";
import { waLink } from "../../shared";

export default function OrderRow({ order, products, ownerPhone, onRemove, onConfirm }){
  const items = order.items.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  const message = `Hello, I am following up on shortlist ${order.id}. Could we confirm availability and pricing?`;
  const chatUrl = waLink(order.customerPhone, message);

  return (
    <div className="border rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{order.id}</div>
        <Badge variant="outline">Pending</Badge>
      </div>
      <div className="text-sm text-neutral-500">Customer: {order.customerPhone}</div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {items.map(p => (
          <div key={p.id} className="relative">
            <img src={p.images?.[0]} alt={p.title} className="h-20 w-full object-cover rounded-lg"/>
            <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7" onClick={()=>onRemove(p.id)}>
              <Trash2 className="h-4 w-4"/>
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 mt-3">
        <Button variant="outline" asChild>
          <a href={chatUrl} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4"/>Chat on WhatsApp</a>
        </Button>
        <Button onClick={onConfirm}><CheckCircle2 className="mr-2 h-4 w-4"/>Confirm Order</Button>
      </div>
    </div>
  );
}
