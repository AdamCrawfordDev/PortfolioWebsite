import type {
  EnemyType,
  PipelineStage,
  UpgradeDefinition,
} from "./types"

export const CANVAS_WIDTH = 900
export const CANVAS_HEIGHT = 500

export const PLAYER_WIDTH = 42
export const PLAYER_HEIGHT = 24
export const PLAYER_SPEED = 380
export const PLAYER_MAX_HEALTH = 5

export const BULLET_WIDTH = 4
export const BULLET_HEIGHT = 14
export const BULLET_SPEED = 700
export const FIRE_RATE = 0.2

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: "source", name: "SOURCE", duration: 10, spawnInterval: 1.2, enemies: ["syntax"] },
  { id: "lint", name: "LINT", duration: 12, spawnInterval: 1.05, enemies: ["syntax", "flaky"] },
  { id: "test", name: "TEST", duration: 14, spawnInterval: 0.9, enemies: ["syntax", "flaky", "compile"] },
  { id: "build", name: "BUILD", duration: 15, spawnInterval: 0.78, enemies: ["flaky", "compile", "regression"] },
  { id: "deploy", name: "DEPLOY", duration: 18, spawnInterval: 0.62, enemies: ["syntax", "flaky", "compile", "regression"] },
]

type StageBriefing = {
  threatLabel: string
  status: string
  enemyType: EnemyType | null
  enemyName: string
  glyph: string
  description: string
  quip: string
}

export const STAGE_BRIEFINGS: Record<string, StageBriefing> = {
  source: {
    threatLabel: "FIRST CONTACT",
    status: "NEW THREAT",
    enemyType: "syntax",
    enemyName: "SYNTAX ERROR",
    glyph: "{ }",
    description: "Fast, fragile and annoyingly common. One clean hit should do it.",
    quip: '"you forgot a bracket. classic."',
  },
  lint: {
    threatLabel: "NEW THREAT DETECTED",
    status: "UNSTABLE",
    enemyType: "flaky",
    enemyName: "FLAKY BUG",
    glyph: "~",
    description: "Drifts unpredictably across the pipeline. Do not trust its trajectory.",
    quip: '"sometimes it works. that\'s worse."',
  },
  test: {
    threatLabel: "NEW THREAT DETECTED",
    status: "ARMOURED",
    enemyType: "compile",
    enemyName: "COMPILE ERROR",
    glyph: "■",
    description: "Slow, chunky and stubborn. It takes three hits before the build moves on.",
    quip: '"works on my machine."',
  },
  build: {
    threatLabel: "NEW THREAT DETECTED",
    status: "TRACKING",
    enemyType: "regression",
    enemyName: "REGRESSION",
    glyph: "↶",
    description: "Fast and actively hunts your position. Standing still is a terrible idea.",
    quip: '"congrats. you broke something that already worked."',
  },
  deploy: {
    threatLabel: "FINAL STAGE",
    status: "ALL ACTIVE",
    enemyType: null,
    enemyName: "ALL SYSTEMS HOSTILE",
    glyph: "!",
    description: "No new bugs. Every threat encountered so far is back in rotation at full speed.",
    quip: '"ship it. what could possibly go wrong?"',
  },
}

export const ENEMY_CONFIG: Record<EnemyType, {
  width: number
  height: number
  speed: number
  health: number
  scoreValue: number
}> = {
  syntax: { width: 34, height: 26, speed: 115, health: 0.2, scoreValue: 100 },
  flaky: { width: 40, height: 26, speed: 80, health: 1.75, scoreValue: 150 },
  compile: { width: 46, height: 34, speed: 70, health: 2.25, scoreValue: 300 },
  regression: { width: 28, height: 22, speed: 165, health: 1, scoreValue: 250 },
}

export const UPGRADES: UpgradeDefinition[] = [
  { id: "rapid-fire", name: "Rapid Fire", description: "Reduce weapon cooldown by 20%." },
  { id: "thrusters", name: "Overclocked Thrusters", description: "Increase movement speed by 25%." },
  { id: "heavy-rounds", name: "Heavy Rounds", description: "Projectiles deal +1 damage." },
  { id: "packet-accelerator", name: "Packet Accelerator", description: "Projectiles travel 25% faster." },
  { id: "forked-process", name: "Forked Process", description: "Fire an additional projectile." },
  { id: "piercing-packets", name: "Piercing Packets", description: "Projectiles can pass through one additional enemy." },
  { id: "integrity-patch", name: "Integrity Patch", description: "Increase maximum integrity by 2 and repair 2 integrity." },
  { id: "shield-cache", name: "Shield Cache", description: "Gain a shield charge that blocks one failure." },
  { id: "wide-bus", name: "Wide Data Bus", description: "Increase projectile width by 50%." },
  { id: "compiler-optimiser", name: "Compiler Optimiser", description: "Gain a 15% chance for projectiles to deal double damage." },
]
