export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, fractionDigits: number) {
  const multiplier = 10 ** fractionDigits;
  return Math.round(value * multiplier) / multiplier;
}
