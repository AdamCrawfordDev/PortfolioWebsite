import type {
  EnemyKind,
  Point,
  TowerDefinition,
  TowerKind,
  WaveEntry,
} from "./types"

export const GAME_WIDTH = 1100
export const GAME_HEIGHT = 620

export const STARTING_CPU = 650
export const STARTING_RAM = 0
export const MAX_RAM = 100

export const PATH_WIDTH = 54

export const PATH: Point[] = [
  { x: 45, y: 145 },
  { x: 190, y: 145 },
  { x: 190, y: 310 },
  { x: 365, y: 310 },
  { x: 365, y: 120 },
  { x: 565, y: 120 },
  { x: 565, y: 405 },
  { x: 760, y: 405 },
  { x: 760, y: 220 },
  { x: 940, y: 220 },
  { x: 1045, y: 220 },
]

export const TOWERS: Record<
  TowerKind,
  TowerDefinition
> = {
  gc: {
    kind: "gc",
    name: "Garbage Collector",
    shortName: "GC",
    description:
      "Reliable area cleanup. Cheap, steady and good against ordinary allocations.",
    cost: 140,
    range: 112,
    damage: 18,
    fireRate: 0.78,
    projectileSpeed: 520,
  },

  free: {
    kind: "free",
    name: "free()",
    shortName: "free()",
    description:
      "Fast single-target cleanup with high damage and a smaller range.",
    cost: 210,
    range: 102,
    damage: 38,
    fireRate: 1.05,
    projectileSpeed: 650,
  },

  reference: {
    kind: "reference",
    name: "Reference Counter",
    shortName: "REF",
    description:
      "Rapid cleanup. Especially effective against retained objects.",
    cost: 265,
    range: 126,
    damage: 11,
    fireRate: 0.28,
    projectileSpeed: 720,
  },

  profiler: {
    kind: "profiler",
    name: "Memory Profiler",
    shortName: "PROF",
    description:
      "Support tower. Boosts the range and damage of nearby cleanup routines.",
    cost: 330,
    range: 145,
    damage: 0,
    fireRate: 0,
    projectileSpeed: 0,
  },

  "cycle-detector": {
    kind: "cycle-detector",
    name: "Cycle Detector",
    shortName: "CYCLE",
    description:
      "Specialised collector that tears through circular references and shields.",
    cost: 360,
    range: 135,
    damage: 31,
    fireRate: 0.72,
    projectileSpeed: 580,
  },
}

export const TOWER_ORDER: TowerKind[] = [
  "gc",
  "free",
  "reference",
  "profiler",
  "cycle-detector",
]

export const ENEMY_STATS: Record<
  EnemyKind,
  {
    hp: number
    speed: number
    ramDamage: number
    reward: number
    radius: number
    shield: number
  }
> = {
  allocation: {
    hp: 45,
    speed: 74,
    ramDamage: 4,
    reward: 18,
    radius: 12,
    shield: 0,
  },

  large: {
    hp: 150,
    speed: 46,
    ramDamage: 10,
    reward: 44,
    radius: 17,
    shield: 0,
  },

  cache: {
    hp: 115,
    speed: 58,
    ramDamage: 7,
    reward: 34,
    radius: 14,
    shield: 24,
  },

  retained: {
    hp: 88,
    speed: 67,
    ramDamage: 6,
    reward: 28,
    radius: 13,
    shield: 18,
  },

  cycle: {
    hp: 185,
    speed: 52,
    ramDamage: 11,
    reward: 55,
    radius: 16,
    shield: 50,
  },

  listener: {
    hp: 220,
    speed: 43,
    ramDamage: 12,
    reward: 72,
    radius: 17,
    shield: 18,
  },

  legacy: {
    hp: 1750,
    speed: 27,
    ramDamage: 35,
    reward: 500,
    radius: 28,
    shield: 180,
  },
}

export const WAVES: WaveEntry[][] = [
  [
    { kind: "allocation", count: 9, interval: 0.72 },
  ],
  [
    { kind: "allocation", count: 13, interval: 0.58 },
    { kind: "large", count: 2, interval: 1.15 },
  ],
  [
    { kind: "allocation", count: 10, interval: 0.48 },
    { kind: "cache", count: 5, interval: 0.8 },
  ],
  [
    { kind: "retained", count: 8, interval: 0.62 },
    { kind: "large", count: 4, interval: 0.9 },
  ],
  [
    { kind: "allocation", count: 12, interval: 0.4 },
    { kind: "cycle", count: 5, interval: 0.9 },
  ],
  [
    { kind: "cache", count: 8, interval: 0.55 },
    { kind: "retained", count: 9, interval: 0.5 },
  ],
  [
    { kind: "listener", count: 4, interval: 1.35 },
    { kind: "allocation", count: 15, interval: 0.34 },
  ],
  [
    { kind: "cycle", count: 8, interval: 0.65 },
    { kind: "large", count: 7, interval: 0.68 },
  ],
  [
    { kind: "listener", count: 6, interval: 1.0 },
    { kind: "retained", count: 12, interval: 0.42 },
    { kind: "cache", count: 8, interval: 0.46 },
  ],
  [
    { kind: "legacy", count: 1, interval: 0.5 },
    { kind: "listener", count: 5, interval: 0.85 },
    { kind: "cycle", count: 8, interval: 0.55 },
  ],
]

export const WAVE_BONUS = 110
export const SELL_REFUND = 0.7
export const UPGRADE_BASE_COST = 120
export const MAX_TOWER_LEVEL = 3
