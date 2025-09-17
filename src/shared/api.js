import { API_BASE } from "./config.js";

// Bypass ngrok's browser warning interstitial (ERR_NGROK_6024)
const NGROK_HEADERS = API_BASE.includes("ngrok-free.app") ? { "ngrok-skip-browser-warning": "true" } : {};

const toProductIn = (p) => ({
  id: p.id,
  title: p.title,
  description: p.description,
  category: p.category,
  price: Math.round(Number(p.price)||0),
  cost: Math.max(0, Math.floor(Number(p.cost||0))),
  qty: Math.max(0, Math.floor(Number(p.qty)||0)),
  available: !!p.available,
  images: p.images || [],
});

export async function getConfig(){
  const r = await fetch(`${API_BASE}/config`, { headers: { ...NGROK_HEADERS } });
  if (!r.ok) throw new Error("load config failed");
  return await r.json();
}

export async function listProducts(){
  const r = await fetch(`${API_BASE}/products`, { headers: { ...NGROK_HEADERS } });
  if (!r.ok) throw new Error("load products failed");
  const data = await r.json();
  return data.items || [];
}

export async function listProductsPaged(params = {}){
  // Support both absolute API base and proxied relative path
  const u = API_BASE
    ? new URL(`${API_BASE}/products`)
    : new URL('/products', window.location.origin);
  Object.entries(params).forEach(([k,v])=>{
    if (v===undefined || v===null || v==='') return;
    u.searchParams.set(k, String(v));
  });
  const r = await fetch(u.toString().replace(window.location.origin, ''), { headers: { ...NGROK_HEADERS } });
  if (!r.ok) throw new Error("load products failed");
  return await r.json(); // { items, total, next_offset }
}

export async function listOwnerProductsPaged(params = {}){
  const u = API_BASE
    ? new URL(`${API_BASE}/owner/products`)
    : new URL('/owner/products', window.location.origin);
  Object.entries(params).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=='') u.searchParams.set(k,String(v)); });
  const r = await fetch(u.toString().replace(window.location.origin, ''), { headers: { ...NGROK_HEADERS } });
  if (!r.ok) throw new Error("load owner products failed");
  return await r.json();
}

export async function listOrdersPaged(params = {}){
  const u = API_BASE
    ? new URL(`${API_BASE}/orders`)
    : new URL('/orders', window.location.origin);
  Object.entries(params).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=='') u.searchParams.set(k,String(v)); });
  const r = await fetch(u.toString().replace(window.location.origin, ''), { headers: { ...NGROK_HEADERS } });
  if (!r.ok) throw new Error("load orders failed");
  return await r.json();
}

export async function removeItemFromOrder(orderId, productId){
  const r = await fetch(`${API_BASE || ''}/orders/${encodeURIComponent(orderId)}/remove_item`.replace(window.location.origin,''), {
    method: 'PATCH',
    headers: { 'Content-Type':'application/json', ...NGROK_HEADERS },
    body: JSON.stringify({ pid: productId })
  });
  if (!r.ok) throw new Error('remove item failed');
  return await r.json();
}

export async function addItemToOrder(orderId, productId){
  const r = await fetch(`${API_BASE || ''}/orders/${encodeURIComponent(orderId)}/add_item`.replace(window.location.origin,''), {
    method: 'PATCH',
    headers: { 'Content-Type':'application/json', ...NGROK_HEADERS },
    body: JSON.stringify({ pid: productId })
  });
  if (!r.ok) throw new Error('add item failed');
  return await r.json();
}

export async function createProduct(p){
  const r = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: {"Content-Type":"application/json", ...NGROK_HEADERS},
    body: JSON.stringify(toProductIn(p)),
  });
  if (!r.ok) {
    let msg = "create product failed";
    try { msg = (await r.text()) || msg; } catch {}
    throw new Error(msg);
  }
  return await r.json();
}

export async function updateProduct(p){
  const r = await fetch(`${API_BASE}/products/${encodeURIComponent(p.id)}`, {
    method: "PATCH",
    headers: {"Content-Type":"application/json", ...NGROK_HEADERS},
    body: JSON.stringify(toProductIn(p)),
  });
  if (!r.ok) {
    let msg = "update product failed";
    try { msg = (await r.text()) || msg; } catch {}
    throw new Error(msg);
  }
  return await r.json();
}

export async function deleteProduct(id){
  const r = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}`, { method: "DELETE", headers: { ...NGROK_HEADERS } });
  if (!r.ok) {
    let msg = "delete failed";
    try { msg = (await r.text()) || msg; } catch {}
    throw new Error(msg);
  }
}

export async function listOrders(){
  const r = await fetch(`${API_BASE}/orders`, { headers: { ...NGROK_HEADERS } });
  if (!r.ok) throw new Error("load orders failed");
  const data = await r.json();
  return Array.isArray(data) ? data : (data.items || []);
}

export async function createOrder(items, customerPhone){
  const r = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {"Content-Type":"application/json", ...NGROK_HEADERS},
    body: JSON.stringify({ items, customer_phone: customerPhone }),
  });
  if (!r.ok) throw new Error("create order failed");
  return await r.json();
}

export async function confirmOrder(id){
  const r = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}/confirm`, { method: "PATCH", headers: { ...NGROK_HEADERS } });
  if (!r.ok) throw new Error("confirm order failed");
  return await r.json();
}
