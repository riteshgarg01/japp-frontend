import React from "react";

const Ctx = React.createContext(null);

export function Select({ value, onValueChange, children }){
  const [open, setOpen] = React.useState(false);
  const ctx = { value, onValueChange, open, setOpen };
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function SelectTrigger({ className="", children }){
  const { setOpen } = React.useContext(Ctx);
  return <button onClick={()=>setOpen(o=>!o)} className={`h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-left text-sm ${className}`}>{children}</button>;
}

export function SelectValue({ placeholder }){
  const { value } = React.useContext(Ctx);
  return <span className="text-sm text-neutral-800">{value || placeholder || "Select..."}</span>;
}

export function SelectContent({ className="", children }){
  const { open } = React.useContext(Ctx);
  if (!open) return null;
  return <div className={`mt-1 w-full rounded-xl border bg-white p-1 shadow ${className}`}>{children}</div>;
}

export function SelectItem({ value, children }){
  const { onValueChange, setOpen } = React.useContext(Ctx);
  return <div className="px-3 py-2 rounded-lg hover:bg-neutral-100 cursor-pointer" onClick={()=>{ onValueChange?.(value); setOpen(false); }}>{children}</div>;
}
