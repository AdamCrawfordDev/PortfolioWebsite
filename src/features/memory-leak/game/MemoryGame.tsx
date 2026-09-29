import {
  useEffect,
  useRef,
  useState,
} from "react"

import {
  ENEMY_STATS,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_RAM,
  MAX_TOWER_LEVEL,
  PATH_WIDTH,
  SELL_REFUND,
  STARTING_CPU,
  STARTING_RAM,
  TOWER_ORDER,
  TOWERS,
  UPGRADE_BASE_COST,
  WAVES,
  WAVE_BONUS,
} from "./config"

import type {
  Enemy,
  EnemyKind,
  FloatingText,
  GameStatus,
  Particle,
  Projectile,
  Tower,
  TowerKind,
} from "./types"


type RuntimeState = {
  cpu: number
  ram: number
  wave: number
  status: GameStatus
  enemies: Enemy[]
  towers: Tower[]
  projectiles: Projectile[]
  particles: Particle[]
  texts: FloatingText[]
  spawnQueue: EnemyKind[]
  spawnTimer: number
  spawnInterval: number
  nextId: number
  endless: boolean
  endlessWavesCleared: number
}


const CANVAS_FONT =
  '"Comic Helvetic", sans-serif'

const GRID_SIZE = 40
const GRID_OFFSET_X = 20
const GRID_OFFSET_Y = 20
const ROAD_WIDTH = GRID_SIZE * 1.4

/*
 * Difficulty curve.
 * The campaign now ramps meaningfully instead of letting a few early towers
 * snowball forever. Endless mode keeps scaling beyond the authored waves.
 */
const CAMPAIGN_ENEMY_HP_SCALE = 1.30
const CAMPAIGN_ENEMY_SPEED_SCALE = 1.10
const CAMPAIGN_ENEMY_RAM_SCALE = 1.30
const CAMPAIGN_REWARD_SCALE = 0.82

const ENDLESS_HP_GROWTH = 0.16
const ENDLESS_SPEED_GROWTH = 0.025
const ENDLESS_RAM_GROWTH = 0.08
const ENDLESS_REWARD_GROWTH = 0.035
const ENDLESS_COUNT_GROWTH = 0.14

const CAMPAIGN_COUNT_GROWTH = 0.09
const CAMPAIGN_INTERVAL_DECAY = 0.04
const MIN_CAMPAIGN_SPAWN_INTERVAL = 0.24
const WAVE_CLEAR_BONUS_SCALE = 0.55
const WAVE_CLEAR_BONUS_GROWTH = 10

function snapToGridCellCenter(value: number, offset: number) {
  const firstCellCenter =
    offset + GRID_SIZE / 2

  return (
    Math.round(
      (value - firstCellCenter) /
        GRID_SIZE
    ) *
      GRID_SIZE +
    firstCellCenter
  )
}

function snapPointToGrid(x: number, y: number) {
  return {
    x: snapToGridCellCenter(
      x,
      GRID_OFFSET_X
    ),
    y: snapToGridCellCenter(
      y,
      GRID_OFFSET_Y
    ),
  }
}

function snapToGridLine(value: number, offset: number) {
  return (
    Math.round((value - offset) / GRID_SIZE) * GRID_SIZE +
    offset
  )
}

function snapPathPoint(x: number, y: number) {
  return {
    x: snapToGridLine(x, GRID_OFFSET_X),
    y: snapToGridLine(y, GRID_OFFSET_Y),
  }
}


/*
 * One authoritative route for rendering, collision and enemy movement.
 * Every point is snapped to the board and diagonal source segments are
 * converted into right-angle grid turns so nothing cuts across cells.
 */
/*
 * A deliberately winding allocation route for Memory Leak.
 * It stays on grid lines, uses varied run lengths and briefly doubles
 * back on itself without filling so much of the board that tower
 * placement becomes cramped.
 */
const MEMORY_LEAK_PATH = [
  // Shifted up by one 40px grid row from the previous layout while preserving
  // the route's exact shape and grid alignment.
  { x: 60, y: 180 },
  { x: 220, y: 180 },
  { x: 220, y: 340 },
  { x: 420, y: 340 },
  { x: 420, y: 140 },
  { x: 660, y: 140 },
  { x: 660, y: 260 },
  { x: 540, y: 260 },
  { x: 540, y: 460 },
  { x: 820, y: 460 },
  { x: 820, y: 220 },
  { x: 980, y: 220 },
  { x: 980, y: 340 },
  { x: 1060, y: 340 },
]

function buildGridPath() {
  // The road centreline belongs on grid lines. Tower placement still
  // uses grid-cell centres independently.
  const snapped = MEMORY_LEAK_PATH.map((point) =>
    snapPathPoint(point.x, point.y)
  )

  const result: Array<{ x: number; y: number }> = []

  const pushUnique = (point: { x: number; y: number }) => {
    const last = result[result.length - 1]
    if (!last || last.x !== point.x || last.y !== point.y) {
      result.push(point)
    }
  }

  pushUnique(snapped[0])

  for (let i = 1; i < snapped.length; i += 1) {
    const previous = result[result.length - 1]
    const next = snapped[i]

    if (previous.x !== next.x && previous.y !== next.y) {
      // Alternate the bend direction so the route keeps the character
      // of the original path while remaining strictly orthogonal.
      const bend =
        i % 2 === 0
          ? { x: previous.x, y: next.y }
          : { x: next.x, y: previous.y }
      pushUnique(bend)
    }

    pushUnique(next)
  }

  return result
}

const GAME_PATH = buildGridPath()


function distance(
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  return Math.hypot(
    ax - bx,
    ay - by
  )
}


function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const dx = bx - ax
  const dy = by - ay

  if (
    dx === 0 &&
    dy === 0
  ) {
    return distance(
      px,
      py,
      ax,
      ay
    )
  }

  const t =
    Math.max(
      0,
      Math.min(
        1,
        (
          (px - ax) * dx +
          (py - ay) * dy
        ) /
        (
          dx * dx +
          dy * dy
        )
      )
    )

  return distance(
    px,
    py,
    ax + dx * t,
    ay + dy * t
  )
}


function isNearPath(
  x: number,
  y: number
) {
  for (
    let i = 0;
    i < GAME_PATH.length - 1;
    i += 1
  ) {
    const a = GAME_PATH[i]
    const b = GAME_PATH[i + 1]

    if (
      distanceToSegment(
        x,
        y,
        a.x,
        a.y,
        b.x,
        b.y
      ) <
      ROAD_WIDTH / 2 + 20
    ) {
      return true
    }
  }

  return false
}


type UpgradeChoice = "power" | "utility"

type UpgradeOption = {
  name: string
  description: string
}

const TOWER_UPGRADES: Record<
  TowerKind,
  Record<UpgradeChoice, UpgradeOption>
> = {
  gc: {
    power: {
      name: "Mark & Sweep",
      description: "+52% cleanup damage · +6% range",
    },
    utility: {
      name: "Generational GC",
      description: "+36% fire rate · +20% range · +12% damage",
    },
  },
  free: {
    power: {
      name: "Aggressive Free",
      description: "+65% single-target damage · +8% fire rate",
    },
    utility: {
      name: "Inline Deallocation",
      description: "+42% fire rate · +16% range · +10% damage",
    },
  },
  reference: {
    power: {
      name: "Atomic Counter",
      description: "+38% damage · +22% fire rate",
    },
    utility: {
      name: "Weak References",
      description: "+32% range · +34% fire rate",
    },
  },
  profiler: {
    power: {
      name: "Heap Snapshot",
      description: "Much stronger damage boost for nearby routines",
    },
    utility: {
      name: "Allocation Trace",
      description: "Larger support radius and stronger range boost",
    },
  },
  "cycle-detector": {
    power: {
      name: "Tarjan Pass",
      description: "+58% damage · stronger cycle and shield cleanup",
    },
    utility: {
      name: "SCC Scanner",
      description: "+26% range · +32% fire rate · +14% damage",
    },
  },
}

function towerLevelMultiplier(tower: Tower) {
  if (tower.kind === "profiler") {
    return 1 + tower.powerUpgrades * 0.28 + tower.utilityUpgrades * 0.12
  }

  const powerDamage: Record<TowerKind, number> = {
    gc: 0.52,
    free: 0.65,
    reference: 0.38,
    profiler: 0,
    "cycle-detector": 0.58,
  }

  const utilityDamage: Record<TowerKind, number> = {
    gc: 0.12,
    free: 0.10,
    reference: 0,
    profiler: 0,
    "cycle-detector": 0.14,
  }

  return (
    1 +
    tower.powerUpgrades * powerDamage[tower.kind] +
    tower.utilityUpgrades * utilityDamage[tower.kind]
  )
}

function towerFireRateMultiplier(tower: Tower) {
  const powerFireRate: Record<TowerKind, number> = {
    gc: 0,
    free: 0.08,
    reference: 0.22,
    profiler: 0,
    "cycle-detector": 0,
  }

  const utilityFireRate: Record<TowerKind, number> = {
    gc: 0.36,
    free: 0.42,
    reference: 0.34,
    profiler: 0,
    "cycle-detector": 0.32,
  }

  return (
    1 +
    tower.powerUpgrades * powerFireRate[tower.kind] +
    tower.utilityUpgrades * utilityFireRate[tower.kind]
  )
}

