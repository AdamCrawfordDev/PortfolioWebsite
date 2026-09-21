import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import corruptCarUrl from "./assets/cars/corrupt.png"
import corruptFragmentCarUrl from "./assets/cars/corrupt_fragment.png"
import corruptSpoofCarUrl from "./assets/cars/corrupt_spoof.png"
import corruptEncryptCarUrl from "./assets/cars/corrupt_encrpyt.png"
import policeCarUrl from "./assets/cars/police.png"
import interceptorCarUrl from "./assets/cars/interceptor.png"
import dpiCarUrl from "./assets/cars/dpi.png"

import spoofPickupUrl from "./assets/powerups/spoof.png"
import fragmentPickupUrl from "./assets/powerups/fragment.png"
import encryptPickupUrl from "./assets/powerups/encrypt.png"
import ttlPickupUrl from "./assets/powerups/ttl.png"

import {
  GAME_HEIGHT,
  GAME_WIDTH,
  GRID_GAP,
  NETWORK_MARGIN,
  PICKUPS,
  PICKUP_INITIAL_DELAY,
  PICKUP_MAX_ACTIVE,
  PICKUP_MAX_INTERVAL,
  PICKUP_MIN_INTERVAL,
  PLAYER_ACCELERATION,
  PLAYER_BRAKE_FORCE,
  PLAYER_DRAG,
  PLAYER_LOW_SPEED_TRACTION,
  PLAYER_MAX_INTEGRITY,
  PLAYER_MAX_SPEED,
  PLAYER_RADIUS,
  PLAYER_REVERSE_ACCELERATION,
  PLAYER_REVERSE_MAX_SPEED,
  PLAYER_TRACTION,
  PLAYER_TURN_SPEED,
  PURSUERS,
  SCORE_PER_SECOND,
  THREAT_MAX,
  THREAT_PER_CRASH,
  THREAT_PER_SECOND,
} from "./config"

import type {
  Decoy,
  Firewall,
  FloatingText,
  GameStatus,
  Particle,
  Pickup,
  PickupKind,
  Player,
  Pursuer,
  PursuerKind,
  Vec2,
} from "./types"

type TrailPoint = {
  x: number
  y: number
  width: number
  colour: TrailColour
  life: number
  maxLife: number
}

type TrailColour = {
  r: number
  g: number
  b: number
}

type Runtime = {
  status: GameStatus

  player: Player

  pursuers: Pursuer[]
  firewalls: Firewall[]
  pickups: Pickup[]
  decoys: Decoy[]

  playerTrail: TrailPoint[]
  trailSampleTimer: number
  trailColour: TrailColour

  particles: Particle[]
  texts: FloatingText[]

  score: number
  threat: number
  survived: number

  nextId: number

  pursuerSpawnTimer: number
  pickupSpawnTimer: number
  firewallSpawnTimer: number

  camera: Vec2

  powerupFlash: {
    timer: number
    duration: number
    colour: string
  }
}

type Hud = {
  status: GameStatus

  score: number
  threat: number
  integrity: number
  survived: number

  spoof: number
  encrypt: number
  ttl: number
}

const FONT =
  '"Comic Helvetic", sans-serif'

const TAU = Math.PI * 2

const makeSprite = (src: string) => {
  const image = new Image()

  // Start decoding immediately instead of waiting until the sprite is first
  // drawn. This avoids a small hitch the first time a power-up swaps the
  // player's car artwork.
  image.decoding = "async"
  image.src = src

  if (typeof image.decode === "function") {
    void image.decode().catch(() => {
      // The normal image load path is still valid if decode() is unavailable
      // or the browser rejects an early decode request.
    })
  }

  return image
}

const CAR_SPRITES = {
  corrupt: makeSprite(corruptCarUrl),
  fragment: makeSprite(corruptFragmentCarUrl),
  spoof: makeSprite(corruptSpoofCarUrl),
  encrypt: makeSprite(corruptEncryptCarUrl),
  police: makeSprite(policeCarUrl),
  interceptor: makeSprite(interceptorCarUrl),
  dpi: makeSprite(dpiCarUrl),
} as const

const PICKUP_SPRITES: Record<PickupKind, HTMLImageElement> = {
  spoof: makeSprite(spoofPickupUrl),
  fragment: makeSprite(fragmentPickupUrl),
  encrypt: makeSprite(encryptPickupUrl),
  ttl: makeSprite(ttlPickupUrl),
}


type CarBox = {
  x: number
  y: number
  angle: number
  width: number
  length: number
}

type CarCollision = {
  normalX: number
  normalY: number
  depth: number
}

const CAR_DIMENSIONS = {
  player: {
    spriteWidth: 54,
    spriteLength: 78,
    hitboxWidth: 42,
    hitboxLength: 70,
  },
  patrol: {
    spriteWidth: 54,
    spriteLength: 78,
    hitboxWidth: 42,
    hitboxLength: 70,
  },
  interceptor: {
    spriteWidth: 54,
    spriteLength: 78,
    hitboxWidth: 40,
    hitboxLength: 72,
  },
  dpi: {
    spriteWidth: 58.32,
    spriteLength: 84.24,
    hitboxWidth: 46,
    hitboxLength: 76,
  },
} as const

const getPursuerDimensions = (kind: PursuerKind) =>
  CAR_DIMENSIONS[kind]

const getCarAxes = (angle: number) => {
  const forwardX = Math.cos(angle)
  const forwardY = Math.sin(angle)

  return {
    forwardX,
    forwardY,
    rightX: -forwardY,
    rightY: forwardX,
  }
}

const projectCarOntoAxis = (
  car: CarBox,
  axisX: number,
  axisY: number
) => {
  const axes = getCarAxes(car.angle)
  const centre = car.x * axisX + car.y * axisY

  const radius =
    Math.abs(
      axes.rightX * axisX + axes.rightY * axisY
    ) *
      (car.width / 2) +
    Math.abs(
      axes.forwardX * axisX + axes.forwardY * axisY
    ) *
      (car.length / 2)

  return {
    min: centre - radius,
    max: centre + radius,
  }
}

/*
 * SAT collision for two rotated car rectangles. Besides telling us whether
 * the cars overlap, this returns the smallest translation needed to separate
 * them. The normal always points from B toward A.
 */
const carBoxCollision = (
  a: CarBox,
  b: CarBox
): CarCollision | null => {
  const aAxes = getCarAxes(a.angle)
  const bAxes = getCarAxes(b.angle)

  const axes = [
    { x: aAxes.rightX, y: aAxes.rightY },
    { x: aAxes.forwardX, y: aAxes.forwardY },
    { x: bAxes.rightX, y: bAxes.rightY },
    { x: bAxes.forwardX, y: bAxes.forwardY },
  ]

  let smallestDepth = Infinity
  let normalX = 0
  let normalY = 0

  for (const axis of axes) {
    const aProjection = projectCarOntoAxis(a, axis.x, axis.y)
    const bProjection = projectCarOntoAxis(b, axis.x, axis.y)

    const overlap =
      Math.min(aProjection.max, bProjection.max) -
      Math.max(aProjection.min, bProjection.min)

    if (overlap <= 0) {
      return null
    }

    if (overlap < smallestDepth) {
      smallestDepth = overlap
      normalX = axis.x
      normalY = axis.y
    }
  }

  const centreDeltaX = a.x - b.x
  const centreDeltaY = a.y - b.y

  if (centreDeltaX * normalX + centreDeltaY * normalY < 0) {
    normalX *= -1
    normalY *= -1
  }

  return {
    normalX,
    normalY,
    depth: smallestDepth,
  }
}

const playerCarBox = (player: Player): CarBox => ({
  x: player.x,
  y: player.y,
  angle: player.angle,
  width: CAR_DIMENSIONS.player.hitboxWidth,
  length: CAR_DIMENSIONS.player.hitboxLength,
})

const pursuerCarBox = (pursuer: Pursuer): CarBox => {
  const dimensions = getPursuerDimensions(pursuer.kind)

  return {
    x: pursuer.x,
    y: pursuer.y,
    angle: pursuer.angle,
    width: dimensions.hitboxWidth,
    length: dimensions.hitboxLength,
  }
}

const drawSprite = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  angle: number,
  width: number,
  height: number,
  alpha = 1
) => {
  if (!image.complete || image.naturalWidth === 0) return

  ctx.save()
  ctx.translate(x, y)
  // The supplied top-down cars face upward in their PNGs, while the game
  // stores 0 radians as facing right.
  ctx.rotate(angle + Math.PI / 2)
  ctx.globalAlpha = alpha
  ctx.drawImage(image, -width / 2, -height / 2, width, height)
  ctx.restore()
}

const WORLD_WIDTH = 5600
const WORLD_HEIGHT = 3600
const CAMERA_LOOK_AHEAD = 185
const CAMERA_FOLLOW_SPEED = 5.4
const POLICE_SPAWN_MIN_DISTANCE = 660
const POLICE_SPAWN_MAX_DISTANCE = 900
const POLICE_DESPAWN_DISTANCE = 2200
const POLICE_SEPARATION_RADIUS = 118
const POLICE_SEPARATION_FORCE = 290
const POLICE_ESCAPE_RADIUS = 48
const POLICE_ESCAPE_FORCE = 980
const POLICE_SIDE_STEP_FORCE = 470
const POLICE_CATCHUP_START = 520
const POLICE_CATCHUP_FULL = 1100
const POLICE_CATCHUP_SPEED = 95
const POLICE_FORWARD_SPAWN_BIAS = 0.60

const clamp = (
  value: number,
  min: number,
  max: number
) =>
  Math.max(
    min,
    Math.min(max, value)
  )

const length = (
  x: number,
  y: number
) => Math.hypot(x, y)

const distance = (
  a: Vec2,
  b: Vec2
) =>
  Math.hypot(
    a.x - b.x,
    a.y - b.y
  )

const normalizeAngle = (
  angle: number
) => {
  while (angle > Math.PI) {
    angle -= TAU
  }

  while (angle < -Math.PI) {
    angle += TAU
  }

  return angle
}

const createPlayer =
  (): Player => ({
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,

    vx: 0,
    vy: 0,

    angle: -Math.PI / 2,

    radius: PLAYER_RADIUS,

    integrity:
      PLAYER_MAX_INTEGRITY,

    maxIntegrity:
      PLAYER_MAX_INTEGRITY,

    invulnerable: 0,

    spoofTimer: 0,
    encryptTimer: 0,
    ttlTimer: 0,
  })

const createRuntime =
  (): Runtime => ({
    status: "ready",

    player: createPlayer(),

    pursuers: [],
    firewalls: [],
    pickups: [],
    decoys: [],

    playerTrail: [],
    trailSampleTimer: 0,
    trailColour: {
      r: 239,
      g: 68,
      b: 68,
    },

    particles: [],
    texts: [],

    score: 0,
    threat: 0,
    survived: 0,

    nextId: 1,

    pursuerSpawnTimer: 1.8,
    pickupSpawnTimer: PICKUP_INITIAL_DELAY,
    firewallSpawnTimer: 9,

    camera: {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
    },

    powerupFlash: {
      timer: 0,
      duration: 0.18,
      colour: CAR_GLOW.corrupt,
    },
  })

const initialHud: Hud = {
  status: "ready",

  score: 0,
  threat: 0,

  integrity:
    PLAYER_MAX_INTEGRITY,

  survived: 0,

  spoof: 0,
  encrypt: 0,
  ttl: 0,
}

