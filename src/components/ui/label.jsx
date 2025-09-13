export function Label({ className="", ...props }){
  return <label className={`block text-sm font-medium text-neutral-700 mb-1 ${className}`} {...props} />;
}
export default Label;
