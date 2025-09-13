import React from "react";
import { Input } from "@/components/ui/input";

export default function Header(){
  const [ownerPhone, setOwnerPhone] = React.useState(localStorage.getItem("ac_owner_phone") || "+919999999999");
  React.useEffect(()=>localStorage.setItem("ac_owner_phone", ownerPhone), [ownerPhone]);
  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-6xl p-4 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Logo" className="h-8 w-8 rounded-full object-cover" />
          <div>
            <div className="font-semibold tracking-tight">Arohi's collection</div>
            <div className="text-sm text-neutral-500">Customer & Owner apps</div>
          </div>
        </div>
        <Input className="w-48" value={ownerPhone} onChange={(e)=>setOwnerPhone(e.target.value)} placeholder="Owner WhatsApp (+91...)" />
      </div>
    </div>
  );
}