function randomPoliceSpawnPoint(
  player: Player
): Vec2 {
  const speed =
    Math.hypot(
      player.vx,
      player.vy
    )

  const travelAngle =
    speed > 35
      ? Math.atan2(
          player.vy,
          player.vx
        )
      : player.angle

  for (
    let attempt = 0;
    attempt < 24;
    attempt += 1
  ) {
    /*
     * Most reinforcements enter somewhere ahead or to the side of
     * the packet. They remain outside the camera, but can now form
     * an interception rather than always joining the chase behind.
     */
    const ahead =
      Math.random() <
      0.78

    const angle =
      ahead
        ? travelAngle +
          (
            Math.random() -
            0.5
          ) *
            Math.PI
        : travelAngle +
          Math.PI +
          (
            Math.random() -
            0.5
          ) *
            1.4

    const spawnDistance =
      POLICE_SPAWN_MIN_DISTANCE +
      Math.random() *
        (
          POLICE_SPAWN_MAX_DISTANCE -
          POLICE_SPAWN_MIN_DISTANCE
        )

    const x =
      player.x +
      Math.cos(angle) *
        spawnDistance

    const y =
      player.y +
      Math.sin(angle) *
        spawnDistance

    if (
      x > 80 &&
      x < WORLD_WIDTH - 80 &&
      y > 80 &&
      y < WORLD_HEIGHT - 80
    ) {
      return {
        x,
        y,
      }
    }
  }

  const centreAngle =
    Math.atan2(
      WORLD_HEIGHT / 2 -
        player.y,
      WORLD_WIDTH / 2 -
        player.x
    )

  return {
    x: clamp(
      player.x +
        Math.cos(
          centreAngle
        ) *
          POLICE_SPAWN_MIN_DISTANCE,
      80,
      WORLD_WIDTH - 80
    ),

    y: clamp(
      player.y +
        Math.sin(
          centreAngle
        ) *
          POLICE_SPAWN_MIN_DISTANCE,
      80,
      WORLD_HEIGHT - 80
    ),
  }
}

function randomPickupPoint(
  player: Player
): Vec2 {
  const angle = Math.random() * TAU
  const spawnDistance = 260 + Math.random() * 560

  return {
    x: clamp(
      player.x + Math.cos(angle) * spawnDistance,
      70,
      WORLD_WIDTH - 70
    ),
    y: clamp(
      player.y + Math.sin(angle) * spawnDistance,
      70,
      WORLD_HEIGHT - 70
    ),
  }
}

function circleRectCollision(
  x: number,
  y: number,
  radius: number,
  rect: Firewall
) {
  const closestX = clamp(
    x,
    rect.x,
    rect.x + rect.width
  )

  const closestY = clamp(
    y,
    rect.y,
    rect.y + rect.height
  )

  const dx =
    x - closestX

  const dy =
    y - closestY

  return (
    dx * dx +
      dy * dy <
    radius * radius
  )
}

