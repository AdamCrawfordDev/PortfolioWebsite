import {
  useEffect,
  useRef,
} from "react"

import {
  BASE_PACKET_SPEED,
  CORRUPTION_CHANCE,
  DIFFICULTY_RAMP_SECONDS,
  FALSE_POSITIVE_DAMAGE,
  GAME_HEIGHT,
  GAME_WIDTH,
  INITIAL_SPAWN_INTERVAL,
  INTERCEPT_COOLDOWN_MS,
  INTERCEPT_SCORE,
  INTERCEPT_X_DISTANCE,
  JUNCTION_X,
  LANE_CHANGE_CHANCE,
  LANE_CHANGE_SPEED,
  LANE_CHANGE_WARNING_DISTANCE,
  LANE_Y,
  MAX_PACKET_SPEED,
  MIN_PACKET_GAP,
  MIN_SPAWN_INTERVAL,
  NETWORK_LEFT,
  NETWORK_RIGHT,
  PACKET_END_X,
  PACKET_START_X,
  PLAYER_COLUMNS,
  PLAYER_START_COLUMN,
  PLAYER_START_LANE,
  PORTS,
  PORT_MAX_HEALTH,
  STREAK_BONUS,
} from "./config"

import type {
  GameStats,
  LaneChangeDirection,
  Packet,
  Player,
  PortState,
} from "./types"


type Props = {
  running: boolean

  onStatsChange:
    (stats: GameStats) => void
}


type GameData = {
  packets: Packet[]

  player: Player

  ports: PortState[]

  score: number

  intercepted: number

  falsePositives: number

  leaked: number

  streak: number

  nextPacketId: number

  spawnTimer: number

  elapsed: number

  failed: boolean

  interceptCooldown: number

  falsePositiveFlash: number

  falsePositiveLane:
    number | null
}


// ========================================
// INITIAL GAME
// ========================================

function createInitialGame():
  GameData {
  return {
    packets: [],

    player: {
      lane:
        PLAYER_START_LANE,

      column:
        PLAYER_START_COLUMN,
    },

    ports:
      PORTS.map(
        (port) => ({
          ...port,
        })
      ),

    score: 0,

    intercepted: 0,

    falsePositives: 0,

    leaked: 0,

    streak: 0,

    nextPacketId: 1,

    spawnTimer: 0,

    elapsed: 0,

    failed: false,

    interceptCooldown: 0,

    falsePositiveFlash: 0,

    falsePositiveLane: null,
  }
}


// ========================================
// COMPONENT
// ========================================

