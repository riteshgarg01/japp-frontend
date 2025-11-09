import { API_BASE } from "./config.js";

// Bypass ngrok's browser warning interstitial (ERR_NGROK_6024)
const NGROK_HEADERS = API_BASE.includes("ngrok-free.app") ? { "ngrok-skip-browser-warning": "true" } : {};
const adminHeaders = () => {
  try {
    const t = localStorage.getItem('admin_token');
    return t ? { Authorization: 'Bearer ' + t, 'X-Admin-Token': t } : {};
  } catch {
    return {};
  }
};

const withAuthHeaders = (headers = {}) => ({ ...NGROK_HEADERS, ...adminHeaders(), ...headers });

async function apiFetch(url, options = {}){
  const opts = { ...options, headers: withAuthHeaders(options.headers || {}) };
  if (!('cache' in opts)) {
    opts.cache = 'no-store';
  }
  let r;
  try {
    r = await fetch(url, opts);
  } catch (err) {
    throw new Error(`[ACNET-001] Network error contacting API: ${err?.message || String(err)}`);
  }
  if (r.status === 401) {
    try { localStorage.removeItem('admin_token'); } catch {}
    if (typeof window !== 'undefined' && window.location && window.location.pathname.includes('/owner')) {
      window.location.reload();
    }
    throw new Error('[ACAUTH-401] unauthorized');
  }
  return r;
}

const toProductIn = (p) => ({
  id: p.id,
  title: p.title,
  description: p.description,
  category: p.category,
  style_tag: p.style_tag ?? null,
  price: Math.round(Number(p.price)||0),
  cost: Math.max(0, Math.floor(Number(p.cost||0))),
  qty: Math.max(0, Math.floor(Number(p.qty)||0)),
  available: !!p.available,
  images: p.images || [],
});

export async function getConfig(){
  const r = await apiFetch(`${API_BASE}/config`);
  if (!r.ok) throw new Error("load config failed");
  return await r.json();
}

export async function getProductFilters(params = {}){
  const baseUrl = API_BASE
    ? new URL(`${API_BASE}/products/filters`)
    : new URL('/products/filters', window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    baseUrl.searchParams.set(key, String(value));
  });
  const target = API_BASE ? baseUrl.toString() : baseUrl.toString().replace(window.location.origin, '');
  const r = await apiFetch(target);
  if (!r.ok) throw new Error("load filters failed");
  return await r.json();
}

export async function listProducts(){
  const r = await apiFetch(`${API_BASE}/products`);
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
  const r = await apiFetch(u.toString().replace(window.location.origin, ''));
  if (!r.ok) throw new Error("load products failed");
  return await r.json(); // { items, total, next_offset }
}

export async function getProductImages(id){
  const r = await apiFetch(`${API_BASE}/products/${encodeURIComponent(id)}/images`);
  if (!r.ok) throw new Error('load images failed');
  return await r.json(); // { images }
}

export async function listOwnerProductsPaged(params = {}){
  const u = API_BASE
    ? new URL(`${API_BASE}/owner/products`)
    : new URL('/owner/products', window.location.origin);
  Object.entries(params).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=='') u.searchParams.set(k,String(v)); });
  const r = await apiFetch(u.toString().replace(window.location.origin, ''));
  if (!r.ok) throw new Error("load owner products failed");
  return await r.json();
}

export async function getOwnerInventoryStats(){
  // Mirrors the new backend stats endpoint so dashboards can display accurate counts without
  // forcing a full product sync on first paint. I intentionally keep this thin wrapper so we can
  // evolve response shape server-side while callers stay isolated from fetch details.
  const url = (API_BASE ? `${API_BASE}/owner/inventory/stats` : '/owner/inventory/stats').replace(window.location.origin, '');
  const r = await apiFetch(url);
  if (!r.ok) throw new Error("load inventory stats failed");
  return await r.json();
}

export async function listOrdersPaged(params = {}){
  const u = API_BASE
    ? new URL(`${API_BASE}/orders`)
    : new URL('/orders', window.location.origin);
  Object.entries(params).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=='') u.searchParams.set(k,String(v)); });
  const r = await apiFetch(u.toString().replace(window.location.origin, ''));
  if (!r.ok) throw new Error("load orders failed");
  return await r.json();
}

export async function removeItemFromOrder(orderId, productId){
  const r = await apiFetch(`${API_BASE || ''}/orders/${encodeURIComponent(orderId)}/remove_item`.replace(window.location.origin,''), {
    method: 'PATCH',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ pid: productId })
  });
  if (!r.ok) throw new Error('remove item failed');
  return await r.json();
}

export async function addItemToOrder(orderId, productId){
  const r = await apiFetch(`${API_BASE || ''}/orders/${encodeURIComponent(orderId)}/add_item`.replace(window.location.origin,''), {
    method: 'PATCH',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ pid: productId })
  });
  if (!r.ok) throw new Error('add item failed');
  return await r.json();
}