function drawNetwork(
  ctx: CanvasRenderingContext2D,
  time: number,
  camera: Vec2
) {
  /*
   * PERFORMANCE NOTE
   *
   * The world is 5600x3600, but the browser only needs to paint the small
   * portion currently around the camera. Everything in this function is
   * therefore culled against the visible world-space rectangle before any
   * expensive glow, shadow or animation work is performed.
   */
  const VIEW_PADDING = 150

  const viewLeft =
    camera.x -
    GAME_WIDTH / 2 -
    VIEW_PADDING

  const viewRight =
    camera.x +
    GAME_WIDTH / 2 +
    VIEW_PADDING

  const viewTop =
    camera.y -
    GAME_HEIGHT / 2 -
    VIEW_PADDING

  const viewBottom =
    camera.y +
    GAME_HEIGHT / 2 +
    VIEW_PADDING

  const pointVisible = (
    x: number,
    y: number,
    padding = 0
  ) =>
    x >= viewLeft - padding &&
    x <= viewRight + padding &&
    y >= viewTop - padding &&
    y <= viewBottom + padding

  const rectVisible = (
    x: number,
    y: number,
    width: number,
    height: number,
    padding = 0
  ) =>
    x + width >= viewLeft - padding &&
    x <= viewRight + padding &&
    y + height >= viewTop - padding &&
    y <= viewBottom + padding

  const segmentVisible = (
    a: Vec2,
    b: Vec2,
    padding = 0
  ) => {
    const minX =
      Math.min(a.x, b.x) -
      padding

    const maxX =
      Math.max(a.x, b.x) +
      padding

    const minY =
      Math.min(a.y, b.y) -
      padding

    const maxY =
      Math.max(a.y, b.y) +
      padding

    return (
      maxX >= viewLeft &&
      minX <= viewRight &&
      maxY >= viewTop &&
      minY <= viewBottom
    )
  }

  const traceVisibleSegments = (
    route: Vec2[],
    padding = 60
  ) => {
    ctx.beginPath()

    let hasVisibleSegment = false

    for (
      let i = 0;
      i < route.length - 1;
      i += 1
    ) {
      const a = route[i]
      const b = route[i + 1]

      if (
        !segmentVisible(
          a,
          b,
          padding
        )
      ) {
        continue
      }

      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      hasVisibleSegment = true
    }

    return hasVisibleSegment
  }

  /*
   * Only fill the visible world region. The canvas itself was already
   * cleared before the camera transform, so there is no reason to repaint
   * all 20 million world pixels every frame.
   */
  ctx.fillStyle = "#000112"
  ctx.fillRect(
    Math.max(0, viewLeft),
    Math.max(0, viewTop),
    Math.min(
      WORLD_WIDTH,
      viewRight
    ) -
      Math.max(0, viewLeft),
    Math.min(
      WORLD_HEIGHT,
      viewBottom
    ) -
      Math.max(0, viewTop)
  )

  const districts = [
    { x: 240, y: 260, width: 1250, height: 900, label: "PUBLIC SUBNET", code: "10.0.1.x" },
    { x: 2000, y: 180, width: 1450, height: 950, label: "API CLUSTER", code: "10.12.4.x" },
    { x: 4020, y: 280, width: 1250, height: 880, label: "SECURE VLAN", code: "10.4.8.x" },
    { x: 330, y: 2230, width: 1450, height: 1020, label: "LEGACY NETWORK", code: "172.16.3.x" },
    { x: 2130, y: 2050, width: 1320, height: 1120, label: "CORE BACKBONE", code: "10.255.0.x" },
    { x: 3980, y: 2130, width: 1320, height: 1050, label: "DATA CENTRE", code: "192.168.7.x" },
  ]

  /*
   * VISIBLE GRID ONLY
   *
   * Instead of drawing every grid line across the complete world, begin at
   * the first grid coordinate inside the camera region and stop immediately
   * after leaving it.
   */
  ctx.save()
  ctx.strokeStyle =
    "rgba(113, 128, 150, 0.055)"
  ctx.lineWidth = 1

  const firstGridX =
    NETWORK_MARGIN +
    Math.floor(
      (
        Math.max(
          0,
          viewLeft
        ) -
        NETWORK_MARGIN
      ) /
        GRID_GAP
    ) *
      GRID_GAP

  const firstGridY =
    NETWORK_MARGIN +
    Math.floor(
      (
        Math.max(
          0,
          viewTop
        ) -
        NETWORK_MARGIN
      ) /
        GRID_GAP
    ) *
      GRID_GAP

  const gridTop =
    Math.max(
      0,
      viewTop
    )

  const gridBottom =
    Math.min(
      WORLD_HEIGHT,
      viewBottom
    )

  const gridLeft =
    Math.max(
      0,
      viewLeft
    )

  const gridRight =
    Math.min(
      WORLD_WIDTH,
      viewRight
    )

  for (
    let x = firstGridX;
    x <= gridRight;
    x += GRID_GAP
  ) {
    if (x < 0) continue

    ctx.beginPath()
    ctx.moveTo(x, gridTop)
    ctx.lineTo(x, gridBottom)
    ctx.stroke()
  }

  for (
    let y = firstGridY;
    y <= gridBottom;
    y += GRID_GAP
  ) {
    if (y < 0) continue

    ctx.beginPath()
    ctx.moveTo(gridLeft, y)
    ctx.lineTo(gridRight, y)
    ctx.stroke()
  }

  ctx.restore()

  /*
   * DISTRICTS
   *
   * Large zone panels are completely skipped while they are outside the
   * camera. This also avoids off-screen text measurement and dashed strokes.
   */
  for (const district of districts) {
    if (
      !rectVisible(
        district.x,
        district.y,
        district.width,
        district.height,
        80
      )
    ) {
      continue
    }

    const inset = 8

    ctx.save()

    ctx.fillStyle =
      "rgba(8, 15, 34, 0.34)"
    ctx.strokeStyle =
      "rgba(100, 116, 139, 0.11)"
    ctx.lineWidth = 2
    ctx.setLineDash([18, 20])

    ctx.beginPath()
    ctx.roundRect(
      district.x,
      district.y,
      district.width,
      district.height,
      42
    )
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])

    const corner = 68

    ctx.strokeStyle =
      "rgba(34, 211, 238, 0.16)"
    ctx.lineWidth = 4
    ctx.lineCap = "round"

    const left =
      district.x + inset

    const right =
      district.x +
      district.width -
      inset

    const top =
      district.y + inset

    const bottom =
      district.y +
      district.height -
      inset

    ctx.beginPath()

    ctx.moveTo(
      left,
      top + corner
    )
    ctx.lineTo(left, top)
    ctx.lineTo(
      left + corner,
      top
    )

    ctx.moveTo(
      right - corner,
      top
    )
    ctx.lineTo(right, top)
    ctx.lineTo(
      right,
      top + corner
    )

    ctx.moveTo(
      left,
      bottom - corner
    )
    ctx.lineTo(left, bottom)
    ctx.lineTo(
      left + corner,
      bottom
    )

    ctx.moveTo(
      right - corner,
      bottom
    )
    ctx.lineTo(right, bottom)
    ctx.lineTo(
      right,
      bottom - corner
    )

    ctx.stroke()

    ctx.fillStyle =
      "rgba(226, 232, 240, 0.34)"
    ctx.font =
      `700 20px ${FONT}`
    ctx.textAlign = "left"

    ctx.fillText(
      district.label,
      district.x + 32,
      district.y + 43
    )

    ctx.fillStyle =
      "rgba(103, 232, 249, 0.23)"
    ctx.font =
      `600 12px ${FONT}`

    ctx.fillText(
      district.code,
      district.x + 32,
      district.y + 66
    )

    ctx.restore()
  }

  const backboneRoutes: Vec2[][] = [
    [
      { x: 0, y: 1740 },
      { x: 1500, y: 1740 },
      { x: 2050, y: 1420 },
      { x: 3550, y: 1420 },
      { x: 4100, y: 1740 },
      { x: WORLD_WIDTH, y: 1740 },
    ],
    [
      { x: 2800, y: 0 },
      { x: 2800, y: 1180 },
      { x: 3150, y: 1740 },
      { x: 2800, y: 2250 },
      { x: 2800, y: WORLD_HEIGHT },
    ],
    [
      { x: 700, y: 700 },
      { x: 1700, y: 1280 },
      { x: 2800, y: 1740 },
      { x: 3900, y: 2360 },
      { x: 4920, y: 2860 },
    ],
    [
      { x: 4750, y: 720 },
      { x: 3900, y: 1220 },
      { x: 2800, y: 1740 },
      { x: 1700, y: 2360 },
      { x: 880, y: 2860 },
    ],
  ]

  /*
   * NETWORK ROADS
   *
   * The road design is unchanged, but each pass now contains ONLY segments
   * intersecting the camera. Most importantly, the moving dashed/glowing
   * pass no longer animates kilometres of invisible road.
   */
  ctx.save()
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  for (const route of backboneRoutes) {
    ctx.shadowBlur = 0
    ctx.strokeStyle =
      "rgba(1, 4, 15, 0.96)"
    ctx.lineWidth = 42

    if (
      traceVisibleSegments(
        route,
        40
      )
    ) {
      ctx.stroke()
    }
  }

  for (const route of backboneRoutes) {
    ctx.shadowColor = "#22d3ee"
    ctx.shadowBlur = 15
    ctx.strokeStyle =
      "rgba(34, 211, 238, 0.26)"
    ctx.lineWidth = 32

    if (
      traceVisibleSegments(
        route,
        55
      )
    ) {
      ctx.stroke()
    }
  }

  for (const route of backboneRoutes) {
    ctx.shadowBlur = 0
    ctx.strokeStyle =
      "rgba(4, 12, 28, 0.96)"
    ctx.lineWidth = 24

    if (
      traceVisibleSegments(
        route,
        35
      )
    ) {
      ctx.stroke()
    }
  }

  /*
   * STATIC BACKBONE FINISH
   *
   * No moving centre line: the cars and gameplay effects provide the motion.
   */
  ctx.setLineDash([])
  ctx.shadowBlur = 0
  ctx.restore()

  const circuitBranches: Vec2[][] = [
    [{ x: 500, y: 1320 }, { x: 760, y: 1320 }, { x: 880, y: 1200 }],
    [{ x: 1120, y: 2140 }, { x: 1380, y: 2140 }, { x: 1510, y: 2010 }],
    [{ x: 2180, y: 920 }, { x: 2360, y: 920 }, { x: 2460, y: 1020 }],
    [{ x: 3370, y: 760 }, { x: 3540, y: 760 }, { x: 3650, y: 870 }],
    [{ x: 4220, y: 1440 }, { x: 4410, y: 1440 }, { x: 4520, y: 1330 }],
    [{ x: 3550, y: 2860 }, { x: 3740, y: 2860 }, { x: 3860, y: 2740 }],
    [{ x: 4630, y: 2240 }, { x: 4830, y: 2240 }, { x: 4940, y: 2350 }],
    [{ x: 1870, y: 3100 }, { x: 2070, y: 3100 }, { x: 2180, y: 2990 }],
  ]

  ctx.save()
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle =
    "rgba(34, 211, 238, 0.10)"
  ctx.lineWidth = 5

  for (
    const branch of
    circuitBranches
  ) {
    if (
      !traceVisibleSegments(
        branch,
        30
      )
    ) {
      continue
    }

    ctx.stroke()

    const end =
      branch[
        branch.length - 1
      ]

    if (
      pointVisible(
        end.x,
        end.y,
        30
      )
    ) {
      ctx.fillStyle =
        "rgba(103, 232, 249, 0.18)"
      ctx.shadowColor =
        "#22d3ee"
      ctx.shadowBlur = 8

      ctx.beginPath()
      ctx.arc(
        end.x,
        end.y,
        5,
        0,
        TAU
      )
      ctx.fill()
    }
  }

  ctx.restore()

  const nodes = [
    { x: 760, y: 720, label: "EDGE ROUTER" },
    { x: 1250, y: 1010, label: "DNS-01" },
    { x: 2350, y: 620, label: "API-01" },
    { x: 3050, y: 760, label: "API-02" },
    { x: 4520, y: 690, label: "VPN GATEWAY" },
    { x: 4920, y: 980, label: "AUTH" },
    { x: 900, y: 2640, label: "OLD-SRV" },
    { x: 1460, y: 3000, label: "FTP" },
    { x: 2800, y: 1740, label: "CORE ROUTER" },
    { x: 2460, y: 2700, label: "SWITCH-04" },
    { x: 4380, y: 2550, label: "CACHE" },
    { x: 4860, y: 2920, label: "DB-03" },
  ]

  /*
   * NODE ANIMATION CULLING
   *
   * Pulsing/scaling and shadowBlur are only calculated for hardware that can
   * actually be seen.
   */
  for (const node of nodes) {
    if (
      !pointVisible(
        node.x,
        node.y,
        100
      )
    ) {
      continue
    }

    const pulse =
      1 +
      Math.sin(
        time * 0.002 +
          node.x * 0.002
      ) *
        0.025

    ctx.save()
    ctx.translate(
      node.x,
      node.y
    )
    ctx.scale(
      pulse,
      pulse
    )

    ctx.globalAlpha = 0.28
    ctx.fillStyle = "#22d3ee"
    ctx.shadowColor = "#22d3ee"
    ctx.shadowBlur = 24

    ctx.beginPath()
    ctx.ellipse(
      0,
      9,
      61,
      28,
      0,
      0,
      TAU
    )
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.shadowBlur = 0

    ctx.fillStyle =
      "rgba(3, 10, 25, 0.98)"
    ctx.strokeStyle =
      "rgba(103, 232, 249, 0.72)"
    ctx.lineWidth = 3

    ctx.beginPath()
    ctx.roundRect(
      -58,
      -27,
      116,
      54,
      12
    )
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle =
      "rgba(34, 211, 238, 0.22)"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.roundRect(
      -49,
      -18,
      98,
      36,
      8
    )
    ctx.stroke()

    const blink =
      0.45 +
      Math.sin(
        time * 0.005 +
          node.y
      ) *
        0.25

    ctx.fillStyle =
      `rgba(34, 197, 94, ${
        0.65 +
        blink * 0.25
      })`

    ctx.shadowColor =
      "#22c55e"
    ctx.shadowBlur = 7

    ctx.beginPath()
    ctx.arc(
      -42,
      -11,
      3.5,
      0,
      TAU
    )
    ctx.fill()

    ctx.fillStyle =
      "rgba(103, 232, 249, 0.82)"
    ctx.shadowColor =
      "#67e8f9"

    ctx.beginPath()
    ctx.arc(
      -31,
      -11,
      3.5,
      0,
      TAU
    )
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.fillStyle =
      "rgba(226, 232, 240, 0.88)"
    ctx.font =
      `700 11px ${FONT}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    ctx.fillText(
      node.label,
      7,
      6
    )

    ctx.restore()
  }

  const junctions = [
    { x: 1500, y: 1740 },
    { x: 2050, y: 1420 },
    { x: 3550, y: 1420 },
    { x: 4100, y: 1740 },
    { x: 2800, y: 1180 },
    { x: 3150, y: 1740 },
    { x: 2800, y: 2250 },
    { x: 1700, y: 1280 },
    { x: 3900, y: 2360 },
    { x: 3900, y: 1220 },
    { x: 1700, y: 2360 },
  ]

  ctx.save()

  for (
    const junction of
    junctions
  ) {
    if (
      !pointVisible(
        junction.x,
        junction.y,
        35
      )
    ) {
      continue
    }

    const pulse =
      0.75 +
      Math.sin(
        time * 0.004 +
          junction.x * 0.01
      ) *
        0.15

    ctx.globalAlpha = pulse
    ctx.fillStyle = "#67e8f9"
    ctx.shadowColor = "#22d3ee"
    ctx.shadowBlur = 12

    ctx.beginPath()
    ctx.arc(
      junction.x,
      junction.y,
      5.5,
      0,
      TAU
    )
    ctx.fill()

    ctx.globalAlpha = 0.5
    ctx.strokeStyle = "#67e8f9"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.arc(
      junction.x,
      junction.y,
      11,
      0,
      TAU
    )
    ctx.stroke()
  }

  ctx.restore()

  /*
   * The world boundary only needs painting when the camera is close enough
   * to see one of its four edges.
   */
  const boundaryVisible =
    viewLeft <= 60 ||
    viewRight >=
      WORLD_WIDTH - 60 ||
    viewTop <= 60 ||
    viewBottom >=
      WORLD_HEIGHT - 60

  if (boundaryVisible) {
    ctx.save()

    ctx.strokeStyle =
      "rgba(248, 113, 113, 0.12)"
    ctx.lineWidth = 16
    ctx.shadowColor = "#ef4444"
    ctx.shadowBlur = 12

    ctx.strokeRect(
      22,
      22,
      WORLD_WIDTH - 44,
      WORLD_HEIGHT - 44
    )

    ctx.shadowBlur = 0
    ctx.strokeStyle =
      "rgba(248, 113, 113, 0.42)"
    ctx.lineWidth = 2
    ctx.setLineDash([28, 20])
    ctx.lineDashOffset =
      time * 0.015

    ctx.strokeRect(
      22,
      22,
      WORLD_WIDTH - 44,
      WORLD_HEIGHT - 44
    )

    ctx.restore()
  }
}
const CAR_GLOW = {
  corrupt: "#ef4444",
  fragment: "#ef4444",
  spoof: "#3b82f6",
  encrypt: "#22c55e",
  ttl: "#f97316",
  police: "#3b82f6",
  interceptor: "#a855f7",
  dpi: "#3b82f6",
} as const

function drawCarUnderglow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  width: number,
  length: number,
  colour: string,
  alpha = 1
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  /*
   * Two soft ellipses give the impression that the light is coming from
   * underneath the chassis rather than being a halo baked around the PNG.
   */
  ctx.globalAlpha = 0.18 * alpha
  ctx.fillStyle = colour
  ctx.shadowColor = colour
  ctx.shadowBlur = 18

  ctx.beginPath()
  ctx.ellipse(
    0,
    0,
    length * 0.43,
    width * 0.42,
    0,
    0,
    TAU
  )
  ctx.fill()

  ctx.globalAlpha = 0.11 * alpha
  ctx.shadowBlur = 28
  ctx.beginPath()
  ctx.ellipse(
    0,
    0,
    length * 0.50,
    width * 0.50,
    0,
    0,
    TAU
  )
  ctx.fill()

  ctx.restore()
}

const TRAIL_MAX_POINTS = 24
const TRAIL_SAMPLE_INTERVAL = 0.035
const TRAIL_LIFETIME = 0.9

const TRAIL_COLOURS: Record<
  "corrupt" | "spoof" | "encrypt" | "ttl",
  TrailColour
> = {
  corrupt: { r: 239, g: 68, b: 68 },
  spoof: { r: 59, g: 130, b: 246 },
  encrypt: { r: 34, g: 197, b: 94 },
  ttl: { r: 249, g: 115, b: 22 },
}

const mixTrailColour = (
  current: TrailColour,
  target: TrailColour,
  amount: number
): TrailColour => ({
  r:
    current.r +
    (target.r - current.r) *
      amount,
  g:
    current.g +
    (target.g - current.g) *
      amount,
  b:
    current.b +
    (target.b - current.b) *
      amount,
})

const trailCss = (
  colour: TrailColour,
  alpha: number
) =>
  `rgba(${Math.round(colour.r)}, ${Math.round(
    colour.g
  )}, ${Math.round(colour.b)}, ${alpha})`

function drawPlayerTrail(
  ctx: CanvasRenderingContext2D,
  trail: TrailPoint[]
) {
  if (trail.length < 2) return

  ctx.save()
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  /*
   * Two inexpensive passes create a soft neon ribbon. There is intentionally
   * no shadowBlur here: the trail stays cheap even during a busy chase.
   */
  for (let i = 1; i < trail.length; i += 1) {
    const a = trail[i - 1]
    const b = trail[i]
    const fade = clamp(b.life / b.maxLife, 0, 1)
    const alpha = fade * fade

    ctx.strokeStyle = trailCss(b.colour, 0.12 * alpha)
    ctx.lineWidth = Math.max(1, b.width * 2.15)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  for (let i = 1; i < trail.length; i += 1) {
    const a = trail[i - 1]
    const b = trail[i]
    const fade = clamp(b.life / b.maxLife, 0, 1)
    const alpha = fade * fade

    ctx.strokeStyle = trailCss(b.colour, 0.55 * alpha)
    ctx.lineWidth = Math.max(0.8, b.width * 0.62)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  ctx.restore()
}

function drawPacket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  alpha = 1,
  variant: "corrupt" | "fragment" | "spoof" | "encrypt" = "corrupt",
  glowOverride?: string
) {
  const glowColour =
    glowOverride ??
    CAR_GLOW[variant]

  drawCarUnderglow(
    ctx,
    x,
    y,
    angle,
    CAR_DIMENSIONS.player.spriteWidth,
    CAR_DIMENSIONS.player.spriteLength,
    glowColour,
    alpha
  )

  drawSprite(
    ctx,
    CAR_SPRITES[variant],
    x,
    y,
    angle,
    CAR_DIMENSIONS.player.spriteWidth,
    CAR_DIMENSIONS.player.spriteLength,
    alpha
  )
}

function drawPursuer(
  ctx: CanvasRenderingContext2D,
  pursuer: Pursuer
) {
  const sprite =
    pursuer.kind === "dpi"
      ? CAR_SPRITES.dpi
      : pursuer.kind === "interceptor"
        ? CAR_SPRITES.interceptor
        : CAR_SPRITES.police

  const dimensions =
    getPursuerDimensions(
      pursuer.kind
    )

  const glowColour =
    pursuer.kind === "interceptor"
      ? CAR_GLOW.interceptor
      : pursuer.kind === "dpi"
        ? CAR_GLOW.dpi
        : CAR_GLOW.police

  drawCarUnderglow(
    ctx,
    pursuer.x,
    pursuer.y,
    pursuer.angle,
    dimensions.spriteWidth,
    dimensions.spriteLength,
    glowColour
  )

  if (pursuer.hitFlash > 0) {
    ctx.save()
    ctx.globalAlpha =
      Math.min(
        0.55,
        pursuer.hitFlash * 3
      )
    ctx.shadowBlur = 20
    ctx.shadowColor = "#ffffff"

    drawSprite(
      ctx,
      sprite,
      pursuer.x,
      pursuer.y,
      pursuer.angle,
      dimensions.spriteWidth,
      dimensions.spriteLength
    )

    ctx.restore()
  }

  drawSprite(
    ctx,
    sprite,
    pursuer.x,
    pursuer.y,
    pursuer.angle,
    dimensions.spriteWidth,
    dimensions.spriteLength
  )
}

function NetworkGame() {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    )

  const runtimeRef =
    useRef<Runtime>(
      createRuntime()
    )

  const keysRef =
    useRef<Set<string>>(
      new Set()
    )

  const animationRef =
    useRef<number | null>(
      null
    )

  const previousTimeRef =
    useRef<number | null>(
      null
    )

  const hudTimerRef =
    useRef(0)

  const [hud, setHud] =
    useState<Hud>(
      initialHud
    )

  const syncHud =
    useCallback(() => {
      const r =
        runtimeRef.current

      setHud({
        status:
          r.status,

        score:
          Math.floor(
            r.score
          ),

        threat:
          r.threat,

        integrity:
          Math.max(
            0,
            r.player
              .integrity
          ),

        survived:
          r.survived,

        spoof:
          r.player
            .spoofTimer,

        encrypt:
          r.player
            .encryptTimer,

        ttl:
          r.player
            .ttlTimer,
      })
    }, [])

  const addText = (
    r: Runtime,
    text: string,
    x: number,
    y: number
  ) => {
    r.texts.push({
      id:
        r.nextId++,

      text,

      x,
      y,

      life: 1.15,
    })
  }

  const burst = (
    r: Runtime,
    x: number,
    y: number,
    amount: number
  ) => {
    for (
      let i = 0;
      i < amount;
      i += 1
    ) {
      const angle =
        Math.random() *
        TAU

      const speed =
        40 +
        Math.random() *
          150

      const life =
        0.35 +
        Math.random() *
          0.55

      r.particles.push({
        id:
          r.nextId++,

        x,
        y,

        vx:
          Math.cos(
            angle
          ) *
          speed,

        vy:
          Math.sin(
            angle
          ) *
          speed,

        life,

        maxLife:
          life,

        size:
          1.5 +
          Math.random() *
            3,
      })
    }
  }

  const startGame =
    useCallback(() => {
      const next =
        createRuntime()

      next.status =
        "running"

      runtimeRef.current =
        next

      previousTimeRef.current =
        null

      syncHud()
    }, [syncHud])

  useEffect(() => {
    const onKeyDown = (
      event: KeyboardEvent
    ) => {
      const key =
        event.key.toLowerCase()

      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "enter",
          " ",
        ].includes(key)
      ) {
        event.preventDefault()
      }

      if (
        key === "enter"
      ) {
        if (
          runtimeRef.current
            .status !==
          "running"
        ) {
          startGame()
        }

        return
      }

      keysRef.current.add(
        key
      )
    }

    const onKeyUp = (
      event: KeyboardEvent
    ) => {
      keysRef.current.delete(
        event.key.toLowerCase()
      )
    }

    window.addEventListener(
      "keydown",
      onKeyDown
    )

    window.addEventListener(
      "keyup",
      onKeyUp
    )

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      )

      window.removeEventListener(
        "keyup",
        onKeyUp
      )
    }
  }, [startGame])

  useEffect(() => {
    const canvas =
      canvasRef.current

    if (!canvas) {
      return
    }

    const ctx =
      canvas.getContext(
        "2d"
      )

    if (!ctx) {
      return
    }

    const spawnPursuer = (
      r: Runtime
    ) => {
      const threat =
        Math.max(
          1,
          Math.ceil(
            r.threat
          )
        )

      let kind: PursuerKind =
        "patrol"

      const roll =
        Math.random()

      if (
        threat >= 4 &&
        roll < 0.34
      ) {
        kind = "dpi"
      } else if (
        threat >= 2 &&
        roll < 0.68
      ) {
        kind =
          "interceptor"
      }

      const point =
        randomPoliceSpawnPoint(
          r.player
        )

      const config =
        PURSUERS[kind]

      const inwardAngle =
        Math.atan2(
          r.player.y -
            point.y,

          r.player.x -
            point.x
        )

      const entrySpeed =
        config.speed *
        0.42

      r.pursuers.push({
        id:
          r.nextId++,

        x:
          point.x,

        y:
          point.y,

        vx:
          Math.cos(
            inwardAngle
          ) *
          entrySpeed,

        vy:
          Math.sin(
            inwardAngle
          ) *
          entrySpeed,

        angle:
          inwardAngle,

        radius:
          config.radius,

        kind,

        health:
          config.health,

        maxHealth:
          config.health,

        hitFlash: 0,
      })
    }

    const spawnPickup = (
      r: Runtime
    ) => {
      const kinds: PickupKind[] =
        [
          "spoof",
          "fragment",
          "encrypt",
          "ttl",
        ]

      const kind =
        kinds[
          Math.floor(
            Math.random() *
              kinds.length
          )
        ]

      const point =
        randomPickupPoint(
          r.player
        )

      r.pickups.push({
        id:
          r.nextId++,

        kind,

        x:
          point.x,

        y:
          point.y,

        radius: 27,

        pulse: 0,
      })
    }

    const spawnFirewall = (
      r: Runtime
    ) => {
      const horizontal =
        Math.random() >
        0.5

      const width =
        horizontal
          ? 130 +
            Math.random() *
              80
          : 18

      const height =
        horizontal
          ? 18
          : 130 +
            Math.random() *
              80

      const angle =
        Math.random() * TAU

      const spawnDistance =
        300 +
        Math.random() * 650

      const x =
        clamp(
          r.player.x +
            Math.cos(angle) *
              spawnDistance -
            width / 2,
          80,
          WORLD_WIDTH - width - 80
        )

      const y =
        clamp(
          r.player.y +
            Math.sin(angle) *
              spawnDistance -
            height / 2,
          80,
          WORLD_HEIGHT - height - 80
        )

      r.firewalls.push({
        id:
          r.nextId++,

        x,
        y,

        width,
        height,

        horizontal,

        ttl:
          10 +
          Math.random() *
            7,
      })
    }

    const applyPickup = (
      r: Runtime,
      pickup: Pickup
    ) => {
      const p =
        r.player

      const flashColour: Record<PickupKind, string> = {
        spoof: CAR_GLOW.spoof,
        fragment: CAR_GLOW.fragment,
        encrypt: CAR_GLOW.encrypt,
        ttl: CAR_GLOW.ttl,
      }

      // Keep the normal corrupt car visible for a split second and hit it with
      // a bright pickup flash. The powered-up colour appears immediately after
      // the flash, making the transformation feel deliberate rather than like
      // a sprite suddenly changing between frames.
      r.powerupFlash.timer = r.powerupFlash.duration
      r.powerupFlash.colour = flashColour[pickup.kind]

      if (
        pickup.kind ===
        "spoof"
      ) {
        p.spoofTimer =
          PICKUPS.spoof
            .duration ??
          4.5

        addText(
          r,
          "IDENTITY SPOOFED",
          pickup.x,
          pickup.y
        )
      }

      if (
        pickup.kind ===
        "encrypt"
      ) {
        p.encryptTimer =
          PICKUPS.encrypt
            .duration ??
          5.5

        addText(
          r,
          "PAYLOAD ENCRYPTED",
          pickup.x,
          pickup.y
        )
      }

      if (
        pickup.kind ===
        "ttl"
      ) {
        p.ttlTimer =
          PICKUPS.ttl
            .duration ??
          4.5

        addText(
          r,
          "TTL BOOST",
          pickup.x,
          pickup.y
        )
      }

      if (
        pickup.kind ===
        "fragment"
      ) {
        for (
          let i = 0;
          i < 4;
          i += 1
        ) {
          const angle =
            Math.random() *
            TAU

          const speed =
            110 +
            Math.random() *
              80

          r.decoys.push({
            id:
              r.nextId++,

            x:
              p.x,

            y:
              p.y,

            vx:
              Math.cos(
                angle
              ) *
              speed,

            vy:
              Math.sin(
                angle
              ) *
              speed,

            ttl:
              4 +
              Math.random() *
                1.5,
          })
        }

        addText(
          r,
          "PACKET FRAGMENTED",
          pickup.x,
          pickup.y
        )
      }

      r.score += 500

      burst(
        r,
        pickup.x,
        pickup.y,
        14
      )
    }

    const update = (
      dt: number
    ) => {
      const r =
        runtimeRef.current

      if (
        r.status !==
        "running"
      ) {
        return
      }

      const p =
        r.player

      const keys =
        keysRef.current

      r.survived += dt

      r.score +=
        SCORE_PER_SECOND *
        dt *
        (
          1 +
          r.threat *
            0.12
        )

      r.threat =
        clamp(
          r.threat +
            THREAT_PER_SECOND *
              dt,

          0,
          THREAT_MAX
        )

      p.invulnerable =
        Math.max(
          0,
          p.invulnerable -
            dt
        )

      p.spoofTimer =
        Math.max(
          0,
          p.spoofTimer -
            dt
        )

      p.encryptTimer =
        Math.max(
          0,
          p.encryptTimer -
            dt
        )

      p.ttlTimer =
        Math.max(
          0,
          p.ttlTimer -
            dt
        )

      r.powerupFlash.timer =
        Math.max(
          0,
          r.powerupFlash.timer - dt
        )

      /*
       * PLAYER DATA TRAIL
       *
       * Colour eases toward the currently active power-up instead of snapping.
       * Every sample keeps its own colour, so transformations leave a genuine
       * red -> blue/green/orange gradient behind the car.
       */
      const trailTarget =
        p.encryptTimer > 0
          ? TRAIL_COLOURS.encrypt
          : p.spoofTimer > 0
            ? TRAIL_COLOURS.spoof
            : p.ttlTimer > 0
              ? TRAIL_COLOURS.ttl
              : TRAIL_COLOURS.corrupt

      const trailBlend =
        1 - Math.exp(-5.4 * dt)

      r.trailColour =
        mixTrailColour(
          r.trailColour,
          trailTarget,
          trailBlend
        )

      for (const point of r.playerTrail) {
        point.life -= dt
      }

      r.playerTrail =
        r.playerTrail.filter(
          (point) => point.life > 0
        )

      const trailSpeed =
        Math.hypot(p.vx, p.vy)

      r.trailSampleTimer -= dt

      if (
        trailSpeed > 55 &&
        r.trailSampleTimer <= 0
      ) {
        const speedRatio =
          clamp(
            trailSpeed /
              (PLAYER_MAX_SPEED * 1.34),
            0,
            1
          )

        const rearOffset =
          CAR_DIMENSIONS.player.spriteLength *
          0.39

        const sampleLife =
          TRAIL_LIFETIME *
          (0.72 + speedRatio * 0.28)

        r.playerTrail.push({
          x:
            p.x -
            Math.cos(p.angle) *
              rearOffset,
          y:
            p.y -
            Math.sin(p.angle) *
              rearOffset,
          width:
            3.2 +
            speedRatio * 5.2,
          colour: {
            ...r.trailColour,
          },
          life: sampleLife,
          maxLife: sampleLife,
        })

        if (
          r.playerTrail.length >
          TRAIL_MAX_POINTS
        ) {
          r.playerTrail.splice(
            0,
            r.playerTrail.length -
              TRAIL_MAX_POINTS
          )
        }

        r.trailSampleTimer =
          TRAIL_SAMPLE_INTERVAL *
          (1.1 - speedRatio * 0.25)
      }


      /*
       * PLAYER INPUT
       */

      const forward =
        keys.has("w") ||
        keys.has(
          "arrowup"
        )

      const reverse =
        keys.has("s") ||
        keys.has(
          "arrowdown"
        )

      const left =
        keys.has("a") ||
        keys.has(
          "arrowleft"
        )

      const right =
        keys.has("d") ||
        keys.has(
          "arrowright"
        )

      /*
       * CONTINUOUS MOMENTUM MODEL
       *
       * Velocity remains a single continuous world-space vector.
       * Steering changes the packet's facing direction while its
       * existing momentum is retained, allowing controllable drifts.
       */

      let currentSpeed =
        Math.hypot(
          p.vx,
          p.vy
        )

      const facingX =
        Math.cos(
          p.angle
        )

      const facingY =
        Math.sin(
          p.angle
        )

      const forwardVelocity =
        p.vx *
          facingX +
        p.vy *
          facingY

      /*
       * STEERING
       */

      const speedRatio =
        clamp(
          currentSpeed /
            PLAYER_MAX_SPEED,

          0,
          1
        )

      const steeringStrength =
        PLAYER_TURN_SPEED *
        (
          1 -
          speedRatio *
            0.17
        )

      const steeringDirection =
        forwardVelocity <
        -15
          ? -1
          : 1

      if (left) {
        p.angle -=
          steeringStrength *
          steeringDirection *
          dt
      }

      if (right) {
        p.angle +=
          steeringStrength *
          steeringDirection *
          dt
      }

      p.angle =
        Math.atan2(
          Math.sin(
            p.angle
          ),

          Math.cos(
            p.angle
          )
        )

      /*
       * THROTTLE / BRAKING
       *
       * Acceleration is applied directly to the existing velocity
       * vector so sideways momentum is not discarded when turning.
       */

      const newFacingX =
        Math.cos(
          p.angle
        )

      const newFacingY =
        Math.sin(
          p.angle
        )

      if (
        forward &&
        !reverse
      ) {
        if (
          forwardVelocity <
          -25
        ) {
          const speed =
            Math.hypot(
              p.vx,
              p.vy
            )

          if (
            speed >
            0.001
          ) {
            const brake =
              Math.min(
                speed,

                PLAYER_BRAKE_FORCE *
                  dt
              )

            p.vx -=
              (
                p.vx /
                speed
              ) *
              brake

            p.vy -=
              (
                p.vy /
                speed
              ) *
              brake
          }
        }

        /*
         * PROGRESSIVE ACCELERATION
         *
         * Keep the launch responsive, but progressively taper acceleration
         * as speed builds so the player has a meaningful run-up to top speed.
         * TTL also gets a small acceleration bonus so it feels like an actual
         * boost rather than only raising the speed limiter.
         */
        const activeForwardMaxSpeed =
          PLAYER_MAX_SPEED *
          (p.ttlTimer > 0 ? 1.34 : 1)

        const forwardSpeedRatio =
          clamp(
            currentSpeed /
              activeForwardMaxSpeed,
            0,
            1
          )

        const accelerationProgress =
          forwardSpeedRatio *
          forwardSpeedRatio *
          (
            3 -
            2 *
              forwardSpeedRatio
          )

        const accelerationMultiplier =
          1 -
          accelerationProgress *
            0.56

        const ttlAccelerationMultiplier =
          p.ttlTimer > 0
            ? 1.14
            : 1

        const effectiveAcceleration =
          PLAYER_ACCELERATION *
          accelerationMultiplier *
          ttlAccelerationMultiplier

        p.vx +=
          newFacingX *
          effectiveAcceleration *
          dt

        p.vy +=
          newFacingY *
          effectiveAcceleration *
          dt
      }

      if (
        reverse &&
        !forward
      ) {
        if (
          forwardVelocity >
          25
        ) {
          const speed =
            Math.hypot(
              p.vx,
              p.vy
            )

          if (
            speed >
            0.001
          ) {
            const brake =
              Math.min(
                speed,

                PLAYER_BRAKE_FORCE *
                  dt
              )

            p.vx -=
              (
                p.vx /
                speed
              ) *
              brake

            p.vy -=
              (
                p.vy /
                speed
              ) *
              brake
          }
        } else {
          p.vx -=
            newFacingX *
            PLAYER_REVERSE_ACCELERATION *
            dt

          p.vy -=
            newFacingY *
            PLAYER_REVERSE_ACCELERATION *
            dt
        }
      }

      /*
       * GENERAL DRAG
       *
       * Drag acts on the whole velocity vector instead of treating
       * sideways motion as something that should be rapidly deleted.
       */

      const drag =
        Math.pow(
          PLAYER_DRAG,
          dt * 60
        )

      p.vx *= drag
      p.vy *= drag

      /*
       * GENTLE TRACTION
       *
       * Rotate the velocity vector toward the packet's facing
       * direction while preserving its magnitude. Low-speed
       * traction is stronger to make recovery easier, while
       * high-speed movement retains more drift.
       */

      currentSpeed =
        Math.hypot(
          p.vx,
          p.vy
        )

      if (
        currentSpeed >
        5
      ) {
        const velocityAngle =
          Math.atan2(
            p.vy,
            p.vx
          )

        const movingBackwards =
          p.vx *
            Math.cos(
              p.angle
            ) +
            p.vy *
              Math.sin(
                p.angle
              ) <
          0

        const desiredVelocityAngle =
          movingBackwards
            ? normalizeAngle(
                p.angle +
                  Math.PI
              )
            : p.angle

        const angleDifference =
          normalizeAngle(
            desiredVelocityAngle -
              velocityAngle
          )

        const traction =
          currentSpeed <
          120
            ? PLAYER_LOW_SPEED_TRACTION
            : PLAYER_TRACTION

        const correction =
          angleDifference *
          Math.min(
            1,
            traction *
              dt
          )

        const correctedAngle =
          velocityAngle +
          correction

        p.vx =
          Math.cos(
            correctedAngle
          ) *
          currentSpeed

        p.vy =
          Math.sin(
            correctedAngle
          ) *
          currentSpeed
      }

      /*
       * SPEED LIMIT
       */

      currentSpeed =
        Math.hypot(
          p.vx,
          p.vy
        )

      const movingBackwardNow =
        p.vx *
          Math.cos(
            p.angle
          ) +
          p.vy *
            Math.sin(
              p.angle
            ) <
        0

      const ttlMultiplier =
        p.ttlTimer > 0
          ? 1.34
          : 1

      const maxSpeed =
        (
          movingBackwardNow
            ? PLAYER_REVERSE_MAX_SPEED
            : PLAYER_MAX_SPEED
        ) *
        ttlMultiplier

      if (
        currentSpeed >
        maxSpeed
      ) {
        const scale =
          maxSpeed /
          currentSpeed

        p.vx *= scale
        p.vy *= scale
      }

      /*
       * MOVE
       */

      p.x +=
        p.vx *
        dt

      p.y +=
        p.vy *
        dt

      /*
       * LARGE WORLD BOUNDS
       */

      if (p.x < p.radius + 24) {
        p.x = p.radius + 24
        p.vx = Math.abs(p.vx) * 0.35
      }

      if (p.x > WORLD_WIDTH - p.radius - 24) {
        p.x = WORLD_WIDTH - p.radius - 24
        p.vx = -Math.abs(p.vx) * 0.35
      }

      if (p.y < p.radius + 24) {
        p.y = p.radius + 24
        p.vy = Math.abs(p.vy) * 0.35
      }

      if (p.y > WORLD_HEIGHT - p.radius - 24) {
        p.y = WORLD_HEIGHT - p.radius - 24
        p.vy = -Math.abs(p.vy) * 0.35
      }

      /*
       * PREDICTIVE CHASE CAMERA
       *
       * Keep the car in a predictable place on screen rather than using a
       * floating dead-zone. The camera looks ahead in the direction of travel,
       * so a clean breakaway opens visible space in front of the player.
       *
       * The look-ahead is speed based and the camera uses a quick exponential
       * follow. That keeps weaving readable while still letting acceleration,
       * slides and sudden direction changes move the car around the viewport.
       */

      const cameraSpeed =
        Math.hypot(
          p.vx,
          p.vy
        )

      const activeCameraMaxSpeed =
        PLAYER_MAX_SPEED *
        (p.ttlTimer > 0 ? 1.34 : 1)

      const cameraSpeedRatio =
        clamp(
          cameraSpeed /
            activeCameraMaxSpeed,
          0,
          1
        )

      const easedCameraSpeed =
        cameraSpeedRatio *
        cameraSpeedRatio *
        (
          3 -
          2 * cameraSpeedRatio
        )

      let travelX =
        Math.cos(p.angle)

      let travelY =
        Math.sin(p.angle)

      if (cameraSpeed > 35) {
        travelX =
          p.vx /
          cameraSpeed

        travelY =
          p.vy /
          cameraSpeed
      }

      const lookDistance =
        CAMERA_LOOK_AHEAD *
        easedCameraSpeed

      const targetCameraX =
        clamp(
          p.x +
            travelX *
              lookDistance,
          GAME_WIDTH / 2,
          WORLD_WIDTH -
            GAME_WIDTH / 2
        )

      const targetCameraY =
        clamp(
          p.y +
            travelY *
              lookDistance,
          GAME_HEIGHT / 2,
          WORLD_HEIGHT -
            GAME_HEIGHT / 2
        )

      const cameraBlend =
        1 -
        Math.exp(
          -CAMERA_FOLLOW_SPEED *
            dt
        )

      r.camera.x +=
        (targetCameraX -
          r.camera.x) *
        cameraBlend

      r.camera.y +=
        (targetCameraY -
          r.camera.y) *
        cameraBlend

      /*
       * POLICE SPAWNING
       */

      r.pursuerSpawnTimer -=
        dt

      const wanted =
        Math.max(
          1,
          Math.ceil(
            r.threat
          )
        )

      const desiredPolice =
        2 +
        wanted * 3 +
        (
          wanted >= 4
            ? 2
            : 0
        )

      if (
        r.pursuerSpawnTimer <=
          0 &&
        r.pursuers.length <
          desiredPolice
      ) {
        spawnPursuer(r)

        r.pursuerSpawnTimer =
          Math.max(
            0.65,
            2.05 -
              wanted *
                0.25
          )
      }

      /*
       * POWER-UP SPAWNING
       *
       * The sprite conversion left the visual pickup loop here but the actual
       * spawn timer was no longer being advanced. Restore the gameplay logic:
       * keep a small number of pickups circulating around the chase.
       */

      r.pickupSpawnTimer -=
        dt

      if (
        r.pickupSpawnTimer <= 0
      ) {
        if (
          r.pickups.length <
          PICKUP_MAX_ACTIVE
        ) {
          spawnPickup(r)
        }

        r.pickupSpawnTimer =
          PICKUP_MIN_INTERVAL +
          Math.random() *
            (
              PICKUP_MAX_INTERVAL -
              PICKUP_MIN_INTERVAL
            )
      }

      /*
       * DECOYS
       */

      for (
        const decoy of
        r.decoys
      ) {
        decoy.ttl -= dt

        decoy.x +=
          decoy.vx *
          dt

        decoy.y +=
          decoy.vy *
          dt

        decoy.vx *=
          Math.pow(
            0.985,
            dt * 60
          )

        decoy.vy *=
          Math.pow(
            0.985,
            dt * 60
          )
      }

      r.decoys =
        r.decoys.filter(
          (decoy) =>
            decoy.ttl > 0
        )

      /*
       * POLICE AI
       */

      for (
        const pursuer of
        r.pursuers
      ) {
        const config =
          PURSUERS[
            pursuer.kind
          ]

        pursuer.hitFlash =
          Math.max(
            0,
            pursuer.hitFlash -
              dt
          )

        let target: Vec2 =
          p

        /*
         * Spoofing breaks the normal target lock.
         */

        if (
          p.spoofTimer > 0
        ) {
          if (
            r.decoys.length >
            0
          ) {
            target =
              r.decoys[
                pursuer.id %
                  r.decoys
                    .length
              ]
          } else {
            target = {
              x:
                GAME_WIDTH /
                  2 +
                Math.sin(
                  pursuer.id
                ) *
                  260,

              y:
                GAME_HEIGHT /
                  2 +
                Math.cos(
                  pursuer.id *
                    1.7
                ) *
                  180,
            }
          }
        } else if (
          r.decoys.length >
            0 &&
          Math.random() <
            0.0025
        ) {
          target =
            r.decoys[
              Math.floor(
                Math.random() *
                  r.decoys
                    .length
              )
            ]
        }

        /*
         * Interceptors lead the player's movement rather than
         * simply driving directly toward the packet.
         */

        let targetX =
          target.x

        let targetY =
          target.y

        if (
          pursuer.kind ===
            "interceptor" &&
          target === p
        ) {
          targetX +=
            p.vx *
            0.78

          targetY +=
            p.vy *
            0.78
        }

        const desiredAngle =
          Math.atan2(
            targetY -
              pursuer.y,

            targetX -
              pursuer.x
          )

        const difference =
          normalizeAngle(
            desiredAngle -
              pursuer.angle
          )

        const maxTurn =
          config.turnSpeed *
          dt

        pursuer.angle +=
          clamp(
            difference,
            -maxTurn,
            maxTurn
          )

        /*
         * POLICE SEPARATION
         *
         * Units still chase the same target, but nearby police apply
         * a gentle repulsion to one another. This keeps a pursuit
         * feeling like several vehicles surrounding the player rather
         * than one tightly stacked blob.
         */

        let separationX = 0
        let separationY = 0

        for (
          const other of
          r.pursuers
        ) {
          if (
            other.id ===
            pursuer.id
          ) {
            continue
          }

          const dx =
            pursuer.x -
            other.x

          const dy =
            pursuer.y -
            other.y

          const separationDistance =
            Math.hypot(
              dx,
              dy
            )

          if (
            separationDistance >
              0.001 &&
            separationDistance <
              POLICE_SEPARATION_RADIUS
          ) {
            const strength =
              1 -
              separationDistance /
                POLICE_SEPARATION_RADIUS

            separationX +=
              (
                dx /
                separationDistance
              ) *
              strength

            separationY +=
              (
                dy /
                separationDistance
              ) *
              strength

            /*
             * Very close police need a much stronger response than
             * ordinary flock separation. Otherwise two units can
             * settle into the same steering line and stay locked
             * together indefinitely.
             */
            if (
              separationDistance <
              POLICE_ESCAPE_RADIUS
            ) {
              const escapeStrength =
                1 -
                separationDistance /
                  POLICE_ESCAPE_RADIUS

              separationX +=
                (
                  dx /
                  separationDistance
                ) *
                escapeStrength *
                2.4

              separationY +=
                (
                  dy /
                  separationDistance
                ) *
                escapeStrength *
                2.4
            }
          }
        }

        const distanceToPlayer =
          distance(
            pursuer,
            p
          )

        const accelerationCatchup =
          clamp(
            (
              distanceToPlayer -
              POLICE_CATCHUP_START
            ) /
              (
                POLICE_CATCHUP_FULL -
                POLICE_CATCHUP_START
              ),
            0,
            1
          )

        const pursuitAcceleration =
          config.acceleration *
          (
            1 +
            accelerationCatchup *
              0.22
          )

        pursuer.vx +=
          Math.cos(
            pursuer.angle
          ) *
          pursuitAcceleration *
          dt

        pursuer.vy +=
          Math.sin(
            pursuer.angle
          ) *
          pursuitAcceleration *
          dt

        const separationMagnitude =
          Math.hypot(
            separationX,
            separationY
          )

        pursuer.vx +=
          separationX *
          POLICE_SEPARATION_FORCE *
          dt

        pursuer.vy +=
          separationY *
          POLICE_SEPARATION_FORCE *
          dt

        /*
         * JAM ESCAPE
         *
         * Normal separation deliberately remains fairly gentle so
         * police can still form satisfying packs. Once a unit is
         * genuinely buried in that pack, however, it gets a short
         * sideways escape impulse. Alternating the side by ID means
         * neighbouring cars naturally peel away in different
         * directions instead of all steering out together.
         */

        if (
          separationMagnitude >
          1.15
        ) {
          const escapeScale =
            Math.min(
              1.6,
              separationMagnitude
            )

          pursuer.vx +=
            separationX *
            POLICE_ESCAPE_FORCE *
            dt *
            escapeScale

          pursuer.vy +=
            separationY *
            POLICE_ESCAPE_FORCE *
            dt *
            escapeScale

          const side =
            pursuer.id % 2 === 0
              ? 1
              : -1

          const sideX =
            -Math.sin(
              pursuer.angle
            ) *
            side

          const sideY =
            Math.cos(
              pursuer.angle
            ) *
            side

          pursuer.vx +=
            sideX *
            POLICE_SIDE_STEP_FORCE *
            dt

          pursuer.vy +=
            sideY *
            POLICE_SIDE_STEP_FORCE *
            dt
        }

        /*
         * DISTANCE-BASED CATCH-UP
         *
         * The player's top speed is higher than the ordinary police
         * cruising speeds. With a fixed cap, driving straight was
         * therefore a guaranteed escape.
         *
         * Police that fall well behind temporarily gain extra top
         * speed. The bonus fades completely as they approach the
         * player, so close-range dodging and out-driving them still
         * matter.
         */

        const pursuitDistance =
          distance(
            pursuer,
            p
          )

        const catchupAmount =
          clamp(
            (
              pursuitDistance -
              POLICE_CATCHUP_START
            ) /
              (
                POLICE_CATCHUP_FULL -
                POLICE_CATCHUP_START
              ),
            0,
            1
          )

        const pursuitSpeedLimit =
          config.speed +
          POLICE_CATCHUP_SPEED *
            catchupAmount

        const policeSpeed =
          length(
            pursuer.vx,
            pursuer.vy
          )

        if (
          policeSpeed >
          pursuitSpeedLimit
        ) {
          pursuer.vx =
            (
              pursuer.vx /
              policeSpeed
            ) *
            pursuitSpeedLimit

          pursuer.vy =
            (
              pursuer.vy /
              policeSpeed
            ) *
            pursuitSpeedLimit
        }

        const policeDrag =
          Math.pow(
            0.991,
            dt * 60
          )

        pursuer.vx *=
          policeDrag

        pursuer.vy *=
          policeDrag

        pursuer.x +=
          pursuer.vx *
          dt

        pursuer.y +=
          pursuer.vy *
          dt

        /*
         * POLICE WORLD BOUNDS
         */

        pursuer.x =
          clamp(
            pursuer.x,
            18,
            WORLD_WIDTH - 18
          )

        pursuer.y =
          clamp(
            pursuer.y,
            18,
            WORLD_HEIGHT - 18
          )

        /*
         * PLAYER / POLICE COLLISION
         *
         * Cars are long rotated sprites, so circle-vs-circle collision lets
         * their noses and sides overlap. Use an oriented rectangle for each
         * physical car and SAT to find the real contact normal/penetration.
         */

        const playerPoliceCollision =
          carBoxCollision(
            playerCarBox(p),
            pursuerCarBox(pursuer)
          )

        if (playerPoliceCollision) {
          const nx = playerPoliceCollision.normalX
          const ny = playerPoliceCollision.normalY
          const overlap = playerPoliceCollision.depth

          // Separate both cars immediately so they cannot remain visibly
          // embedded in one another between frames.
          p.x += nx * overlap * 0.55
          p.y += ny * overlap * 0.55

          pursuer.x -= nx * overlap * 0.45
          pursuer.y -= ny * overlap * 0.45

          const relativeSpeed =
            length(
              p.vx - pursuer.vx,
              p.vy - pursuer.vy
            )

          /*
           * Don't allow tiny bumps to repeatedly destroy the player.
           */
          if (p.invulnerable <= 0) {
            const damage =
              config.damage +
              Math.min(
                9,
                relativeSpeed * 0.018
              )

            p.integrity -= damage
            p.invulnerable = 0.65

            r.threat = clamp(
              r.threat + THREAT_PER_CRASH,
              0,
              THREAT_MAX
            )

            addText(
              r,
              `-${Math.round(damage)} INTEGRITY`,
              p.x,
              p.y - 25
            )

            burst(r, p.x, p.y, 12)
          }

          /*
           * Push along the actual contact normal rather than the line between
           * car centres. Side-swipes therefore feel like side-swipes and
           * nose-to-nose impacts separate along the cars' length.
           */
          const playerPush =
            Math.min(
              115,
              40 + relativeSpeed * 0.2
            )

          p.vx += nx * playerPush
          p.vy += ny * playerPush

          pursuer.vx -= nx * playerPush * 0.75
          pursuer.vy -= ny * playerPush * 0.75
        }
      }

      /*
       * POLICE / POLICE COLLISIONS
       *
       * Use the same oriented car hitboxes here so differently sized patrol,
       * interceptor and DPI cars cannot visually stack inside one another.
       */

      for (
        let i = 0;
        i < r.pursuers.length;
        i += 1
      ) {
        for (
          let j = i + 1;
          j < r.pursuers.length;
          j += 1
        ) {
          const a = r.pursuers[i]
          const b = r.pursuers[j]

          const policeCollision =
            carBoxCollision(
              pursuerCarBox(a),
              pursuerCarBox(b)
            )

          if (!policeCollision) {
            continue
          }

          const nx = policeCollision.normalX
          const ny = policeCollision.normalY
          const overlap = policeCollision.depth

          // Split the penetration evenly. This prevents a pack from settling
          // into overlapping sprites even when their steering lines converge.
          a.x += nx * overlap * 0.5
          a.y += ny * overlap * 0.5
          b.x -= nx * overlap * 0.5
          b.y -= ny * overlap * 0.5

          const relative =
            length(
              a.vx - b.vx,
              a.vy - b.vy
            )

          if (relative > 115) {
            const damage = relative * 0.045

            a.health -= damage
            b.health -= damage
            a.hitFlash = 0.12
            b.hitFlash = 0.12
          }

          // Remove only the component of closing velocity along the collision
          // normal. Keeping tangential velocity makes glancing impacts slide
          // past one another instead of looking like an arbitrary velocity swap.
          const relativeNormalVelocity =
            (a.vx - b.vx) * nx +
            (a.vy - b.vy) * ny

          if (relativeNormalVelocity < 0) {
            const impulse =
              -relativeNormalVelocity * 0.58

            a.vx += nx * impulse * 0.5
            a.vy += ny * impulse * 0.5
            b.vx -= nx * impulse * 0.5
            b.vy -= ny * impulse * 0.5
          }
        }
      }

      /*
       * REMOVE DESTROYED POLICE
       */

      const destroyed =
        r.pursuers.filter(
          (pursuer) =>
            pursuer.health <=
            0
        )

      for (
        const pursuer of
        destroyed
      ) {
        r.score += 750

        addText(
          r,
          "+750 POLICE CRASH",
          pursuer.x,
          pursuer.y
        )

        burst(
          r,
          pursuer.x,
          pursuer.y,
          20
        )
      }

      r.pursuers =
        r.pursuers.filter(
          (pursuer) =>
            pursuer.health >
            0
        )

      r.pursuers =
        r.pursuers.filter(
          (pursuer) =>
            distance(pursuer, p) <
            POLICE_DESPAWN_DISTANCE
        )

      /*
       * FIREWALL COLLISIONS
       */

      for (
        const firewall of
        r.firewalls
      ) {
        firewall.ttl -=
          dt

        if (
          circleRectCollision(
            p.x,
            p.y,
            p.radius,
            firewall
          )
        ) {
          if (
            p.encryptTimer <=
              0 &&
            p.invulnerable <=
              0
          ) {
            p.integrity -= 16

            p.invulnerable =
              0.7

            addText(
              r,
              "FIREWALL HIT",
              p.x,
              p.y - 22
            )

            burst(
              r,
              p.x,
              p.y,
              10
            )
          }

          p.vx *= -0.45
          p.vy *= -0.45

          p.x -=
            p.vx *
            dt *
            2

          p.y -=
            p.vy *
            dt *
            2
        }
      }

      r.firewalls =
        r.firewalls.filter(
          (firewall) =>
            firewall.ttl >
            0
        )

      /*
       * PICKUP COLLISIONS
       */

      const collected =
        new Set<number>()

      for (
        const pickup of
        r.pickups
      ) {
        pickup.pulse +=
          dt * 3

        if (
          distance(
            p,
            pickup
          ) <
          p.radius +
            pickup.radius
        ) {
          applyPickup(
            r,
            pickup
          )

          collected.add(
            pickup.id
          )
        }
      }

      r.pickups =
        r.pickups.filter(
          (pickup) =>
            !collected.has(
              pickup.id
            )
        )

      /*
       * PARTICLES
       */

      for (
        const particle of
        r.particles
      ) {
        particle.life -=
          dt

        particle.x +=
          particle.vx *
          dt

        particle.y +=
          particle.vy *
          dt

        particle.vx *=
          Math.pow(
            0.97,
            dt * 60
          )

        particle.vy *=
          Math.pow(
            0.97,
            dt * 60
          )
      }

      r.particles =
        r.particles.filter(
          (particle) =>
            particle.life >
            0
        )

      /*
       * FLOATING TEXT
       */

      for (
        const text of
        r.texts
      ) {
        text.life -= dt

        text.y -=
          24 * dt
      }

      r.texts =
        r.texts.filter(
          (text) =>
            text.life > 0
        )

      /*
       * GAME OVER
       */

      if (
        p.integrity <= 0
      ) {
        p.integrity = 0

        r.status =
          "game-over"

        burst(
          r,
          p.x,
          p.y,
          35
        )

        syncHud()
      }
    }

    const draw = (
      time: number
    ) => {
      const r =
        runtimeRef.current

      ctx.fillStyle = "#000112"
      ctx.fillRect(
        0,
        0,
        GAME_WIDTH,
        GAME_HEIGHT
      )

      ctx.save()

      ctx.translate(
        GAME_WIDTH / 2 - r.camera.x,
        GAME_HEIGHT / 2 - r.camera.y
      )

      drawNetwork(
        ctx,
        time,
        r.camera
      )

      /*
       * FIREWALLS
       */

      for (
        const firewall of
        r.firewalls
      ) {
        const alpha =
          clamp(
            firewall.ttl,
            0,
            1
          )

        ctx.save()

        ctx.globalAlpha =
          alpha

        ctx.shadowBlur = 12

        ctx.shadowColor =
          "#ef4444"

        ctx.fillStyle =
          "rgba(127, 29, 29, 0.72)"

        ctx.strokeStyle =
          "#f87171"

        ctx.lineWidth = 2

        ctx.fillRect(
          firewall.x,
          firewall.y,
          firewall.width,
          firewall.height
        )

        ctx.strokeRect(
          firewall.x,
          firewall.y,
          firewall.width,
          firewall.height
        )

        ctx.shadowBlur = 0

        ctx.fillStyle =
          "#fecaca"

        ctx.font =
          `700 9px ${FONT}`

        ctx.textAlign =
          "center"

        ctx.fillText(
          "FIREWALL",

          firewall.x +
            firewall.width /
              2,

          firewall.y +
            firewall.height /
              2 +
            3
        )

        ctx.restore()
      }

      /*
       * PICKUPS
       */

      for (
        const pickup of
        r.pickups
      ) {
        const sprite =
          PICKUP_SPRITES[
            pickup.kind
          ]

        const pickupColours: Record<
          PickupKind,
          string
        > = {
          spoof: "#3b82f6",
          fragment: "#ef4444",
          encrypt: "#22c55e",
          ttl: "#f97316",
        }

        const colour =
          pickupColours[
            pickup.kind
          ]

        const pulse =
          1 +
          Math.sin(
            pickup.pulse
          ) *
            0.07

        const size =
          48 * pulse

        /*
         * A subtle ring makes transparent pickup artwork readable against
         * the dark network without replacing the artwork itself.
         */
        ctx.save()
        ctx.translate(
          pickup.x,
          pickup.y
        )
        ctx.globalAlpha =
          0.20 +
          Math.sin(
            pickup.pulse
          ) *
            0.04
        ctx.strokeStyle =
          colour
        ctx.shadowColor =
          colour
        ctx.shadowBlur = 14
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(
          0,
          0,
          27 +
            Math.sin(
              pickup.pulse
            ) *
              2,
          0,
          TAU
        )
        ctx.stroke()
        ctx.restore()

        if (
          sprite.complete &&
          sprite.naturalWidth > 0
        ) {
          ctx.save()
          ctx.translate(
            pickup.x,
            pickup.y
          )
          ctx.shadowColor =
            colour
          ctx.shadowBlur = 10
          ctx.drawImage(
            sprite,
            -size / 2,
            -size / 2,
            size,
            size
          )
          ctx.restore()
        }
      }

      /*
       * DECOYS
       */

      for (
        const decoy of
        r.decoys
      ) {
        drawPacket(
          ctx,

          decoy.x,
          decoy.y,

          Math.atan2(
            decoy.vy,
            decoy.vx
          ),

          clamp(
            decoy.ttl /
              1.2,
            0.25,
            0.75
          ),
          "fragment"
        )
      }

      /*
       * POLICE
       */

      for (
        const pursuer of
        r.pursuers
      ) {
        drawPursuer(
          ctx,
          pursuer
        )
      }

      /*
       * PLAYER EFFECTS
       */

      const p = r.player

      // TTL deliberately has no speed trail. Its orange underglow and the
      // pickup flash communicate the boost without leaving a tail behind the car.

      /*
       * PLAYER TRAIL
       */

      drawPlayerTrail(
        ctx,
        r.playerTrail
      )

      /*
       * PLAYER
       */

      if (
        p.invulnerable <=
          0 ||
        Math.floor(
          time / 80
        ) %
          2 ===
          0
      ) {
        const transforming =
          r.powerupFlash.timer > 0

        const playerVariant =
          transforming
            ? "corrupt"
            : p.encryptTimer > 0
              ? "encrypt"
              : p.spoofTimer > 0
                ? "spoof"
                : "corrupt"

        const playerGlow =
          transforming
            ? CAR_GLOW.corrupt
            : p.encryptTimer > 0
              ? CAR_GLOW.encrypt
              : p.spoofTimer > 0
                ? CAR_GLOW.spoof
                : p.ttlTimer > 0
                  ? CAR_GLOW.ttl
                  : CAR_GLOW.corrupt

        drawPacket(
          ctx,
          p.x,
          p.y,
          p.angle,
          1,
          playerVariant,
          playerGlow
        )

        if (transforming) {
          const flashProgress =
            1 -
            r.powerupFlash.timer /
              r.powerupFlash.duration

          const flashStrength =
            Math.sin(
              flashProgress * Math.PI
            )

          ctx.save()
          ctx.translate(p.x, p.y)

          // A tight coloured burst sits directly over the original corrupt car.
          // It peaks in the middle of the transition, hiding the sprite swap.
          ctx.globalAlpha =
            0.72 * flashStrength
          ctx.fillStyle =
            r.powerupFlash.colour
          ctx.shadowColor =
            r.powerupFlash.colour
          ctx.shadowBlur =
            30 + 18 * flashStrength
          ctx.beginPath()
          ctx.ellipse(
            0,
            0,
            28 + 12 * flashProgress,
            40 + 18 * flashProgress,
            p.angle,
            0,
            TAU
          )
          ctx.fill()

          // White centre flash gives the pickup a sharp impact without turning
          // into a lingering screen-wide effect.
          ctx.globalAlpha =
            0.48 * flashStrength
          ctx.fillStyle = "#ffffff"
          ctx.shadowColor = "#ffffff"
          ctx.shadowBlur = 18
          ctx.beginPath()
          ctx.arc(
            0,
            0,
            16 + 8 * flashProgress,
            0,
            TAU
          )
          ctx.fill()

          // Expanding ring makes the moment readable at chase speed.
          ctx.globalAlpha =
            0.75 *
            (1 - flashProgress)
          ctx.strokeStyle =
            r.powerupFlash.colour
          ctx.lineWidth = 3
          ctx.shadowBlur = 14
          ctx.beginPath()
          ctx.arc(
            0,
            0,
            24 + 34 * flashProgress,
            0,
            TAU
          )
          ctx.stroke()

          ctx.restore()
        }
      }

      /*
       * PARTICLES
       */

      for (
        const particle of
        r.particles
      ) {
        ctx.save()

        ctx.globalAlpha =
          clamp(
            particle.life /
              particle.maxLife,

            0,
            1
          )

        ctx.fillStyle =
          "#fdba74"

        ctx.beginPath()

        ctx.arc(
          particle.x,
          particle.y,
          particle.size,
          0,
          TAU
        )

        ctx.fill()

        ctx.restore()
      }

      /*
       * FLOATING TEXT
       */

      for (
        const text of
        r.texts
      ) {
        ctx.save()

        ctx.globalAlpha =
          clamp(
            text.life,
            0,
            1
          )

        ctx.fillStyle =
          "#ffffff"

        ctx.font =
          `700 13px ${FONT}`

        ctx.textAlign =
          "center"

        ctx.fillText(
          text.text,
          text.x,
          text.y
        )

        ctx.restore()
      }

      /*
       * Return to screen coordinates for UI.
       */

      ctx.restore()

      const currentArea =
        p.x < 1800
          ? (
              p.y < 1800
                ? "PUBLIC SUBNET"
                : "LEGACY NETWORK"
            )
          : p.x > 3800
            ? (
                p.y < 1800
                  ? "SECURE VLAN"
                  : "DATA CENTRE"
              )
            : (
                p.y < 1800
                  ? "API CLUSTER"
                  : "CORE BACKBONE"
              )

      ctx.save()
      ctx.fillStyle = "rgba(148, 163, 184, 0.62)"
      ctx.font = `700 10px ${FONT}`
      ctx.textAlign = "right"
      ctx.fillText(
        currentArea,
        GAME_WIDTH - 18,
        GAME_HEIGHT - 16
      )
      ctx.restore()


    }

    const frame = (
      time: number
    ) => {
      const previous =
        previousTimeRef.current ??
        time

      const dt =
        Math.min(
          0.033,

          Math.max(
            0,

            (
              time -
              previous
            ) /
              1000
          )
        )

      previousTimeRef.current =
        time

      update(dt)

      draw(time)

      hudTimerRef.current +=
        dt

      if (
        hudTimerRef.current >=
        0.08
      ) {
        hudTimerRef.current =
          0

        syncHud()
      }

      animationRef.current =
        requestAnimationFrame(
          frame
        )
    }

    animationRef.current =
      requestAnimationFrame(
        frame
      )

    return () => {
      if (
        animationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationRef.current
        )
      }
    }
  }, [syncHud])

  const threatBlocks =
    Array.from(
      {
        length:
          THREAT_MAX,
      },

      (_, index) =>
        index <
        Math.ceil(
          hud.threat
        )
    )

  const activeEffects =
    [
      hud.spoof > 0
        ? `SPOOF ${hud.spoof.toFixed(
            1
          )}s`
        : null,

      hud.encrypt > 0
        ? `ENCRYPT ${hud.encrypt.toFixed(
            1
          )}s`
        : null,

      hud.ttl > 0
        ? `TTL ${hud.ttl.toFixed(
            1
          )}s`
        : null,
    ].filter(Boolean)

  return (
    <div
      className="w-full select-none text-white"
      style={{
        fontFamily: FONT,
      }}
    >
      <div className="mb-5">
        <div className="text-xs text-white/30">
          /minigames/packet-police.exe
        </div>

        <h2 className="mt-2 font-comic-serif text-3xl text-white">
          Packet Police
        </h2>
      </div>

      {/* ========================================
          NETWORK STATUS
      ======================================== */}

      <div className="mb-2">
        <div className="mb-1 flex items-end justify-between gap-4">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[9px] tracking-[0.12em] text-white/25">
            <span>
              INTEGRITY{" "}
              <strong className="font-medium text-white/55">
                {Math.round(
                  hud.integrity
                )}
                %
              </strong>
            </span>

            <span>
              SCORE{" "}
              <strong className="font-medium text-white/55">
                {hud.score.toLocaleString()}
              </strong>
            </span>

            <span>
              UPTIME{" "}
              <strong className="font-medium text-white/55">
                {hud.survived.toFixed(
                  1
                )}
                s
              </strong>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-[9px] tracking-[0.12em] text-white/25">
            <span>
              THREAT
            </span>

            <div className="flex gap-1">
              {threatBlocks.map(
                (
                  active,
                  index
                ) => (
                  <span
                    key={
                      index
                    }
                    className={`h-1.5 w-4 border ${
                      active
                        ? "border-red-300/50 bg-red-400/60"
                        : "border-white/10 bg-white/[0.025]"
                    }`}
                  />
                )
              )}
            </div>
          </div>
        </div>

        <div className="h-1 overflow-hidden bg-white/5">
          <div
            className="h-full bg-white/45 transition-[width] duration-100"
            style={{
              width:
                `${Math.max(
                  0,
                  Math.min(
                    100,
                    hud.integrity
                  )
                )}%`,
            }}
          />
        </div>
      </div>

      {/* ========================================
          GAME
      ======================================== */}

      <div className="relative overflow-hidden border border-white/5 bg-[#000112]">
        <canvas
          ref={canvasRef}
          width={
            GAME_WIDTH
          }
          height={
            GAME_HEIGHT
          }
          className="block h-auto w-full"
          aria-label="Packet Police arcade chase game"
        />

        {activeEffects.length >
          0 && (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
            {activeEffects.map(
              (effect) => (
                <span
                  key={
                    effect
                  }
                  className="border border-cyan-200/20 bg-[#000112]/80 px-2.5 py-1 text-[10px] tracking-[0.1em] text-cyan-100/70 backdrop-blur-sm"
                >
                  {
                    effect
                  }
                </span>
              )
            )}
          </div>
        )}

        {/* ========================================
            START SCREEN
        ======================================== */}

        {hud.status ===
          "ready" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-navy-dark/80 px-5 backdrop-blur-[1px]">
            <div className="w-full max-w-md border border-white/15 bg-navy-dark/95 p-6 text-center shadow-[8px_8px_0_rgba(255,255,255,0.04)]">
              <div className="text-[10px] tracking-[0.2em] text-white/25">
                CONNECTION UNTRUSTED
              </div>

              <div className="mt-2 font-comic-serif text-3xl text-white">
                Inject packet?
              </div>

              <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-white/40">
                You are the corrupted packet.
                Break through the network,
                evade firewall patrols and
                avoid quarantine for as long
                as possible.
              </p>

              <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-x-5 gap-y-2 border-y border-white/[0.06] py-4 text-left text-[10px] tracking-[0.08em]">
                <span className="text-white/25">
                  MOVE
                </span>
                <span className="text-right text-white/55">
                  WASD / ARROWS
                </span>

                <span className="text-white/25">
                  OBJECTIVE
                </span>
                <span className="text-right text-white/55">
                  EVADE
                </span>

                <span className="text-white/25">
                  STATUS
                </span>
                <span className="text-right text-red-200/60">
                  CORRUPTED
                </span>
              </div>

              <button
                type="button"
                onClick={
                  startGame
                }
                className="
                  mt-6
                  border
                  border-white/70
                  bg-white/[0.08]
                  px-5
                  py-2
                  text-sm
                  text-white
                  transition
                  hover:-translate-y-0.5
                  hover:border-white
                  hover:bg-white/[0.12]
                "
              >
                &gt; inject packet
              </button>

              <div className="mt-2 text-[9px] tracking-[0.1em] text-white/20">
                ENTER · INJECT PACKET
              </div>
            </div>
          </div>
        )}

        {/* ========================================
            CAPTURE SCREEN
        ======================================== */}

        {hud.status ===
          "game-over" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#17070b]/95 px-5">
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_14px,rgba(248,113,113,0.15)_14px,rgba(248,113,113,0.15)_15px)]" />
            </div>

            <div className="relative w-full max-w-lg border-2 border-red-300/70 bg-[#12060a]/95 px-6 py-8 text-center shadow-[10px_10px_0_rgba(248,113,113,0.12)]">
              <div className="text-[10px] tracking-[0.3em] text-red-300/60">
                FIREWALL STATUS 403
              </div>

              <div className="mt-3 font-comic-serif text-4xl text-red-200 md:text-5xl">
                PACKET CAPTURED
              </div>

              <div className="mx-auto mt-4 h-px max-w-xs bg-red-300/25" />

              <div className="mt-4 text-sm text-red-100/65">
                The corrupted packet was quarantined.
              </div>

              <div className="mt-1 text-xs text-white/35">
                connection terminated · payload contained
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <div className="border border-red-200/20 px-4 py-2 text-xs text-red-100/70">
                  score&nbsp;
                  <span className="text-red-100">
                    {hud.score.toLocaleString()}
                  </span>
                </div>

                <div className="border border-red-200/20 px-4 py-2 text-xs text-red-100/70">
                  uptime&nbsp;
                  <span className="text-red-100">
                    {hud.survived.toFixed(
                      1
                    )}
                    s
                  </span>
                </div>
              </div>

              <div className="mt-6 text-[10px] tracking-[0.16em] text-red-300/40">
                CONNECTION CLOSED
              </div>

              <button
                type="button"
                onClick={
                  startGame
                }
                className="
                  mt-5
                  border
                  border-red-200/35
                  px-5
                  py-2
                  text-xs
                  text-red-100/70
                  transition
                  hover:-translate-y-0.5
                  hover:border-red-100/70
                  hover:bg-red-200/[0.05]
                  hover:text-red-50
                "
              >
                &gt; reinject packet
              </button>

              <div className="mt-2 text-[9px] tracking-[0.1em] text-red-200/25">
                ENTER · REINJECT
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================
          CONTROLS / POWER-UP KEY
      ======================================== */}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-white/25">
        <span>
          W / S · ACCELERATE
        </span>

        <span>
          A / D · STEER
        </span>

        <span>
          ARROWS · DRIVE
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 text-[10px]">
        <span className="text-blue-300/55">
          S · SPOOF
        </span>

        <span className="text-red-300/55">
          F · FRAGMENT
        </span>

        <span className="text-emerald-300/55">
          E · ENCRYPT
        </span>

        <span className="text-orange-300/55">
          T · TTL BOOST
        </span>
      </div>
    </div>
  )
}

export default NetworkGame