export const BRAND_NAME = "Arohi's collection";
export const CURRENCY = "₹";
// Categories align exactly with the AI prompt list
export const SHOPIFY_CATEGORIES = [
  "Anklets",
  "Bracelets",
  "Brooches & Lapel Pins",
  "Charms & Pendants",
  "Earrings",
  "Jewelry Sets",
  "Necklaces",
  "Rings",
];
const USE_PROXY = String(import.meta.env.VITE_USE_PROXY || "0") === "1";
export const API_BASE = USE_PROXY ? "" : (import.meta.env.VITE_API_URL || "http://localhost:8000");
