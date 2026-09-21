import type {
  PickupKind,
  PursuerKind,
} from "./types"

export const GAME_WIDTH = 1100
export const GAME_HEIGHT = 620

/*
 * PLAYER HANDLING
 *
 * Fast enough to create genuine breakaways, but with a longer acceleration
 * curve so speed has to be earned. High drag retention keeps slides alive
 * without making the car feel like it is permanently on ice.
 */
export const PLAYER_MAX_INTEGRITY = 100
export const PLAYER_ACCELERATION = 640
export const PLAYER_REVERSE_ACCELERATION = 470
export const PLAYER_MAX_SPEED = 390
export const PLAYER_REVERSE_MAX_SPEED = 155
export const PLAYER_TURN_SPEED = 3.35
export const PLAYER_DRAG = 0.994
export const PLAYER_TRACTION = 2.0
export const PLAYER_LOW_SPEED_TRACTION = 3.15
export const PLAYER_BRAKE_FORCE = 760
export const PLAYER_RADIUS = 15

export const THREAT_MAX = 5
export const THREAT_PER_SECOND = 0.043
export const THREAT_PER_CRASH = 0.14
export const SCORE_PER_SECOND = 100

// Keep power-ups circulating so they remain a regular part of the chase.
export const PICKUP_INITIAL_DELAY = 3.5
export const PICKUP_MIN_INTERVAL = 5.5
export const PICKUP_MAX_INTERVAL = 8.5
export const PICKUP_MAX_ACTIVE = 5

export const NETWORK_MARGIN = 44
export const GRID_GAP = 80

/*
 * PURSUER ROLES
 *
 * Patrols create traffic and pressure but cannot simply run the player down.
 * Interceptors are the genuine speed threat and can briefly match a clean
 * breakaway. DPI units are heavier, slower blockers that punish bad lines.
 */
export const PURSUERS: Record<
  PursuerKind,
  {
    label: string
    speed: number
    acceleration: number
    turnSpeed: number
    health: number
    damage: number
    radius: number
  }
> = {
  patrol: {
    label: "FIREWALL PATROL",
    speed: 245,
    acceleration: 430,
    turnSpeed: 2.15,
    health: 34,
    damage: 10,
    radius: 15,
  },
  interceptor: {
    label: "INTERCEPTOR",
    speed: 315,
    acceleration: 535,
    turnSpeed: 2.55,
    health: 44,
    damage: 13,
    radius: 16,
  },
  dpi: {
    label: "DPI UNIT",
    speed: 270,
    acceleration: 455,
    turnSpeed: 2.15,
    health: 60,
    damage: 17,
    radius: 18,
  },
}

export const PICKUPS: Record<
  PickupKind,
  {
    label: string
    description: string
    duration?: number
  }
> = {
  spoof: {
    label: "SPOOF",
    description: "Police lose target lock",
    duration: 4.8,
  },
  fragment: {
    label: "FRAGMENT",
    description: "Split into decoy packets",
  },
  encrypt: {
    label: "ENCRYPT",
    description: "Ignore firewall damage",
    duration: 5.8,
  },
  ttl: {
    label: "TTL BOOST",
    description: "Temporary speed boost",
    duration: 4.5,
  },
}
