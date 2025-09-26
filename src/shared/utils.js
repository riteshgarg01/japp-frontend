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
  const raw = String(phone || "").trim();
  let digits = raw.replace(/\D/g, "");
  if (!raw.startsWith("+")){
    digits = digits.replace(/^0+/, "");
    if (digits.length === 10){
      digits = `91${digits}`;
    }
  }
  if (!digits){
    const t = encodeURIComponent(text || "");
    return `https://wa.me/?text=${t}`;
  }
  const t = encodeURIComponent(text || "");
  return `https://wa.me/${digits}?text=${t}`;
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

// Format like: "1 Jan, 2025 5:30 pm"
export function formatDateTime(s){
  if (!s) return '';
  try{
    const d = new Date(s);
    if (isNaN(d.getTime())) return String(s);
    const day = d.getDate();
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2,'0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12; if (hours === 0) hours = 12;
    return `${day} ${month}, ${year} ${hours}:${minutes} ${ampm}`;
  }catch{
    return String(s);
  }
}
