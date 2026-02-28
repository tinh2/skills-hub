export const VISIBILITY = ["PUBLIC", "PRIVATE", "UNLISTED"] as const;

export type Visibility = (typeof VISIBILITY)[number];

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLIC: "Public",
  PRIVATE: "Private",
  UNLISTED: "Unlisted",
};

export const VISIBILITY_DESCRIPTIONS: Record<Visibility, string> = {
  PUBLIC: "Visible to everyone in browse and search",
  PRIVATE: "Only visible to you — not listed or searchable",
  UNLISTED: "Accessible via direct link but not listed in browse or search",
};
