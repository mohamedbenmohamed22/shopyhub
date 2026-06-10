/** Format a numeric amount as Tunisian Dinar, e.g. 20 -> "20.00 TND". */
export function formatTND(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${safe.toFixed(2)} TND`;
}

/** Clamp a desired quantity into the orderable range [0, stock]. */
export function clampQuantity(quantity: number, stock: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.min(Math.floor(quantity), Math.max(0, stock)));
}
