import { API_BASE } from "./config.js";

const NGROK_HEADERS = API_BASE.includes("ngrok-free.app") ? { "ngrok-skip-browser-warning": "true" } : {};

export async function fetchAIMetadata(imageUrls = []){
  try{
    const res = await fetch(`${API_BASE}/ai/describe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...NGROK_HEADERS },
      body: JSON.stringify({ image_urls: imageUrls }),
    });
    if (res.ok) return await res.json();
  }catch{}
  return fallbackSuggestMeta(imageUrls);
}

export function fallbackSuggestMeta(fileNames = []){
  const text = fileNames.join(" ").toLowerCase();
  let category = "Pendants";
  if (/ear|jhumka/.test(text)) category = "Earrings";
  else if (/neck|set/.test(text)) category = "Necklace Sets";
  else if (/ring/.test(text)) category = "Rings";
  else if (/bangle/.test(text)) category = "Bangles";
  else if (/bracelet/.test(text)) category = "Bracelets";
  else if (/nose/.test(text)) category = "Nose Pins";
  else if (/anklet|payal/.test(text)) category = "Anklets";
  const adjectives = ["Handcrafted","Minimalist","Elegant","Festive","Everyday","Heritage","Modern","Classic"];
  const materials  = ["gold-tone","silver-tone","oxidized","kundan","pearl","polki","american diamond","meenakari"];
  const adj = adjectives[Math.floor(Math.random()*adjectives.length)];
  const mat = materials[Math.floor(Math.random()*materials.length)];
  const title = `${adj} ${mat} ${category.toLowerCase()}`.slice(0,80);
  const description = `A ${adj.toLowerCase()} ${category.toLowerCase()} crafted with ${mat} detailing. Perfect for weddings, festive wear, and everyday styling. Lightweight finish.`.slice(0,300);
  return { category, title, description };
}
