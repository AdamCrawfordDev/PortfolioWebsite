import type {
  PortState,
} from "./types"


// ========================================
// CANVAS
// ========================================

export const GAME_WIDTH =
  1100

export const GAME_HEIGHT =
  580


// ========================================
// SERVICES
// ========================================

export const PORT_MAX_HEALTH =
  100


export const PORTS:
  PortState[] = [
  {
    id: "http",
    name: "HTTP",
    port: 80,
    health:
      PORT_MAX_HEALTH,
  },

  {
    id: "https",
    name: "HTTPS",
    port: 443,
    health:
      PORT_MAX_HEALTH,
  },

  {
    id: "ssh",
    name: "SSH",
    port: 22,
    health:
      PORT_MAX_HEALTH,
  },

  {
    id: "dns",
    name: "DNS",
    port: 53,
    health:
      PORT_MAX_HEALTH,
  },
]


export const LANE_COUNT =
  PORTS.length


// ========================================
// NETWORK
// ========================================

export const NETWORK_LEFT =
  95


export const NETWORK_RIGHT =
  GAME_WIDTH - 145


export const LANE_Y = [
  115,
  225,
  335,
  445,
]


// ========================================
// JUNCTIONS
// ========================================

export const PLAYER_COLUMNS = [
  250,
  440,
  630,
  820,
]


export const JUNCTION_X =
  PLAYER_COLUMNS


/*
 * Packets reveal their route decision
 * before reaching the junction.
 */

export const LANE_CHANGE_WARNING_DISTANCE =
  75


/*
 * Roughly one third of packets will
 * attempt to change route at a junction.
 */

export const LANE_CHANGE_CHANCE =
  0.32


/*
 * Vertical movement speed in pixels
 * per second.
 *
 * Lanes are 110px apart, so 300px/s
 * means a route change takes about
 * 0.37 seconds.
 */

export const LANE_CHANGE_SPEED =
  300


// ========================================
// PLAYER
// ========================================

export const PLAYER_START_LANE =
  1


export const PLAYER_START_COLUMN =
  1


/*
 * Short arrest cooldown prevents a
 * tightly packed queue from causing
 * several arrests in one instant.
 */

export const INTERCEPT_COOLDOWN_MS =
  180


// ========================================
// PACKET SPAWNING
// ========================================

export const PACKET_START_X =
  NETWORK_LEFT - 45


export const PACKET_END_X =
  NETWORK_RIGHT + 20


export const INITIAL_SPAWN_INTERVAL =
  900


export const MIN_SPAWN_INTERVAL =
  300


// ========================================
// TRAFFIC
// ========================================

export const BASE_PACKET_SPEED =
  135


export const MAX_PACKET_SPEED =
  205


export const MIN_PACKET_GAP =
  66


// ========================================
// CORRUPTION
// ========================================

export const CORRUPTION_CHANCE =
  0.38


// ========================================
// INTERCEPTION
// ========================================

export const INTERCEPT_X_DISTANCE =
  43


/*
 * Legitimate traffic incorrectly
 * arrested causes a small availability
 * penalty.
 */

export const FALSE_POSITIVE_DAMAGE =
  4


// ========================================
// DIFFICULTY
// ========================================

export const DIFFICULTY_RAMP_SECONDS =
  75


// ========================================
// SCORING
// ========================================

export const INTERCEPT_SCORE =
  100


export const STREAK_BONUS =
  15