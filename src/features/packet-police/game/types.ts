export type GameState =
  | "idle"
  | "running"
  | "game-over"


export type PortId =
  | "http"
  | "https"
  | "ssh"
  | "dns"


export type PortState = {
  id: PortId

  name: string

  port: number

  health: number
}


export type PacketSize =
  | "small"
  | "normal"
  | "large"


export type LaneChangeDirection =
  | -1
  | 1


export type Packet = {
  id: number

  /*
   * Current horizontal route.
   *
   * While changing lanes this remains
   * the route the packet came from until
   * the vertical movement finishes.
   */

  lane: number

  x: number

  speed: number

  corrupted: boolean

  damage: number

  size: PacketSize

  seed: number


  // ========================================
  // ROUTING
  // ========================================

  nextJunctionIndex: number


  /*
   * Planned direction at the upcoming
   * junction.
   */

  laneChangeDirection:
    LaneChangeDirection | null


  /*
   * True while the route arrow should
   * be displayed.
   */

  laneChangeWarning: boolean


  // ========================================
  // VERTICAL MOVEMENT
  // ========================================

  /*
   * True while the packet is physically
   * travelling along a vertical junction
   * rail.
   */

  changingLane: boolean


  /*
   * Destination route.
   */

  targetLane:
    number | null


  /*
   * Actual rendered Y position.
   *
   * Horizontal packets normally use
   * LANE_Y[lane].
   *
   * During a route change this value is
   * smoothly moved toward the target
   * lane.
   */

  y: number
}


export type Player = {
  lane: number

  column: number
}


export type GameStats = {
  score: number

  intercepted: number

  falsePositives: number

  leaked: number

  streak: number

  ports: PortState[]

  gameState: GameState

  failedPort:
    PortId | null
}