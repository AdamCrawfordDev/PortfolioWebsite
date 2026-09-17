import {
  useEffect,
  useRef,
} from "react"

import {
  BASE_MEMORY_USAGE,
  DIFFICULTY_RAMP_SECONDS,
  FALSE_FREE_SCORE_PENALTY,
  GAME_HEIGHT,
  GAME_WIDTH,
  HEAP_BOTTOM,
  HEAP_LEFT,
  HEAP_RIGHT,
  HEAP_TOP,
  INITIAL_LEAK_CHANCE,
  INITIAL_SPAWN_INTERVAL,
  LEAK_SCORE,
  LISTENER_CHILD_INTERVAL,
  MAX_LEAK_CHANCE,
  MEMORY_CAPACITY,
  MIN_SPAWN_INTERVAL,
} from "./config"

import type {
  Allocation,
  AllocationKind,
  MemoryStats,
} from "./types"


type Props = {
  running: boolean

  onStatsChange:
    (stats: MemoryStats) => void

  onStabilityChange:
    (stability: number) => void
}


type GameData = {
  allocations: Allocation[]

  nextAllocationId: number

  spawnTimer: number

  elapsed: number

  score: number

  leaksFixed: number

  falseFrees: number

  stability: number

  failed: boolean

  selectedId:
    number | null

  allocationHistory: {
    time: number
    memory: number
  }[]

  lastAllocationRate: number

  feedback: {
    text: string
    type:
      | "success"
      | "error"
      | "info"
    timer: number
  } | null
}


// ========================================
// DATA
// ========================================

const OWNERS = [
  "image_cache",
  "event_bus",
  "user_session",
  "render_tree",
  "api_client",
  "route_cache",
  "socket_pool",
  "analytics",
  "auth_store",
  "component_tree",
]


const CREATORS = [
  "renderAvatar()",
  "subscribe()",
  "loadProfile()",
  "fetchData()",
  "mountComponent()",
  "openSocket()",
  "cacheImage()",
  "createSession()",
  "registerListener()",
  "hydrateStore()",
]


// ========================================
// INITIAL GAME
// ========================================

function createInitialGame():
  GameData {
  return {
    allocations: [],

    nextAllocationId: 1,

    spawnTimer: 0,

    elapsed: 0,

    score: 0,

    leaksFixed: 0,

    falseFrees: 0,

    stability: 100,

    failed: false,

    selectedId: null,

    allocationHistory: [],

    lastAllocationRate: 0,

    feedback: null,
  }
}


// ========================================
// COMPONENT
// ========================================

