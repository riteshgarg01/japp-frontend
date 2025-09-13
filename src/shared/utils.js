export const fmt = (n) => `${"₹"}${Number(n || 0).toLocaleString("en-IN",{maximumFractionDigits:0})}`;

export const makeProductId = (category) => {
  const prefix = (category || "GEN").replace(/\s+/g, "-");
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${num}`;
};

export const oid = () =>
  `ORD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const b64FromFile = (f) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

export function waLink(phone, text){
  const p = encodeURIComponent((phone||"").replace(/[^+\d]/g,""));
  const t = encodeURIComponent(text || "");
  return `https://wa.me/${p}?text=${t}`;
}
