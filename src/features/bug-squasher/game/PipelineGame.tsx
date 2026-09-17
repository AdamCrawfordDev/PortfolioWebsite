import {
  useEffect,
  useRef,
  useState,
} from "react"

import {
  BULLET_HEIGHT,
  BULLET_SPEED,
  BULLET_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ENEMY_CONFIG,
  FIRE_RATE,
  PIPELINE_STAGES,
  PLAYER_HEIGHT,
  PLAYER_MAX_HEALTH,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  STAGE_BRIEFINGS,
  UPGRADES,
} from "./config"

import type {
  Bullet,
  Enemy,
  EnemyType,
  FloatingText,
  GameStats,
  Particle,
  Player,
  UpgradeDefinition,
  UpgradeId,
} from "./types"

import { UPGRADE_ICONS } from "../assets/upgrade-icons"


type PipelineGameProps = {
  running: boolean

  onStatsChange:
    (stats: GameStats) => void
}


// ========================================
// WEAPON HEAT
// ========================================

const WEAPON_MAX_HEAT = 100

// Heat is based on sustained firing time rather than bullet count.
// At 40 heat per second, the weapon can fire continuously for
// roughly 2.5 seconds before it is forced to cool down.
const WEAPON_HEAT_PER_SECOND = 40

const WEAPON_COOL_DELAY = 0.1
const WEAPON_COOL_RATE = 75
const WEAPON_OVERHEAT_COOL_RATE = 105
const WEAPON_UNLOCK_HEAT = 25


// ========================================
// STAGE TRANSITION
// ========================================

type StageTransition = {
  active: boolean
  elapsed: number
  nextStageIndex: number
  bugsDestroyed: boolean
  startPlayerY: number
}

const TRANSITION_DURATION = 1.55
const TRANSITION_SLOW_MO_END = 0.42
const TRANSITION_BUG_CLEAR_TIME = 0.46
const TRANSITION_FLY_START = 0.64


// ========================================
// PROD / FINAL BOSS
// ========================================

type EndUserBoss = {
  x: number
  y: number
  width: number
  height: number
  speed: number
  direction: 1 | -1
  health: number
  maxHealth: number
  hitFlash: number
}

type QuipWall = {
  id: number
  x: number
  y: number
  width: number
  height: number
  speed: number
  health: number
  maxHealth: number
  text: string
  hitFlash: number
}

const QUIP_WALL_WIDTH = 360
const QUIP_WALL_HEIGHT = 42
const QUIP_WALL_SPEED = 80
const QUIP_WALL_HEALTH = 15
const QUIP_WALL_SCORE = 400

const BOSS_MAX_HEALTH = 150
const BOSS_SCORE_VALUE = 5000

// Separate PROD spawn controls.
// Lower interval = more frequent spawns.
const BOSS_ENEMY_SPAWN_INTERVAL_HIGH = 0.9
const BOSS_ENEMY_SPAWN_INTERVAL_MID = 0.7
const BOSS_ENEMY_SPAWN_INTERVAL_LOW = 0.55

const BOSS_QUIP_SPAWN_INTERVAL = 4.4

// Compile / build bugs are deliberately chunkier than flaky bugs.
// Base damage is 1, so 4 health = four hits at base.
// After one Heavy Rounds upgrade (1.5 damage), they still take 3 hits.
const BUILD_BUG_HEALTH = 4

const BOSS_QUIPS = [
  '"it looks different on my laptop"',
  '"what do you mean clear cache?"',
  '"i clicked it twice"',
  '"it worked yesterday"',
  '"my timezone is UTC-7"',
  '"can this work on safari 12?"',
]


