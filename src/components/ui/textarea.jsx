export function Textarea({ className="", ...props }){
  return <textarea className={`w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300 ${className}`} {...props} />;
}
export default Textarea;
