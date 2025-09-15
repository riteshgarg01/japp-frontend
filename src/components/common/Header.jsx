import React from "react";

export default function Header(){
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
        <div className="hidden sm:block text-xs text-neutral-500">WhatsApp ordering enabled</div>
      </div>
    </div>
  );
}
