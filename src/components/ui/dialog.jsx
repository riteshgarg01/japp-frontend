import React from "react";

export function Dialog({ open, onOpenChange, children }){
  return <>{open ? children : null}</>;
}

export function DialogContent({ className="", children }){
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="fixed inset-0 bg-black/30" />
      <div className={`relative z-10 w-11/12 max-w-lg rounded-2xl border bg-white p-4 shadow-xl ${className}`}>{children}</div>
    </div>
  );
}

export function DialogHeader({ className="", ...props }){
  return <div className={`mb-2 ${className}`} {...props} />;
}

export function DialogTitle({ className="", ...props }){
  return <div className={`text-lg font-semibold ${className}`} {...props} />;
}
