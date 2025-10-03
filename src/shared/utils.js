export const fmt = (n) => `${"₹"}${Number(n || 0).toLocaleString("en-IN",{maximumFractionDigits:0})}`;

export const makeProductId = (category) => {
  const prefix = (category || "GEN").replace(/\s+/g, "-");
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${num}`;
};

export const oid = () =>
  `ORD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const b64FromFile = (file, opts = {}) =>
  new Promise((resolve, reject) => {
    try {
      const {
        maxDimension = 1600,
        quality = 0.82,
      } = opts || {};

      const readAsDataURL = (blobOrFile) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blobOrFile);
      };

      if (typeof window === 'undefined' || !('URL' in window) || !maxDimension) {
        readAsDataURL(file);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const width = img.width;
          const height = img.height;
          const maxSide = Math.max(width, height);
          const shouldResize = maxDimension && maxSide > maxDimension;

          if (!shouldResize) {
            URL.revokeObjectURL(objectUrl);
            readAsDataURL(file);
            return;
          }

          const scale = maxDimension / maxSide;
          const targetWidth = Math.round(width * scale);
          const targetHeight = Math.round(height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            readAsDataURL(file);
            return;
          }
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              readAsDataURL(file);
              return;
            }
            readAsDataURL(blob);
          }, 'image/jpeg', quality);
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      };
      img.src = objectUrl;
    } catch (err) {
      reject(err);
    }
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
const IST_FORMAT_OPTIONS = Object.freeze({
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function formatDateTime(s){
  if (!s) return '';
  try{
    const raw = String(s).trim();
    if (!raw) return '';
    let normalized = raw;
    if (!normalized.includes('T')){
      normalized = normalized.replace(' ', 'T');
    }
    const hasTimezone = /[zZ]$/i.test(normalized) || /[+-]\d{2}:?\d{2}$/.test(normalized);
    if (!hasTimezone){
      normalized = `${normalized}Z`;
    }
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('en-IN', IST_FORMAT_OPTIONS).format(date);
  }catch{
    return String(s);
  }
}
