// The fixed set of query categories. A closed list, not free text, so every
// query is triageable by an advisor without reading it first — see README.md.
export const CATEGORIES = {
  contract_review: "Contract review",
  tax: "Tax",
  superannuation: "Superannuation",
  other_financial: "Other financial matter",
} as const;

export type Category = keyof typeof CATEGORIES;

export function isCategory(value: string): value is Category {
  return value in CATEGORIES;
}
