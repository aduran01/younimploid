const MASK = '••••';
// Below this, the last 4 characters would be most of the value, such as a short name.
const MIN_LENGTH_TO_SHOW_ENDING = 8;

// The length is hidden too. Anything short enough to be recognized is fully masked.
export function maskValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < MIN_LENGTH_TO_SHOW_ENDING) return MASK;
  return `${MASK}${trimmed.slice(-4)}`;
}
