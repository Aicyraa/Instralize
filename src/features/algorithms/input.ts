export function parseArray(text: string): number[] {
  const tokens = text.split(',').map((token) => token.trim());
  if (tokens.length > 64 || tokens.some((token) => !/^-?\d+$/.test(token))) {
    throw new Error('Enter 1–64 comma-separated integers.');
  }
  const values = tokens.map(Number);
  if (
    values.some(
      (value) => !Number.isSafeInteger(value) || Math.abs(value) > 999,
    )
  ) {
    throw new Error('Each number must be between −999 and 999.');
  }
  return values;
}
export function parseScalar(text: string, min: number, max: number): number {
  if (!/^-?\d+$/.test(text.trim()))
    throw new Error(`Enter an integer between ${min} and ${max}.`);
  const value = Number(text);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`Enter an integer between ${min} and ${max}.`);
  return value;
}
export function randomValues(): number[] {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 90) + 10);
}
