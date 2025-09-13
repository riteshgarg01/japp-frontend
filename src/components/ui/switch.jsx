export function Switch({ checked=false, onCheckedChange }){
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only" checked={checked} onChange={()=>onCheckedChange?.(!checked)} />
      <span className={`h-6 w-11 rounded-full p-1 transition ${checked?"bg-neutral-900":"bg-neutral-300"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${checked?"translate-x-5":"translate-x-0"}`}></span>
      </span>
    </label>
  );
}
export default Switch;
