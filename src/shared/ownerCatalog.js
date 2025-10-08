/*
  ownerCatalog centralizes owner-side product hydration so every dashboard view shares the same
  cache + in-flight lookups. Before this helpers existed, Shortlists and Orders each re-fetched
  missing products independently, which meant:
    • duplicate backend traffic for the same product ID  
    • temporary blank thumbnails until both components finished their own fetches  
    • no single place to prime the cache when Inventory bootstraps

  By funnelling all lookups through this module we keep the catalog coherent across the owner
  surface and dramatically cut the number of network calls during a session.
*/
import { getOwnerProduct } from "./api.js";

const ownerProductCache = new Map();
const inflightFetches = new Map();

// Seed or refresh the shared owner catalog cache with the latest copy of each product. We call
// this whenever we load a page of owner data (initial bootstrap, Inventory pagination, edits, etc.)
// so every view immediately benefits from the freshest metadata.
export function primeOwnerProductCache(products){
  products.forEach(prod => {
    if (prod?.id) ownerProductCache.set(prod.id, prod);
  });
}

// Fetch any missing product records, deduplicating both the incoming list and any pending fetches.
// This lets Shortlists, Orders, or future owner views request enrichments without worrying about
// redundant API calls.
export async function hydrateOwnerProducts(ids){
  // Gather unique IDs and reuse cached or in-flight promises so multiple components coalesce their
  // hydration work into the smallest possible set of backend round trips.
  const uniqueIds = Array.from(new Set((ids || []).filter(Boolean)));
  const fetches = uniqueIds.map(id => {
    if (ownerProductCache.has(id)) return Promise.resolve(ownerProductCache.get(id));
    if (inflightFetches.has(id)) return inflightFetches.get(id);
    const fetchPromise = getOwnerProduct(id)
      .then(prod => {
        if (prod?.id) ownerProductCache.set(prod.id, prod);
        return prod;
      })
      .catch(err => {
        console.error('Failed to hydrate owner product', id, err);
        return null;
      })
      .finally(() => inflightFetches.delete(id));
    inflightFetches.set(id, fetchPromise);
    return fetchPromise;
  });
  const results = await Promise.all(fetches);
  return results.filter(Boolean);
}

// Expose direct reads for places where we only need to check if the cache already has a product
// (e.g., rendering without forcing a network call).
export function getCachedOwnerProduct(id){
  return ownerProductCache.get(id);
}
