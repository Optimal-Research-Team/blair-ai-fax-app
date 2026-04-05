/**
 * Tokenized, order-independent search.
 * Splits query into words; ALL must appear somewhere in the target string.
 * Returns true if query is empty/whitespace.
 */
export function tokenizedMatch(target: string, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  const lowerTarget = target.toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((token) => lowerTarget.includes(token))
}
