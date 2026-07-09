/**
 * Everyone must lock in their "who wins the cup" pick before the
 * quarter-finals get going: Friday 10.07.2026, 22:00 Kyiv time (EEST, UTC+3).
 */
export const CHAMPION_PICK_DEADLINE = new Date("2026-07-10T19:00:00Z")

export function isChampionPickLocked(now: Date = new Date()): boolean {
  return now.getTime() >= CHAMPION_PICK_DEADLINE.getTime()
}
