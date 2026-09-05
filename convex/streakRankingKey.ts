export const GLOBAL_STREAK_RANKING_MAX_NODE_SIZE = 64 as const;

export function localDateRankValue(localDate: string): number {
  const compactDate = Number(localDate.replaceAll("-", ""));
  return Number.isFinite(compactDate) ? compactDate : 0;
}