export async function createProduct(p){
  const r = await apiFetch(`${API_BASE}/products`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(toProductIn(p)),
  });
  if (!r.ok) {
    let msg = "create product failed";
    try { msg = (await r.text()) || msg; } catch {}
    throw new Error(`[ACHTTP-${r.status}] ${msg}`);
  }
  return await r.json();
}

export async function updateProduct(p){
  const r = await apiFetch(`${API_BASE}/products/${encodeURIComponent(p.id)}`, {
    method: "PATCH",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(toProductIn(p)),
  });
  if (!r.ok) {
    let msg = "update product failed";
    try { msg = (await r.text()) || msg; } catch {}
    throw new Error(`[ACHTTP-${r.status}] ${msg}`);
  }
  return await r.json();
}

export async function getOwnerProduct(id){
  const r = await apiFetch(`${API_BASE}/owner/products/${encodeURIComponent(id)}`);
  if (!r.ok) {
    let msg = "load product failed";
    try { msg = (await r.text()) || msg; } catch {}
    throw new Error(msg);
  }
  return await r.json();
}

export async function reprocessProduct(id){
  const r = await apiFetch(`${API_BASE}/owner/products/${encodeURIComponent(id)}/reprocess`, {
    method: 'POST',
  });
  if (!r.ok) {
    let msg = "reprocess failed";
    try { msg = (await r.text()) || msg; } catch {}
    throw new Error(msg);
  }
  return await r.json();
}

export async function deleteProduct(id){
  const r = await apiFetch(`${API_BASE}/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!r.ok) {
    let msg = "delete failed";
    try { msg = (await r.text()) || msg; } catch {}
    throw new Error(msg);
  }
}

export async function listOrders(){
  const r = await apiFetch(`${API_BASE}/orders`);
  if (!r.ok) throw new Error("load orders failed");
  const data = await r.json();
  return Array.isArray(data) ? data : (data.items || []);
}

export async function createOrder(items, customerPhone, sessionId){
  const r = await apiFetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ items, customer_phone: customerPhone, session_id: sessionId }),
  });
  if (!r.ok) throw new Error("create order failed");
  return await r.json();
}

export async function notifyOwnerByEmail(payload){
  try{
    await fetch(`${API_BASE}/notify-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }catch(err){
    // Don't surface to user; just log so the order flow isn't affected
    console.warn('Owner email notification failed', err);
  }
}

export async function confirmOrder(id){
  const r = await apiFetch(`${API_BASE}/orders/${encodeURIComponent(id)}/confirm`, { method: "PATCH" });
  if (!r.ok) throw new Error("confirm order failed");
  return await r.json();
}

export async function cancelOrder(id){
  const r = await apiFetch(`${API_BASE}/orders/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' });
  if (!r.ok) throw new Error('cancel order failed');
  return await r.json();
}

export async function getOrdersBySession(sessionId, limit=1){
  const u = API_BASE
    ? new URL(`${API_BASE}/orders/by_session`)
    : new URL('/orders/by_session', window.location.origin);
  u.searchParams.set('session_id', sessionId);
  u.searchParams.set('limit', String(limit));
  const r = await apiFetch(u.toString().replace(window.location.origin, ''));
  if (!r.ok) throw new Error('load by_session failed');
  return await r.json();
}

export async function getCart(sessionId, customerPhone){
  const u = API_BASE
    ? new URL(`${API_BASE}/cart`)
    : new URL('/cart', window.location.origin);
  if (sessionId) u.searchParams.set('session_id', sessionId);
  if (customerPhone) u.searchParams.set('customer_phone', customerPhone);
  const r = await apiFetch(u.toString().replace(window.location.origin, ''));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('load cart failed');
  return await r.json();
}

export async function syncCart(items, sessionId, customerPhone){
  const payload = { items: Array.isArray(items) ? items : [] };
  if (sessionId) payload.session_id = sessionId;
  if (customerPhone) payload.customer_phone = customerPhone;
  const r = await apiFetch(`${API_BASE}/cart/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error('sync cart failed');
  return await r.json();
}

// ---- Analytics ----
export async function trackEvent(kind, payload = {}){
  // Attach session id if available
  let session_id = null;
  let customer_phone = null;
  try { session_id = localStorage.getItem('ac_session_id') || null; } catch {}
  try { customer_phone = localStorage.getItem('ac_phone') || null; } catch {}
  const body = { kind, payload, session_id, customer_phone };
  // Build URL and include token as query param for visibility (some proxies strip headers)
  const r = await apiFetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // ignore non-OK silently (observability should not break UX)
  try { await r.json(); } catch {}
}
