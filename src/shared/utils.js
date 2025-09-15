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

// Category helpers: convert backend taxonomy to concise UI label
const CAT_MAP = new Map([
  ["Apparel & Accessories > Jewelry > Earrings", "Earrings"],
  ["Apparel & Accessories > Jewelry > Necklaces", "Necklace Sets"], // UI prefers "Necklace Sets"
  ["Apparel & Accessories > Jewelry > Jewelry Sets", "Necklace Sets"],
  ["Apparel & Accessories > Jewelry > Charms & Pendants", "Pendants"],
  ["Apparel & Accessories > Jewelry > Rings", "Rings"],
  ["Apparel & Accessories > Jewelry > Bangles", "Bangles"],
  ["Apparel & Accessories > Jewelry > Bracelets", "Bracelets"],
  ["Apparel & Accessories > Jewelry > Nose Pins", "Nose Pins"],
  ["Apparel & Accessories > Jewelry > Anklets", "Anklets"],
]);

export function shortCategory(cat){
  if (!cat) return "";
  if (CAT_MAP.has(cat)) return CAT_MAP.get(cat);
  const last = String(cat).split(">").pop()?.trim();
  // Normalize some common variants
  const norm = {
    "Jewelry Sets":"Necklace Sets",
    "Necklaces":"Necklace Sets",
    "Charms & Pendants":"Pendants",
  }[last] || last;
  return norm;
}

export function mapToShopCategory(cat){
  // Ensure category always maps to one used in SHOPIFY_CATEGORIES
  return shortCategory(cat);
}