function MemoryGame({
  running,
  onStatsChange,
  onStabilityChange,
}: Props) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    )


  const gameRef =
    useRef<GameData>(
      createInitialGame()
    )


  const runningRef =
    useRef(running)


  const onStatsChangeRef =
    useRef(onStatsChange)


  const onStabilityChangeRef =
    useRef(onStabilityChange)


  // ========================================
  // CURRENT PROPS
  // ========================================

  useEffect(() => {
    runningRef.current =
      running
  }, [running])


  useEffect(() => {
    onStatsChangeRef.current =
      onStatsChange
  }, [onStatsChange])


  useEffect(() => {
    onStabilityChangeRef.current =
      onStabilityChange
  }, [onStabilityChange])


  // ========================================
  // POINTER INPUT
  // ========================================

  useEffect(() => {
    const canvas =
      canvasRef.current


    if (!canvas) {
      return
    }


    function getCanvasPoint(
      event: MouseEvent
    ) {
      if (!canvas) {
        return {
          x: 0,
          y: 0,
        }
      }


      const rect =
        canvas.getBoundingClientRect()


      return {
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
      }
    }


    function handleClick(
      event: MouseEvent
    ) {
      if (
        !runningRef.current
      ) {
        return
      }


      const game =
        gameRef.current


      if (game.failed) {
        return
      }


      const point =
        getCanvasPoint(event)


      // ========================================
      // FREE BUTTON
      // ========================================

      if (
        point.x >= 870 &&
        point.x <= 1030 &&
        point.y >= 445 &&
        point.y <= 490
      ) {
        freeSelectedAllocation()

        return
      }


      // ========================================
      // ALLOCATION SELECTION
      // ========================================

      /*
       * Reverse so allocations drawn later
       * are selected first if two overlap.
       */

      const allocation =
        [...game.allocations]
          .reverse()
          .find(
            (item) =>
              point.x >=
                item.x &&
              point.x <=
                item.x +
                  item.width &&
              point.y >=
                item.y &&
              point.y <=
                item.y +
                  item.height
          )


      game.selectedId =
        allocation?.id ??
        null


      for (
        const item of
        game.allocations
      ) {
        item.selected =
          item.id ===
          game.selectedId
      }
    }


    canvas.addEventListener(
      "click",
      handleClick
    )


    return () => {
      canvas.removeEventListener(
        "click",
        handleClick
      )
    }
  }, [])


  // ========================================
  // KEYBOARD
  // ========================================

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        !runningRef.current
      ) {
        return
      }


      if (
        event.key.toLowerCase() ===
          "f" ||
        event.key ===
          "Delete"
      ) {
        event.preventDefault()

        freeSelectedAllocation()
      }
    }


    window.addEventListener(
      "keydown",
      handleKeyDown
    )


    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      )
    }
  }, [])


  // ========================================
  // MAIN LOOP
  // ========================================

  useEffect(() => {
    const canvas =
      canvasRef.current


    if (!canvas) {
      return
    }


    const maybeContext =
      canvas.getContext(
        "2d"
      )


    if (!maybeContext) {
      return
    }


    const context:
      CanvasRenderingContext2D =
        maybeContext


    gameRef.current =
      createInitialGame()


    let animationFrame =
      0

    let previousTime =
      performance.now()

    let statsTimer =
      0


    function frame(
      currentTime: number
    ) {
      const delta =
        Math.min(
          (
            currentTime -
            previousTime
          ) / 1000,
          0.05
        )


      previousTime =
        currentTime


      if (
        runningRef.current &&
        !gameRef.current.failed
      ) {
        updateGame(delta)


        statsTimer +=
          delta


        if (
          statsTimer >=
          0.1
        ) {
          statsTimer =
            0

          publishStats()
        }
      }


      drawGame(context)


      animationFrame =
        requestAnimationFrame(
          frame
        )
    }


    drawGame(context)

    publishStats()


    animationFrame =
      requestAnimationFrame(
        frame
      )


    return () => {
      cancelAnimationFrame(
        animationFrame
      )
    }
  }, [])


  // ========================================
  // MEMORY
  // ========================================

  function getMemoryUsed() {
    const game =
      gameRef.current


    const allocations =
      game.allocations.reduce(
        (
          total,
          allocation
        ) =>
          total +
          allocation.size,
        0
      )


    return (
      BASE_MEMORY_USAGE +
      allocations
    )
  }


  // ========================================
  // STATS
  // ========================================

  function publishStats() {
    const game =
      gameRef.current


    const memoryUsed =
      getMemoryUsed()


    onStatsChangeRef.current({
      memoryUsed,

      memoryCapacity:
        MEMORY_CAPACITY,

      memoryPercent:
        Math.min(
          100,
          (
            memoryUsed /
            MEMORY_CAPACITY
          ) *
            100
        ),

      score:
        game.score,

      leaksFixed:
        game.leaksFixed,

      falseFrees:
        game.falseFrees,

      activeAllocations:
        game.allocations.length,

      allocationRate:
        game.lastAllocationRate,

      gameState:
        game.failed
          ? "game-over"
          : runningRef.current
            ? "running"
            : "idle",
    })


    onStabilityChangeRef.current(
      game.stability
    )
  }


  // ========================================
  // UPDATE
  // ========================================

  function updateGame(
    delta: number
  ) {
    const game =
      gameRef.current


    game.elapsed +=
      delta


    game.spawnTimer -=
      delta * 1000


    if (game.feedback) {
      game.feedback.timer -=
        delta


      if (
        game.feedback.timer <=
        0
      ) {
        game.feedback =
          null
      }
    }


    const difficulty =
      Math.min(
        game.elapsed /
          DIFFICULTY_RAMP_SECONDS,
        1
      )


    // ========================================
    // SPAWN
    // ========================================

    if (
      game.spawnTimer <=
      0
    ) {
      spawnAllocation(
        difficulty
      )


      game.spawnTimer =
        INITIAL_SPAWN_INTERVAL -
        (
          INITIAL_SPAWN_INTERVAL -
          MIN_SPAWN_INTERVAL
        ) *
          difficulty
    }


    // ========================================
    // AGE ALLOCATIONS
    // ========================================

    const expiredIds =
      new Set<number>()


    const childAllocations:
      Allocation[] = []


    for (
      const allocation of
      game.allocations
    ) {
      allocation.age +=
        delta


      // ========================================
      // NORMAL FREE
      // ========================================

      if (
        !allocation.leaking &&
        allocation.age >=
          allocation.lifetime
      ) {
        expiredIds.add(
          allocation.id
        )

        continue
      }


      // ========================================
      // LISTENER LEAK
      // ========================================

      if (
        allocation.kind ===
        "listener-leak"
      ) {
        allocation.childTimer -=
          delta


        if (
          allocation.childTimer <=
          0
        ) {
          allocation.childTimer =
            LISTENER_CHILD_INTERVAL


          const child =
            createAllocation(
              Math.max(
                4,
                Math.round(
                  allocation.size *
                    0.35
                )
              ),
              true,
              "slow-leak"
            )


          child.owner =
            allocation.owner


          child.createdBy =
            "eventCallback()"


          childAllocations.push(
            child
          )
        }
      }
    }


    game.allocations =
      game.allocations.filter(
        (allocation) =>
          !expiredIds.has(
            allocation.id
          )
      )


    game.allocations.push(
      ...childAllocations
    )


    // ========================================
    // MEMORY HISTORY
    // ========================================

    updateMemoryHistory()


    // ========================================
    // FAILURE
    // ========================================

    if (
      getMemoryUsed() >=
        MEMORY_CAPACITY ||
      game.stability <= 0
    ) {
      game.failed =
        true

      publishStats()
    }
  }


  // ========================================
  // MEMORY HISTORY
  // ========================================

  function updateMemoryHistory() {
    const game =
      gameRef.current


    const last =
      game.allocationHistory[
        game.allocationHistory.length -
          1
      ]


    if (
      last &&
      game.elapsed -
        last.time <
        1
    ) {
      return
    }


    const memory =
      getMemoryUsed()


    game.allocationHistory.push({
      time:
        game.elapsed,

      memory,
    })


    if (
      game.allocationHistory.length >
      10
    ) {
      game.allocationHistory.shift()
    }


    if (
      game.allocationHistory.length >=
      2
    ) {
      const first =
        game.allocationHistory[0]

      const latest =
        game.allocationHistory[
          game.allocationHistory.length -
            1
        ]


      const timeDifference =
        latest.time -
        first.time


      if (
        timeDifference >
        0
      ) {
        game.lastAllocationRate =
          (
            latest.memory -
            first.memory
          ) /
          timeDifference
      }
    }
  }


  // ========================================
  // SPAWN
  // ========================================

  function spawnAllocation(
    difficulty: number
  ) {
    const leakChance =
      INITIAL_LEAK_CHANCE +
      (
        MAX_LEAK_CHANCE -
        INITIAL_LEAK_CHANCE
      ) *
        difficulty


    const leaking =
      Math.random() <
      leakChance


    let kind:
      AllocationKind =
        "normal"


    if (leaking) {
      const roll =
        Math.random()


      if (
        roll <
        0.58
      ) {
        kind =
          "slow-leak"
      }

      else if (
        roll <
        0.83
      ) {
        kind =
          "listener-leak"
      }

      else {
        kind =
          "cache"
      }
    }


    const sizes = [
      4,
      8,
      12,
      16,
      24,
      32,
      48,
    ]


    const size =
      sizes[
        Math.floor(
          Math.random() *
            sizes.length
        )
      ]


    const allocation =
      createAllocation(
        size,
        leaking,
        kind
      )


    gameRef.current
      .allocations
      .push(
        allocation
      )
  }


  // ========================================
  // CREATE ALLOCATION
  // ========================================

  function createAllocation(
    size: number,
    leaking: boolean,
    kind: AllocationKind
  ): Allocation {
    const game =
      gameRef.current


    const width =
      Math.max(
        42,
        Math.min(
          82,
          36 + size
        )
      )


    const height =
      30


    const position =
      findFreePosition(
        width,
        height
      )


    const owner =
      OWNERS[
        Math.floor(
          Math.random() *
            OWNERS.length
        )
      ]


    const createdBy =
      CREATORS[
        Math.floor(
          Math.random() *
            CREATORS.length
        )
      ]


    const allocation:
      Allocation = {
      id:
        game.nextAllocationId++,

      x:
        position.x,

      y:
        position.y,

      width,

      height,

      size,

      age: 0,

      /*
       * Legitimate allocations have
       * deliberately varied lifetimes.
       *
       * Some survive long enough to look
       * suspicious, which prevents age
       * alone being a perfect answer.
       */

      lifetime:
        2.5 +
        Math.random() *
          7.5,

      leaking,

      kind,

      owner,

      createdBy,

      references:
        leaking
          ? Math.random() <
              0.65
            ? 0
            : 1
          : 1 +
            Math.floor(
              Math.random() *
                4
            ),

      selected: false,

      seed:
        Math.random() *
        1000,

      childTimer:
        LISTENER_CHILD_INTERVAL,
    }


    return allocation
  }


  // ========================================
  // POSITIONING
  // ========================================

  function findFreePosition(
    width: number,
    height: number
  ) {
    const game =
      gameRef.current


    for (
      let attempt = 0;
      attempt < 40;
      attempt++
    ) {
      const x =
        HEAP_LEFT +
        15 +
        Math.random() *
          (
            HEAP_RIGHT -
            HEAP_LEFT -
            width -
            30
          )


      const y =
        HEAP_TOP +
        20 +
        Math.random() *
          (
            HEAP_BOTTOM -
            HEAP_TOP -
            height -
            40
          )


      const overlaps =
        game.allocations.some(
          (allocation) =>
            x <
              allocation.x +
                allocation.width +
                8 &&
            x + width + 8 >
              allocation.x &&
            y <
              allocation.y +
                allocation.height +
                8 &&
            y + height + 8 >
              allocation.y
        )


      if (!overlaps) {
        return {
          x,
          y,
        }
      }
    }


    /*
     * Heap is visually crowded.
     * Allow overlap rather than failing
     * to allocate.
     */

    return {
      x:
        HEAP_LEFT +
        20 +
        Math.random() *
          620,

      y:
        HEAP_TOP +
        25 +
        Math.random() *
          360,
    }
  }


  // ========================================
  // FREE SELECTED
  // ========================================

  function freeSelectedAllocation() {
    const game =
      gameRef.current


    if (
      !runningRef.current ||
      game.failed ||
      game.selectedId ===
        null
    ) {
      return
    }


    const allocation =
      game.allocations.find(
        (item) =>
          item.id ===
          game.selectedId
      )


    if (!allocation) {
      return
    }


    // ========================================
    // REAL LEAK
    // ========================================

    if (
      allocation.leaking
    ) {
      game.score +=
        LEAK_SCORE +
        allocation.size *
          4


      game.leaksFixed +=
        1


      game.feedback = {
        text:
          `LEAK FREED  -${allocation.size}MB`,

        type:
          "success",

        timer:
          1.1,
      }
    }


    // ========================================
    // FALSE FREE
    // ========================================

    else {
      game.falseFrees +=
        1


      game.score =
        Math.max(
          0,
          game.score -
            FALSE_FREE_SCORE_PENALTY
        )


      game.stability =
        Math.max(
          0,
          game.stability -
            7
        )


      game.feedback = {
        text:
          "INVALID FREE  STABILITY -7%",

        type:
          "error",

        timer:
          1.2,
      }
    }


    game.allocations =
      game.allocations.filter(
        (item) =>
          item.id !==
          allocation.id
      )


    game.selectedId =
      null


    publishStats()
  }


  // ========================================
  // DRAW
  // ========================================

  function drawGame(
    context:
      CanvasRenderingContext2D
  ) {
    context.clearRect(
      0,
      0,
      GAME_WIDTH,
      GAME_HEIGHT
    )


    context.fillStyle =
      "#000112"


    context.fillRect(
      0,
      0,
      GAME_WIDTH,
      GAME_HEIGHT
    )


    drawGrid(context)

    drawHeap(context)

    drawAllocations(context)

    drawProfiler(context)

    drawMemoryBar(context)

    drawFeedback(context)
  }


  // ========================================
  // GRID
  // ========================================

  function drawGrid(
    context:
      CanvasRenderingContext2D
  ) {
    context.save()


    context.strokeStyle =
      "rgba(255,255,255,0.022)"


    context.lineWidth =
      1


    for (
      let x = 0;
      x <= GAME_WIDTH;
      x += 40
    ) {
      context.beginPath()

      context.moveTo(
        x,
        0
      )

      context.lineTo(
        x,
        GAME_HEIGHT
      )

      context.stroke()
    }


    for (
      let y = 0;
      y <= GAME_HEIGHT;
      y += 40
    ) {
      context.beginPath()

      context.moveTo(
        0,
        y
      )

      context.lineTo(
        GAME_WIDTH,
        y
      )

      context.stroke()
    }


    context.restore()
  }


  // ========================================
  // HEAP
  // ========================================

  function drawHeap(
    context:
      CanvasRenderingContext2D
  ) {
    context.save()


    context.fillStyle =
      "rgba(255,255,255,0.012)"


    context.fillRect(
      HEAP_LEFT,
      HEAP_TOP,
      HEAP_RIGHT -
        HEAP_LEFT,
      HEAP_BOTTOM -
        HEAP_TOP
    )


    context.strokeStyle =
      "rgba(255,255,255,0.10)"


    context.lineWidth =
      1


    context.strokeRect(
      HEAP_LEFT,
      HEAP_TOP,
      HEAP_RIGHT -
        HEAP_LEFT,
      HEAP_BOTTOM -
        HEAP_TOP
    )


    context.font =
      "10px monospace"


    context.fillStyle =
      "rgba(255,255,255,0.25)"


    context.fillText(
      "HEAP",
      HEAP_LEFT,
      HEAP_TOP - 18
    )


    context.fillStyle =
      "rgba(255,255,255,0.12)"


    context.fillText(
      "live allocations",
      HEAP_LEFT + 42,
      HEAP_TOP - 18
    )


    context.restore()
  }


  // ========================================
  // ALLOCATIONS
  // ========================================

  function drawAllocations(
    context:
      CanvasRenderingContext2D
  ) {
    const game =
      gameRef.current


    const now =
      performance.now()


    for (
      const allocation of
      game.allocations
    ) {
      const suspicious =
        allocation.age >
        6


      const pulse =
        (
          Math.sin(
            now *
              0.003 +
            allocation.seed
          ) +
          1
        ) /
        2


      context.save()


      // ========================================
      // SELECTED
      // ========================================

      if (
        allocation.selected
      ) {
        context.shadowBlur =
          18

        context.shadowColor =
          "rgba(125,211,252,0.45)"


        context.strokeStyle =
          "rgba(186,230,253,0.9)"


        context.lineWidth =
          2
      }

      else {
        context.strokeStyle =
          suspicious
            ? `rgba(253,224,71,${
                0.25 +
                pulse *
                  0.15
              })`
            : "rgba(255,255,255,0.16)"


        context.lineWidth =
          1
      }


      context.fillStyle =
        allocation.selected
          ? "rgba(125,211,252,0.055)"
          : "rgba(255,255,255,0.025)"


      context.fillRect(
        allocation.x,
        allocation.y,
        allocation.width,
        allocation.height
      )


      context.strokeRect(
        allocation.x,
        allocation.y,
        allocation.width,
        allocation.height
      )


      // ========================================
      // MEMORY BLOCK
      // ========================================

      context.fillStyle =
        allocation.selected
          ? "rgba(224,242,254,0.82)"
          : "rgba(255,255,255,0.55)"


      context.font =
        "10px monospace"


      context.fillText(
        `${allocation.size}MB`,
        allocation.x + 7,
        allocation.y + 13
      )


      context.font =
        "8px monospace"


      context.fillStyle =
        "rgba(255,255,255,0.22)"


      context.fillText(
        `#${String(
          allocation.id
        ).padStart(
          4,
          "0"
        )}`,
        allocation.x + 7,
        allocation.y + 24
      )


      /*
       * Old allocations get a tiny age
       * marker, but never an explicit
       * "this is a leak" marker.
       */

      if (suspicious) {
        context.fillStyle =
          "rgba(253,224,71,0.55)"


        context.beginPath()

        context.arc(
          allocation.x +
            allocation.width -
            7,
          allocation.y + 7,
          2.5,
          0,
          Math.PI * 2
        )

        context.fill()
      }


      context.restore()
    }
  }


  // ========================================
  // PROFILER
  // ========================================

  function drawProfiler(
    context:
      CanvasRenderingContext2D
  ) {
    const game =
      gameRef.current


    const x =
      835

    const y =
      HEAP_TOP


    const width =
      215

    const height =
      410


    context.save()


    context.fillStyle =
      "rgba(255,255,255,0.012)"


    context.fillRect(
      x,
      y,
      width,
      height
    )


    context.strokeStyle =
      "rgba(255,255,255,0.10)"


    context.strokeRect(
      x,
      y,
      width,
      height
    )


    context.font =
      "10px monospace"


    context.fillStyle =
      "rgba(255,255,255,0.25)"


    context.fillText(
      "MEMORY PROFILER",
      x + 14,
      y + 22
    )


    context.strokeStyle =
      "rgba(255,255,255,0.06)"


    context.beginPath()

    context.moveTo(
      x + 14,
      y + 34
    )

    context.lineTo(
      x + width - 14,
      y + 34
    )

    context.stroke()


    const allocation =
      game.allocations.find(
        (item) =>
          item.id ===
          game.selectedId
      )


    // ========================================
    // NOTHING SELECTED
    // ========================================

    if (!allocation) {
      context.font =
        "10px monospace"


      context.fillStyle =
        "rgba(255,255,255,0.18)"


      context.fillText(
        "> select allocation",
        x + 14,
        y + 65
      )


      context.fillStyle =
        "rgba(255,255,255,0.10)"


      context.fillText(
        "inspect before freeing",
        x + 14,
        y + 84
      )


      drawFreeButton(
        context,
        false
      )


      context.restore()

      return
    }


    // ========================================
    // SELECTED ALLOCATION
    // ========================================

    context.font =
      "11px monospace"


    context.fillStyle =
      "rgba(186,230,253,0.75)"


    context.fillText(
      `ALLOCATION #${String(
        allocation.id
      ).padStart(
        4,
        "0"
      )}`,
      x + 14,
      y + 64
    )


    const rows = [
      [
        "size",
        `${allocation.size} MB`,
      ],

      [
        "age",
        `${allocation.age.toFixed(
          1
        )}s`,
      ],

      [
        "references",
        String(
          allocation.references
        ),
      ],

      [
        "owner",
        allocation.owner,
      ],

      [
        "created",
        allocation.createdBy,
      ],
    ]


    let rowY =
      y + 100


    for (
      const [
        label,
        value,
      ] of rows
    ) {
      context.font =
        "9px monospace"


      context.fillStyle =
        "rgba(255,255,255,0.20)"


      context.fillText(
        label,
        x + 14,
        rowY
      )


      context.fillStyle =
        "rgba(255,255,255,0.58)"


      context.fillText(
        value,
        x + 82,
        rowY
      )


      rowY +=
        28
    }


    // ========================================
    // PROFILER HINT
    // ========================================

    context.strokeStyle =
      "rgba(255,255,255,0.06)"


    context.beginPath()

    context.moveTo(
      x + 14,
      y + 252
    )

    context.lineTo(
      x + width - 14,
      y + 252
    )

    context.stroke()


    context.font =
      "9px monospace"


    if (
      allocation.references ===
      0
    ) {
      context.fillStyle =
        "rgba(253,224,71,0.55)"


      context.fillText(
        "⚠ NO ACTIVE REFERENCES",
        x + 14,
        y + 278
      )
    }

    else {
      context.fillStyle =
        "rgba(255,255,255,0.18)"


      context.fillText(
        "references still active",
        x + 14,
        y + 278
      )
    }


    if (
      allocation.age >
      6
    ) {
      context.fillStyle =
        "rgba(253,224,71,0.45)"


      context.fillText(
        "⚠ LONG-LIVED OBJECT",
        x + 14,
        y + 299
      )
    }


    context.font =
      "8px monospace"


    context.fillStyle =
      "rgba(255,255,255,0.12)"


    context.fillText(
      "freeing live memory",
      x + 14,
      y + 337
    )


    context.fillText(
      "reduces stability",
      x + 14,
      y + 351
    )


    drawFreeButton(
      context,
      true
    )


    context.restore()
  }


  // ========================================
  // FREE BUTTON
  // ========================================

  function drawFreeButton(
    context:
      CanvasRenderingContext2D,
    enabled: boolean
  ) {
    context.fillStyle =
      enabled
        ? "rgba(248,113,113,0.035)"
        : "rgba(255,255,255,0.01)"


    context.fillRect(
      870,
      445,
      160,
      45
    )


    context.strokeStyle =
      enabled
        ? "rgba(248,113,113,0.35)"
        : "rgba(255,255,255,0.06)"


    context.strokeRect(
      870,
      445,
      160,
      45
    )


    context.font =
      "11px monospace"


    context.fillStyle =
      enabled
        ? "rgba(254,202,202,0.72)"
        : "rgba(255,255,255,0.12)"


    context.fillText(
      "[ F ] FREE",
      910,
      472
    )
  }


  // ========================================
  // MEMORY BAR
  // ========================================

  function drawMemoryBar(
    context:
      CanvasRenderingContext2D
  ) {
    const memory =
      getMemoryUsed()


    const ratio =
      Math.min(
        1,
        memory /
          MEMORY_CAPACITY
      )


    let colour =
      "rgba(134,239,172,0.65)"


    if (
      ratio >=
      0.65
    ) {
      colour =
        "rgba(253,224,71,0.72)"
    }


    if (
      ratio >=
      0.85
    ) {
      colour =
        "rgba(248,113,113,0.82)"
    }


    const x =
      HEAP_LEFT

    const y =
      548

    const width =
      HEAP_RIGHT -
      HEAP_LEFT


    context.fillStyle =
      "rgba(255,255,255,0.06)"


    context.fillRect(
      x,
      y,
      width,
      7
    )


    context.fillStyle =
      colour


    context.fillRect(
      x,
      y,
      width * ratio,
      7
    )


    context.font =
      "9px monospace"


    context.fillStyle =
      "rgba(255,255,255,0.28)"


    context.fillText(
      `RAM ${Math.round(
        memory
      )} / ${MEMORY_CAPACITY} MB`,
      x,
      y - 9
    )


    context.textAlign =
      "right"


    context.fillStyle =
      colour


    context.fillText(
      `${Math.round(
        ratio * 100
      )}%`,
      x + width,
      y - 9
    )


    context.textAlign =
      "left"
  }


  // ========================================
  // FEEDBACK
  // ========================================

  function drawFeedback(
    context:
      CanvasRenderingContext2D
  ) {
    const feedback =
      gameRef.current.feedback


    if (!feedback) {
      return
    }


    context.save()


    context.textAlign =
      "center"


    context.font =
      "bold 11px monospace"


    if (
      feedback.type ===
      "success"
    ) {
      context.fillStyle =
        "rgba(134,239,172,0.8)"
    }

    else if (
      feedback.type ===
      "error"
    ) {
      context.fillStyle =
        "rgba(248,113,113,0.85)"
    }

    else {
      context.fillStyle =
        "rgba(186,230,253,0.7)"
    }


    context.fillText(
      feedback.text,
      (
        HEAP_LEFT +
        HEAP_RIGHT
      ) /
        2,
      55
    )


    context.restore()
  }


  // ========================================
  // RENDER
  // ========================================

  return (
    <canvas
      ref={
        canvasRef
      }
      width={
        GAME_WIDTH
      }
      height={
        GAME_HEIGHT
      }
      className="
        block
        h-auto
        w-full
        cursor-crosshair
        bg-navy-dark
      "
    />
  )
}


export default MemoryGame