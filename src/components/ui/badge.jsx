export function Badge({ className="", variant="default", ...props }){
  const styles = variant==="outline"
    ? "border border-neutral-300 text-neutral-700 bg-white"
    : "bg-neutral-900 text-white";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs ${styles} ${className}`} {...props} />;
}
export default Badge;