function towerRangeMultiplier(tower: Tower) {
  const powerRange: Record<TowerKind, number> = {
    gc: 0.06,
    free: 0,
    reference: 0,
    profiler: 0.08,
    "cycle-detector": 0,
  }

  const utilityRange: Record<TowerKind, number> = {
    gc: 0.20,
    free: 0.16,
    reference: 0.32,
    profiler: 0.30,
    "cycle-detector": 0.26,
  }

  return (
    1 +
    tower.powerUpgrades * powerRange[tower.kind] +
    tower.utilityUpgrades * utilityRange[tower.kind]
  )
}


function profilerBoost(
  tower: Tower,
  towers: Tower[]
) {
  let damage = 1
  let range = 1

  for (const other of towers) {
    if (
      other.kind !== "profiler" ||
      other.id === tower.id
    ) {
      continue
    }

    const definition =
      TOWERS.profiler

    const supportRange =
      definition.range *
      towerLevelMultiplier(other)

    if (
      distance(
        tower.x,
        tower.y,
        other.x,
        other.y
      ) <= supportRange
    ) {
      damage +=
        0.18 +
        other.powerUpgrades * 0.16 +
        other.utilityUpgrades * 0.05

      range +=
        0.1 +
        other.powerUpgrades * 0.03 +
        other.utilityUpgrades * 0.11
    }
  }

  return {
    damage,
    range,
  }
}


function getEnemyLabel(
  kind: EnemyKind
) {
  switch (kind) {
    case "allocation":
      return "32K"

    case "large":
      return "8MB"

    case "cache":
      return "CACHE"

    case "retained":
      return "OBJ"

    case "cycle":
      return "A↔B"

    case "listener":
      return "EVENT"

    case "legacy":
      return "LEGACY"
  }
}


function getEnemyFill(
  kind: EnemyKind
) {
  switch (kind) {
    case "allocation":
      return "#d8dee9"

    case "large":
      return "#f2c879"

    case "cache":
      return "#7dd3fc"

    case "retained":
      return "#c4b5fd"

    case "cycle":
      return "#fb7185"

    case "listener":
      return "#f9a8d4"

    case "legacy":
      return "#ef4444"
  }
}


function getTowerFill(
  kind: TowerKind
) {
  switch (kind) {
    case "gc":
      return "#86efac"

    case "free":
      return "#fde68a"

    case "reference":
      return "#93c5fd"

    case "profiler":
      return "#c4b5fd"

    case "cycle-detector":
      return "#fda4af"
  }
}


function createRuntime(): RuntimeState {
  return {
    cpu: STARTING_CPU,
    ram: STARTING_RAM,
    wave: 0,
    status: "ready",
    enemies: [],
    towers: [],
    projectiles: [],
    particles: [],
    texts: [],
    spawnQueue: [],
    spawnTimer: 0,
    spawnInterval: 0.5,
    nextId: 1,
    endless: false,
    endlessWavesCleared: 0,
  }
}


