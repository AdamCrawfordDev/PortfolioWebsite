export type GameStatus = "ready" | "running" | "game-over"

export type Vec2 = {
  x: number
  y: number
}

export type PursuerKind =
  | "patrol"
  | "interceptor"
  | "dpi"

export type PickupKind =
  | "spoof"
  | "fragment"
  | "encrypt"
  | "ttl"

export type Player = Vec2 & {
  vx: number
  vy: number
  angle: number
  radius: number
  integrity: number
  maxIntegrity: number
  invulnerable: number
  spoofTimer: number
  encryptTimer: number
  ttlTimer: number
}

export type Pursuer = Vec2 & {
  id: number
  vx: number
  vy: number
  angle: number
  radius: number
  kind: PursuerKind
  health: number
  maxHealth: number
  hitFlash: number
}

export type Firewall = {
  id: number
  x: number
  y: number
  width: number
  height: number
  horizontal: boolean
  ttl: number
}

export type Pickup = Vec2 & {
  id: number
  kind: PickupKind
  radius: number
  pulse: number
}

export type Decoy = Vec2 & {
  id: number
  vx: number
  vy: number
  ttl: number
}

export type Particle = Vec2 & {
  id: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

export type FloatingText = Vec2 & {
  id: number
  text: string
  life: number
}