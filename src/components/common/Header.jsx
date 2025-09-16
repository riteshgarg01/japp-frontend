import React from "react";

export default function Header(){
  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-6xl p-3 flex items-center justify-center select-none">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Arohi Collection logo" className="h-9 w-9 object-contain" />
          <div className="font-semibold tracking-tight text-lg">Arohi's Collection</div>
        </div>
      </div>
    </div>
  );
}
