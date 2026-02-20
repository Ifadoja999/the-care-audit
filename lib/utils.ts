/**
 * Convert an ALL CAPS or mixed-case string to Title Case.
 * Handles common articles/prepositions (of, the, at, in, etc.)
 * that should remain lowercase unless they're the first word.
 */
const LOWERCASE_WORDS = new Set([
  'of', 'the', 'at', 'in', 'for', 'and', 'or', 'on', 'to', 'a', 'an',
  'by', 'with', 'from', 'as', 'but', 'nor', 'so', 'yet',
]);

export function toTitleCase(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map((word, i) => {
      if (i === 0 || !LOWERCASE_WORDS.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}
