import React from "react";

export function Slider({ value=[0,100], onValueChange, min=0, max=100, step=1 }){
  const [v1, v2] = value;
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const change1 = (e) => {
    const nv = clamp(parseInt(e.target.value,10));
    onValueChange?.([Math.min(nv, v2), v2]);
  };
  const change2 = (e) => {
    const nv = clamp(parseInt(e.target.value,10));
    onValueChange?.([v1, Math.max(nv, v1)]);
  };
  return (
    <div className="relative h-6">
      <input type="range" min={min} max={max} step={step} value={v1} onChange={change1} className="absolute inset-0 w-full pointer-events-auto opacity-70"/>
      <input type="range" min={min} max={max} step={step} value={v2} onChange={change2} className="absolute inset-0 w-full pointer-events-auto"/>
    </div>
  );
}
export default Slider;
