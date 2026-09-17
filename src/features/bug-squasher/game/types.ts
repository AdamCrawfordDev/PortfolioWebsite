export type GameState =
  | "idle"
  | "running"
  | "game-over"
  | "complete"

export type EnemyType =
  | "syntax"
  | "flaky"
  | "compile"
  | "regression"

export type UpgradeId =
  | "rapid-fire"
  | "thrusters"
  | "heavy-rounds"
  | "packet-accelerator"
  | "forked-process"
  | "piercing-packets"
  | "integrity-patch"
  | "shield-cache"
  | "wide-bus"
  | "compiler-optimiser"

export type PipelineStage = {
  id: string
  name: string
  duration: number
  spawnInterval: number
  enemies: EnemyType[]
}

export type UpgradeDefinition = {
  id: UpgradeId
  name: string
  description: string
}

export type Player = {
  x: number
  y: number
  width: number
  height: number
  speed: number
  health: number
  maxHealth: number
  fireCooldown: number
  fireRate: number
  bulletDamage: number
  bulletSpeed: number
  bulletWidth: number
  projectileCount: number
  projectileSpread: number
  bulletPierce: number
  shieldCharges: number
  critChance: number
  hitFlash: number
}

export type Bullet = {
  id: number
  x: number
  y: number
  width: number
  height: number
  speed: number
  vx: number
  damage: number
  pierceRemaining: number
}

export type Enemy = {
  id: number
  type: EnemyType
  x: number
  y: number
  baseX: number
  width: number
  height: number
  speed: number
  health: number
  maxHealth: number
  scoreValue: number
  movementTime: number
  hitFlash: number
}

export type Particle = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

export type FloatingText = {
  id: number
  x: number
  y: number
  text: string
  life: number
  maxLife: number
}

export type GameStats = {
  score: number
  health: number
  maxHealth: number
  stageIndex: number
  stageProgress: number
  gameState: GameState
}
