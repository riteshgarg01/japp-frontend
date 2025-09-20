import React, { useEffect, useState } from "react";
import { getConfig } from "@/shared";

export default function Header(){
  const [brand, setBrand] = useState("Arohi's Collection");
  const [logo, setLogo] = useState("/logo.svg");
  useEffect(()=>{
    getConfig().then(c=>{ if(c.brand_name) setBrand(c.brand_name); if(c.logo_url) setLogo(c.logo_url); }).catch(()=>{});
  }, []);
  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-6xl p-3 flex items-center justify-center select-none">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Brand logo" className="h-9 w-9 object-contain" />
          <div className="font-semibold tracking-tight text-lg">{brand}</div>
        </div>
      </div>
    </div>
  );
}
