// Shared type scale.
//
// Before this existed the app ran two scales side by side: the Tailwind steps
// on Today/Library/Profile, and a hand-rolled iOS-ish pixel scale
// (25/21/19/17/15/13) that arrived with the social surfaces. Neighbouring
// screens ended up 1px apart on the same semantic element, which reads as
// sloppy without being nameable.
//
// The `caption` and `micro` steps are deliberate: 11px and 10px are used in
// 14 places (brand footers, calendar day numbers, eyebrow labels) and sit
// below Tailwind's text-xs. Without them in the scale, people go back to
// writing arbitrary text-[Npx] and the drift returns.
export const type = {
  /** Screen titles — "Today's Reading", "Social", "Library" */
  display: "text-2xl font-bold", // 24
  /** Card and section headers */
  title: "text-lg font-semibold", // 18
  /** Primary body copy, verse translations */
  body: "text-base", // 16
  /** Screen subtitles, secondary body */
  bodySm: "text-sm", // 14
  /** Row metadata, chapter/verse labels */
  meta: "text-xs", // 12
  /** Legends, eyebrow labels */
  caption: "text-[11px]",
  /** Brand footer, calendar day numbers */
  micro: "text-[10px]",
} as const;

export type TypeStep = keyof typeof type;
