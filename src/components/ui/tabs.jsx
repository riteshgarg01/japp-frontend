import React from "react";

const Ctx = React.createContext(null);

export function Tabs({ defaultValue, value:ctrl, onValueChange, className="", children }){
  const [val, setVal] = React.useState(defaultValue);
  const value = ctrl !== undefined ? ctrl : val;
  const setValue = onValueChange || setVal;
  return <Ctx.Provider value={{ value, setValue }}><div className={className}>{children}</div></Ctx.Provider>;
}

export function TabsList({ className="", ...props }){
  return <div className={`inline-flex rounded-xl border bg-neutral-50 p-1 ${className}`} {...props} />;
}

export function TabsTrigger({ value, className="", children, ...props }){
  const ctx = React.useContext(Ctx);
  const active = ctx.value === value;
  return (
    <button
      onClick={()=>ctx.setValue(value)}
      className={`px-3 py-2 rounded-lg text-sm ${active ? "bg-white shadow-sm" : "text-neutral-600 hover:bg-white/60"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className="", children, ...props }){
  const ctx = React.useContext(Ctx);
  if (ctx.value !== value) return null;
  return <div className={className} {...props}>{children}</div>;
}
