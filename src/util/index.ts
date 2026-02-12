/**
 * Sort an array by a key function. Returns a new array.
 */
export function sortBy<T>(arr: readonly T[], keyFn: (item: T) => string): T[] {
  return [...arr].sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return 0;
  });
}
