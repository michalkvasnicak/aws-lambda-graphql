/**
 * Computes TTL in UNIX timestamp with seconds precision
 */
export function computeTTL(ttl: number): number {
  return Math.round(Date.now() / 1000 + ttl);
}