function PipelineGame({
  running,
  onStatsChange,
}: PipelineGameProps) {

  // ========================================
  // REACT STATE
  // ========================================

  const [
    upgradeChoices,
    setUpgradeChoices,
  ] =
    useState<UpgradeDefinition[]>([])

  const [
    bossIntroVisible,
    setBossIntroVisible,
  ] =
    useState(false)

  const [
    bossIntroStep,
    setBossIntroStep,
  ] =
    useState<"intro" | "upgrades">(
      "intro"
    )

  const [
    prodUpgradeChoices,
    setProdUpgradeChoices,
  ] =
    useState<UpgradeDefinition[]>([])

  const [
    prodUpgradesSelected,
    setProdUpgradesSelected,
  ] =
    useState<UpgradeId[]>([])


  // ========================================
  // CANVAS
  // ========================================

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    )

  const animationFrameRef =
    useRef<number | null>(
      null
    )


  // ========================================
  // INPUT
  // ========================================

  const keysRef =
    useRef<Set<string>>(
      new Set()
    )


  // ========================================
  // PLAYER
  // ========================================

  const playerRef =
    useRef<Player>(
      createPlayer()
    )


  // ========================================
  // ENTITIES
  // ========================================

  const bulletsRef =
    useRef<Bullet[]>([])

  const enemiesRef =
    useRef<Enemy[]>([])

  const particlesRef =
    useRef<Particle[]>([])

  const floatingTextsRef =
    useRef<FloatingText[]>([])

  const quipWallsRef =
    useRef<QuipWall[]>([])


  // ========================================
  // IDS
  // ========================================

  const nextBulletId =
    useRef(1)

  const nextEnemyId =
    useRef(1)

  const nextParticleId =
    useRef(1)

  const nextFloatingTextId =
    useRef(1)

  const nextQuipWallId =
    useRef(1)


  // ========================================
  // GAME STATE
  // ========================================

  const scoreRef =
    useRef(0)

  const stageIndexRef =
    useRef(0)

  const stageTimeRef =
    useRef(0)

  const spawnTimerRef =
    useRef(0)

  const lastTimeRef =
    useRef<number | null>(
      null
    )

  const gameFinishedRef =
    useRef(false)

  const gamePausedRef =
    useRef(false)

  const shakeRef =
    useRef(0)

  const weaponHeatRef =
    useRef(0)

  // Upgrade trade-offs can make the weapon build heat faster.
  // 1.0 = default heat generation.
  const heatGenerationMultiplierRef =
    useRef(1)

  const weaponOverheatedRef =
    useRef(false)

  const timeSinceShotRef =
    useRef(999)

  const bossRef =
    useRef<EndUserBoss | null>(
      null
    )

  const bossActiveRef =
    useRef(false)

  const bossSpawnTimerRef =
    useRef(0)

  const bossQuipTimerRef =
    useRef(0)

  const bossQuipIndexRef =
    useRef(0)

  const boundaryFlashRef =
    useRef(0)

  const stageTransitionRef =
    useRef<StageTransition>({
      active: false,
      elapsed: 0,
      nextStageIndex: 0,
      bugsDestroyed: false,
      startPlayerY:
        CANVAS_HEIGHT -
        PLAYER_HEIGHT -
        35,
    })


  // ========================================
  // PLAYER FACTORY
  // ========================================

  function createPlayer():
    Player {
    return {
      x:
        CANVAS_WIDTH / 2 -
        PLAYER_WIDTH / 2,

      y:
        CANVAS_HEIGHT -
        PLAYER_HEIGHT -
        35,

      width:
        PLAYER_WIDTH,

      height:
        PLAYER_HEIGHT,

      speed:
        PLAYER_SPEED,

      health:
        PLAYER_MAX_HEALTH,

      maxHealth:
        PLAYER_MAX_HEALTH,

      fireCooldown:
        0,

      fireRate:
        FIRE_RATE,

      bulletDamage:
        1,

      bulletSpeed:
        BULLET_SPEED,

      bulletWidth:
        BULLET_WIDTH,

      projectileCount:
        1,

      projectileSpread:
        120,

      bulletPierce:
        0,

      shieldCharges:
        0,

      critChance:
        0,

      hitFlash:
        0,
    }
  }


  // ========================================
  // RESET
  // ========================================

  function resetGame() {
    playerRef.current =
      createPlayer()

    bulletsRef.current = []
    enemiesRef.current = []

    particlesRef.current = []
    floatingTextsRef.current = []
    quipWallsRef.current = []

    nextBulletId.current = 1
    nextEnemyId.current = 1

    nextParticleId.current = 1

    nextFloatingTextId.current =
      1

    nextQuipWallId.current =
      1

    scoreRef.current = 0

    stageIndexRef.current = 0

    stageTimeRef.current = 0

    spawnTimerRef.current = 0

    lastTimeRef.current = null

    gameFinishedRef.current =
      false

    gamePausedRef.current =
      false

    shakeRef.current = 0

    weaponHeatRef.current = 0

    heatGenerationMultiplierRef.current =
      1

    weaponOverheatedRef.current =
      false

    timeSinceShotRef.current =
      999

    boundaryFlashRef.current = 0

    stageTransitionRef.current = {
      active: false,
      elapsed: 0,
      nextStageIndex: 0,
      bugsDestroyed: false,
      startPlayerY:
        CANVAS_HEIGHT -
        PLAYER_HEIGHT -
        35,
    }

    setBossIntroVisible(false)
    setProdUpgradeChoices([])
    setProdUpgradesSelected([])

    publishStats(
      "running"
    )

    prepareUpgradeChoice()
  }


  // ========================================
  // STATS
  // ========================================

  function publishStats(
    gameState:
      | "running"
      | "game-over"
      | "complete"
  ) {
    const stage =
      PIPELINE_STAGES[
        stageIndexRef.current
      ]

    const progress =
      stage
        ? Math.min(
            stageTimeRef.current /
              stage.duration,

            1
          )
        : bossRef.current
          ? Math.min(
              1 -
                bossRef.current.health /
                  bossRef.current.maxHealth,

              1
            )
          : 1

    onStatsChange({
      score:
        scoreRef.current,

      health:
        playerRef.current.health,

      maxHealth:
        playerRef.current.maxHealth,

      stageIndex:
        stageIndexRef.current,

      stageProgress:
        progress,

      gameState,
    })
  }


  // ========================================
  // UPGRADE SELECTION
  // ========================================

  // Normal stages always offer one offensive option and one
  // utility / survival option. This keeps the run random while
  // preventing RNG from starving the player of damage upgrades.
  const POWER_UPGRADE_IDS: UpgradeId[] = [
    "rapid-fire",
    "heavy-rounds",
    "forked-process",
    "piercing-packets",
    "compiler-optimiser",
  ]

  const UTILITY_UPGRADE_IDS: UpgradeId[] = [
    "thrusters",
    "packet-accelerator",
    "integrity-patch",
    "shield-cache",
    "wide-bus",
  ]

  // Exact player-facing upgrade values.
  // Keep these in sync with applyUpgradeEffect below so the
  // selection cards always describe what the code really applies.
  const UPGRADE_BENEFITS:
    Record<UpgradeId, string> = {
      "rapid-fire":
        "20% shorter fire cooldown (~25% more shots/sec)",
      "thrusters":
        "+30% movement speed",
      "heavy-rounds":
        "+35% bullet damage",
      "packet-accelerator":
        "+40% projectile speed",
      "forked-process":
        "+1 projectile per shot (max 5)",
      "piercing-packets":
        "+30% pierce chance per stack (15% vs PROD walls, capped)",
      "integrity-patch":
        "+2 max integrity + restore 2 integrity",
      "shield-cache":
        "+2 shield charges",
      "wide-bus":
        "+50% projectile width",
      "compiler-optimiser":
        "+15 percentage points crit chance (max 75%)",
    }

  const UPGRADE_TRADE_OFFS:
    Record<UpgradeId, string> = {
      "rapid-fire":
        "-12% bullet damage",
      "thrusters":
        "-1 max integrity (minimum 3) + 3% heat generation",
      "heavy-rounds":
        "-12% projectile speed",
      "packet-accelerator":
        "-12% projectile width",
      "forked-process":
        "-12% bullet damage",
      "piercing-packets":
        "+12% fire cooldown (~11% fewer shots/sec)",
      "integrity-patch":
        "-8% movement speed",
      "shield-cache":
        "+8% heat generation",
      "wide-bus":
        "-12% projectile speed",
      "compiler-optimiser":
        "-8% bullet damage",
    }

  function getRandomUpgradeFromPool(
    upgradeIds: UpgradeId[]
  ): UpgradeDefinition | null {
    const available =
      UPGRADES.filter(
        (upgrade) =>
          upgradeIds.includes(
            upgrade.id
          )
      )

    if (available.length === 0) {
      return null
    }

    return available[
      Math.floor(
        Math.random() *
          available.length
      )
    ]
  }

  function prepareUpgradeChoice() {
    gamePausedRef.current =
      true

    enemiesRef.current = []
    bulletsRef.current = []

    const powerUpgrade =
      getRandomUpgradeFromPool(
        POWER_UPGRADE_IDS
      )

    const utilityUpgrade =
      getRandomUpgradeFromPool(
        UTILITY_UPGRADE_IDS
      )

    const choices =
      [
        powerUpgrade,
        utilityUpgrade,
      ].filter(
        (
          upgrade
        ): upgrade is UpgradeDefinition =>
          upgrade !== null
      )

    // Shuffle so the power option is not always in the same slot.
    setUpgradeChoices(
      choices.sort(
        () =>
          Math.random() - 0.5
      )
    )
  }


  function applyUpgradeEffect(
    upgradeId: UpgradeId
  ) {
    const player =
      playerRef.current

    switch (upgradeId) {
      // More bullets per second, but each individual round
      // is a little weaker.
      case "rapid-fire":
        player.fireRate *= 0.8
        player.bulletDamage *= 0.88
        break

      // A lighter, faster ship with less integrity and slightly more heat.
      case "thrusters":
        player.speed *= 1.3

        player.maxHealth =
          Math.max(
            3,
            player.maxHealth - 1
          )

        player.health =
          Math.min(
            player.health,
            player.maxHealth
          )

        heatGenerationMultiplierRef.current *=
          1.03
        break

      // Stronger rounds, but the extra mass slows them down.
      case "heavy-rounds":
        player.bulletDamage *= 1.35
        player.bulletSpeed *= 0.88
        break

      // Faster projectiles are narrower and reward accuracy.
      case "packet-accelerator":
        player.bulletSpeed *= 1.4
        player.bulletWidth *= 0.88
        break

      // More projectiles per trigger pull, but damage is split
      // slightly across the fork.
      case "forked-process":
        player.projectileCount =
          Math.min(
            player.projectileCount + 1,
            5
          )

        player.bulletDamage *=
          0.88
        break

      // Each stack raises the chance that a projectile survives a hit
      // and continues through the target. PROD walls deliberately use
      // half the normal chance so this upgrade cannot trivialise them.
      case "piercing-packets":
        player.bulletPierce += 1
        player.fireRate *= 1.12
        break

      // More armour and an immediate repair, at the cost of
      // carrying a heavier ship.
      case "integrity-patch":
        player.maxHealth += 2

        player.health =
          Math.min(
            player.maxHealth,
            player.health + 2
          )

        player.speed *= 0.92
        break

      // Two blocked hits, but the defensive cache draws extra
      // power and makes sustained firing heat up noticeably faster.
      case "shield-cache":
        player.shieldCharges += 2

        heatGenerationMultiplierRef.current *=
          1.08
        break

      // Much easier shots to connect, but the wider packet
      // travels slightly more slowly.
      case "wide-bus":
        player.bulletWidth *= 1.5
        player.bulletSpeed *= 0.88
        break

      // More critical hits, with a small reduction in normal
      // damage to trade consistency for spikes.
      case "compiler-optimiser":
        player.critChance =
          Math.min(
            player.critChance + 0.15,
            0.75
          )

        player.bulletDamage *=
          0.92
        break
    }
  }


  function applyUpgrade(
    upgradeId: UpgradeId
  ) {
    applyUpgradeEffect(
      upgradeId
    )

    setUpgradeChoices([])

    gamePausedRef.current =
      false

    lastTimeRef.current =
      null
  }


  function selectProdUpgrade(
    upgradeId: UpgradeId
  ) {
    if (
      prodUpgradesSelected.includes(
        upgradeId
      ) ||
      prodUpgradesSelected.length >= 2
    ) {
      return
    }

    applyUpgradeEffect(
      upgradeId
    )

    setProdUpgradesSelected(
      (current) => [
        ...current,
        upgradeId,
      ]
    )
  }



  // ========================================
  // INPUT
  // ========================================

  useEffect(() => {
    function keyDown(
      event: KeyboardEvent
    ) {
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "KeyA",
          "KeyD",
          "Space",
        ].includes(
          event.code
        )
      ) {
        event.preventDefault()
      }

      keysRef.current.add(
        event.code
      )
    }


    function keyUp(
      event: KeyboardEvent
    ) {
      keysRef.current.delete(
        event.code
      )
    }


    window.addEventListener(
      "keydown",
      keyDown
    )

    window.addEventListener(
      "keyup",
      keyUp
    )


    return () => {
      window.removeEventListener(
        "keydown",
        keyDown
      )

      window.removeEventListener(
        "keyup",
        keyUp
      )
    }
  }, [])


  // ========================================
  // COLLISION
  // ========================================

  function intersects(
    a: {
      x: number
      y: number

      width: number
      height: number
    },

    b: {
      x: number
      y: number

      width: number
      height: number
    }
  ) {
    return (
      a.x <
        b.x +
          b.width &&

      a.x +
        a.width >
        b.x &&

      a.y <
        b.y +
          b.height &&

      a.y +
        a.height >
        b.y
    )
  }


  // ========================================
  // SHOOT
  // ========================================

  function shoot() {
    const player =
      playerRef.current

    const count =
      player.projectileCount

    for (
      let index = 0;
      index < count;
      index++
    ) {
      const centre =
        (count - 1) / 2

      const offset =
        index - centre

      bulletsRef.current.push({
        id:
          nextBulletId.current++,

        x:
          player.x +
          player.width / 2 -
          player.bulletWidth /
            2,

        y:
          player.y -
          BULLET_HEIGHT,

        width:
          player.bulletWidth,

        height:
          BULLET_HEIGHT,

        speed:
          player.bulletSpeed,

        vx:
          offset *
          player.projectileSpread,

        damage:
          player.bulletDamage,

        pierceRemaining:
          player.bulletPierce,
      })
    }

    player.fireCooldown =
      player.fireRate

    // Used only to delay normal cooling very slightly after
    // the most recent shot. Firing rate no longer affects heat.
    timeSinceShotRef.current = 0
  }


  // ========================================
  // SPAWN ENEMY
  // ========================================

  function spawnEnemyType(
    enemyType: EnemyType,
    forcedX?: number,
    forcedY?: number
  ) {
    const config =
      ENEMY_CONFIG[
        enemyType
      ]

    const padding =
      20

    const randomX =
      padding +
      Math.random() *
        (
          CANVAS_WIDTH -
          config.width -
          padding * 2
        )

    const x =
      forcedX === undefined
        ? randomX
        : Math.max(
            padding,
            Math.min(
              CANVAS_WIDTH -
                config.width -
                padding,

              forcedX
            )
          )

    const enemyHealth =
      enemyType === "compile"
        ? BUILD_BUG_HEALTH
        : config.health

    enemiesRef.current.push({
      id:
        nextEnemyId.current++,

      type:
        enemyType,

      x,

      y:
        forcedY === undefined
          ? -config.height
          : forcedY,

      baseX:
        x,

      width:
        config.width,

      height:
        config.height,

      speed:
        config.speed,

      health:
        enemyHealth,

      maxHealth:
        enemyHealth,

      scoreValue:
        config.scoreValue,

      movementTime:
        0,

      hitFlash:
        0,
    })
  }


  function spawnEnemy() {
    const stage =
      PIPELINE_STAGES[
        stageIndexRef.current
      ]

    if (!stage) {
      return
    }

    const enemyType =
      stage.enemies[
        Math.floor(
          Math.random() *
            stage.enemies.length
        )
      ]

    spawnEnemyType(
      enemyType
    )
  }


  // ========================================
  // PLAYER UPDATE
  // ========================================

  function updatePlayer(
    delta: number
  ) {
    const player =
      playerRef.current

    const keys =
      keysRef.current


    if (
      keys.has(
        "ArrowLeft"
      ) ||
      keys.has(
        "KeyA"
      )
    ) {
      player.x -=
        player.speed *
        delta
    }


    if (
      keys.has(
        "ArrowRight"
      ) ||
      keys.has(
        "KeyD"
      )
    ) {
      player.x +=
        player.speed *
        delta
    }


    player.x =
      Math.max(
        0,

        Math.min(
          CANVAS_WIDTH -
          player.width,

          player.x
        )
      )


    player.fireCooldown -=
      delta

    player.hitFlash =
      Math.max(
        0,

        player.hitFlash -
          delta
      )

    boundaryFlashRef.current =
      Math.max(
        0,
        boundaryFlashRef.current -
          delta
      )


    // ----------------------------------------
    // WEAPON HEAT
    // ----------------------------------------

    timeSinceShotRef.current +=
      delta

    const fireHeld =
      keys.has(
        "Space"
      )


    // ----------------------------------------
    // BUILD HEAT FROM SUSTAINED FIRING TIME
    // ----------------------------------------

    // Heat now measures how long the weapon has been held on,
    // not how many bullets have been emitted. This means Rapid
    // Fire is a real upgrade: it produces more shots during the
    // same heat window instead of reaching overheat sooner.
    if (
      fireHeld &&
      !weaponOverheatedRef.current
    ) {
      weaponHeatRef.current =
        Math.min(
          WEAPON_MAX_HEAT,
          weaponHeatRef.current +
            WEAPON_HEAT_PER_SECOND *
              heatGenerationMultiplierRef.current *
              delta
        )

      if (
        weaponHeatRef.current >=
          WEAPON_MAX_HEAT
      ) {
        weaponOverheatedRef.current =
          true

        createFloatingText(
          player.x +
            player.width / 2,

          player.y +
            player.height + 18,

          "OVERHEATED"
        )

        createParticles(
          player.x +
            player.width / 2,

          player.y - 6,

          8
        )

        shakeRef.current =
          Math.max(
            shakeRef.current,
            3
          )
      }
    }


    // ----------------------------------------
    // COOLING
    // ----------------------------------------

    const shouldCool =
      weaponOverheatedRef.current ||
      (
        !fireHeld &&
        timeSinceShotRef.current >=
          WEAPON_COOL_DELAY
      )

    if (shouldCool) {
      const coolingRate =
        weaponOverheatedRef.current
          ? WEAPON_OVERHEAT_COOL_RATE
          : WEAPON_COOL_RATE

      weaponHeatRef.current =
        Math.max(
          0,
          weaponHeatRef.current -
            coolingRate * delta
        )
    }


    // ----------------------------------------
    // READY AGAIN
    // ----------------------------------------

    if (
      weaponOverheatedRef.current &&
      weaponHeatRef.current <=
        WEAPON_UNLOCK_HEAT
    ) {
      weaponOverheatedRef.current =
        false

      createFloatingText(
        player.x +
          player.width / 2,

        player.y +
          player.height + 18,

        "READY"
      )
    }


    // ----------------------------------------
    // FIRE
    // ----------------------------------------

    if (
      fireHeld &&
      !weaponOverheatedRef.current &&
      player.fireCooldown <=
        0
    ) {
      shoot()
    }
  }


  // ========================================
  // BULLET UPDATE
  // ========================================

  function updateBullets(
    delta: number
  ) {
    bulletsRef.current =
      bulletsRef.current
        .map(
          (bullet) => ({
            ...bullet,

            x:
              bullet.x +
              bullet.vx *
                delta,

            y:
              bullet.y -
              bullet.speed *
                delta,
          })
        )

        .filter(
          (bullet) =>
            bullet.y +
              bullet.height >
              0 &&

            bullet.x +
              bullet.width >
              0 &&

            bullet.x <
              CANVAS_WIDTH
        )
  }


  // ========================================
  // ENEMY UPDATE
  // ========================================

  function updateEnemies(
    delta: number
  ) {
    const player =
      playerRef.current

    const survivors:
      Enemy[] = []


    for (
      const enemy of
        enemiesRef.current
    ) {
      enemy.movementTime +=
        delta

      enemy.hitFlash =
        Math.max(
          0,

          enemy.hitFlash -
            delta
        )

      enemy.y +=
        enemy.speed *
        delta


      // ----------------------------------------
      // FLAKY
      // ----------------------------------------

      if (
        enemy.type ===
        "flaky"
      ) {
        enemy.x =
          enemy.baseX +
          Math.sin(
            enemy.movementTime *
              5
          ) *
          45
      }


      // ----------------------------------------
      // REGRESSION
      // ----------------------------------------

      if (
        enemy.type ===
        "regression"
      ) {
        const enemyCenter =
          enemy.x +
          enemy.width / 2

        const playerCenter =
          player.x +
          player.width / 2

        const difference =
          playerCenter -
          enemyCenter

        enemy.x +=
          Math.sign(
            difference
          ) *
          65 *
          delta
      }


      enemy.x =
        Math.max(
          0,

          Math.min(
            CANVAS_WIDTH -
            enemy.width,

            enemy.x
          )
        )


      // ----------------------------------------
      // COLLIDE WITH PLAYER
      // ----------------------------------------

      if (
        intersects(
          enemy,
          player
        )
      ) {
        damagePlayer(
          enemy.x +
            enemy.width / 2,

          enemy.y +
            enemy.height / 2
        )

        continue
      }


      // ----------------------------------------
      // ESCAPED
      // ----------------------------------------

      if (
        enemy.y >
        CANVAS_HEIGHT
      ) {
        boundaryFlashRef.current =
          0.18

        damagePlayer(
          enemy.x +
            enemy.width / 2,

          CANVAS_HEIGHT -
            10
        )

        continue
      }


      survivors.push(
        enemy
      )
    }


    enemiesRef.current =
      survivors
  }


  // ========================================
  // DAMAGE PLAYER
  // ========================================

  function damagePlayer(
    x: number,
    y: number
  ) {
    const player =
      playerRef.current


    if (
      player.shieldCharges >
      0
    ) {
      player.shieldCharges -=
        1

      createFloatingText(
        x,
        y,
        "BLOCKED"
      )

      createParticles(
        x,
        y,
        10
      )

      shakeRef.current =
        4

      return
    }


    player.health -=
      1

    player.hitFlash =
      0.18

    shakeRef.current =
      9


    createParticles(
      x,
      y,
      14
    )


    createFloatingText(
      player.x +
        player.width / 2,

      player.y - 15,

      "-1 INTEGRITY"
    )
  }


  // ========================================
  // BULLET COLLISIONS
  // ========================================

  // Resolve every hit to one decimal place first, then use that
  // exact value for both health subtraction and the floating
  // damage number shown to the player.
  function resolveDamage(
    rawDamage: number
  ) {
    return (
      Math.round(
        rawDamage * 10
      ) / 10
    )
  }

  // Piercing is chance-based rather than guaranteed.
  // bullet.pierceRemaining is used as the number of Piercing Packets
  // upgrade stacks carried by this projectile.
  //
  // Normal targets: 30% per stack, capped at 70%.
  // PROD quip walls: 15% per stack, capped at 35%.
  function getPierceChance(
    bullet: Bullet,
    target:
      | "enemy"
      | "wall"
      | "boss"
  ) {
    const stacks =
      bullet.pierceRemaining

    if (stacks <= 0) {
      return 0
    }

    if (target === "wall") {
      return Math.min(
        0.15 * stacks,
        0.35
      )
    }

    return Math.min(
      0.30 * stacks,
      0.70
    )
  }

  function rollPierce(
    bullet: Bullet,
    target:
      | "enemy"
      | "wall"
      | "boss"
  ) {
    return (
      Math.random() <
      getPierceChance(
        bullet,
        target
      )
    )
  }

  function handleBulletCollisions() {
    const bulletsToRemove =
      new Set<number>()

    const enemiesToRemove =
      new Set<number>()

    const quipWallsToRemove =
      new Set<number>()


    for (
      const bullet of
        bulletsRef.current
    ) {

      // ----------------------------------------
      // END USER QUIP WALLS
      // ----------------------------------------

      for (
        const wall of
          quipWallsRef.current
      ) {
        if (
          quipWallsToRemove.has(
            wall.id
          ) ||
          !intersects(
            bullet,
            wall
          )
        ) {
          continue
        }

        const critical =
          Math.random() <
          playerRef.current
            .critChance

        const damage =
          resolveDamage(
            critical
              ? bullet.damage * 2
              : bullet.damage
          )

        wall.health -=
          damage

        wall.hitFlash =
          0.1

        createParticles(
          bullet.x +
            bullet.width / 2,
          bullet.y,
          5
        )

        createFloatingText(
          bullet.x +
            bullet.width / 2,
          bullet.y,
          critical
            ? `CRIT ${damage.toFixed(1)}`
            : damage.toFixed(1)
        )

        if (
          wall.health <=
          0
        ) {
          quipWallsToRemove.add(
            wall.id
          )

          scoreRef.current +=
            QUIP_WALL_SCORE

          createParticles(
            wall.x +
              wall.width / 2,
            wall.y +
              wall.height / 2,
            24
          )

          createFloatingText(
            wall.x +
              wall.width / 2,
            wall.y,
            `+${QUIP_WALL_SCORE}`
          )

          shakeRef.current =
            Math.max(
              shakeRef.current,
              5
            )
        }

        const piercedWall =
          rollPierce(
            bullet,
            "wall"
          )

        if (piercedWall) {
          // Move the projectile fully beyond the wall so it cannot
          // damage the same wall again on the next frame.
          bullet.y =
            wall.y -
            bullet.height -
            1

          createFloatingText(
            bullet.x +
              bullet.width / 2,
            bullet.y,
            "PIERCE"
          )
        } else {
          bulletsToRemove.add(
            bullet.id
          )
        }

        break
      }

      if (
        bulletsToRemove.has(
          bullet.id
        )
      ) {
        continue
      }

      for (
        const enemy of
          enemiesRef.current
      ) {
        if (
          enemiesToRemove.has(
            enemy.id
          )
        ) {
          continue
        }


        if (
          !intersects(
            bullet,
            enemy
          )
        ) {
          continue
        }


        const critical =
          Math.random() <
          playerRef.current
            .critChance

        const damage =
          resolveDamage(
            critical
              ? bullet.damage * 2
              : bullet.damage
          )


        enemy.health -=
          damage

        enemy.hitFlash =
          0.1


        const hitX =
          bullet.x +
          bullet.width / 2

        const hitY =
          bullet.y


        createParticles(
          hitX,
          hitY,
          4
        )


        createFloatingText(
          hitX,
          hitY,
          critical
            ? `CRIT ${damage.toFixed(1)}`
            : damage.toFixed(1)
        )


        // ----------------------------------------
        // ENEMY DIES
        // ----------------------------------------

        if (
          enemy.health <=
          0
        ) {
          enemiesToRemove.add(
            enemy.id
          )

          scoreRef.current +=
            enemy.scoreValue


          createParticles(
            enemy.x +
              enemy.width / 2,

            enemy.y +
              enemy.height / 2,

            16
          )


          createFloatingText(
            enemy.x +
              enemy.width / 2,

            enemy.y,

            `+${enemy.scoreValue}`
          )


          shakeRef.current =
            Math.max(
              shakeRef.current,

              enemy.type ===
                "compile"
                ? 6
                : 3
            )
        }


        // ----------------------------------------
        // PIERCING
        // ----------------------------------------

        const piercedEnemy =
          rollPierce(
            bullet,
            "enemy"
          )

        if (piercedEnemy) {
          // Push the projectile past the current enemy so a living,
          // multi-hit target cannot absorb repeated damage from the
          // same piercing bullet across consecutive frames.
          bullet.y =
            enemy.y -
            bullet.height -
            1

          createFloatingText(
            hitX,
            hitY,
            "PIERCE"
          )
        } else {
          bulletsToRemove.add(
            bullet.id
          )
        }


        break
      }


      // ----------------------------------------
      // FINAL BOSS
      // ----------------------------------------

      const boss =
        bossRef.current

      if (
        boss &&
        bossActiveRef.current &&
        !bulletsToRemove.has(
          bullet.id
        ) &&
        intersects(
          bullet,
          boss
        )
      ) {
        const critical =
          Math.random() <
          playerRef.current
            .critChance

        const damage =
          resolveDamage(
            critical
              ? bullet.damage * 2
              : bullet.damage
          )

        boss.health -=
          damage

        boss.hitFlash =
          0.11

        createParticles(
          bullet.x +
            bullet.width / 2,

          bullet.y,

          6
        )

        createFloatingText(
          bullet.x +
            bullet.width / 2,

          bullet.y,

          critical
            ? `CRIT ${damage.toFixed(1)}`
            : damage.toFixed(1)
        )

        const piercedBoss =
          rollPierce(
            bullet,
            "boss"
          )

        if (piercedBoss) {
          // Prevent the same projectile from repeatedly colliding with
          // the boss while it is still overlapping the boss rectangle.
          bullet.y =
            boss.y -
            bullet.height -
            1

          createFloatingText(
            bullet.x +
              bullet.width / 2,
            bullet.y,
            "PIERCE"
          )
        } else {
          bulletsToRemove.add(
            bullet.id
          )
        }

        if (
          boss.health <=
          0
        ) {
          boss.health = 0

          scoreRef.current +=
            BOSS_SCORE_VALUE

          createFloatingText(
            boss.x +
              boss.width / 2,

            boss.y +
              boss.height,

            `+${BOSS_SCORE_VALUE}`
          )

          // Freeze normal PROD behaviour, then run the exact same
          // slow-motion clear / explosion / fly-forward cinematic
          // used between pipeline stages.
          bossActiveRef.current =
            false

          startStageTransition(
            PIPELINE_STAGES.length +
              1
          )
        }
      }
    }


    bulletsRef.current =
      bulletsRef.current.filter(
        (bullet) =>
          !bulletsToRemove.has(
            bullet.id
          )
      )


    enemiesRef.current =
      enemiesRef.current.filter(
        (enemy) =>
          !enemiesToRemove.has(
            enemy.id
          )
      )

    quipWallsRef.current =
      quipWallsRef.current.filter(
        (wall) =>
          !quipWallsToRemove.has(
            wall.id
          )
      )
  }


  // ========================================
  // PARTICLES
  // ========================================

  function createParticles(
    x: number,
    y: number,
    amount: number
  ) {
    for (
      let index = 0;
      index < amount;
      index++
    ) {
      const angle =
        Math.random() *
        Math.PI *
        2

      const speed =
        50 +
        Math.random() *
        150

      const life =
        0.25 +
        Math.random() *
        0.35


      particlesRef.current.push({
        id:
          nextParticleId.current++,

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
          1 +
          Math.random() *
          3,
      })
    }
  }


  function updateParticles(
    delta: number
  ) {
    for (
      const particle of
        particlesRef.current
    ) {
      particle.x +=
        particle.vx *
        delta

      particle.y +=
        particle.vy *
        delta

      particle.vx *=
        0.96

      particle.vy *=
        0.96

      particle.life -=
        delta
    }


    particlesRef.current =
      particlesRef.current.filter(
        (particle) =>
          particle.life >
          0
      )
  }


  // ========================================
  // FLOATING TEXT
  // ========================================

  function createFloatingText(
    x: number,
    y: number,
    text: string
  ) {
    floatingTextsRef.current.push({
      id:
        nextFloatingTextId.current++,

      x,
      y,

      text,

      life:
        0.8,

      maxLife:
        0.8,
    })
  }


  function updateFloatingTexts(
    delta: number
  ) {
    for (
      const text of
        floatingTextsRef.current
    ) {
      text.y -=
        28 *
        delta

      text.life -=
        delta
    }


    floatingTextsRef.current =
      floatingTextsRef.current.filter(
        (text) =>
          text.life >
          0
      )
  }


  // ========================================
  // END USER QUIP WALLS
  // ========================================

  function spawnQuipWall(
    text: string,
    boss: EndUserBoss
  ) {
    const x =
      Math.max(
        20,
        Math.min(
          CANVAS_WIDTH -
            QUIP_WALL_WIDTH -
            20,
          boss.x +
            boss.width / 2 -
            QUIP_WALL_WIDTH / 2
        )
      )

    const y =
      boss.y +
      boss.height +
      30

    quipWallsRef.current.push({
      id:
        nextQuipWallId.current++,
      x,
      y,
      width:
        QUIP_WALL_WIDTH,
      height:
        QUIP_WALL_HEIGHT,
      speed:
        QUIP_WALL_SPEED,
      health:
        QUIP_WALL_HEALTH,
      maxHealth:
        QUIP_WALL_HEALTH,
      text,
      hitFlash:
        0,
    })

    createParticles(
      x +
        QUIP_WALL_WIDTH / 2,
      y +
        QUIP_WALL_HEIGHT / 2,
      12
    )
  }


  function updateQuipWalls(
    delta: number
  ) {
    const player =
      playerRef.current

    const survivors:
      QuipWall[] = []

    for (
      const wall of
        quipWallsRef.current
    ) {
      wall.y +=
        wall.speed *
        delta

      wall.hitFlash =
        Math.max(
          0,
          wall.hitFlash -
            delta
        )

      if (
        intersects(
          wall,
          player
        )
      ) {
        damagePlayer(
          wall.x +
            wall.width / 2,
          wall.y +
            wall.height / 2
        )

        createParticles(
          wall.x +
            wall.width / 2,
          wall.y +
            wall.height / 2,
          20
        )

        shakeRef.current =
          Math.max(
            shakeRef.current,
            8
          )

        continue
      }

      if (
        wall.y >
        CANVAS_HEIGHT
      ) {
        boundaryFlashRef.current =
          0.18

        damagePlayer(
          wall.x +
            wall.width / 2,
          CANVAS_HEIGHT - 10
        )

        continue
      }

      survivors.push(
        wall
      )
    }

    quipWallsRef.current =
      survivors
  }


  function drawQuipWalls(
    context:
      CanvasRenderingContext2D
  ) {
    for (
      const wall of
        quipWallsRef.current
    ) {
      const flashing =
        wall.hitFlash > 0

      const healthRatio =
        Math.max(
          0,
          wall.health /
            wall.maxHealth
        )

      context.save()

      context.fillStyle =
        flashing
          ? "rgba(255,255,255,0.92)"
          : "rgba(125,211,252,0.10)"

      context.strokeStyle =
        flashing
          ? "rgba(255,255,255,1)"
          : "rgba(125,211,252,0.92)"

      context.lineWidth =
        2

      context.fillRect(
        wall.x,
        wall.y,
        wall.width,
        wall.height
      )

      context.strokeRect(
        wall.x,
        wall.y,
        wall.width,
        wall.height
      )

      // Terminal-like edge brackets make these feel like physical
      // user requests rather than ordinary floating text.
      context.beginPath()

      context.moveTo(
        wall.x + 8,
        wall.y + 8
      )

      context.lineTo(
        wall.x + 8,
        wall.y +
          wall.height - 8
      )

      context.moveTo(
        wall.x +
          wall.width - 8,
        wall.y + 8
      )

      context.lineTo(
        wall.x +
          wall.width - 8,
        wall.y +
          wall.height - 8
      )

      context.stroke()

      context.fillStyle =
        flashing
          ? "#000112"
          : "rgba(224,242,254,0.96)"

      context.font =
        "bold 11px monospace"

      context.textAlign =
        "center"

      context.textBaseline =
        "middle"

      context.fillText(
        wall.text,
        wall.x +
          wall.width / 2,
        wall.y +
          wall.height / 2 - 3
      )

      const healthY =
        wall.y +
        wall.height - 7

      context.fillStyle =
        "rgba(255,255,255,0.10)"

      context.fillRect(
        wall.x + 12,
        healthY,
        wall.width - 24,
        3
      )

      context.fillStyle =
        healthRatio > 0.5
          ? "rgba(125,211,252,0.85)"
          : healthRatio > 0.25
            ? "rgba(250,204,21,0.9)"
            : "rgba(248,113,113,0.95)"

      context.fillRect(
        wall.x + 12,
        healthY,
        (wall.width - 24) *
          healthRatio,
        3
      )

      context.restore()
    }
  }


  // ========================================
  // PROD / FINAL BOSS
  // ========================================

  function prepareBossFight() {
    stageIndexRef.current =
      PIPELINE_STAGES.length

    stageTimeRef.current =
      0

    spawnTimerRef.current =
      0

    enemiesRef.current =
      []

    bulletsRef.current =
      []

    quipWallsRef.current =
      []

    bossSpawnTimerRef.current =
      0

    bossQuipTimerRef.current =
      0

    bossQuipIndexRef.current =
      0

    bossRef.current = {
      x:
        CANVAS_WIDTH / 2 -
        75,

      y:
        54,

      width:
        150,

      height:
        58,

      speed:
        92,

      direction:
        1,

      health:
        BOSS_MAX_HEALTH,

      maxHealth:
        BOSS_MAX_HEALTH,

      hitFlash:
        0,
    }

    bossActiveRef.current =
      true

    gamePausedRef.current =
      true

    const shuffledUpgrades =
      [...UPGRADES].sort(
        () =>
          Math.random() - 0.5
      )

    setProdUpgradeChoices(
      shuffledUpgrades.slice(
        0,
        4
      )
    )

    setProdUpgradesSelected([])
    setBossIntroStep("intro")
    setBossIntroVisible(true)

    publishStats(
      "running"
    )
  }


  function beginBossFight() {
    if (
      prodUpgradesSelected.length < 2
    ) {
      return
    }

    setBossIntroVisible(false)
    setProdUpgradeChoices([])

    gamePausedRef.current =
      false

    lastTimeRef.current =
      null

    weaponHeatRef.current =
      Math.min(
        weaponHeatRef.current,
        25
      )

    weaponOverheatedRef.current =
      false
  }


  function getBossSpawnPool(
    healthRatio: number
  ): EnemyType[] {
    if (
      healthRatio >
      0.7
    ) {
      return [
        "syntax",
        "flaky",
      ]
    }

    if (
      healthRatio >
      0.4
    ) {
      return [
        "syntax",
        "flaky",
        "compile",
      ]
    }

    return [
      "syntax",
      "flaky",
      "compile",
      "regression",
    ]
  }


  function updateBoss(
    delta: number
  ) {
    const boss =
      bossRef.current

    if (
      !boss ||
      !bossActiveRef.current
    ) {
      return
    }

    boss.hitFlash =
      Math.max(
        0,
        boss.hitFlash -
          delta
      )

    boss.x +=
      boss.speed *
      boss.direction *
      delta

    const bossPadding =
      42

    if (
      boss.x <=
      bossPadding
    ) {
      boss.x =
        bossPadding

      boss.direction =
        1
    }

    if (
      boss.x +
        boss.width >=
      CANVAS_WIDTH -
        bossPadding
    ) {
      boss.x =
        CANVAS_WIDTH -
        bossPadding -
        boss.width

      boss.direction =
        -1
    }

    const healthRatio =
      boss.health /
      boss.maxHealth

    const spawnInterval =
      healthRatio > 0.7
        ? BOSS_ENEMY_SPAWN_INTERVAL_HIGH
        : healthRatio > 0.4
          ? BOSS_ENEMY_SPAWN_INTERVAL_MID
          : BOSS_ENEMY_SPAWN_INTERVAL_LOW

    bossSpawnTimerRef.current +=
      delta

    if (
      bossSpawnTimerRef.current >=
      spawnInterval
    ) {
      bossSpawnTimerRef.current =
        0

      const pool =
        getBossSpawnPool(
          healthRatio
        )

      const enemyType =
        pool[
          Math.floor(
            Math.random() *
              pool.length
          )
        ]

      const config =
        ENEMY_CONFIG[
          enemyType
        ]

      // Bugs can emerge from the front, left, or right side
      // of the END USER boss. "Front" is the lower edge because
      // the boss faces down toward the player.
      const spawnSide =
        [
          "front",
          "left",
          "right",
        ][
          Math.floor(
            Math.random() * 3
          )
        ]

      let spawnX:
        number

      let spawnY:
        number

      if (
        spawnSide ===
        "left"
      ) {
        spawnX =
          boss.x -
          config.width / 2

        spawnY =
          boss.y +
          boss.height / 2 -
          config.height / 2 +
          (
            Math.random() -
            0.5
          ) *
          26
      } else if (
        spawnSide ===
        "right"
      ) {
        spawnX =
          boss.x +
          boss.width -
          config.width / 2

        spawnY =
          boss.y +
          boss.height / 2 -
          config.height / 2 +
          (
            Math.random() -
            0.5
          ) *
          26
      } else {
        spawnX =
          boss.x +
          boss.width / 2 -
          config.width / 2 +
          (
            Math.random() -
            0.5
          ) *
          60

        spawnY =
          boss.y +
          boss.height -
          config.height / 2
      }

      spawnEnemyType(
        enemyType,
        spawnX,
        spawnY
      )

      // Make the bug feel like it is physically being emitted
      // from whichever side of the END USER spawned it.
      createParticles(
        spawnX +
          config.width / 2,

        spawnY +
          config.height / 2,

        7
      )
    }

    bossQuipTimerRef.current +=
      delta

    if (
      bossQuipTimerRef.current >=
      BOSS_QUIP_SPAWN_INTERVAL
    ) {
      bossQuipTimerRef.current =
        0

      const quip =
        BOSS_QUIPS[
          bossQuipIndexRef.current %
            BOSS_QUIPS.length
        ]

      bossQuipIndexRef.current +=
        1

      spawnQuipWall(
        quip,
        boss
      )
    }
  }


  // ========================================
  // STAGE TRANSITION
  // ========================================

  function startStageTransition(
    nextStageIndex: number
  ) {
    if (
      stageTransitionRef.current.active
    ) {
      return
    }

    const player =
      playerRef.current

    stageTransitionRef.current = {
      active: true,
      elapsed: 0,
      nextStageIndex,
      bugsDestroyed: false,
      startPlayerY: player.y,
    }

    keysRef.current.delete(
      "Space"
    )

    player.fireCooldown = 0
  }


  function finishStageTransition() {
    const transition =
      stageTransitionRef.current

    const nextStageIndex =
      transition.nextStageIndex

    const player =
      playerRef.current

    player.x =
      CANVAS_WIDTH / 2 -
      player.width / 2

    player.y =
      CANVAS_HEIGHT -
      player.height -
      35

    bulletsRef.current = []
    enemiesRef.current = []

    stageTransitionRef.current = {
      ...transition,
      active: false,
      elapsed: 0,
      bugsDestroyed: false,
    }

    if (
      nextStageIndex >
      PIPELINE_STAGES.length
    ) {
      bossRef.current = null
      bossActiveRef.current =
        false

      quipWallsRef.current = []
      enemiesRef.current = []
      bulletsRef.current = []

      gameFinishedRef.current =
        true

      publishStats(
        "complete"
      )

      return
    }

    if (
      nextStageIndex ===
      PIPELINE_STAGES.length
    ) {
      prepareBossFight()
      return
    }

    stageIndexRef.current =
      nextStageIndex

    stageTimeRef.current = 0
    spawnTimerRef.current = 0

    publishStats(
      "running"
    )

    prepareUpgradeChoice()
  }


  function updateStageTransition(
    delta: number
  ) {
    const transition =
      stageTransitionRef.current

    transition.elapsed +=
      delta

    const player =
      playerRef.current

    const finalVictory =
      transition.nextStageIndex >
      PIPELINE_STAGES.length

    // First beat: keep the last frame alive in dramatic slow motion.
    if (
      transition.elapsed <
      TRANSITION_SLOW_MO_END
    ) {
      const slowDelta =
        delta * 0.16

      for (
        const enemy of
          enemiesRef.current
      ) {
        enemy.movementTime +=
          slowDelta

        enemy.y +=
          enemy.speed *
          slowDelta
      }

      for (
        const wall of
          quipWallsRef.current
      ) {
        wall.y +=
          wall.speed *
          slowDelta

        wall.hitFlash =
          Math.max(
            0,
            wall.hitFlash -
              slowDelta
          )
      }

      if (
        finalVictory &&
        bossRef.current
      ) {
        const boss =
          bossRef.current

        boss.x +=
          boss.speed *
          boss.direction *
          slowDelta

        const bossPadding =
          42

        if (
          boss.x <=
          bossPadding
        ) {
          boss.x =
            bossPadding

          boss.direction =
            1
        }

        if (
          boss.x +
            boss.width >=
          CANVAS_WIDTH -
            bossPadding
        ) {
          boss.x =
            CANVAS_WIDTH -
            bossPadding -
            boss.width

          boss.direction =
            -1
        }

        boss.hitFlash =
          Math.max(
            0,
            boss.hitFlash -
              slowDelta
          )
      }

      updateBullets(
        slowDelta
      )

      updateParticles(
        slowDelta
      )

      updateFloatingTexts(
        slowDelta
      )
    } else {
      updateParticles(
        delta
      )

      updateFloatingTexts(
        delta
      )
    }

    // Second beat: wipe every remaining bug at once.
    if (
      !transition.bugsDestroyed &&
      transition.elapsed >=
        TRANSITION_BUG_CLEAR_TIME
    ) {
      transition.bugsDestroyed =
        true

      for (
        const enemy of
          enemiesRef.current
      ) {
        createParticles(
          enemy.x +
            enemy.width / 2,
          enemy.y +
            enemy.height / 2,
          18
        )
      }

      for (
        const wall of
          quipWallsRef.current
      ) {
        createParticles(
          wall.x +
            wall.width / 2,
          wall.y +
            wall.height / 2,
          24
        )
      }

      if (
        finalVictory &&
        bossRef.current
      ) {
        const boss =
          bossRef.current

        createParticles(
          boss.x +
            boss.width / 2,
          boss.y +
            boss.height / 2,
          72
        )

        createParticles(
          boss.x +
            boss.width * 0.25,
          boss.y +
            boss.height * 0.35,
          24
        )

        createParticles(
          boss.x +
            boss.width * 0.75,
          boss.y +
            boss.height * 0.65,
          24
        )

        bossRef.current = null
      }

      enemiesRef.current = []
      quipWallsRef.current = []
      bulletsRef.current = []

      shakeRef.current =
        Math.max(
          shakeRef.current,
          finalVictory
            ? 14
            : 7
        )
    }

    // Final beat: launch the ship forward into the next pipeline stage.
    if (
      transition.elapsed >=
      TRANSITION_FLY_START
    ) {
      const flyProgress =
        Math.min(
          (
            transition.elapsed -
            TRANSITION_FLY_START
          ) /
            (
              TRANSITION_DURATION -
              TRANSITION_FLY_START
            ),
          1
        )

      const eased =
        flyProgress *
        flyProgress *
        flyProgress

      player.y =
        transition.startPlayerY +
        (
          -player.height - 70 -
          transition.startPlayerY
        ) *
          eased

      weaponHeatRef.current =
        Math.max(
          0,
          weaponHeatRef.current -
            95 * delta
        )
    }

    if (
      transition.elapsed >=
      TRANSITION_DURATION
    ) {
      finishStageTransition()
    }
  }


  function drawStageTransition(
    context:
      CanvasRenderingContext2D
  ) {
    const transition =
      stageTransitionRef.current

    if (!transition.active) {
      return
    }

    const elapsed =
      transition.elapsed

    const finalVictory =
      transition.nextStageIndex >
      PIPELINE_STAGES.length

    context.save()

    // A subtle cinematic wash during the slow-motion beat.
    if (
      elapsed <
      TRANSITION_BUG_CLEAR_TIME
    ) {
      const pulse =
        0.04 +
        Math.sin(
          elapsed * 18
        ) *
          0.02

      context.fillStyle =
        `rgba(255,255,255,${Math.max(0, pulse)})`

      context.fillRect(
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
      )
    }

    if (
      elapsed >=
      TRANSITION_FLY_START
    ) {
      const flyProgress =
        Math.min(
          (
            elapsed -
            TRANSITION_FLY_START
          ) /
            (
              TRANSITION_DURATION -
              TRANSITION_FLY_START
            ),
          1
        )

      // Pipeline speed lines. Their motion is derived from elapsed time,
      // so they remain deterministic and do not flicker randomly.
      context.strokeStyle =
        `rgba(255,255,255,${0.08 + flyProgress * 0.24})`

      context.lineWidth =
        1 + flyProgress * 2

      for (
        let index = 0;
        index < 20;
        index++
      ) {
        const x =
          (
            index * 73 +
            31
          ) %
          CANVAS_WIDTH

        const offset =
          (
            elapsed *
              620 +
            index * 41
          ) %
          150

        const y =
          CANVAS_HEIGHT -
          offset

        const length =
          18 +
          flyProgress * 62

        context.beginPath()
        context.moveTo(
          x,
          y
        )
        context.lineTo(
          x,
          y + length
        )
        context.stroke()
      }
    }

    context.textAlign =
      "center"

    context.textBaseline =
      "middle"

    if (
      elapsed >= 0.2 &&
      elapsed < 0.82
    ) {
      const alpha =
        Math.min(
          1,
          (elapsed - 0.2) /
            0.12
        )

      context.fillStyle =
        `rgba(255,255,255,${0.75 * alpha})`

      context.font =
        "bold 18px monospace"

      context.fillText(
        finalVictory
          ? "PROD CLEAR"
          : "STAGE CLEAR",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 8
      )
    }

    if (elapsed >= 0.72) {
      const nextName =
        finalVictory
          ? "COMPLETE"
          : transition.nextStageIndex >=
              PIPELINE_STAGES.length
            ? "PROD"
            : PIPELINE_STAGES[
                transition.nextStageIndex
              ]?.name ??
              "NEXT"

      const alpha =
        Math.min(
          1,
          (elapsed - 0.72) /
            0.18
        )

      context.fillStyle =
        `rgba(186,230,253,${0.82 * alpha})`

      context.font =
        "10px monospace"

      context.fillText(
        finalVictory
          ? "PIPELINE // COMPLETE"
          : `FORWARD // ${nextName}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 18
      )
    }

    context.restore()
  }


  // ========================================
  // PIPELINE
  // ========================================

  function updatePipeline(
    delta: number
  ) {
    if (
      bossActiveRef.current
    ) {
      updateBoss(
        delta
      )

      return
    }

    const stage =
      PIPELINE_STAGES[
        stageIndexRef.current
      ]


    if (
      !stage
    ) {
      return
    }


    stageTimeRef.current +=
      delta

    spawnTimerRef.current +=
      delta


    if (
      spawnTimerRef.current >=
      stage.spawnInterval
    ) {
      spawnEnemy()

      spawnTimerRef.current =
        0
    }


    if (
      stageTimeRef.current >=
      stage.duration
    ) {
      const nextStage =
        stageIndexRef.current +
        1

      startStageTransition(
        nextStage
      )
    }
  }


  // ========================================
  // ENEMY LABEL
  // ========================================

  function getEnemyLabel(
    enemy: Enemy
  ) {
    switch (
      enemy.type
    ) {
      case "syntax":
        return "SYNTAX"

      case "flaky":
        return "FLAKY"

      case "compile":
        return "BUILD"

      case "regression":
        return "REG"

      default:
        return "BUG"
    }
  }


  // ========================================
  // DRAW ENEMY
  // ========================================

  function drawEnemy(
    context:
      CanvasRenderingContext2D,

    enemy: Enemy
  ) {
    const centreX =
      enemy.x +
      enemy.width / 2

    const centreY =
      enemy.y +
      enemy.height / 2

    const flashing =
      enemy.hitFlash > 0

    context.save()

    context.lineWidth = 1.5

    if (flashing) {
      context.fillStyle =
        "rgba(255,255,255,0.95)"

      context.strokeStyle =
        "rgba(255,255,255,1)"
    }

    // ----------------------------------------
    // SYNTAX ERROR
    // Sharp red parser/error diamond.
    // ----------------------------------------

    if (
      enemy.type ===
      "syntax"
    ) {
      if (!flashing) {
        context.fillStyle =
          "rgba(248,113,113,0.16)"

        context.strokeStyle =
          "rgba(248,113,113,0.95)"
      }

      context.beginPath()

      context.moveTo(
        centreX,
        enemy.y
      )

      context.lineTo(
        enemy.x +
          enemy.width,
        centreY
      )

      context.lineTo(
        centreX,
        enemy.y +
          enemy.height
      )

      context.lineTo(
        enemy.x,
        centreY
      )

      context.closePath()

      context.fill()
      context.stroke()

      context.fillStyle =
        flashing
          ? "#000112"
          : "rgba(248,113,113,0.95)"

      context.font =
        "bold 15px monospace"

      context.textAlign =
        "center"

      context.textBaseline =
        "middle"

      context.fillText(
        "!",
        centreX,
        centreY + 1
      )

      context.font =
        "8px monospace"

      context.fillText(
        "{ }",
        centreX,
        enemy.y +
          enemy.height +
          8
      )
    }

    // ----------------------------------------
    // FLAKY TEST
    // Broken yellow test pulse with unstable
    // side nodes.
    // ----------------------------------------

    else if (
      enemy.type ===
      "flaky"
    ) {
      if (!flashing) {
        context.fillStyle =
          "rgba(250,204,21,0.10)"

        context.strokeStyle =
          "rgba(250,204,21,0.95)"
      }

      const wobble =
        Math.sin(
          enemy.movementTime * 8
        ) * 2

      context.strokeRect(
        enemy.x,
        enemy.y,
        enemy.width,
        enemy.height
      )

      context.beginPath()

      context.moveTo(
        enemy.x + 3,
        centreY
      )

      context.lineTo(
        enemy.x + 8,
        centreY
      )

      context.lineTo(
        enemy.x + 11,
        enemy.y + 6 + wobble
      )

      context.lineTo(
        enemy.x + 16,
        enemy.y +
          enemy.height -
          6 -
          wobble
      )

      context.lineTo(
        enemy.x + 20,
        centreY
      )

      context.lineTo(
        enemy.x +
          enemy.width -
          3,
        centreY
      )

      context.stroke()

      context.fillStyle =
        flashing
          ? "#000112"
          : "rgba(250,204,21,0.9)"

      context.fillRect(
        enemy.x - 3,
        centreY - 2,
        3,
        4
      )

      context.fillRect(
        enemy.x +
          enemy.width,
        centreY - 2,
        3,
        4
      )

      context.font =
        "7px monospace"

      context.textAlign =
        "center"

      context.textBaseline =
        "top"

      context.fillText(
        "FLAKY",
        centreX,
        enemy.y +
          enemy.height +
          4
      )
    }

    // ----------------------------------------
    // COMPILE / BUILD FAILURE
    // Large purple build block with stacked
    // package segments and health.
    // ----------------------------------------

    else if (
      enemy.type ===
      "compile"
    ) {
      if (!flashing) {
        context.fillStyle =
          "rgba(192,132,252,0.14)"

        context.strokeStyle =
          "rgba(192,132,252,0.95)"
      }

      context.fillRect(
        enemy.x,
        enemy.y,
        enemy.width,
        enemy.height
      )

      context.strokeRect(
        enemy.x,
        enemy.y,
        enemy.width,
        enemy.height
      )

      context.beginPath()

      context.moveTo(
        enemy.x,
        enemy.y + 10
      )

      context.lineTo(
        enemy.x +
          enemy.width,
        enemy.y + 10
      )

      context.moveTo(
        enemy.x + 10,
        enemy.y
      )

      context.lineTo(
        enemy.x + 10,
        enemy.y + 10
      )

      context.moveTo(
        enemy.x + 20,
        enemy.y
      )

      context.lineTo(
        enemy.x + 20,
        enemy.y + 10
      )

      context.stroke()

      context.fillStyle =
        flashing
          ? "#000112"
          : "rgba(192,132,252,0.95)"

      context.font =
        "bold 9px monospace"

      context.textAlign =
        "center"

      context.textBaseline =
        "middle"

      context.fillText(
        "BUILD",
        centreX,
        centreY + 4
      )

      context.font =
        "8px monospace"

      context.fillText(
        "×",
        enemy.x +
          enemy.width -
          6,
        enemy.y + 6
      )
    }

    // ----------------------------------------
    // REGRESSION
    // Fast orange rollback arrow that hunts
    // the player horizontally.
    // ----------------------------------------

    else {
      if (!flashing) {
        context.fillStyle =
          "rgba(251,146,60,0.12)"

        context.strokeStyle =
          "rgba(251,146,60,0.98)"
      }

      const pulse =
        1 +
        Math.sin(
          enemy.movementTime * 10
        ) * 0.08

      context.save()

      context.translate(
        centreX,
        centreY
      )

      context.scale(
        pulse,
        pulse
      )

      context.beginPath()

      context.arc(
        0,
        0,
        Math.min(
          enemy.width,
          enemy.height
        ) /
          2 -
          2,
        Math.PI * 0.2,
        Math.PI * 1.7
      )

      context.stroke()

      context.beginPath()

      context.moveTo(
        -8,
        -8
      )

      context.lineTo(
        -12,
        -1
      )

      context.lineTo(
        -4,
        -2
      )

      context.closePath()

      context.fill()

      context.restore()

      context.fillStyle =
        flashing
          ? "#000112"
          : "rgba(251,146,60,0.95)"

      context.font =
        "bold 7px monospace"

      context.textAlign =
        "center"

      context.textBaseline =
        "top"

      context.fillText(
        "REG",
        centreX,
        enemy.y +
          enemy.height +
          4
      )
    }

    context.restore()

    // ----------------------------------------
    // HEALTH BAR
    // ----------------------------------------

    const healthRatio =
      Math.max(
        0,
        Math.min(
          enemy.health /
            enemy.maxHealth,
          1
        )
      )

    context.fillStyle =
      "rgba(255,255,255,0.08)"

    context.fillRect(
      enemy.x,
      enemy.y - 7,
      enemy.width,
      3
    )

    context.fillStyle =
      healthRatio > 0.5
        ? "rgba(255,255,255,0.65)"
        : healthRatio > 0.25
          ? "rgba(250,204,21,0.85)"
          : "rgba(248,113,113,0.92)"

    context.fillRect(
      enemy.x,
      enemy.y - 7,
      enemy.width *
        healthRatio,
      3
    )
  }


  // ========================================
  // DRAW FINAL BOSS
  // ========================================

  function drawBoss(
    context:
      CanvasRenderingContext2D
  ) {
    const boss =
      bossRef.current

    if (
      !boss ||
      !bossActiveRef.current
    ) {
      return
    }

    const centreX =
      boss.x +
      boss.width / 2

    const flashing =
      boss.hitFlash > 0

    const healthRatio =
      Math.max(
        0,
        boss.health /
          boss.maxHealth
      )

    context.save()

    context.fillStyle =
      flashing
        ? "rgba(255,255,255,0.92)"
        : "rgba(125,211,252,0.07)"

    context.strokeStyle =
      flashing
        ? "rgba(255,255,255,1)"
        : "rgba(125,211,252,0.82)"

    context.lineWidth =
      1.5

    context.fillRect(
      boss.x,
      boss.y,
      boss.width,
      boss.height
    )

    context.strokeRect(
      boss.x,
      boss.y,
      boss.width,
      boss.height
    )

    // little user / monitor icon
    context.beginPath()

    context.arc(
      boss.x + 25,
      boss.y + 20,
      7,
      0,
      Math.PI * 2
    )

    context.stroke()

    context.beginPath()

    context.arc(
      boss.x + 25,
      boss.y + 43,
      13,
      Math.PI,
      0
    )

    context.stroke()

    context.fillStyle =
      flashing
        ? "#000112"
        : "rgba(186,230,253,0.92)"

    context.font =
      "bold 12px monospace"

    context.textAlign =
      "left"

    context.textBaseline =
      "top"

    context.fillText(
      "END USER",
      boss.x + 48,
      boss.y + 10
    )

    context.font =
      "8px monospace"

    context.fillStyle =
      flashing
        ? "#000112"
        : "rgba(186,230,253,0.55)"

    context.fillText(
      "timezone: UTC-7",
      boss.x + 48,
      boss.y + 29
    )

    context.fillText(
      "environment: ???",
      boss.x + 48,
      boss.y + 41
    )

    // boss health
    const healthY =
      boss.y +
      boss.height +
      9

    context.fillStyle =
      "rgba(255,255,255,0.09)"

    context.fillRect(
      boss.x,
      healthY,
      boss.width,
      5
    )

    context.fillStyle =
      healthRatio > 0.55
        ? "rgba(125,211,252,0.8)"
        : healthRatio > 0.25
          ? "rgba(250,204,21,0.9)"
          : "rgba(248,113,113,0.95)"

    context.fillRect(
      boss.x,
      healthY,
      boss.width *
        healthRatio,
      5
    )

    context.fillStyle =
      "rgba(255,255,255,0.45)"

    context.font =
      "8px monospace"

    context.textAlign =
      "center"

    context.fillText(
      `PROD INCIDENT  ${boss.health}/${boss.maxHealth}`,
      centreX,
      healthY + 9
    )

    context.restore()
  }


  // ========================================
  // DRAW PLAYER
  // ========================================

  function getHeatColour(
    heatRatio: number
  ) {
    if (heatRatio >= 0.9) {
      return "rgba(248,113,113,0.98)"
    }

    if (heatRatio >= 0.72) {
      return "rgba(251,146,60,0.96)"
    }

    if (heatRatio >= 0.45) {
      return "rgba(250,204,21,0.94)"
    }

    return "rgba(74,222,128,0.90)"
  }


  function drawWeaponHeatBoundary(
    context:
      CanvasRenderingContext2D
  ) {
    const heatRatio =
      Math.max(
        0,
        Math.min(
          weaponHeatRef.current /
            WEAPON_MAX_HEAT,
          1
        )
      )

    const centreX =
      CANVAS_WIDTH / 2

    const filledHalf =
      centreX * heatRatio

    const lineY =
      CANVAS_HEIGHT - 6

    const baseHeight = 2
    const heatHeight = 5

    const heatColour =
      getHeatColour(
        heatRatio
      )

    const boundaryHit =
      boundaryFlashRef.current > 0

    context.save()


    // ----------------------------------------
    // PRODUCTION / FAILURE BOUNDARY
    // ----------------------------------------

    context.fillStyle =
      boundaryHit
        ? "rgba(248,113,113,0.8)"
        : "rgba(255,255,255,0.10)"

    context.fillRect(
      0,
      lineY,
      CANVAS_WIDTH,
      baseHeight
    )


    // ----------------------------------------
    // HEAT FILL - CENTRE OUT
    // ----------------------------------------

    if (filledHalf > 0) {
      context.fillStyle =
        heatColour

      context.fillRect(
        centreX - filledHalf,
        lineY - 1,
        filledHalf,
        heatHeight
      )

      context.fillRect(
        centreX,
        lineY - 1,
        filledHalf,
        heatHeight
      )
    }


    // ----------------------------------------
    // CENTRE MARKER
    // ----------------------------------------

    context.fillStyle =
      "rgba(255,255,255,0.32)"

    context.fillRect(
      centreX - 0.5,
      lineY - 4,
      1,
      9
    )


    // ----------------------------------------
    // LABELS
    // ----------------------------------------

    context.font =
      "8px monospace"

    context.textBaseline =
      "bottom"

    context.fillStyle =
      boundaryHit
        ? "rgba(248,113,113,0.9)"
        : "rgba(255,255,255,0.22)"

    context.textAlign =
      "left"

    context.fillText(
      boundaryHit
        ? "PRODUCTION BREACH"
        : "PRODUCTION BOUNDARY",
      8,
      lineY - 7
    )

    context.textAlign =
      "right"

    context.fillStyle =
      weaponOverheatedRef.current
        ? "rgba(248,113,113,0.95)"
        : heatRatio >= 0.45
          ? heatColour
          : "rgba(255,255,255,0.24)"

    context.fillText(
      weaponOverheatedRef.current
        ? "WEAPONS OVERHEATED"
        : `WEAPON HEAT ${Math.round(
            heatRatio * 100
          )}%`,
      CANVAS_WIDTH - 8,
      lineY - 7
    )


    // ----------------------------------------
    // OVERHEAT FLASH
    // ----------------------------------------

    if (
      weaponOverheatedRef.current
    ) {
      const flash =
        Math.floor(
          performance.now() / 120
        ) % 2 === 0

      if (flash) {
        context.fillStyle =
          "rgba(248,113,113,0.18)"

        context.fillRect(
          0,
          lineY - 4,
          CANVAS_WIDTH,
          8
        )
      }
    }

    context.restore()
  }


  function drawPlayer(
    context:
      CanvasRenderingContext2D
  ) {
    const player =
      playerRef.current

    const heatRatio =
      Math.max(
        0,
        Math.min(
          weaponHeatRef.current /
            WEAPON_MAX_HEAT,
          1
        )
      )


    if (
      player.hitFlash >
      0
    ) {
      context.fillStyle =
        "rgba(248,113,113,0.8)"

      context.strokeStyle =
        "rgba(255,255,255,1)"
    }

    else {
      context.fillStyle =
        "rgba(255,255,255,0.10)"

      context.strokeStyle =
        "rgba(255,255,255,0.8)"
    }


    context.fillRect(
      player.x,
      player.y,

      player.width,
      player.height
    )


    context.strokeRect(
      player.x,
      player.y,

      player.width,
      player.height
    )


    // cannon mirrors the current weapon temperature

    context.fillStyle =
      heatRatio < 0.35
        ? "rgba(255,255,255,0.85)"
        : getHeatColour(
            heatRatio
          )


    context.fillRect(
      player.x +
      player.width / 2 -
      2,

      player.y - 8,

      4,
      8
    )


    // shield indicator

    if (
      player.shieldCharges >
      0
    ) {
      context.strokeStyle =
        "rgba(125,211,252,0.65)"

      context.beginPath()

      context.arc(
        player.x +
        player.width / 2,

        player.y +
        player.height / 2,

        player.width /
        1.4,

        0,

        Math.PI *
        2
      )

      context.stroke()
    }
  }


  // ========================================
  // DRAW PARTICLES
  // ========================================

  function drawParticles(
    context:
      CanvasRenderingContext2D
  ) {
    for (
      const particle of
        particlesRef.current
    ) {
      const opacity =
        particle.life /
        particle.maxLife


      context.fillStyle =
        `rgba(255,255,255,${opacity})`


      context.fillRect(
        particle.x,
        particle.y,

        particle.size,
        particle.size
      )
    }
  }


  // ========================================
  // DRAW FLOATING TEXT
  // ========================================

  function drawFloatingTexts(
    context:
      CanvasRenderingContext2D
  ) {
    context.font =
      "11px monospace"

    context.textAlign =
      "center"


    for (
      const text of
        floatingTextsRef.current
    ) {
      const opacity =
        text.life /
        text.maxLife


      context.fillStyle =
        `rgba(255,255,255,${opacity})`


      context.fillText(
        text.text,

        text.x,
        text.y
      )
    }


    context.textAlign =
      "start"
  }


  // ========================================
  // DRAW
  // ========================================

  function draw(
    context:
      CanvasRenderingContext2D
  ) {
    context.clearRect(
      0,
      0,

      CANVAS_WIDTH,
      CANVAS_HEIGHT
    )


    context.fillStyle =
      "#000112"


    context.fillRect(
      0,
      0,

      CANVAS_WIDTH,
      CANVAS_HEIGHT
    )


    context.save()


    // ----------------------------------------
    // SCREEN SHAKE
    // ----------------------------------------

    if (
      shakeRef.current >
      0
    ) {
      const amount =
        shakeRef.current

      context.translate(
        (
          Math.random() -
          0.5
        ) *
        amount,

        (
          Math.random() -
          0.5
        ) *
        amount
      )

      shakeRef.current *=
        0.88

      if (
        shakeRef.current <
        0.3
      ) {
        shakeRef.current =
          0
      }
    }


    // ----------------------------------------
    // BACKGROUND LINES
    // ----------------------------------------

    context.strokeStyle =
      "rgba(255,255,255,0.04)"

    context.lineWidth =
      1


    for (
      let x = 100;
      x < CANVAS_WIDTH;
      x += 100
    ) {
      context.beginPath()

      context.moveTo(
        x,
        0
      )

      context.lineTo(
        x,
        CANVAS_HEIGHT
      )

      context.stroke()
    }


    // ----------------------------------------
    // BULLETS
    // ----------------------------------------

    context.fillStyle =
      "rgba(255,255,255,0.9)"


    for (
      const bullet of
        bulletsRef.current
    ) {
      context.fillRect(
        bullet.x,
        bullet.y,

        bullet.width,
        bullet.height
      )
    }


    // ----------------------------------------
    // ENEMIES
    // ----------------------------------------

    for (
      const enemy of
        enemiesRef.current
    ) {
      drawEnemy(
        context,
        enemy
      )
    }

    drawQuipWalls(
      context
    )


    drawBoss(
      context
    )


    drawPlayer(
      context
    )

    drawWeaponHeatBoundary(
      context
    )

    drawParticles(
      context
    )

    drawFloatingTexts(
      context
    )

    drawStageTransition(
      context
    )


    context.restore()
  }


  // ========================================
  // GAME LOOP
  // ========================================

  function gameLoop(
    timestamp: number
  ) {
    if (
      !running ||
      gameFinishedRef.current
    ) {
      return
    }


    const canvas =
      canvasRef.current

    if (
      !canvas
    ) {
      return
    }


    const context =
      canvas.getContext(
        "2d"
      )

    if (
      !context
    ) {
      return
    }


    // ----------------------------------------
    // PAUSED FOR UPGRADE
    // ----------------------------------------

    if (
      gamePausedRef.current
    ) {
      lastTimeRef.current =
        timestamp

      draw(
        context
      )

      animationFrameRef.current =
        requestAnimationFrame(
          gameLoop
        )

      return
    }


    if (
      lastTimeRef.current ===
      null
    ) {
      lastTimeRef.current =
        timestamp
    }


    const delta =
      Math.min(
        (
          timestamp -
          lastTimeRef.current
        ) /
        1000,

        0.05
      )


    lastTimeRef.current =
      timestamp


    if (
      stageTransitionRef.current.active
    ) {
      updateStageTransition(
        delta
      )

      draw(
        context
      )

      if (
        gameFinishedRef.current
      ) {
        return
      }

      publishStats(
        "running"
      )

      animationFrameRef.current =
        requestAnimationFrame(
          gameLoop
        )

      return
    }


    updatePlayer(
      delta
    )

    updateBullets(
      delta
    )

    updateEnemies(
      delta
    )

    updateQuipWalls(
      delta
    )

    updateParticles(
      delta
    )

    updateFloatingTexts(
      delta
    )

    handleBulletCollisions()

    updatePipeline(
      delta
    )


    // ----------------------------------------
    // PIPELINE COMPLETE
    // ----------------------------------------

    // The run only completes after the PROD boss is defeated.
    // Stop this frame here so the generic "running"
    // publish at the bottom cannot immediately overwrite it.
    if (
      gameFinishedRef.current
    ) {
      draw(
        context
      )

      return
    }


    // ----------------------------------------
    // GAME OVER
    // ----------------------------------------

    if (
      playerRef.current
        .health <=
      0
    ) {
      playerRef.current
        .health =
        0

      gameFinishedRef.current =
        true

      publishStats(
        "game-over"
      )

      draw(
        context
      )

      return
    }


    draw(
      context
    )


    publishStats(
      "running"
    )


    animationFrameRef.current =
      requestAnimationFrame(
        gameLoop
      )
  }


  // ========================================
  // START / STOP
  // ========================================

  useEffect(() => {
    if (
      !running
    ) {
      return
    }


    resetGame()


    animationFrameRef.current =
      requestAnimationFrame(
        gameLoop
      )


    return () => {
      if (
        animationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        )
      }
    }
  }, [running])


  // ========================================
  // RENDER
  // ========================================

  const currentStage =
    PIPELINE_STAGES[
      stageIndexRef.current
    ]

  const currentBriefing =
    currentStage
      ? STAGE_BRIEFINGS[
          currentStage.id
        ]
      : null

  function getThreatClasses() {
    switch (
      currentBriefing?.enemyType
    ) {
      case "syntax":
        return {
          border: "border-red-300/35",
          background: "bg-red-300/[0.04]",
          text: "text-red-200",
          muted: "text-red-200/45",
          badge:
            "border-red-300/30 bg-red-300/[0.06] text-red-200/75",
        }

      case "flaky":
        return {
          border: "border-yellow-200/35",
          background: "bg-yellow-200/[0.04]",
          text: "text-yellow-100",
          muted: "text-yellow-100/45",
          badge:
            "border-yellow-200/30 bg-yellow-200/[0.06] text-yellow-100/75",
        }

      case "compile":
        return {
          border: "border-purple-300/35",
          background: "bg-purple-300/[0.04]",
          text: "text-purple-200",
          muted: "text-purple-200/45",
          badge:
            "border-purple-300/30 bg-purple-300/[0.06] text-purple-200/75",
        }

      case "regression":
        return {
          border: "border-orange-300/35",
          background: "bg-orange-300/[0.04]",
          text: "text-orange-200",
          muted: "text-orange-200/45",
          badge:
            "border-orange-300/30 bg-orange-300/[0.06] text-orange-200/75",
        }

      default:
        return {
          border: "border-emerald-300/30",
          background: "bg-emerald-300/[0.035]",
          text: "text-emerald-200",
          muted: "text-emerald-200/45",
          badge:
            "border-emerald-300/25 bg-emerald-300/[0.05] text-emerald-200/70",
        }
    }
  }

  const threatClasses =
    getThreatClasses()


  // ========================================
  // THREAT PREVIEW
  // ========================================

  function renderThreatPreview() {
    const type =
      currentBriefing?.enemyType

    if (type === "syntax") {
      return (
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <div
            className="
              flex
              h-9
              w-9
              rotate-45
              items-center
              justify-center
              border
              border-red-300/70
              bg-red-300/[0.08]
              shadow-[3px_3px_0_rgba(248,113,113,0.08)]
            "
          >
            <span className="-rotate-45 font-mono text-base font-bold text-red-200">
              !
            </span>
          </div>

          <span className="absolute -bottom-0.5 font-mono text-[8px] text-red-200/65">
            {"{ }"}
          </span>
        </div>
      )
    }

    if (type === "flaky") {
      return (
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <div
            className="
              relative
              flex
              h-9
              w-11
              items-center
              justify-center
              border
              border-yellow-200/70
              bg-yellow-200/[0.05]
              shadow-[3px_3px_0_rgba(250,204,21,0.06)]
            "
          >
            <span className="absolute -left-1 h-1 w-1 bg-yellow-100/80" />
            <span className="absolute -right-1 h-1 w-1 bg-yellow-100/80" />

            <svg
              viewBox="0 0 44 28"
              className="h-7 w-10 text-yellow-100/85"
              aria-hidden="true"
            >
              <polyline
                points="2,14 9,14 13,5 20,23 26,11 31,14 42,14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <span className="absolute -bottom-0.5 font-mono text-[7px] text-yellow-100/65">
            FLAKY
          </span>
        </div>
      )
    }

    if (type === "compile") {
      return (
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <div
            className="
              relative
              h-10
              w-12
              border
              border-purple-300/70
              bg-purple-300/[0.07]
              shadow-[3px_3px_0_rgba(192,132,252,0.07)]
            "
          >
            <div className="absolute left-0 right-0 top-2 border-t border-purple-300/55" />
            <div className="absolute left-2 top-0 h-2 border-l border-purple-300/55" />
            <div className="absolute left-4 top-0 h-2 border-l border-purple-300/55" />

            <span className="absolute right-1 top-0 font-mono text-[8px] text-purple-200/80">
              ×
            </span>

            <span className="absolute inset-x-0 bottom-2 text-center font-mono text-[8px] font-bold text-purple-200/90">
              BUILD
            </span>
          </div>
        </div>
      )
    }

    if (type === "regression") {
      return (
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-orange-300/70
              bg-orange-300/[0.05]
              shadow-[3px_3px_0_rgba(251,146,60,0.06)]
            "
          >
            <span className="font-mono text-2xl leading-none text-orange-200/90">
              ↶
            </span>
          </div>

          <span className="absolute -bottom-0.5 font-mono text-[7px] text-orange-200/65">
            REG
          </span>
        </div>
      )
    }

    // DEPLOY: no new enemy, so show the whole collection.
    return (
      <div
        className="
          grid
          h-14
          w-14
          shrink-0
          grid-cols-2
          gap-1
          border
          border-emerald-300/25
          bg-emerald-300/[0.025]
          p-1.5
          shadow-[3px_3px_0_rgba(110,231,183,0.05)]
        "
      >
        <div className="flex items-center justify-center border border-red-300/35 font-mono text-[9px] text-red-200/75">
          !
        </div>

        <div className="flex items-center justify-center border border-yellow-200/35 font-mono text-[9px] text-yellow-100/75">
          ~
        </div>

        <div className="flex items-center justify-center border border-purple-300/35 font-mono text-[8px] text-purple-200/75">
          ■
        </div>

        <div className="flex items-center justify-center border border-orange-300/35 font-mono text-[10px] text-orange-200/75">
          ↶
        </div>
      </div>
    )
  }


  return (
    <div
      className="relative mx-auto"
      style={{
        // Keep the 900×500 game ratio, but also cap the game by
        // available viewport height. On a 1366×768 laptop this
        // shrinks the game enough to keep the surrounding UI visible;
        // on 1080p displays it is still free to use the full width.
        width:
          "min(100%, calc((100dvh - 220px) * 1.8))",
        aspectRatio:
          `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="
          absolute
          inset-0
          block
          h-full
          w-full
          border
          border-white/15
          bg-navy-dark
        "
      />

      {bossIntroVisible && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-[#020913]/95 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-h-full items-center justify-center">
            <div className="relative w-full max-w-2xl overflow-hidden border border-sky-200/35 bg-[#020913] px-5 py-4 text-center shadow-[8px_8px_0_rgba(125,211,252,0.07)] sm:px-6 sm:py-5">
              <div className="absolute right-0 top-0 h-7 w-7 border-b border-l border-sky-200/25" />

              {bossIntroStep === "intro" ? (
                <>
                  <div className="font-comic text-[8px] tracking-[0.28em] text-emerald-200/55 sm:text-[9px]">
                    DEPLOY SUCCESSFUL
                  </div>

                  <div className="mt-1 font-comic-serif text-2xl text-white sm:text-3xl">
                    ...uh oh.
                  </div>

                  <p className="mx-auto mt-2 max-w-md font-comic text-[9px] leading-4 text-white/40 sm:text-[10px]">
                    You thought you made it. Then an actual user opened production.
                  </p>

                  <div className="mx-auto mt-4 grid max-w-md grid-cols-2 overflow-hidden border border-sky-200/15 bg-sky-200/[0.025] text-left font-mono text-[8px] sm:text-[9px]">
                    <div className="border-b border-r border-sky-200/10 px-3 py-2.5">
                      <div className="text-[7px] uppercase tracking-[0.14em] text-white/20">
                        stage
                      </div>

                      <div className="mt-0.5 text-sky-100/75">
                        PROD
                      </div>
                    </div>

                    <div className="border-b border-sky-200/10 px-3 py-2.5">
                      <div className="text-[7px] uppercase tracking-[0.14em] text-white/20">
                        connection
                      </div>

                      <div className="mt-0.5 text-sky-100/75">
                        END USER
                      </div>
                    </div>

                    <div className="border-r border-sky-200/10 px-3 py-2.5">
                      <div className="text-[7px] uppercase tracking-[0.14em] text-white/20">
                        timezone
                      </div>

                      <div className="mt-0.5 text-yellow-100/75">
                        UTC-7
                      </div>
                    </div>

                    <div className="px-3 py-2.5">
                      <div className="text-[7px] uppercase tracking-[0.14em] text-white/20">
                        environment
                      </div>

                      <div className="mt-0.5 text-red-200/75">
                        somehow different
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 font-comic text-[9px] italic text-sky-100/45">
                    &gt; &quot;but it worked yesterday?&quot;
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setBossIntroStep(
                        "upgrades"
                      )
                    }
                    className="mt-5 border border-sky-100/40 bg-sky-100/[0.035] px-5 py-2 font-comic text-[10px] text-sky-50/80 transition hover:-translate-y-0.5 hover:border-sky-50/75 hover:bg-sky-100/[0.07] hover:text-white"
                  >
                    &gt; let&apos;s fight
                  </button>
                </>
              ) : (
                <>
                  <div className="font-comic text-[8px] tracking-[0.28em] text-sky-200/45 sm:text-[9px]">
                    EMERGENCY PROD PATCH
                  </div>

                  <div className="mx-auto mt-1 max-w-lg font-comic-serif text-lg leading-tight text-white sm:text-xl">
                    We&apos;re gonna need some more firepower.
                  </div>

                  <div className="mt-0.5 font-comic text-[7px] tracking-[0.14em] text-white/30">
                    PICK TWO · {prodUpgradesSelected.length}/2 INSTALLED
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2 max-[560px]:grid-cols-1">
                    {prodUpgradeChoices.map(
                      (upgrade) => {
                        const selected =
                          prodUpgradesSelected.includes(
                            upgrade.id
                          )

                        const locked =
                          prodUpgradesSelected.length >= 2 &&
                          !selected

                        return (
                          <button
                            key={upgrade.id}
                            type="button"
                            disabled={
                              selected || locked
                            }
                            onClick={() =>
                              selectProdUpgrade(
                                upgrade.id
                              )
                            }
                            className={`
                              min-h-[84px]
                              border
                              bg-white/[0.01]
                              px-2.5
                              py-2
                              text-left
                              transition
                              ${
                                selected
                                  ? "border-emerald-200/55 bg-emerald-200/[0.06]"
                                  : locked
                                    ? "cursor-not-allowed border-white/5 opacity-30"
                                    : "border-white/15 hover:-translate-y-0.5 hover:border-sky-100/45 hover:bg-sky-100/[0.025]"
                              }
                            `}
                          >
                            <div className="flex h-full items-stretch gap-2.5">
                              <div className="flex w-14 shrink-0 items-center justify-center border-r border-white/[0.07] pr-2.5 sm:w-16">
                                <img
                                  src={UPGRADE_ICONS[upgrade.id]}
                                  alt=""
                                  aria-hidden="true"
                                  draggable={false}
                                  className="h-11 w-11 object-contain sm:h-12 sm:w-12"
                                />
                              </div>

                              <div className="flex min-w-0 flex-1 flex-col justify-center">
                                <div className="font-comic text-[8px] tracking-[0.16em] text-white/30">
                                  {selected
                                    ? "✓ INSTALLED"
                                    : "> INSTALL"}
                                </div>

                                <div className="mt-0.5 font-comic-serif text-[12px] leading-tight text-white/90 sm:text-[13px]">
                                  {upgrade.name}
                                </div>

                                <div className="mt-1 border-t border-emerald-200/10 pt-1 font-comic text-[7px] leading-[11px] text-emerald-200/70">
                                  BENEFIT · {UPGRADE_BENEFITS[upgrade.id]}
                                </div>

                                <div className="mt-0.5 border-t border-red-300/10 pt-1 font-comic text-[7px] leading-[11px] text-red-300/70">
                                  TRADE-OFF · {UPGRADE_TRADE_OFFS[upgrade.id]}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      }
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={beginBossFight}
                    disabled={
                      prodUpgradesSelected.length < 2
                    }
                    className={`
                      mt-2
                      border
                      px-4
                      py-1
                      font-comic
                      text-[10px]
                      transition
                      ${
                        prodUpgradesSelected.length >= 2
                          ? "border-sky-100/40 bg-sky-100/[0.035] text-sky-50/80 hover:-translate-y-0.5 hover:border-sky-50/75 hover:bg-sky-100/[0.07] hover:text-white"
                          : "cursor-not-allowed border-white/10 text-white/20"
                      }
                    `}
                  >
                    {prodUpgradesSelected.length >= 2
                      ? "> open production"
                      : `> select ${2 - prodUpgradesSelected.length} more`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {upgradeChoices.length > 0 && (
        <div
          className="
            absolute
            inset-0
            overflow-y-auto
            bg-navy-dark/95
            px-4
            py-3
            sm:px-6
            sm:py-4
          "
        >
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center">
            {/* ====================================== */}
            {/* STAGE HEADER */}
            {/* ====================================== */}

            <div
              className="
                mb-2.0
                flex
                items-end
                justify-between
                border-b
                border-white/10
                pb-2
              "
            >
              <div>
                <div
                  className="
                    mb-0.5
                    font-comic
                    text-[7px]
                    tracking-[0.22em]
                    text-white/25
                    sm:text-[8px]
                  "
                >
                  ENTERING PIPELINE STAGE
                </div>

                <h3
                  className="
                    font-comic-serif
                    text-xl
                    leading-none
                    text-white
                    sm:text-2xl
                  "
                >
                  {currentStage?.name}
                </h3>
              </div>

              <div
                className="
                  pb-0.5
                  font-comic
                  text-[8px]
                  tracking-[0.2em]
                  text-white/25
                  sm:text-[9px]
                "
              >
                {String(
                  stageIndexRef.current + 1
                ).padStart(2, "0")}
                {" / "}
                {String(
                  PIPELINE_STAGES.length
                ).padStart(2, "0")}
              </div>
            </div>

            {/* ====================================== */}
            {/* STAGE BRIEFING / ENEMY INTRO */}
            {/* ====================================== */}

            {currentBriefing && (
              <div
                className={`
                  relative
                  overflow-hidden
                  border
                  ${threatClasses.border}
                  ${threatClasses.background}
                  px-4
                  py-2.5
                  sm:px-5
                  sm:py-3
                `}
              >
                <div
                  className={`
                    absolute
                    right-0
                    top-0
                    h-5
                    w-5
                    border-b
                    border-l
                    ${threatClasses.border}
                  `}
                />

                {/* briefing status */}
                <div className="flex min-h-3 items-center gap-2 pr-8">
                  <span className="font-comic text-[8px] leading-none tracking-[0.2em] text-white/30 sm:text-[9px]">
                    {currentBriefing.threatLabel}
                  </span>

                  <span
                    aria-hidden="true"
                    className="text-[8px] leading-none text-white/15"
                  >
                    ·
                  </span>

                  <span
                    className={`
                      font-comic
                      text-[7px]
                      leading-none
                      tracking-[0.16em]
                      sm:text-[8px]
                      ${threatClasses.muted}
                    `}
                  >
                    {currentBriefing.status}
                  </span>
                </div>

                {/* threat identity */}
                <div
                  className="
                    mt-2.5
                    grid
                    grid-cols-[56px_minmax(0,1fr)]
                    items-center
                    gap-3
                    sm:grid-cols-[64px_minmax(0,1fr)]
                    sm:gap-4
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      items-center
                      justify-center
                      border-r
                      border-white/[0.07]
                      pr-3
                      sm:h-16
                      sm:pr-4
                    "
                  >
                    {renderThreatPreview()}
                  </div>

                  <div className="min-w-0">
                    <div className="font-comic text-[7px] leading-none tracking-[0.18em] text-white/20 sm:text-[8px]">
                      {currentBriefing.enemyType
                        ? "THREAT IDENTIFIED"
                        : "THREAT SUMMARY"}
                    </div>

                    <div
                      className={`
                        mt-1
                        font-comic-serif
                        text-base
                        leading-none
                        sm:text-lg
                        ${threatClasses.text}
                      `}
                    >
                      {currentBriefing.enemyName}
                    </div>

                    <p className="mt-1 max-w-2xl font-comic text-[8px] leading-[1.35] text-white/45 sm:text-[9px]">
                      {currentBriefing.description}
                    </p>
                  </div>
                </div>

                {/* quip */}
                <div
                  className="
                    mt-2.5
                    grid
                    grid-cols-[56px_minmax(0,1fr)]
                    gap-3
                    border-t
                    border-white/10
                    pt-2
                    sm:grid-cols-[64px_minmax(0,1fr)]
                    sm:gap-4
                  "
                >
                  <div
                    aria-hidden="true"
                    className={`
                      pr-3
                      text-right
                      font-comic
                      text-[8px]
                      leading-3
                      sm:pr-4
                      sm:text-[9px]
                      ${threatClasses.muted}
                    `}
                  >
                    &gt;
                  </div>

                  <p
                    className={`
                      min-w-0
                      font-comic
                      text-[8px]
                      italic
                      leading-3
                      sm:text-[9px]
                      ${threatClasses.muted}
                    `}
                  >
                    {currentBriefing.quip}
                  </p>
                </div>
              </div>
            )}


            {/* ====================================== */}
            {/* UPGRADE HEADER */}
            {/* ====================================== */}

            <div
              className="
                mb-1.5
                mt-2.5
                flex
                items-center
                justify-between
              "
            >
              <div
                className="
                  font-comic
                  text-[8px]
                  tracking-[0.2em]
                  text-white/30
                  sm:text-[9px]
                "
              >
                PIPELINE PATCH
              </div>

              <div
                className="
                  font-comic
                  text-[7px]
                  text-white/20
                  sm:text-[8px]
                "
              >
                choose one
              </div>
            </div>

            {/* ====================================== */}
            {/* UPGRADES */}
            {/* ====================================== */}

            <div
              className="
                grid
                grid-cols-2
                gap-2.5
                sm:gap-3
                max-[520px]:grid-cols-1
              "
            >
              {upgradeChoices.map(
                (upgrade) => (
                  <button
                    key={upgrade.id}
                    type="button"
                    onClick={() =>
                      applyUpgrade(
                        upgrade.id
                      )
                    }
                    className="
                      group
                      min-h-[104px]
                      border
                      border-white/15
                      bg-white/[0.01]
                      px-3.5
                      py-2.5
                      text-left
                      transition
                      duration-150

                      hover:-translate-y-0.5
                      hover:border-white/40
                      hover:bg-white/[0.025]
                      sm:min-h-[110px]
                      sm:px-4
                      sm:py-3
                    "
                  >
                    <div className="flex h-full items-stretch gap-3.5">
                      <div className="flex w-[72px] shrink-0 items-center justify-center border-r border-white/[0.07] pr-3.5 sm:w-20">
                        <img
                          src={UPGRADE_ICONS[upgrade.id]}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          className="h-16 w-16 object-contain sm:h-[68px] sm:w-[68px]"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <div>
                          <div
                            className="
                              font-comic
                              text-[7px]
                              tracking-wide
                              text-white/20
                              transition
                              group-hover:text-white/35
                              sm:text-[8px]
                            "
                          >
                            &gt; install
                          </div>

                          <div
                            className="
                              mt-1
                              font-comic-serif
                              text-sm
                              leading-tight
                              text-white/80
                              transition
                              group-hover:text-white
                              sm:text-base
                            "
                          >
                            {upgrade.name}
                          </div>
                        </div>

                        <div>
                          <div
                            className="
                              mt-2
                              border-t
                              border-emerald-200/10
                              pt-1
                              font-comic
                              text-[7px]
                              leading-3
                              text-emerald-200/70
                              sm:text-[8px]
                            "
                          >
                            BENEFIT · {UPGRADE_BENEFITS[upgrade.id]}
                          </div>

                          <div
                            className="
                              mt-1
                              border-t
                              border-red-300/10
                              pt-1
                              font-comic
                              text-[7px]
                              leading-3
                              text-red-300/70
                              sm:text-[8px]
                            "
                          >
                            TRADE-OFF · {UPGRADE_TRADE_OFFS[upgrade.id]}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}


export default PipelineGame