export default function MemoryGame() {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    )

  const runtimeRef =
    useRef<RuntimeState>(
      createRuntime()
    )

  const lastTimeRef =
    useRef<number | null>(
      null
    )

  const animationRef =
    useRef<number | null>(
      null
    )

  const mouseRef =
    useRef({
      x: 0,
      y: 0,
      inside: false,
    })

  // Last direction each weapon actually fired.
  // Idle weapons retain this angle until their next shot.
  const towerAimRef =
    useRef<Map<number, number>>(
      new Map()
    )

  // Track how many retained objects each Listener has created in the
  // current wave. This prevents Listener waves from snowballing forever.
  const listenerSpawnCountsRef =
    useRef<Map<number, number>>(
      new Map()
    )


  const [
    selectedTowerKind,
    setSelectedTowerKind,
  ] =
    useState<TowerKind | null>(
      "gc"
    )

  const [
    selectedTowerId,
    setSelectedTowerId,
  ] =
    useState<number | null>(
      null
    )

  const [
    uiVersion,
    setUiVersion,
  ] =
    useState(0)

  const [
    hoveredQuickTower,
    setHoveredQuickTower,
  ] =
    useState<TowerKind | null>(
      null
    )

  const [
    gameSpeed,
    setGameSpeed,
  ] =
    useState<1 | 2>(1)

  const gameSpeedRef =
    useRef<1 | 2>(1)


  const runtime =
    runtimeRef.current

  const selectedTower =
    runtime.towers.find(
      (tower) =>
        tower.id ===
        selectedTowerId
    ) ?? null


  function forceUiRefresh() {
    setUiVersion(
      (value) => value + 1
    )
  }


  function addFloatingText(
    x: number,
    y: number,
    text: string
  ) {
    const state =
      runtimeRef.current

    state.texts.push({
      id: state.nextId++,
      x,
      y,
      text,
      life: 0.8,
      maxLife: 0.8,
    })
  }


  function addBurst(
    x: number,
    y: number,
    amount = 7
  ) {
    const state =
      runtimeRef.current

    for (
      let i = 0;
      i < amount;
      i += 1
    ) {
      const angle =
        Math.random() *
        Math.PI *
        2

      const speed =
        30 +
        Math.random() *
          80

      state.particles.push({
        id: state.nextId++,
        x,
        y,
        vx:
          Math.cos(angle) *
          speed,
        vy:
          Math.sin(angle) *
          speed,
        life:
          0.35 +
          Math.random() *
            0.35,
        maxLife: 0.7,
        size:
          1 +
          Math.random() *
            3,
      })
    }
  }


  function createEnemy(
    kind: EnemyKind
  ) {
    const state =
      runtimeRef.current

    const stats =
      ENEMY_STATS[kind]

    const endlessWave =
      state.endless
        ? Math.max(1, state.wave - WAVES.length)
        : 0

    const hpScale =
      CAMPAIGN_ENEMY_HP_SCALE *
      (1 + endlessWave * ENDLESS_HP_GROWTH)

    const speedScale =
      CAMPAIGN_ENEMY_SPEED_SCALE *
      (1 + endlessWave * ENDLESS_SPEED_GROWTH)

    const ramScale =
      CAMPAIGN_ENEMY_RAM_SCALE *
      (1 + endlessWave * ENDLESS_RAM_GROWTH)

    const rewardScale =
      CAMPAIGN_REWARD_SCALE *
      (1 + endlessWave * ENDLESS_REWARD_GROWTH)

    const scaledHp =
      stats.hp * hpScale

    const start =
      GAME_PATH[0]

    const enemy: Enemy = {
      id: state.nextId++,
      kind,
      pathIndex: 0,
      pathProgress: 0,
      x: start.x,
      y: start.y,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: stats.speed * speedScale,
      ramDamage: Math.max(1, Math.round(stats.ramDamage * ramScale)),
      reward: Math.max(1, Math.round(stats.reward * rewardScale)),
      radius: stats.radius,
      shield: stats.shield * hpScale,
      spawnCooldown:
        kind === "listener"
          ? 2.5
          : 0,
      dead: false,
    }

    state.enemies.push(
      enemy
    )

    console.log(
      `[SPAWN] wave=${state.wave} source=wave kind=${kind} id=${enemy.id} ` +
        `alive=${state.enemies.filter((candidate) => !candidate.dead).length} ` +
        `queued=${state.spawnQueue.length}`
    )
  }


  function buildEndlessWaveQueue(
    endlessWave: number
  ) {
    const baseCount =
      14 +
      Math.floor(
        endlessWave *
          ENDLESS_COUNT_GROWTH *
          14
      )

    const pool: EnemyKind[] = [
      "allocation",
      "large",
      "cache",
      "retained",
      "cycle",
      "listener",
      "legacy",
    ]

    const queue: EnemyKind[] = []

    for (
      let i = 0;
      i < baseCount;
      i += 1
    ) {
      const pressure =
        Math.min(
          pool.length - 1,
          2 +
            Math.floor(
              endlessWave / 2
            )
        )

      const index =
        Math.floor(
          Math.random() *
            (pressure + 1)
        )

      queue.push(
        pool[index]
      )
    }

    // Guarantee some dangerous units so endless waves cannot roll harmlessly.
    if (endlessWave >= 2) {
      queue.push("cycle")
    }

    if (endlessWave >= 3) {
      queue.push("listener")
    }

    if (endlessWave >= 5) {
      queue.push("legacy")
    }

    return queue
  }


  function buildWaveQueue(
    waveIndex: number
  ) {
    if (waveIndex >= WAVES.length) {
      return buildEndlessWaveQueue(
        waveIndex - WAVES.length + 1
      )
    }

    const entries =
      WAVES[waveIndex]

    const pressureMultiplier =
      1 +
      waveIndex *
        CAMPAIGN_COUNT_GROWTH

    const queue: EnemyKind[] =
      []

    /*
     * Interleave groups slightly so waves
     * feel less like one enemy type followed
     * by another.
     */
    const working =
      entries.map(
        (entry) => ({
          ...entry,
          remaining:
            Math.ceil(
              entry.count *
                pressureMultiplier
            ),
        })
      )

    while (
      working.some(
        (entry) =>
          entry.remaining > 0
      )
    ) {
      for (const entry of working) {
        if (
          entry.remaining <= 0
        ) {
          continue
        }

        queue.push(
          entry.kind
        )

        entry.remaining -= 1
      }
    }

    // Wave 7 introduces Listeners. Keep the introduction threatening, but
    // deliberately smaller than the generic count-growth result. Five
    // Listeners are enough to teach the mechanic without allowing the wave
    // to turn into an uncontrolled retained-object flood.
    if (waveIndex === 6) {
      const balancedWaveSeven: EnemyKind[] = []

      for (let i = 0; i < 6; i += 1) {
        balancedWaveSeven.push(
          "listener",
          "allocation"
        )
      }

      while (balancedWaveSeven.length < 30) {
        balancedWaveSeven.push("allocation")
      }

      return balancedWaveSeven
    }

    return queue
  }


  function startNextWave() {
    const state =
      runtimeRef.current

    if (
      state.status === "wave" ||
      state.status === "lost" ||
      state.status === "won"
    ) {
      return
    }

    if (
      state.wave >= WAVES.length &&
      !state.endless
    ) {
      return
    }

    const queue =
      buildWaveQueue(
        state.wave
      )

    state.spawnQueue =
      queue

    // A Listener's retained-object allowance is per wave.
    listenerSpawnCountsRef.current.clear()

    const waveCounts = queue.reduce<Record<string, number>>((counts, kind) => {
      counts[kind] = (counts[kind] ?? 0) + 1
      return counts
    }, {})

    console.group(`[WAVE ${state.wave + 1}] spawn plan`)
    console.log(`Total queued enemies: ${queue.length}`)
    console.table(waveCounts)
    console.log("Exact spawn queue:", [...queue])
    console.groupEnd()

    state.spawnTimer = 0

    const waveEntries =
      WAVES[state.wave]

    state.spawnInterval =
      waveEntries
        ? Math.max(
            MIN_CAMPAIGN_SPAWN_INTERVAL,
            Math.min(
              ...waveEntries.map(
                (entry) =>
                  entry.interval
              )
            ) *
              Math.max(
                0.58,
                1 -
                  state.wave *
                    CAMPAIGN_INTERVAL_DECAY
              )
          )
        : Math.max(
            0.14,
            0.42 -
              (state.wave - WAVES.length) *
                0.028
          )

    state.wave += 1
    state.status = "wave"

    addFloatingText(
      GAME_WIDTH / 2,
      58,
      !state.endless &&
      state.wave === WAVES.length
        ? "FINAL WAVE"
        : state.endless &&
            state.wave > WAVES.length
          ? `ENDLESS WAVE ${state.wave - WAVES.length}`
          : `WAVE ${state.wave}`
    )

    forceUiRefresh()
  }


  function continueEndless() {
    const state =
      runtimeRef.current

    if (state.status !== "won") {
      return
    }

    state.endless = true
    state.endlessWavesCleared = 0
    state.status = "between"

    addFloatingText(
      GAME_WIDTH / 2,
      62,
      "ENDLESS MODE"
    )

    forceUiRefresh()
  }


  function resetGame() {
    runtimeRef.current =
      createRuntime()

    towerAimRef.current.clear()

    setSelectedTowerId(
      null
    )

    setSelectedTowerKind(
      "gc"
    )

    forceUiRefresh()
  }


  function canPlaceTower(
    x: number,
    y: number
  ) {
    if (
      x < 30 ||
      x > GAME_WIDTH - 30 ||
      y < 70 ||
      y > GAME_HEIGHT - 35
    ) {
      return false
    }

    if (
      isNearPath(
        x,
        y
      )
    ) {
      return false
    }

    for (
      const tower of
      runtimeRef.current
        .towers
    ) {
      if (
        distance(
          x,
          y,
          tower.x,
          tower.y
        ) < GRID_SIZE * 0.75
      ) {
        return false
      }
    }

    return true
  }


  function placeTower(
    kind: TowerKind,
    x: number,
    y: number
  ) {
    const state =
      runtimeRef.current

    const definition =
      TOWERS[kind]

    const snapped =
      snapPointToGrid(x, y)

    x = snapped.x
    y = snapped.y

    if (
      state.cpu <
      definition.cost
    ) {
      addFloatingText(
        x,
        y,
        "NOT ENOUGH CPU"
      )

      return
    }

    if (
      !canPlaceTower(
        x,
        y
      )
    ) {
      addFloatingText(
        x,
        y,
        "INVALID"
      )

      return
    }

    const tower: Tower = {
      id: state.nextId++,
      kind,
      x,
      y,
      level: 1,
      cooldown: 0,
      spent:
        definition.cost,
      powerUpgrades: 0,
      utilityUpgrades: 0,
    }

    state.cpu -=
      definition.cost

    state.towers.push(
      tower
    )

    if (tower.kind !== "profiler") {
      towerAimRef.current.set(
        tower.id,
        -Math.PI / 2
      )
    }

    setSelectedTowerId(
      tower.id
    )

    setSelectedTowerKind(
      null
    )

    forceUiRefresh()
  }


  function getUpgradeCost(
    tower: Tower
  ) {
    return (
      UPGRADE_BASE_COST +
      tower.level *
        85
    )
  }


  function upgradeSelectedTower(
    choice: "power" | "utility"
  ) {
    const state = runtimeRef.current
    const tower = state.towers.find(
      (candidate) => candidate.id === selectedTowerId
    )

    if (!tower || tower.level >= MAX_TOWER_LEVEL) return

    const cost = getUpgradeCost(tower)
    if (state.cpu < cost) {
      addFloatingText(tower.x, tower.y, "NOT ENOUGH CPU")
      return
    }

    state.cpu -= cost
    tower.spent += cost
    tower.level += 1

    if (choice === "power") tower.powerUpgrades += 1
    else tower.utilityUpgrades += 1

    addFloatingText(
      tower.x,
      tower.y - 25,
      choice === "power" ? `L${tower.level} POWER` : `L${tower.level} UTILITY`
    )
    forceUiRefresh()
  }

  function sellSelectedTower() {
    const state =
      runtimeRef.current

    const tower =
      state.towers.find(
        (candidate) =>
          candidate.id ===
          selectedTowerId
      )

    if (!tower) {
      return
    }

    const refund =
      Math.floor(
        tower.spent *
        SELL_REFUND
      )

    state.cpu += refund

    state.towers =
      state.towers.filter(
        (candidate) =>
          candidate.id !==
          tower.id
      )

    towerAimRef.current.delete(
      tower.id
    )

    addFloatingText(
      tower.x,
      tower.y,
      `+${refund} CPU`
    )

    setSelectedTowerId(
      null
    )

    forceUiRefresh()
  }


  function findTowerAt(
    x: number,
    y: number
  ) {
    return (
      runtimeRef.current
        .towers.find(
          (tower) =>
            distance(
              x,
              y,
              tower.x,
              tower.y
            ) <= 22
        ) ?? null
    )
  }


  function handleCanvasClick(
    event:
      React.MouseEvent<
        HTMLCanvasElement
      >
  ) {
    const canvas =
      canvasRef.current

    if (!canvas) {
      return
    }

    const rect =
      canvas.getBoundingClientRect()

    const x =
      (
        event.clientX -
        rect.left
      ) *
      (
        GAME_WIDTH /
        rect.width
      )

    const y =
      (
        event.clientY -
        rect.top
      ) *
      (
        GAME_HEIGHT /
        rect.height
      )

    const clickedTower =
      findTowerAt(
        x,
        y
      )

    if (clickedTower) {
      setSelectedTowerId(
        clickedTower.id
      )

      setSelectedTowerKind(
        null
      )

      return
    }

    if (selectedTowerKind) {
      placeTower(
        selectedTowerKind,
        x,
        y
      )

      return
    }

    setSelectedTowerId(
      null
    )
  }


  function handleMouseMove(
    event:
      React.MouseEvent<
        HTMLCanvasElement
      >
  ) {
    const canvas =
      canvasRef.current

    if (!canvas) {
      return
    }

    const rect =
      canvas.getBoundingClientRect()

    mouseRef.current = {
      x:
        (
          event.clientX -
          rect.left
        ) *
        (
          GAME_WIDTH /
          rect.width
        ),
      y:
        (
          event.clientY -
          rect.top
        ) *
        (
          GAME_HEIGHT /
          rect.height
        ),
      inside: true,
    }
  }


  function moveEnemy(
    enemy: Enemy,
    dt: number
  ) {
    let remaining =
      enemy.speed *
      dt

    while (
      remaining > 0 &&
      !enemy.dead
    ) {
      const from =
        GAME_PATH[
          enemy.pathIndex
        ]

      const to =
        GAME_PATH[
          enemy.pathIndex +
            1
        ]

      if (!to) {
        const state =
          runtimeRef.current

        state.ram =
          Math.min(
            MAX_RAM,
            state.ram +
              enemy.ramDamage
          )

        enemy.dead = true

        addFloatingText(
          enemy.x,
          enemy.y,
          `+${enemy.ramDamage}% RAM`
        )

        if (
          state.ram >=
          MAX_RAM
        ) {
          state.status =
            "lost"
        }

        return
      }

      const segmentLength =
        distance(
          from.x,
          from.y,
          to.x,
          to.y
        )

      const travelled =
        enemy.pathProgress *
        segmentLength

      const available =
        segmentLength -
        travelled

      if (
        remaining <
        available
      ) {
        enemy.pathProgress +=
          remaining /
          segmentLength

        remaining = 0
      } else {
        remaining -=
          available

        enemy.pathIndex += 1
        enemy.pathProgress = 0
      }

      const currentFrom =
        GAME_PATH[
          enemy.pathIndex
        ]

      const currentTo =
        GAME_PATH[
          enemy.pathIndex +
            1
        ]

      if (currentTo) {
        enemy.x =
          currentFrom.x +
          (
            currentTo.x -
            currentFrom.x
          ) *
            enemy.pathProgress

        enemy.y =
          currentFrom.y +
          (
            currentTo.y -
            currentFrom.y
          ) *
            enemy.pathProgress
      }
    }
  }


  function damageEnemy(
    enemy: Enemy,
    amount: number,
    kind: TowerKind
  ) {
    let damage =
      amount

    if (
      kind ===
        "reference" &&
      enemy.kind ===
        "retained"
    ) {
      damage *= 1.65
    }

    if (
      kind ===
        "cycle-detector" &&
      (
        enemy.kind ===
          "cycle" ||
        enemy.kind ===
          "legacy"
      )
    ) {
      damage *= 2.1
    }

    if (
      enemy.shield > 0
    ) {
      const shieldMultiplier =
        kind ===
        "cycle-detector"
          ? 2.5
          : 1

      const shieldDamage =
        Math.min(
          enemy.shield,
          damage *
            shieldMultiplier
        )

      enemy.shield -=
        shieldDamage

      damage -=
        shieldDamage /
        shieldMultiplier
    }

    if (
      damage > 0
    ) {
      enemy.hp -= damage
    }

    if (
      enemy.hp <= 0 &&
      !enemy.dead
    ) {
      const state =
        runtimeRef.current

      enemy.dead = true

      state.cpu +=
        enemy.reward

      addBurst(
        enemy.x,
        enemy.y,
        enemy.kind ===
          "legacy"
          ? 18
          : 7
      )

      addFloatingText(
        enemy.x,
        enemy.y,
        `+${enemy.reward} CPU`
      )
    }
  }


  function updateTowers(
    dt: number
  ) {
    const state =
      runtimeRef.current

    for (
      const tower of
      state.towers
    ) {
      if (
        tower.kind ===
        "profiler"
      ) {
        continue
      }

      tower.cooldown -= dt

      const definition =
        TOWERS[tower.kind]

      const boost =
        profilerBoost(
          tower,
          state.towers
        )

      const levelMultiplier =
        towerLevelMultiplier(
          tower
        )

      const range =
        definition.range *
        towerRangeMultiplier(tower) *
        boost.range

      let target: Enemy | null =
        null

      let bestProgress =
        -Infinity

      for (
        const enemy of
        state.enemies
      ) {
        if (enemy.dead) {
          continue
        }

        if (
          distance(
            tower.x,
            tower.y,
            enemy.x,
            enemy.y
          ) > range
        ) {
          continue
        }

        const progress =
          enemy.pathIndex +
          enemy.pathProgress

        if (
          progress >
          bestProgress
        ) {
          bestProgress =
            progress

          target = enemy
        }
      }

      if (!target) {
        continue
      }

      // Keep the weapon pointed at its current in-range target at all times.
      // Cooldown controls firing only, not aiming.
      towerAimRef.current.set(
        tower.id,
        Math.atan2(
          target.y - tower.y,
          target.x - tower.x
        )
      )

      if (tower.cooldown > 0) {
        continue
      }

      const damage =
        definition.damage *
        levelMultiplier *
        boost.damage

      state.projectiles.push({
        id: state.nextId++,
        x: tower.x,
        y: tower.y,
        targetId: target.id,
        damage,
        speed:
          definition
            .projectileSpeed,
        radius:
          tower.kind ===
          "free"
            ? 4
            : 3,
        kind: tower.kind,
        dead: false,
      })

      tower.cooldown =
        definition.fireRate /
        towerFireRateMultiplier(tower)
    }
  }


  function updateProjectiles(
    dt: number
  ) {
    const state =
      runtimeRef.current

    for (
      const projectile of
      state.projectiles
    ) {
      if (projectile.dead) {
        continue
      }

      const target =
        state.enemies.find(
          (enemy) =>
            enemy.id ===
            projectile.targetId &&
            !enemy.dead
        )

      if (!target) {
        projectile.dead =
          true

        continue
      }

      const dx =
        target.x -
        projectile.x

      const dy =
        target.y -
        projectile.y

      const dist =
        Math.hypot(
          dx,
          dy
        )

      const step =
        projectile.speed *
        dt

      if (
        dist <=
        step +
          target.radius
      ) {
        projectile.x =
          target.x

        projectile.y =
          target.y

        projectile.dead =
          true

        damageEnemy(
          target,
          projectile.damage,
          projectile.kind
        )

        continue
      }

      projectile.x +=
        dx / dist *
        step

      projectile.y +=
        dy / dist *
        step
    }
  }


  function updateListener(
    enemy: Enemy,
    dt: number
  ) {
    if (
      enemy.kind !==
      "listener"
    ) {
      return
    }

    enemy.spawnCooldown -= dt

    if (
      enemy.spawnCooldown >
      0
    ) {
      return
    }

    const spawnedSoFar =
      listenerSpawnCountsRef.current.get(enemy.id) ?? 0

    // Each Listener may retain at most four extra objects. Once it has
    // reached the cap it remains an enemy, but it can no longer multiply.
    if (spawnedSoFar >= 4) {
      enemy.spawnCooldown = Number.POSITIVE_INFINITY
      return
    }

    // Slower than the old 2.8 second loop, giving the player a meaningful
    // window to focus the Listener before another retained object appears.
    enemy.spawnCooldown =
      3.4

    listenerSpawnCountsRef.current.set(
      enemy.id,
      spawnedSoFar + 1
    )

    const state =
      runtimeRef.current

    const stats =
      ENEMY_STATS.retained

    const retainedId = state.nextId++

    state.enemies.push({
      id: retainedId,
      kind: "retained",
      pathIndex:
        enemy.pathIndex,
      pathProgress:
        Math.max(
          0,
          enemy.pathProgress -
            0.08
        ),
      x: enemy.x,
      y: enemy.y,
      hp:
        stats.hp *
        0.7 *
        CAMPAIGN_ENEMY_HP_SCALE *
        (state.endless
          ? 1 +
            Math.max(
              1,
              state.wave - WAVES.length
            ) *
              ENDLESS_HP_GROWTH
          : 1),
      maxHp:
        stats.hp *
        0.7 *
        CAMPAIGN_ENEMY_HP_SCALE *
        (state.endless
          ? 1 +
            Math.max(
              1,
              state.wave - WAVES.length
            ) *
              ENDLESS_HP_GROWTH
          : 1),
      speed:
        stats.speed *
        CAMPAIGN_ENEMY_SPEED_SCALE,
      ramDamage:
        Math.max(
          1,
          Math.round(
            stats.ramDamage *
              CAMPAIGN_ENEMY_RAM_SCALE
          )
        ),
      reward:
        Math.max(
          1,
          Math.floor(
            stats.reward *
              0.7 *
              CAMPAIGN_REWARD_SCALE
          )
        ),
      radius:
        stats.radius,
      shield:
        stats.shield,
      spawnCooldown: 0,
      dead: false,
    })

    console.log(
      `[SPAWN] wave=${state.wave} source=listener parent=${enemy.id} ` +
        `kind=retained id=${retainedId} ` +
        `listenerSpawn=${spawnedSoFar + 1}/4 ` +
        `alive=${state.enemies.filter((candidate) => !candidate.dead).length}`
    )

    addFloatingText(
      enemy.x,
      enemy.y - 18,
      "+ RETAINED"
    )
  }


  function updateSpawning(
    dt: number
  ) {
    const state =
      runtimeRef.current

    if (
      state.status !==
      "wave"
    ) {
      return
    }

    if (
      state.spawnQueue.length >
      0
    ) {
      state.spawnTimer -= dt

      if (
        state.spawnTimer <=
        0
      ) {
        const kind =
          state.spawnQueue.shift()

        if (kind) {
          createEnemy(
            kind
          )
        }

        state.spawnTimer =
          state.spawnInterval
      }
    }
  }


  function updateParticles(
    dt: number
  ) {
    const state =
      runtimeRef.current

    for (
      const particle of
      state.particles
    ) {
      particle.life -= dt
      particle.x +=
        particle.vx * dt
      particle.y +=
        particle.vy * dt

      particle.vx *= 0.96
      particle.vy *= 0.96
    }

    for (
      const text of
      state.texts
    ) {
      text.life -= dt
      text.y -=
        20 * dt
    }
  }


  function updateGame(
    dt: number
  ) {
    const state =
      runtimeRef.current

    if (
      state.status ===
        "lost" ||
      state.status ===
        "won"
    ) {
      updateParticles(
        dt
      )

      return
    }

    updateSpawning(
      dt
    )

    for (
      const enemy of
      state.enemies
    ) {
      if (enemy.dead) {
        continue
      }

      moveEnemy(
        enemy,
        dt
      )

      updateListener(
        enemy,
        dt
      )
    }

    updateTowers(
      dt
    )

    updateProjectiles(
      dt
    )

    updateParticles(
      dt
    )

    state.enemies =
      state.enemies.filter(
        (enemy) =>
          !enemy.dead
      )

    state.projectiles =
      state.projectiles.filter(
        (projectile) =>
          !projectile.dead
      )

    state.particles =
      state.particles.filter(
        (particle) =>
          particle.life > 0
      )

    state.texts =
      state.texts.filter(
        (text) =>
          text.life > 0
      )

    if (
      state.status ===
        "wave" &&
      state.spawnQueue.length ===
        0 &&
      state.enemies.length ===
        0
    ) {
      if (
        state.wave >= WAVES.length &&
        !state.endless
      ) {
        state.status =
          "won"
      } else {
        if (
          state.endless &&
          state.wave > WAVES.length
        ) {
          state.endlessWavesCleared += 1
        }

        state.status =
          "between"

        // Bonuses grow more slowly than enemy pressure so placement and
        // upgrade choices continue to matter in later waves.
        state.cpu +=
          Math.floor(
            WAVE_BONUS * WAVE_CLEAR_BONUS_SCALE +
            state.wave * WAVE_CLEAR_BONUS_GROWTH
          )

        addFloatingText(
          GAME_WIDTH / 2,
          62,
          `WAVE CLEAR +${
            Math.floor(
              WAVE_BONUS * WAVE_CLEAR_BONUS_SCALE +
              state.wave * WAVE_CLEAR_BONUS_GROWTH
            )
          } CPU`
        )
      }

      console.log(
        `[WAVE CLEAR] wave=${state.wave} cpu=${state.cpu} ram=${state.ram}% ` +
          `towers=${state.towers.length}`
      )

      forceUiRefresh()
    }
  }


  function drawRoundedRect(
    ctx:
      CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    const r =
      Math.min(
        radius,
        width / 2,
        height / 2
      )

    ctx.beginPath()
    ctx.roundRect(
      x,
      y,
      width,
      height,
      r
    )
  }


  function drawBackground(
    ctx:
      CanvasRenderingContext2D
  ) {
    ctx.fillStyle =
      "#030615"

    ctx.fillRect(
      0,
      0,
      GAME_WIDTH,
      GAME_HEIGHT
    )

    /*
     * Tiny circuit-board grid.
     */
    ctx.strokeStyle =
      "rgba(255,255,255,0.035)"

    ctx.lineWidth = 1

    for (
      let x = GRID_OFFSET_X;
      x < GAME_WIDTH;
      x += GRID_SIZE
    ) {
      ctx.beginPath()
      ctx.moveTo(
        x,
        0
      )
      ctx.lineTo(
        x,
        GAME_HEIGHT
      )
      ctx.stroke()
    }

    for (
      let y = GRID_OFFSET_Y;
      y < GAME_HEIGHT;
      y += GRID_SIZE
    ) {
      ctx.beginPath()
      ctx.moveTo(
        0,
        y
      )
      ctx.lineTo(
        GAME_WIDTH,
        y
      )
      ctx.stroke()
    }
  }


  function drawPath(
    ctx:
      CanvasRenderingContext2D
  ) {
    ctx.save()
    ctx.lineCap = "square"
    ctx.lineJoin = "round"

    ctx.beginPath()
    ctx.moveTo(
      GAME_PATH[0].x,
      GAME_PATH[0].y
    )

    for (let i = 1; i < GAME_PATH.length; i += 1) {
      ctx.lineTo(
        GAME_PATH[i].x,
        GAME_PATH[i].y
      )
    }

    // Quiet outer edge, then the actual road. No cell-by-cell boxes:
    // those were what made the previous version look fragmented.
    ctx.strokeStyle = "rgba(56,189,248,0.08)"
    ctx.lineWidth = ROAD_WIDTH + 8
    ctx.stroke()

    ctx.strokeStyle = "rgba(125,211,252,0.18)"
    ctx.lineWidth = ROAD_WIDTH
    ctx.stroke()

    ctx.strokeStyle = "rgba(255,255,255,0.12)"
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.restore()

    ctx.font = `11px ${CANVAS_FONT}`

    // Keep the endpoint labels vertically aligned with the actual route.
    const pathStart = GAME_PATH[0]
    const pathEnd = GAME_PATH[GAME_PATH.length - 1]

    ctx.textBaseline = "middle"
    ctx.textAlign = "left"
    ctx.fillStyle = "rgba(255,255,255,0.42)"
    ctx.fillText(
      "ALLOC",
      24,
      pathStart.y
    )

    ctx.textAlign = "right"
    ctx.fillStyle = "rgba(248,113,113,0.72)"
    ctx.fillText(
      "LEAK →",
      GAME_WIDTH - 22,
      pathEnd.y
    )

    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
  }

  function drawTower(
    ctx: CanvasRenderingContext2D,
    tower: Tower
  ) {
    const selected = tower.id === selectedTowerId
    const definition = TOWERS[tower.kind]
    const state = runtimeRef.current
    const boost = profilerBoost(tower, state.towers)
    const level = Math.max(1, Math.min(3, tower.level))
    const colour = getTowerFill(tower.kind)

    if (selected) {
      ctx.beginPath()
      ctx.arc(
        tower.x,
        tower.y,
        definition.range * towerRangeMultiplier(tower) * boost.range,
        0,
        Math.PI * 2
      )
      ctx.fillStyle = "rgba(255,255,255,0.025)"
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.18)"
      ctx.lineWidth = 1
      ctx.stroke()
    }

    const angle =
      tower.kind === "profiler"
        ? performance.now() / 1500
        : towerAimRef.current.get(
            tower.id
          ) ?? -Math.PI / 2

    ctx.save()
    ctx.translate(tower.x, tower.y)
    ctx.rotate(angle)

    /*
     * Level 2 intentionally preserves the established tower silhouette.
     * Level 1 strips details away; level 3 adds hardware, glow and a more
     * substantial weapon profile. Upgrading is therefore visible at a glance
     * without changing the tower's identity or footprint.
     */
    if (tower.kind === "gc") {
      const bodyW = level === 1 ? 24 : level === 2 ? 28 : 30
      const bodyH = level === 1 ? 22 : level === 2 ? 26 : 28

      ctx.fillStyle = "rgba(3,10,15,0.92)"
      drawRoundedRect(
        ctx,
        -bodyW / 2,
        -bodyH / 2,
        bodyW,
        bodyH,
        level === 1 ? 6 : 8
      )
      ctx.fill()
      ctx.strokeStyle = selected ? "#fff" : colour
      ctx.lineWidth = selected ? 2 : level === 3 ? 1.8 : 1.4
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(
        0,
        0,
        level === 1 ? 5 : level === 2 ? 7 : 8,
        -0.7,
        4.6
      )
      ctx.strokeStyle = colour
      ctx.lineWidth = level === 1 ? 1.6 : level === 2 ? 2.2 : 2.6
      ctx.stroke()

      if (level >= 2) {
        ctx.beginPath()
        ctx.moveTo(5, -7)
        ctx.lineTo(11, -7)
        ctx.lineTo(8, -2)
        ctx.fillStyle = colour
        ctx.fill()
      }

      ctx.fillStyle = colour
      ctx.fillRect(
        level === 1 ? 5 : 7,
        level === 1 ? -1.5 : -2,
        level === 1 ? 10 : level === 2 ? 12 : 15,
        level === 1 ? 3 : level === 2 ? 4 : 5
      )

      if (level === 3) {
        ctx.globalAlpha = 0.55
        ctx.strokeStyle = colour
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(0, 0, 12, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.fillRect(10, -5, 8, 2)
        ctx.fillRect(10, 3, 8, 2)
      }
    } else if (tower.kind === "free") {
      const bodyW = level === 1 ? 22 : level === 2 ? 26 : 29
      const bodyH = level === 1 ? 20 : level === 2 ? 24 : 27

      ctx.fillStyle = "rgba(12,9,3,0.94)"
      drawRoundedRect(
        ctx,
        -bodyW / 2,
        -bodyH / 2,
        bodyW,
        bodyH,
        level === 1 ? 4 : 5
      )
      ctx.fill()
      ctx.strokeStyle = selected ? "#fff" : colour
      ctx.lineWidth = selected ? 2 : level === 3 ? 1.8 : 1.4
      ctx.stroke()

      ctx.fillStyle = colour
      ctx.fillRect(
        level === 1 ? 2 : 3,
        level === 1 ? -3 : -4,
        level === 1 ? 13 : level === 2 ? 17 : 20,
        level === 1 ? 6 : 8
      )

      ctx.fillStyle = "rgba(255,255,255,0.75)"
      ctx.fillRect(-7, level === 1 ? -4 : -6, 3, level === 1 ? 8 : 12)

      if (level >= 2) {
        ctx.fillRect(-1, -6, 2, 12)
      }

      if (level === 3) {
        ctx.fillStyle = colour
        ctx.globalAlpha = 0.55
        ctx.fillRect(-10, -10, 5, 3)
        ctx.fillRect(-10, 7, 5, 3)
        ctx.globalAlpha = 1
        ctx.strokeStyle = colour
        ctx.beginPath()
        ctx.moveTo(8, -6)
        ctx.lineTo(18, -6)
        ctx.moveTo(8, 6)
        ctx.lineTo(18, 6)
        ctx.stroke()
      }
    } else if (tower.kind === "reference") {
      const outerR = level === 1 ? 11.5 : level === 2 ? 13 : 15
      const innerR = level === 1 ? 5.75 : level === 2 ? 7 : 8

      ctx.fillStyle = "rgba(3,8,16,0.94)"
      ctx.beginPath()
      ctx.arc(0, 0, outerR, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = selected ? "#fff" : colour
      ctx.lineWidth = selected ? 2 : level === 3 ? 1.8 : 1.4
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(0, 0, innerR, 0, Math.PI * 2)
      ctx.strokeStyle = colour
      ctx.lineWidth = level === 1 ? 1.4 : 2
      ctx.stroke()

      ctx.fillStyle = colour
      ctx.fillRect(
        level === 1 ? 5 : 7,
        level === 1 ? -2 : -2.5,
        level === 1 ? 11 : level === 2 ? 13 : 16,
        level === 1 ? 4 : 5
      )

      if (level >= 2) {
        ctx.beginPath()
        ctx.arc(-3, 0, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }

      if (level === 3) {
        ctx.globalAlpha = 0.55
        ctx.beginPath()
        ctx.arc(0, 0, 11, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(-7, -7, 2, 0, Math.PI * 2)
        ctx.arc(-7, 7, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (tower.kind === "profiler") {
      const body = level === 1 ? 21 : level === 2 ? 24 : 28

      ctx.fillStyle = "rgba(8,5,16,0.94)"
      drawRoundedRect(
        ctx,
        -body / 2,
        -body / 2,
        body,
        body,
        level === 1 ? 5 : 6
      )
      ctx.fill()
      ctx.strokeStyle = selected ? "#fff" : colour
      ctx.lineWidth = selected ? 2 : level === 3 ? 1.8 : 1.4
      ctx.stroke()

      ctx.strokeStyle = colour
      ctx.lineWidth = level === 1 ? 1.2 : 1.5
      ctx.beginPath()
      ctx.arc(0, 0, level === 1 ? 5 : 7, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(level === 1 ? 12 : level === 2 ? 16 : 19, 0)
      ctx.stroke()

      if (level >= 2) {
        ctx.beginPath()
        ctx.arc(0, 0, 17, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(196,181,253,0.22)"
        ctx.stroke()
      }

      if (level === 3) {
        ctx.strokeStyle = "rgba(196,181,253,0.38)"
        ctx.beginPath()
        ctx.arc(0, 0, 20, -0.8, 0.8)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0, 0, 20, 2.35, 3.95)
        ctx.stroke()

        ctx.fillStyle = colour
        ctx.globalAlpha = 0.7
        for (const [x, y] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
          ctx.fillRect(x - 1.5, y - 1.5, 3, 3)
        }
        ctx.globalAlpha = 1
      }
    } else {
      const left = level === 1 ? -11.5 : -13
      const top = level === 1 ? -9 : -10
      const nose = level === 1 ? 12.5 : level === 2 ? 14 : 17

      ctx.fillStyle = "rgba(15,4,8,0.94)"
      ctx.beginPath()
      ctx.moveTo(left, top)
      ctx.lineTo(level === 1 ? 6 : 8, top)
      ctx.lineTo(nose, 0)
      ctx.lineTo(level === 1 ? 6 : 8, -top)
      ctx.lineTo(left, -top)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = selected ? "#fff" : colour
      ctx.lineWidth = selected ? 2 : level === 3 ? 1.8 : 1.4
      ctx.stroke()

      ctx.strokeStyle = colour
      ctx.lineWidth = level === 1 ? 1.5 : 2
      ctx.beginPath()
      ctx.arc(-3, 0, level === 1 ? 4 : 6, -1.1, 1.1)
      ctx.stroke()

      if (level >= 2) {
        ctx.beginPath()
        ctx.arc(2, 0, 6, 2.05, 4.25)
        ctx.stroke()
      }

      ctx.fillStyle = colour
      ctx.fillRect(
        level === 1 ? 5 : 7,
        level === 1 ? -1.5 : -2,
        level === 1 ? 10 : level === 2 ? 12 : 15,
        level === 1 ? 3 : 4
      )

      if (level === 3) {
        ctx.globalAlpha = 0.55
        ctx.strokeStyle = colour
        ctx.beginPath()
        ctx.moveTo(-9, -12)
        ctx.lineTo(5, -12)
        ctx.moveTo(-9, 12)
        ctx.lineTo(5, 12)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.fillRect(10, -5, 7, 2)
        ctx.fillRect(10, 3, 7, 2)
      }
    }

    ctx.restore()
  }

  function drawEnemy(
    ctx:
      CanvasRenderingContext2D,
    enemy: Enemy
  ) {
    ctx.save()

    ctx.translate(
      enemy.x,
      enemy.y
    )


    if (
      enemy.shield > 0
    ) {
      ctx.beginPath()

      ctx.arc(
        0,
        0,
        enemy.radius + 6,
        0,
        Math.PI * 2
      )

      ctx.strokeStyle =
        "rgba(125,211,252,0.65)"

      ctx.lineWidth = 2

      ctx.stroke()
    }


    ctx.fillStyle =
      getEnemyFill(
        enemy.kind
      )

    ctx.globalAlpha =
      enemy.kind ===
      "legacy"
        ? 0.92
        : 0.82

    drawRoundedRect(
      ctx,
      -enemy.radius,
      -enemy.radius,
      enemy.radius * 2,
      enemy.radius * 2,
      enemy.kind ===
        "legacy"
        ? 8
        : 4
    )

    ctx.fill()

    ctx.globalAlpha = 1


    ctx.strokeStyle =
      "rgba(255,255,255,0.55)"

    ctx.lineWidth = 1

    ctx.stroke()


    ctx.fillStyle =
      enemy.kind ===
      "legacy"
        ? "#fff"
        : "#050816"

    ctx.font =
      `${
        enemy.kind ===
        "legacy"
          ? 9
          : 8
      }px ${CANVAS_FONT}`

    ctx.textAlign =
      "center"

    ctx.textBaseline =
      "middle"

    ctx.fillText(
      getEnemyLabel(
        enemy.kind
      ),
      0,
      0
    )


    const hpRatio =
      Math.max(
        0,
        enemy.hp /
        enemy.maxHp
      )

    ctx.fillStyle =
      "rgba(0,0,0,0.55)"

    ctx.fillRect(
      -enemy.radius,
      -enemy.radius - 7,
      enemy.radius * 2,
      3
    )

    ctx.fillStyle =
      "rgba(134,239,172,0.85)"

    ctx.fillRect(
      -enemy.radius,
      -enemy.radius - 7,
      enemy.radius *
        2 *
        hpRatio,
      3
    )

    ctx.restore()
  }


  function drawProjectile(
    ctx:
      CanvasRenderingContext2D,
    projectile: Projectile
  ) {
    ctx.beginPath()

    ctx.arc(
      projectile.x,
      projectile.y,
      projectile.radius,
      0,
      Math.PI * 2
    )

    ctx.fillStyle =
      getTowerFill(
        projectile.kind
      )

    ctx.fill()
  }


  function drawEffects(
    ctx:
      CanvasRenderingContext2D
  ) {
    const state =
      runtimeRef.current

    for (
      const particle of
      state.particles
    ) {
      ctx.globalAlpha =
        Math.max(
          0,
          particle.life /
          particle.maxLife
        )

      ctx.fillStyle =
        "rgba(255,255,255,0.8)"

      ctx.fillRect(
        particle.x,
        particle.y,
        particle.size,
        particle.size
      )
    }

    ctx.globalAlpha = 1


    ctx.textAlign =
      "center"

    ctx.font =
      `10px ${CANVAS_FONT}`

    for (
      const text of
      state.texts
    ) {
      ctx.globalAlpha =
        Math.max(
          0,
          text.life /
          text.maxLife
        )

      ctx.fillStyle =
        "rgba(255,255,255,0.75)"

      ctx.fillText(
        text.text,
        text.x,
        text.y
      )
    }

    ctx.globalAlpha = 1
    ctx.textAlign =
      "left"
  }


  function drawPlacementPreview(
    ctx:
      CanvasRenderingContext2D
  ) {
    if (
      !selectedTowerKind ||
      !mouseRef.current
        .inside
    ) {
      return
    }

    const mouse =
      mouseRef.current

    const snapped =
      snapPointToGrid(
        mouse.x,
        mouse.y
      )

    const valid =
      canPlaceTower(
        snapped.x,
        snapped.y
      )

    const definition =
      TOWERS[
        selectedTowerKind
      ]

    ctx.beginPath()

    ctx.arc(
      snapped.x,
      snapped.y,
      definition.range,
      0,
      Math.PI * 2
    )

    ctx.fillStyle =
      valid
        ? "rgba(134,239,172,0.035)"
        : "rgba(248,113,113,0.04)"

    ctx.fill()

    ctx.strokeStyle =
      valid
        ? "rgba(134,239,172,0.22)"
        : "rgba(248,113,113,0.28)"

    ctx.lineWidth = 1

    ctx.stroke()


    ctx.globalAlpha =
      0.75

    ctx.fillStyle =
      valid
        ? getTowerFill(
            selectedTowerKind
          )
        : "#f87171"

    drawRoundedRect(
      ctx,
      snapped.x - 20,
      snapped.y - 18,
      40,
      36,
      8
    )

    ctx.fill()

    ctx.globalAlpha = 1
  }


  function drawHud(
    ctx:
      CanvasRenderingContext2D
  ) {

    // Keep all top HUD information on one visual baseline.
    ctx.textBaseline = "middle"
    ctx.font = `16px ${CANVAS_FONT}`

    ctx.fillStyle = "rgba(255,255,255,0.42)"
    ctx.fillText("WAVE", 24, 34)

    ctx.fillStyle = "rgba(255,255,255,0.82)"
    ctx.fillText(
      state.endless
        ? `${state.wave} · E`
        : `${state.wave}/${WAVES.length}`,
      82,
      34
    )

    ctx.fillStyle = "rgba(255,255,255,0.42)"
    ctx.fillText("CPU", 175, 34)

    ctx.fillStyle = "rgba(255,255,255,0.82)"
    ctx.fillText(
      `${Math.floor(state.cpu)}`,
      225,
      34
    )

    ctx.fillStyle = "rgba(255,255,255,0.42)"
    ctx.fillText("RAM", 310, 34)

    const barX = 360
    const barY = 21
    const barW = 230
    const barH = 26

    ctx.font =
      `12px ${CANVAS_FONT}`

    ctx.fillStyle =
      "rgba(255,255,255,0.45)"

    ctx.fillStyle =
      "rgba(255,255,255,0.08)"

    drawRoundedRect(
      ctx,
      barX,
      barY,
      barW,
      barH,
      6
    )

    ctx.fill()


    const ramRatio =
      state.ram /
      MAX_RAM

    ctx.fillStyle =
      ramRatio >= 0.75
        ? "rgba(248,113,113,0.85)"
        : ramRatio >= 0.45
          ? "rgba(250,204,21,0.75)"
          : "rgba(134,239,172,0.72)"

    if (
      ramRatio > 0
    ) {
      drawRoundedRect(
        ctx,
        barX,
        barY,
        barW *
          ramRatio,
        barH,
        6
      )

      ctx.fill()
    }


    if (
      state.wave ===
        WAVES.length &&
      state.status ===
        "wave"
    ) {
      ctx.fillStyle =
        "rgba(248,113,113,0.7)"

      ctx.font =
        `12px ${CANVAS_FONT}`

      ctx.textAlign =
        "right"

      ctx.fillText(
        "PRODUCTION",
        GAME_WIDTH - 22,
        39
      )

      ctx.textAlign =
        "left"
    }
    ctx.textBaseline = "alphabetic"

  }


  function drawOverlay(
    ctx:
      CanvasRenderingContext2D
  ) {
    const state =
      runtimeRef.current

    if (
      state.status !==
        "lost" &&
      state.status !==
        "won"
    ) {
      return
    }

    ctx.fillStyle =
      "rgba(0,1,18,0.78)"

    ctx.fillRect(
      0,
      0,
      GAME_WIDTH,
      GAME_HEIGHT
    )


    ctx.textAlign =
      "center"

    ctx.fillStyle =
      state.status ===
      "won"
        ? "#86efac"
        : "#f87171"

    ctx.font =
      `42px ${CANVAS_FONT}`

    ctx.fillText(
      state.status ===
      "won"
        ? "HEAP STABLE"
        : "OUT OF MEMORY",
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 -
        30
    )


    ctx.fillStyle =
      "rgba(255,255,255,0.55)"

    ctx.font =
      `15px ${CANVAS_FONT}`

    ctx.fillText(
      state.status ===
      "won"
        ? "legacy code collected. somehow."
        : "too much memory escaped into the void.",
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 +
        10
    )


    ctx.font =
      `12px ${CANVAS_FONT}`

    ctx.fillStyle =
      "rgba(255,255,255,0.3)"

    ctx.fillText(
      "use RESTART below to try again",
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 +
        45
    )

    ctx.textAlign =
      "left"
  }


  function drawGame() {
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

    drawBackground(
      ctx
    )

    drawPath(
      ctx
    )

    for (
      const tower of
      runtimeRef.current
        .towers
    ) {
      drawTower(
        ctx,
        tower
      )
    }

    drawPlacementPreview(
      ctx
    )

    for (
      const enemy of
      runtimeRef.current
        .enemies
    ) {
      drawEnemy(
        ctx,
        enemy
      )
    }

    for (
      const projectile of
      runtimeRef.current
        .projectiles
    ) {
      drawProjectile(
        ctx,
        projectile
      )
    }

    drawEffects(
      ctx
    )

    drawHud(
      ctx
    )

    drawOverlay(
      ctx
    )
  }


  useEffect(() => {
    const handleQuickBuyKey = (
      event: KeyboardEvent
    ) => {
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return
      }

      const index =
        Number(event.key) - 1

      if (
        index < 0 ||
        index >= TOWER_ORDER.length
      ) {
        return
      }

      setSelectedTowerKind(
        TOWER_ORDER[index]
      )
      setSelectedTowerId(null)
    }

    window.addEventListener(
      "keydown",
      handleQuickBuyKey
    )

    return () => {
      window.removeEventListener(
        "keydown",
        handleQuickBuyKey
      )
    }
  }, [])


  useEffect(() => {
    let lastUiUpdate = 0

    function frame(
      time: number
    ) {
      if (
        lastTimeRef.current ===
        null
      ) {
        lastTimeRef.current =
          time
      }

      const dt =
        Math.min(
          0.035,
          (
            time -
            lastTimeRef.current
          ) /
            1000
        )

      lastTimeRef.current =
        time

      updateGame(
        dt * gameSpeedRef.current
      )

      drawGame()


      /*
       * Keep React UI in sync without
       * rerendering at 60fps.
       */
      if (
        time -
          lastUiUpdate >
        180
      ) {
        lastUiUpdate = time

        setUiVersion(
          (value) =>
            value + 1
        )
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

      lastTimeRef.current =
        null
    }
  }, [
    selectedTowerId,
    selectedTowerKind,
  ])


  const state =
    runtimeRef.current


  return (
    <div className="w-full font-comic text-white">

      <div
        className="relative mx-auto overflow-hidden"
        style={{
          width: `min(100%, calc((100dvh - 220px) * ${GAME_WIDTH / GAME_HEIGHT}))`,
          aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
        }}
      >
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            mouseRef.current.inside = false
          }}
          className="
            absolute
            inset-0
            block
            h-full
            w-full
            cursor-crosshair
            border
            border-white/15
            bg-navy-dark
          "
        />

        {/* ENDLESS SURVIVAL SCORE */}
        {state.status !== "ready" && state.endless && (
          <div
            className="
              pointer-events-none
              absolute left-1/2 top-3 z-30
              -translate-x-1/2
              border border-white/15
              px-3 py-1.5
              shadow-[6px_6px_0_rgba(255,255,255,0.025)]
              text-center
            "
            style={{
              backgroundColor: "rgba(5, 8, 25, 0.70)",
              backdropFilter: "blur(14px) saturate(88%) brightness(82%)",
              WebkitBackdropFilter: "blur(14px) saturate(88%) brightness(82%)",
            }}
          >
            <div className="text-[7px] uppercase tracking-[0.16em] text-white/25">
              endless survival
            </div>
            <div className="mt-0.5 text-[11px] text-white/75">
              {state.endlessWavesCleared} waves cleared
            </div>
          </div>
        )}

        {/* QUICK BUY / CONTEXT INFO */}
        {state.status !== "ready" && (
        <div
          className="
            pointer-events-none
            absolute
            bottom-3 left-3 right-[190px]
            z-20
            flex items-end
          "
        >
          <div
            className="
              pointer-events-auto
              flex min-w-0 items-stretch gap-1.5
              border border-white/15
              p-1.5
              shadow-[6px_6px_0_rgba(255,255,255,0.025)]
            "
            style={{
              backgroundColor: "rgba(5, 8, 25, 0.66)",
              backdropFilter: "blur(14px) saturate(88%) brightness(82%)",
              WebkitBackdropFilter: "blur(14px) saturate(88%) brightness(82%)",
            }}
          >
            {TOWER_ORDER.map((kind) => {
              const definition = TOWERS[kind]
              const active =
                selectedTowerKind === kind
              const affordable =
                runtime.cpu >= definition.cost

              return (
                <button
                  key={kind}
                  type="button"
                  onMouseEnter={() =>
                    setHoveredQuickTower(kind)
                  }
                  onMouseLeave={() =>
                    setHoveredQuickTower(null)
                  }
                  onFocus={() =>
                    setHoveredQuickTower(kind)
                  }
                  onBlur={() =>
                    setHoveredQuickTower(null)
                  }
                  onClick={() => {
                    setSelectedTowerKind(kind)
                    setSelectedTowerId(null)
                  }}
                  style={{
                    backgroundColor: active
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(14,20,43,0.52)",
                    backdropFilter:
                      "blur(24px) saturate(96%) brightness(78%)",
                    WebkitBackdropFilter:
                      "blur(24px) saturate(96%) brightness(78%)",
                  }}
                  className={`
                    group relative
                    flex h-[48px] w-[104px]
                    shrink-0 items-center gap-2
                    border px-2 text-left
                    transition-all
                    ${
                      active
                        ? "border-white/35 text-white"
                        : "border-white/10 text-white/65 hover:border-white/25 hover:text-white"
                    }
                    ${affordable ? "" : "opacity-45"}
                  `}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: getTowerFill(kind),
                      boxShadow: `0 0 8px ${getTowerFill(kind)}55`,
                    }}
                  />

                  <span className="min-w-0">
                    <span className="block truncate text-[9px] leading-3">
                      {definition.name}
                    </span>
                    <span className="mt-0.5 block text-[9px] text-white/40">
                      {definition.cost} CPU
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {hoveredQuickTower && (
            <div
              className="
                pointer-events-none
                absolute bottom-[70px] left-0
                w-[340px]
                border border-white/15
                px-3 py-2.5
                shadow-[7px_7px_0_rgba(255,255,255,0.025)]
              "
              style={{
                backgroundColor: "rgba(5,8,25,0.84)",
                backdropFilter:
                  "blur(14px) saturate(88%) brightness(82%)",
                WebkitBackdropFilter:
                  "blur(14px) saturate(88%) brightness(82%)",
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-[11px] text-white/85">
                  {TOWERS[hoveredQuickTower].name}
                </div>
                <div className="shrink-0 text-[9px] text-white/35">
                  {TOWERS[hoveredQuickTower].cost} CPU
                </div>
              </div>

              <div className="mt-1 text-[9px] leading-[13px] text-white/45">
                {TOWERS[hoveredQuickTower].description}
              </div>

              <div className="mt-2 flex gap-3 border-t border-white/10 pt-2 text-[8px] text-white/30">
                <span>
                  RNG {TOWERS[hoveredQuickTower].range}
                </span>
                {hoveredQuickTower !== "profiler" && (
                  <>
                    <span>
                      DMG {TOWERS[hoveredQuickTower].damage}
                    </span>
                    <span>
                      RATE {TOWERS[hoveredQuickTower].fireRate.toFixed(2)}s
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        )}

{/* SELECTED TOWER ACTIONS - ABOVE THE WAVE BUTTON */}
        {state.status !== "ready" && selectedTower && (
          <div
            className="
              absolute
              bottom-[72px]
              right-2
              z-20
              w-[430px]
              max-w-[calc(100%-16px)]
              border border-white/15
              bg-[#050819]/95
              p-4
              shadow-[8px_8px_0_rgba(255,255,255,0.035)]
              backdrop-blur-[1px]
            "
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <div className="truncate text-[14px] text-white/85">
                  {TOWERS[selectedTower.kind].name}
                </div>
                <span className="shrink-0 text-[10px] text-white/45">
                  L{selectedTower.level}/{MAX_TOWER_LEVEL}
                </span>
              </div>
            </div>

            {selectedTower.level < MAX_TOWER_LEVEL ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(["power", "utility"] as const).map((choice) => {
                  const option = TOWER_UPGRADES[selectedTower.kind][choice]
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => upgradeSelectedTower(choice)}
                      style={{
                        backgroundColor: "rgba(14, 20, 43, 0.48)",
                        backdropFilter: "blur(24px) saturate(96%) brightness(78%)",
                        WebkitBackdropFilter: "blur(24px) saturate(96%) brightness(78%)",
                      }}
                      className="
                        min-h-[82px]
                        border border-white/15
                        px-4 py-3.5
                        text-left
                        transition-colors
                        hover:border-white/35
                        hover:bg-white/[0.035]
                      "
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[13px] leading-[17px] text-white/90">
                          {option.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-white/55">
                          ${getUpgradeCost(selectedTower)}
                        </span>
                      </span>
                      <span className="mt-1 block text-[10px] leading-[14px] text-white/55">
                        {option.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="mt-3 border border-white/10 px-4 py-3 text-[11px] text-white/45">
                MAX LEVEL · routine fully optimised
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <div className="text-[9px] leading-[13px] text-white/35">
                choose how this routine specialises
              </div>
              <button
                type="button"
                onClick={sellSelectedTower}
                style={{
                  backgroundColor: "rgba(14, 20, 43, 0.48)",
                  backdropFilter: "blur(24px) saturate(96%) brightness(78%)",
                  WebkitBackdropFilter: "blur(24px) saturate(96%) brightness(78%)",
                }}
                className="
                  border border-white/15
                  px-3 py-2
                  text-[10px] text-white/45
                  transition-colors
                  hover:border-red-400/30
                  hover:text-red-300
                "
              >
                SELL
              </button>
            </div>
          </div>
        )}

        {/* WAVE / SPEED CONTROL - ALWAYS BOTTOM RIGHT */}
        {state.status !== "ready" && (
        <button
          type="button"
          onClick={() => {
            if (state.status === "won") {
              gameSpeedRef.current = 1
              setGameSpeed(1)
              continueEndless()
              return
            }

            if (state.status === "lost") {
              gameSpeedRef.current = 1
              setGameSpeed(1)
              resetGame()
              return
            }

            if (state.status === "wave") {
              const nextSpeed: 1 | 2 = gameSpeed === 1 ? 2 : 1
              gameSpeedRef.current = nextSpeed
              setGameSpeed(nextSpeed)
              return
            }

            gameSpeedRef.current = 1
            setGameSpeed(1)
            startNextWave()
          }}
          style={{
            right: 12,
            left: "auto",
            bottom: 12,
            backgroundColor: "rgba(5, 8, 25, 0.72)",
            backdropFilter: "blur(24px) saturate(96%) brightness(78%)",
            WebkitBackdropFilter: "blur(24px) saturate(96%) brightness(78%)",
          }}
          className="
            absolute
            bottom-3
            right-3
            z-40
            min-w-[142px]
            border
            border-white/25
            px-3.5
            py-2.5
            text-left
            shadow-[7px_7px_0_rgba(255,255,255,0.035)]
            backdrop-blur-[1px]
            transition-all
            duration-150
            hover:-translate-y-0.5
            hover:border-white/55
          "
        >
          <div className="text-[7px] uppercase tracking-[0.15em] text-white/25">
            {state.status === "wave"
              ? `${state.enemies.length + state.spawnQueue.length} allocations remain`
              : state.status === "between"
                ? "heap stable"
                : state.status === "won"
                  ? "production survived"
                  : state.status === "lost"
                    ? "process crashed"
                    : "HEAP MONITOR OFFLINE"}
          </div>

          <div className="mt-0.5 text-[11px] text-white/75">
            {state.status === "won"
              ? "CONTINUE · ENDLESS →"
              : state.status === "lost"
                ? state.endless
                  ? `SCORE ${state.endlessWavesCleared} · RESTART`
                  : "RESTART"
              : state.status === "wave"
                ? gameSpeed === 2
                  ? "2× SPEED · ON"
                  : "2× SPEED →"
                : state.wave === 0
                  ? "> INITIALISE HEAP"
                  : `START WAVE ${state.wave + 1} →`}
          </div>
        </button>
        )}

        {/* ========================================
            START SCREEN
        ======================================== */}

        {state.status === "ready" && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-navy-dark/80 px-5 backdrop-blur-[1px]">
            <div className="w-full max-w-md border border-white/15 bg-navy-dark/95 p-6 text-center shadow-[8px_8px_0_rgba(255,255,255,0.04)]">
              <div className="text-[10px] tracking-[0.2em] text-white/25">
                HEAP MONITOR OFFLINE
              </div>

              <div className="mt-2 font-comic-serif text-3xl text-white">
                Initialise heap?
              </div>

              <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-white/40">
                Memory is escaping. Build cleanup routines beside the
                allocation path, collect objects before they leak and keep
                RAM below 100%.
              </p>

              <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-x-5 gap-y-2 border-y border-white/[0.06] py-4 text-left text-[10px] tracking-[0.08em]">
                <span className="text-white/25">
                  PLACE
                </span>
                <span className="text-right text-white/55">
                  CLICK
                </span>

                <span className="text-white/25">
                  RESOURCE
                </span>
                <span className="text-right text-white/55">
                  CPU
                </span>

                <span className="text-white/25">
                  FAILURE
                </span>
                <span className="text-right text-red-200/60">
                  RAM 100%
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  gameSpeedRef.current = 1
                  setGameSpeed(1)
                  startNextWave()
                }}
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
                &gt; initialise heap
              </button>

              <div className="mt-2 text-[9px] tracking-[0.1em] text-white/20">
                CLICK · BEGIN ALLOCATION
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-white/25 [@media(max-height:760px)]:hidden">
        <span>
          CLICK · PLACE / SELECT
        </span>

        <span>
          GRID · SNAP ENABLED
        </span>

        <span>
          2× · WAVE SPEED
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 text-[10px] [@media(max-height:760px)]:hidden">
        <span className="text-emerald-300/55">
          ● GC · CLEANUP
        </span>

        <span className="text-yellow-300/55">
          ● FREE · DEALLOCATE
        </span>

        <span className="text-blue-300/55">
          ● REF · RETAINED
        </span>

        <span className="text-purple-300/55">
          ● PROFILER · BOOST
        </span>

        <span className="text-rose-300/55">
          ● CYCLE · DETECT
        </span>

        <span className="text-white/25">
          100% RAM · OOM
        </span>
      </div>

      <span className="hidden">
        {uiVersion}
      </span>
    </div>
  )}