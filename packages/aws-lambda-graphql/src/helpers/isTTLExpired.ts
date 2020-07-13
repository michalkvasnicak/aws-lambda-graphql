export function isTTLExpired(ttl?: null | undefined | false | number): boolean {
  if (ttl == null || ttl === false) {
    return false;
  }

  return ttl * 1000 < Date.now();
}
