import React from "react";
import clsx from "clsx";

export function Button({ variant="default", size="md", className, asChild, children, ...props }){
  const C = asChild ? 'span' : 'button';
  const variants = {
    default: "bg-neutral-900 text-white hover:bg-neutral-800",
    secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
    outline: "border border-neutral-300 bg-white hover:bg-neutral-50",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    ghost: "hover:bg-neutral-100",
  };
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-12 px-5 text-base",
    icon: "h-10 w-10 p-0 inline-grid place-items-center",
  };
  return <C className={clsx(
    "rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none",
    variants[variant], sizes[size] || sizes.md, className)} {...props}>{children}</C>;
}
export default Button;
