export type MiniGameId =
  | "ci-cd-defense"
  | "packet-police"
  | "memory-leak"


export const MINI_GAME_IDS =
  new Set<MiniGameId>([
    "ci-cd-defense",
    "packet-police",
    "memory-leak",
  ])


export function isMiniGame(
  id: string
): id is MiniGameId {
  return MINI_GAME_IDS.has(
    id as MiniGameId
  )
}