function NetworkGame({
  running,
  onStatsChange,
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
    useRef(
      running
    )


  const onStatsChangeRef =
    useRef(
      onStatsChange
    )


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


      const game =
        gameRef.current


      if (game.failed) {
        return
      }


      if (
        event.key ===
          "ArrowUp" ||
        event.key.toLowerCase() ===
          "w"
      ) {
        event.preventDefault()

        game.player.lane =
          Math.max(
            0,
            game.player.lane - 1
          )

        return
      }


      if (
        event.key ===
          "ArrowDown" ||
        event.key.toLowerCase() ===
          "s"
      ) {
        event.preventDefault()

        game.player.lane =
          Math.min(
            LANE_Y.length - 1,
            game.player.lane + 1
          )

        return
      }


      if (
        event.key ===
          "ArrowLeft" ||
        event.key.toLowerCase() ===
          "a"
      ) {
        event.preventDefault()

        game.player.column =
          Math.max(
            0,
            game.player.column - 1
          )

        return
      }


      if (
        event.key ===
          "ArrowRight" ||
        event.key.toLowerCase() ===
          "d"
      ) {
        event.preventDefault()

        game.player.column =
          Math.min(
            PLAYER_COLUMNS.length - 1,
            game.player.column + 1
          )
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
        updateGame(
          delta
        )


        statsTimer +=
          delta


        if (
          statsTimer >=
          0.08
        ) {
          statsTimer =
            0

          publishStats()
        }
      }


      drawGame(
        context
      )


      animationFrame =
        requestAnimationFrame(
          frame
        )
    }


    drawGame(
      context
    )


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
  // STATS
  // ========================================

  function publishStats() {
    const game =
      gameRef.current


    const failedPort =
      game.ports.find(
        (port) =>
          port.health <= 0
      )


    onStatsChangeRef.current({
      score:
        game.score,

      intercepted:
        game.intercepted,

      falsePositives:
        game.falsePositives,

      leaked:
        game.leaked,

      streak:
        game.streak,

      ports:
        game.ports.map(
          (port) => ({
            ...port,
          })
        ),

      gameState:
        game.failed
          ? "game-over"
          : runningRef.current
            ? "running"
            : "idle",

      failedPort:
        failedPort?.id ??
        null,
    })
  }


  // ========================================
  // UPDATE
  // ========================================

  function updateGame(
    delta: number
  ) {
    const game =
      gameRef.current


    if (game.failed) {
      return
    }


    game.elapsed +=
      delta


    game.spawnTimer -=
      delta * 1000


    game.interceptCooldown =
      Math.max(
        0,
        game.interceptCooldown -
          delta * 1000
      )


    game.falsePositiveFlash =
      Math.max(
        0,
        game.falsePositiveFlash -
          delta * 1000
      )


    const difficulty =
      Math.min(
        game.elapsed /
          DIFFICULTY_RAMP_SECONDS,
        1
      )


    const trafficSpeed =
      BASE_PACKET_SPEED +
      (
        MAX_PACKET_SPEED -
        BASE_PACKET_SPEED
      ) *
        difficulty


    // ========================================
    // SPAWNING
    // ========================================

    if (
      game.spawnTimer <=
      0
    ) {
      spawnPacket(
        trafficSpeed
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
    // ROUTE PLANNING
    // ========================================

    updatePacketRoutes()


    // ========================================
    // VERTICAL ROUTE MOVEMENT
    // ========================================

    moveChangingPackets(
      delta
    )


    // ========================================
    // HORIZONTAL TRAFFIC
    // ========================================

    movePackets(
      delta,
      trafficSpeed
    )


    // ========================================
    // INTERCEPTION
    // ========================================

    const interceptedIds =
      new Set<number>()


    if (
      game.interceptCooldown <=
      0
    ) {
      const playerX =
        PLAYER_COLUMNS[
          game.player.column
        ]


      const candidates =
        game.packets
          .filter(
            (packet) => {
              /*
               * Packets travelling vertically
               * through a junction cannot be
               * arrested until they have joined
               * the new horizontal route.
               *
               * This prevents the player being
               * punished because a packet simply
               * crossed through them.
               */

              if (
                packet.changingLane
              ) {
                return false
              }


              return (
                packet.lane ===
                  game.player.lane &&
                Math.abs(
                  packet.x -
                    playerX
                ) <=
                  INTERCEPT_X_DISTANCE
              )
            }
          )
          .sort(
            (a, b) =>
              Math.abs(
                a.x -
                  playerX
              ) -
              Math.abs(
                b.x -
                  playerX
              )
          )


      const packet =
        candidates[0]


      if (packet) {
        interceptedIds.add(
          packet.id
        )


        game.interceptCooldown =
          INTERCEPT_COOLDOWN_MS


        // ========================================
        // CORRECT ARREST
        // ========================================

        if (
          packet.corrupted
        ) {
          game.intercepted +=
            1


          game.streak +=
            1


          game.score +=
            INTERCEPT_SCORE +
            Math.min(
              game.streak *
                STREAK_BONUS,
              300
            )
        }


        // ========================================
        // FALSE POSITIVE
        // ========================================

        else {
          game.falsePositives +=
            1


          game.streak =
            0


          const port =
            game.ports[
              packet.lane
            ]


          port.health =
            Math.max(
              0,
              port.health -
                FALSE_POSITIVE_DAMAGE
            )


          game.falsePositiveFlash =
            650


          game.falsePositiveLane =
            packet.lane


          if (
            port.health <=
            0
          ) {
            game.failed =
              true
          }
        }
      }
    }


    // ========================================
    // SERVICE ARRIVALS
    // ========================================

    const escapedIds =
      new Set<number>()


    for (
      const packet of
      game.packets
    ) {
      if (
        interceptedIds.has(
          packet.id
        )
      ) {
        continue
      }


      if (
        packet.changingLane
      ) {
        continue
      }


      if (
        packet.x <
        PACKET_END_X
      ) {
        continue
      }


      escapedIds.add(
        packet.id
      )


      if (
        !packet.corrupted
      ) {
        continue
      }


      const port =
        game.ports[
          packet.lane
        ]


      port.health =
        Math.max(
          0,
          port.health -
            packet.damage
        )


      game.leaked +=
        1


      game.streak =
        0


      if (
        port.health <=
        0
      ) {
        game.failed =
          true
      }
    }


    // ========================================
    // CLEANUP
    // ========================================

    game.packets =
      game.packets.filter(
        (packet) =>
          !interceptedIds.has(
            packet.id
          ) &&
          !escapedIds.has(
            packet.id
          )
      )


    if (game.failed) {
      publishStats()
    }
  }


  // ========================================
  // ROUTE PLANNING
  // ========================================

  function updatePacketRoutes() {
    const game =
      gameRef.current


    for (
      const packet of
      game.packets
    ) {
      /*
       * A packet already travelling down
       * a junction should not make another
       * routing decision.
       */

      if (
        packet.changingLane
      ) {
        continue
      }


      if (
        packet.nextJunctionIndex >=
        JUNCTION_X.length
      ) {
        packet.laneChangeWarning =
          false

        continue
      }


      const junctionX =
        JUNCTION_X[
          packet.nextJunctionIndex
        ]


      const distance =
        junctionX -
        packet.x


      // ========================================
      // DECIDE ROUTE
      // ========================================

      if (
        distance <=
          LANE_CHANGE_WARNING_DISTANCE &&
        distance >
          0 &&
        !packet.laneChangeWarning
      ) {
        packet.laneChangeWarning =
          true


        packet.laneChangeDirection =
          chooseLaneChange(
            packet.lane
          )
      }


      // ========================================
      // REACH JUNCTION
      // ========================================

      if (
        packet.x >=
        junctionX
      ) {
        const direction =
          packet.laneChangeDirection


        /*
         * If this packet planned to change
         * route, check that the destination
         * has enough space.
         */

        if (
          direction !==
          null
        ) {
          const targetLane =
            packet.lane +
            direction


          if (
            canEnterLane(
              packet,
              targetLane
            )
          ) {
            /*
             * Lock X to the junction and begin
             * physical vertical movement.
             */

            packet.x =
              junctionX


            packet.changingLane =
              true


            packet.targetLane =
              targetLane


            packet.laneChangeWarning =
              false


            continue
          }
        }


        /*
         * No route change, or merge wasn't
         * possible. Continue horizontally.
         */

        packet.nextJunctionIndex +=
          1


        packet.laneChangeDirection =
          null


        packet.laneChangeWarning =
          false
      }
    }
  }


  // ========================================
  // VERTICAL MOVEMENT
  // ========================================

  function moveChangingPackets(
    delta: number
  ) {
    const game =
      gameRef.current


    for (
      const packet of
      game.packets
    ) {
      if (
        !packet.changingLane ||
        packet.targetLane ===
          null
      ) {
        continue
      }


      const targetY =
        LANE_Y[
          packet.targetLane
        ]


      const difference =
        targetY -
        packet.y


      const distance =
        Math.abs(
          difference
        )


      const movement =
        LANE_CHANGE_SPEED *
        delta


      /*
       * Packet has reached the new route.
       */

      if (
        distance <=
        movement
      ) {
        packet.y =
          targetY


        packet.lane =
          packet.targetLane


        packet.targetLane =
          null


        packet.changingLane =
          false


        packet.nextJunctionIndex +=
          1


        packet.laneChangeDirection =
          null


        packet.laneChangeWarning =
          false


        continue
      }


      /*
       * Move smoothly along the rail.
       */

      packet.y +=
        Math.sign(
          difference
        ) *
        movement
    }
  }


  // ========================================
  // CHOOSE ROUTE
  // ========================================

  function chooseLaneChange(
    lane: number
  ):
    LaneChangeDirection | null {
    if (
      Math.random() >
      LANE_CHANGE_CHANCE
    ) {
      return null
    }


    if (lane === 0) {
      return 1
    }


    if (
      lane ===
      LANE_Y.length - 1
    ) {
      return -1
    }


    return Math.random() <
      0.5
      ? -1
      : 1
  }


  // ========================================
  // MERGE SAFETY
  // ========================================

  function canEnterLane(
    packet: Packet,
    targetLane: number
  ) {
    const game =
      gameRef.current


    if (
      targetLane < 0 ||
      targetLane >=
        LANE_Y.length
    ) {
      return false
    }


    return !game.packets.some(
      (other) => {
        if (
          other.id ===
          packet.id
        ) {
          return false
        }


        if (
          other.changingLane
        ) {
          return false
        }


        if (
          other.lane !==
          targetLane
        ) {
          return false
        }


        return (
          Math.abs(
            other.x -
              packet.x
          ) <
          MIN_PACKET_GAP
        )
      }
    )
  }


  // ========================================
  // HORIZONTAL TRAFFIC
  // ========================================

  function movePackets(
    delta: number,
    trafficSpeed: number
  ) {
    const game =
      gameRef.current


    for (
      let lane = 0;
      lane <
      LANE_Y.length;
      lane++
    ) {
      const lanePackets =
        game.packets
          .filter(
            (packet) =>
              packet.lane ===
                lane &&
              !packet.changingLane
          )
          .sort(
            (a, b) =>
              b.x - a.x
          )


      let packetAhead:
        Packet | null =
          null


      for (
        const packet of
        lanePackets
      ) {
        packet.speed =
          trafficSpeed


        let targetX =
          packet.x +
          trafficSpeed *
            delta


        if (
          packetAhead
        ) {
          const maximumX =
            packetAhead.x -
            MIN_PACKET_GAP


          targetX =
            Math.min(
              targetX,
              maximumX
            )
        }


        packet.x =
          Math.max(
            packet.x,
            targetX
          )


        /*
         * Horizontal packets stay exactly
         * centred on their route.
         */

        packet.y =
          LANE_Y[
            packet.lane
          ]


        packetAhead =
          packet
      }
    }
  }


  // ========================================
  // SPAWN
  // ========================================

  function spawnPacket(
    trafficSpeed: number
  ) {
    const game =
      gameRef.current


    const availableLanes =
      LANE_Y
        .map(
          (_, lane) =>
            lane
        )
        .filter(
          (lane) =>
            !game.packets.some(
              (packet) =>
                !packet.changingLane &&
                packet.lane ===
                  lane &&
                packet.x <
                  PACKET_START_X +
                    MIN_PACKET_GAP
            )
        )


    if (
      availableLanes.length ===
      0
    ) {
      game.spawnTimer =
        100

      return
    }


    const lane =
      availableLanes[
        Math.floor(
          Math.random() *
            availableLanes.length
        )
      ]


    const corrupted =
      Math.random() <
      CORRUPTION_CHANCE


    const sizeRoll =
      Math.random()


    let size:
      Packet["size"] =
        "normal"


    let damage =
      18


    if (
      sizeRoll <
      0.18
    ) {
      size =
        "small"

      damage =
        12
    }

    else if (
      sizeRoll >
      0.88
    ) {
      size =
        "large"

      damage =
        28
    }


    game.packets.push({
      id:
        game.nextPacketId++,

      lane,

      x:
        PACKET_START_X,

      y:
        LANE_Y[
          lane
        ],

      speed:
        trafficSpeed,

      corrupted,

      damage,

      size,

      seed:
        Math.random() *
        1000,

      nextJunctionIndex:
        0,

      laneChangeDirection:
        null,

      laneChangeWarning:
        false,

      changingLane:
        false,

      targetLane:
        null,
    })
  }


  // ========================================
  // DRAW GAME
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


    drawBackgroundGrid(
      context
    )


    drawNetwork(
      context
    )


    drawPorts(
      context
    )


    drawPackets(
      context
    )


    drawPlayer(
      context
    )


    drawFalsePositiveFeedback(
      context
    )


    drawLabels(
      context
    )
  }


  // ========================================
  // BACKGROUND GRID
  // ========================================

  function drawBackgroundGrid(
    context:
      CanvasRenderingContext2D
  ) {
    context.save()


    context.strokeStyle =
      "rgba(255,255,255,0.025)"


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
  // NETWORK
  // ========================================

  function drawNetwork(
    context:
      CanvasRenderingContext2D
  ) {
    context.save()


    // ========================================
    // HORIZONTAL ROUTES
    // ========================================

    for (
      let lane = 0;
      lane <
      LANE_Y.length;
      lane++
    ) {
      const y =
        LANE_Y[
          lane
        ]


      context.strokeStyle =
        "rgba(255,255,255,0.11)"


      context.lineWidth =
        2


      context.beginPath()

      context.moveTo(
        NETWORK_LEFT,
        y
      )

      context.lineTo(
        NETWORK_RIGHT,
        y
      )

      context.stroke()


      context.strokeStyle =
        "rgba(125,211,252,0.10)"


      context.lineWidth =
        1


      for (
        let x =
          NETWORK_LEFT + 30;
        x <
        NETWORK_RIGHT;
        x += 70
      ) {
        context.beginPath()

        context.moveTo(
          x,
          y - 3
        )

        context.lineTo(
          x + 16,
          y - 3
        )

        context.stroke()
      }
    }


    // ========================================
    // VERTICAL ROUTES
    // ========================================

    for (
      const x of
      JUNCTION_X
    ) {
      /*
       * Make the vertical junction routes a
       * little clearer now that packets
       * genuinely travel along them.
       */

      context.strokeStyle =
        "rgba(125,211,252,0.14)"


      context.lineWidth =
        1.5


      context.beginPath()

      context.moveTo(
        x,
        LANE_Y[0]
      )

      context.lineTo(
        x,
        LANE_Y[
          LANE_Y.length - 1
        ]
      )

      context.stroke()


      for (
        const y of
        LANE_Y
      ) {
        context.fillStyle =
          "rgba(125,211,252,0.28)"


        context.beginPath()

        context.arc(
          x,
          y,
          4,
          0,
          Math.PI * 2
        )

        context.fill()
      }
    }


    context.restore()
  }


  // ========================================
  // PORTS
  // ========================================

  function drawPorts(
    context:
      CanvasRenderingContext2D
  ) {
    const game =
      gameRef.current


    for (
      let lane = 0;
      lane <
      game.ports.length;
      lane++
    ) {
      const port =
        game.ports[
          lane
        ]


      const y =
        LANE_Y[
          lane
        ]


      const healthRatio =
        port.health /
        PORT_MAX_HEALTH


      let accent =
        "rgba(134,239,172,0.75)"


      if (
        healthRatio <=
        0.5
      ) {
        accent =
          "rgba(253,224,71,0.8)"
      }


      if (
        healthRatio <=
        0.25
      ) {
        accent =
          "rgba(248,113,113,0.9)"
      }


      context.strokeStyle =
        accent


      context.globalAlpha =
        0.35


      context.beginPath()

      context.moveTo(
        NETWORK_RIGHT,
        y
      )

      context.lineTo(
        NETWORK_RIGHT + 24,
        y
      )

      context.stroke()


      context.globalAlpha =
        1


      const boxX =
        NETWORK_RIGHT + 25


      const boxY =
        y - 29


      const boxWidth =
        105


      const boxHeight =
        58


      context.fillStyle =
        "rgba(255,255,255,0.018)"


      context.fillRect(
        boxX,
        boxY,
        boxWidth,
        boxHeight
      )


      context.strokeStyle =
        accent


      context.globalAlpha =
        healthRatio <=
        0.25
          ? 0.7
          : 0.3


      context.strokeRect(
        boxX,
        boxY,
        boxWidth,
        boxHeight
      )


      context.globalAlpha =
        1


      context.font =
        "11px monospace"


      context.fillStyle =
        "rgba(255,255,255,0.72)"


      context.fillText(
        `${port.name} :${port.port}`,
        boxX + 9,
        boxY + 18
      )


      const barX =
        boxX + 9


      const barY =
        boxY + 31


      const barWidth =
        boxWidth - 18


      const barHeight =
        5


      context.fillStyle =
        "rgba(255,255,255,0.08)"


      context.fillRect(
        barX,
        barY,
        barWidth,
        barHeight
      )


      context.fillStyle =
        accent


      context.fillRect(
        barX,
        barY,
        barWidth *
          healthRatio,
        barHeight
      )


      context.font =
        "9px monospace"


      context.fillStyle =
        healthRatio <=
        0.25
          ? "rgba(248,113,113,0.8)"
          : "rgba(255,255,255,0.28)"


      context.fillText(
        `${Math.round(
          port.health
        )}%`,
        barX,
        boxY + 50
      )
    }
  }


  // ========================================
  // PACKETS
  // ========================================

  function drawPackets(
    context:
      CanvasRenderingContext2D
  ) {
    const game =
      gameRef.current


    const now =
      performance.now()


    for (
      const packet of
      game.packets
    ) {
      const y =
        packet.y


      let width =
        42


      let height =
        20


      if (
        packet.size ===
        "small"
      ) {
        width =
          32

        height =
          16
      }


      if (
        packet.size ===
        "large"
      ) {
        width =
          56

        height =
          25
      }


      const glitch =
        packet.corrupted &&
        Math.sin(
          now *
            0.018 +
          packet.seed
        ) >
          0.45


      const jitterX =
        glitch
          ? (
              Math.random() -
              0.5
            ) * 6
          : 0


      const jitterY =
        glitch
          ? (
              Math.random() -
              0.5
            ) * 5
          : 0


      const x =
        packet.x +
        jitterX


      const drawY =
        y -
        height / 2 +
        jitterY


      // ========================================
      // ROUTE WARNING
      // ========================================

      if (
        packet.laneChangeWarning &&
        packet.laneChangeDirection !==
          null &&
        !packet.changingLane
      ) {
        context.save()


        context.font =
          "bold 14px monospace"


        context.textAlign =
          "center"


        context.fillStyle =
          packet.corrupted
            ? "rgba(253,224,71,0.85)"
            : "rgba(125,211,252,0.65)"


        context.fillText(
          packet.laneChangeDirection ===
            -1
            ? "↑"
            : "↓",
          x + width / 2,
          drawY - 8
        )


        context.restore()
      }


      // ========================================
      // VERTICAL TRAVEL INDICATOR
      // ========================================

      if (
        packet.changingLane
      ) {
        context.save()


        context.strokeStyle =
          packet.corrupted
            ? "rgba(248,113,113,0.18)"
            : "rgba(125,211,252,0.16)"


        context.lineWidth =
          1


        context.beginPath()

        context.arc(
          x + width / 2,
          y,
          width / 2 + 7,
          0,
          Math.PI * 2
        )

        context.stroke()


        context.restore()
      }


      // ========================================
      // BODY
      // ========================================

      if (
        packet.corrupted
      ) {
        context.save()


        context.shadowBlur =
          glitch
            ? 18
            : 9


        context.shadowColor =
          "rgba(248,113,113,0.65)"


        context.strokeStyle =
          glitch
            ? "rgba(248,113,113,0.95)"
            : "rgba(248,113,113,0.58)"


        context.lineWidth =
          1.5


        context.strokeRect(
          x,
          drawY,
          width,
          height
        )


        context.restore()
      }

      else {
        context.strokeStyle =
          "rgba(125,211,252,0.34)"


        context.lineWidth =
          1


        context.strokeRect(
          x,
          drawY,
          width,
          height
        )
      }


      // ========================================
      // PACKET CONTENT
      // ========================================

      context.font =
        packet.size ===
        "small"
          ? "8px monospace"
          : "9px monospace"


      context.fillStyle =
        packet.corrupted
          ? glitch
            ? "rgba(254,202,202,0.95)"
            : "rgba(254,202,202,0.62)"
          : "rgba(186,230,253,0.55)"


      let text =
        packet.corrupted &&
        glitch
          ? "1#X!0"
          : packet.corrupted
            ? "10X01"
            : "10110"


      if (
        packet.size ===
        "small"
      ) {
        text =
          packet.corrupted
            ? "1X0"
            : "101"
      }


      if (
        packet.size ===
        "large"
      ) {
        text =
          packet.corrupted
            ? "10#X!001"
            : "10110101"
      }


      context.fillText(
        text,
        x + 6,
        y + 3 +
          jitterY
      )


      // ========================================
      // CORRUPTION SPARK
      // ========================================

      if (
        packet.corrupted &&
        glitch
      ) {
        context.strokeStyle =
          "rgba(253,224,71,0.7)"


        context.lineWidth =
          1


        context.beginPath()

        context.moveTo(
          x + width + 2,
          y - 7
        )

        context.lineTo(
          x + width + 7,
          y - 11
        )

        context.lineTo(
          x + width + 5,
          y - 4
        )

        context.lineTo(
          x + width + 10,
          y - 6
        )

        context.stroke()
      }
    }
  }


  // ========================================
  // PLAYER
  // ========================================

  function drawPlayer(
    context:
      CanvasRenderingContext2D
  ) {
    const game =
      gameRef.current


    const x =
      PLAYER_COLUMNS[
        game.player.column
      ]


    const y =
      LANE_Y[
        game.player.lane
      ]


    context.save()


    context.strokeStyle =
      game.interceptCooldown > 0
        ? "rgba(255,255,255,0.08)"
        : "rgba(103,232,249,0.14)"


    context.lineWidth =
      1


    context.beginPath()

    context.arc(
      x,
      y,
      INTERCEPT_X_DISTANCE,
      0,
      Math.PI * 2
    )

    context.stroke()


    context.shadowBlur =
      18


    context.shadowColor =
      "rgba(103,232,249,0.65)"


    context.fillStyle =
      "rgba(8,47,73,0.95)"


    context.strokeStyle =
      "rgba(165,243,252,0.9)"


    context.lineWidth =
      2


    context.beginPath()

    context.arc(
      x,
      y,
      15,
      0,
      Math.PI * 2
    )

    context.fill()

    context.stroke()


    context.strokeStyle =
      "rgba(255,255,255,0.7)"


    context.lineWidth =
      1


    context.beginPath()

    context.moveTo(
      x - 6,
      y
    )

    context.lineTo(
      x + 6,
      y
    )

    context.moveTo(
      x,
      y - 6
    )

    context.lineTo(
      x,
      y + 6
    )

    context.stroke()


    context.restore()


    context.font =
      "9px monospace"


    context.fillStyle =
      "rgba(165,243,252,0.55)"


    context.fillText(
      "POLICE",
      x - 17,
      y + 30
    )
  }


  // ========================================
  // FALSE POSITIVE FEEDBACK
  // ========================================

  function drawFalsePositiveFeedback(
    context:
      CanvasRenderingContext2D
  ) {
    const game =
      gameRef.current


    if (
      game.falsePositiveFlash <=
        0 ||
      game.falsePositiveLane ===
        null
    ) {
      return
    }


    const progress =
      game.falsePositiveFlash /
      650


    const y =
      LANE_Y[
        game.falsePositiveLane
      ]


    context.save()


    context.strokeStyle =
      `rgba(253,224,71,${
        0.22 * progress
      })`


    context.lineWidth =
      5


    context.beginPath()

    context.moveTo(
      NETWORK_LEFT,
      y
    )

    context.lineTo(
      NETWORK_RIGHT,
      y
    )

    context.stroke()


    const playerX =
      PLAYER_COLUMNS[
        game.player.column
      ]


    context.font =
      "bold 10px monospace"


    context.textAlign =
      "center"


    context.fillStyle =
      `rgba(253,224,71,${
        0.9 * progress
      })`


    context.fillText(
      `FALSE POSITIVE  AVAILABILITY -${FALSE_POSITIVE_DAMAGE}%`,
      playerX,
      y - 34
    )


    context.restore()
  }


  // ========================================
  // LABELS
  // ========================================

  function drawLabels(
    context:
      CanvasRenderingContext2D
  ) {
    context.font =
      "9px monospace"


    context.fillStyle =
      "rgba(255,255,255,0.18)"


    context.fillText(
      "INCOMING TRAFFIC",
      NETWORK_LEFT,
      45
    )


    context.fillText(
      "PROTECTED SERVICES",
      NETWORK_RIGHT - 5,
      45
    )


    context.fillStyle =
      "rgba(125,211,252,0.24)"


    context.fillText(
      "NETWORK INTERCEPT GRID",
      GAME_WIDTH / 2 - 70,
      GAME_HEIGHT - 32
    )
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
        bg-navy-dark
      "
    />
  )
}


export default NetworkGame