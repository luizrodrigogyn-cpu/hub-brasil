export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

export type BrazilState = (typeof BRAZIL_STATES)[number];

export function normalizeBrazilState(value: string) {
  return value.trim().toUpperCase();
}

export function isValidBrazilState(value: string): value is BrazilState {
  return (BRAZIL_STATES as readonly string[]).includes(normalizeBrazilState(value));
}
