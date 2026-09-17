import {
  useState,
} from "react"

import NetworkGame from "./game/NetworkGame"

import {
  PORTS,
} from "./game/config"

import type {
  GameStats,
} from "./game/types"


// ========================================
// INITIAL STATS
// ========================================

function makeInitialStats():
  GameStats {
  return {
    score: 0,

    intercepted: 0,

    falsePositives: 0,

    leaked: 0,

    streak: 0,

    ports:
      PORTS.map(
        (port) => ({
          ...port,
        })
      ),

    gameState: "idle",

    failedPort: null,
  }
}


// ========================================
// COMPONENT
// ========================================

function PacketPolice() {
  const [runId, setRunId] =
    useState(0)

  const [running, setRunning] =
    useState(false)

  const [stats, setStats] =
    useState<GameStats>(
      makeInitialStats()
    )


  // ========================================
  // START / RESTART
  // ========================================

  function startGame() {
    setRunId(
      (current) =>
        current + 1
    )

    setStats(
      makeInitialStats()
    )

    setRunning(false)

    requestAnimationFrame(
      () => {
        setRunning(true)
      }
    )
  }


  // ========================================
  // GAME STATE
  // ========================================

  const isGameOver =
    stats.gameState ===
    "game-over"


  const failedPort =
    stats.ports.find(
      (port) =>
        port.id ===
        stats.failedPort
    )


  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="font-comic">
      {/* ========================================
          HEADER
      ======================================== */}

      <div className="mb-5">
        <div className="text-xs text-white/30">
          /minigames/packet-police.exe
        </div>

        <h2 className="mt-2 font-comic-serif text-3xl text-white">
          Packet Police
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
          Corrupted packets are crossing
          the network. Patrol the routes,
          intercept malicious traffic and
          avoid disrupting legitimate
          requests.
        </p>
      </div>


      {/* ========================================
          HUD
      ======================================== */}

      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        {/* SCORE */}

        <div>
          <span className="text-white/25">
            score:{" "}
          </span>

          <span className="text-white/65">
            {stats.score}
          </span>
        </div>


        {/* CORRECT ARRESTS */}

        <div>
          <span className="text-white/25">
            arrested:{" "}
          </span>

          <span className="text-cyan-100/65">
            {stats.intercepted}
          </span>
        </div>


        {/* FALSE POSITIVES */}

        <div>
          <span className="text-white/25">
            false +:{" "}
          </span>

          <span
            className={
              stats.falsePositives > 0
                ? "text-yellow-200/75"
                : "text-white/65"
            }
          >
            {stats.falsePositives}
          </span>
        </div>


        {/* LEAKED */}

        <div>
          <span className="text-white/25">
            leaked:{" "}
          </span>

          <span
            className={
              stats.leaked > 0
                ? "text-red-200/70"
                : "text-white/65"
            }
          >
            {stats.leaked}
          </span>
        </div>


        {/* STREAK */}

        <div>
          <span className="text-white/25">
            streak:{" "}
          </span>

          <span className="text-white/65">
            x{stats.streak}
          </span>
        </div>


        <div className="ml-auto hidden text-[10px] tracking-[0.18em] text-white/20 sm:block">
          NETWORK DEFENCE SYSTEM
        </div>
      </div>


      {/* ========================================
          PORT AVAILABILITY
      ======================================== */}

      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4">
        {stats.ports.map(
          (port) => {
            const health =
              Math.max(
                0,
                port.health
              )


            const critical =
              health <= 25


            const warning =
              health <= 50 &&
              !critical


            return (
              <div
                key={port.id}
              >
                <div className="mb-1 flex items-center justify-between text-[9px] tracking-[0.08em]">
                  <span
                    className={
                      critical
                        ? "text-red-300/75"
                        : warning
                          ? "text-yellow-200/65"
                          : "text-white/30"
                    }
                  >
                    {port.name}
                    {" "}
                    :{port.port}
                  </span>


                  <span
                    className={
                      critical
                        ? "text-red-300/70"
                        : warning
                          ? "text-yellow-200/55"
                          : "text-white/20"
                    }
                  >
                    {Math.round(
                      health
                    )}
                    %
                  </span>
                </div>


                <div className="h-1 overflow-hidden bg-white/[0.06]">
                  <div
                    className={
                      `
                        h-full
                        transition-[width]
                        duration-150
                        ${
                          critical
                            ? "bg-red-300/70"
                            : warning
                              ? "bg-yellow-200/55"
                              : "bg-cyan-200/40"
                        }
                      `
                    }
                    style={{
                      width:
                        `${health}%`,
                    }}
                  />
                </div>
              </div>
            )
          }
        )}
      </div>


      {/* ========================================
          GAME
      ======================================== */}

      <div className="relative overflow-hidden border border-white/5">
        <NetworkGame
          key={runId}
          running={
            running &&
            !isGameOver
          }
          onStatsChange={
            setStats
          }
        />


        {/* ========================================
            START SCREEN
        ======================================== */}

        {!running &&
          !isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-dark/80 px-5 backdrop-blur-[1px]">
              <div className="w-full max-w-md border border-white/15 bg-navy-dark/95 p-6 text-center shadow-[8px_8px_0_rgba(255,255,255,0.04)]">
                <div className="text-[10px] tracking-[0.2em] text-white/25">
                  NETWORK UNPROTECTED
                </div>

                <div className="mt-2 font-comic-serif text-3xl text-white">
                  Begin patrol?
                </div>

                <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-white/40">
                  Corrupted packets are
                  targeting four services.
                  Intercept malicious traffic
                  before it reaches a port,
                  but be careful. Blocking
                  legitimate requests reduces
                  service availability too.
                </p>


                {/* ========================================
                    SERVICES
                ======================================== */}

                <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-2 text-left text-[10px]">
                  <div className="border border-white/[0.08] px-3 py-2">
                    <div className="text-white/20">
                      HTTP
                    </div>

                    <div className="mt-0.5 text-white/55">
                      PORT :80
                    </div>
                  </div>


                  <div className="border border-white/[0.08] px-3 py-2">
                    <div className="text-white/20">
                      HTTPS
                    </div>

                    <div className="mt-0.5 text-white/55">
                      PORT :443
                    </div>
                  </div>


                  <div className="border border-white/[0.08] px-3 py-2">
                    <div className="text-white/20">
                      SSH
                    </div>

                    <div className="mt-0.5 text-white/55">
                      PORT :22
                    </div>
                  </div>


                  <div className="border border-white/[0.08] px-3 py-2">
                    <div className="text-white/20">
                      DNS
                    </div>

                    <div className="mt-0.5 text-white/55">
                      PORT :53
                    </div>
                  </div>
                </div>


                {/* ========================================
                    RULE
                ======================================== */}

                <div className="mx-auto mt-4 max-w-xs border border-yellow-200/[0.08] bg-yellow-100/[0.015] px-3 py-2 text-left">
                  <div className="text-[9px] tracking-[0.14em] text-yellow-100/35">
                    RULE 01
                  </div>

                  <div className="mt-1 text-[10px] leading-4 text-white/35">
                    Red corrupted packets are
                    hostile. Blue packets are
                    legitimate traffic.
                  </div>

                  <div className="mt-1 text-[10px] leading-4 text-yellow-100/45">
                    False arrests reduce the
                    destination service's
                    availability.
                  </div>
                </div>


                <button
                  type="button"
                  onClick={
                    startGame
                  }
                  className="
                    mt-6
                    border
                    border-cyan-100/25
                    bg-cyan-100/[0.02]
                    px-5
                    py-2
                    text-sm
                    text-cyan-50/65
                    transition
                    hover:-translate-y-0.5
                    hover:border-cyan-100/60
                    hover:bg-cyan-100/[0.05]
                    hover:text-white
                  "
                >
                  &gt; start patrol
                </button>
              </div>
            </div>
          )}


        {/* ========================================
            FAILURE
        ======================================== */}

        {isGameOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#17070b]/95 px-5">
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_14px,rgba(248,113,113,0.15)_14px,rgba(248,113,113,0.15)_15px)]" />
            </div>


            <div className="relative w-full max-w-lg border-2 border-red-300/70 bg-[#12060a]/95 px-6 py-8 text-center shadow-[10px_10px_0_rgba(248,113,113,0.12)]">
              <div className="text-[10px] tracking-[0.3em] text-red-300/60">
                CONNECTION LOST
              </div>

              <div className="mt-3 font-comic-serif text-4xl text-red-200 md:text-5xl">
                SERVICE DOWN
              </div>

              <div className="mx-auto mt-4 h-px max-w-xs bg-red-300/25" />


              <div className="mt-4 text-sm text-red-100/65">
                {failedPort
                  ? `${failedPort.name} :${failedPort.port} crashed.`
                  : "A protected service crashed."}
              </div>


              <div className="mt-1 text-xs text-white/35">
                availability reached zero
              </div>


              {/* ========================================
                  FAILURE STATS
              ======================================== */}

              <div className="mx-auto mt-6 grid max-w-sm grid-cols-4 border border-red-200/15">
                {/* SCORE */}

                <div className="border-r border-red-200/10 px-2 py-3">
                  <div className="text-[9px] text-red-200/35">
                    SCORE
                  </div>

                  <div className="mt-1 text-sm text-red-100/80">
                    {stats.score}
                  </div>
                </div>


                {/* ARRESTS */}

                <div className="border-r border-red-200/10 px-2 py-3">
                  <div className="text-[9px] text-red-200/35">
                    ARRESTS
                  </div>

                  <div className="mt-1 text-sm text-red-100/80">
                    {
                      stats.intercepted
                    }
                  </div>
                </div>


                {/* FALSE POSITIVES */}

                <div className="border-r border-red-200/10 px-2 py-3">
                  <div className="text-[9px] text-yellow-200/40">
                    FALSE +
                  </div>

                  <div className="mt-1 text-sm text-yellow-100/80">
                    {
                      stats.falsePositives
                    }
                  </div>
                </div>


                {/* LEAKED */}

                <div className="px-2 py-3">
                  <div className="text-[9px] text-red-200/35">
                    LEAKED
                  </div>

                  <div className="mt-1 text-sm text-red-100/80">
                    {stats.leaked}
                  </div>
                </div>
              </div>


              {/* ========================================
                  FAILURE REASON
              ======================================== */}

              <div className="mx-auto mt-4 max-w-sm text-[10px] leading-4 text-white/25">
                {stats.falsePositives >
                stats.leaked
                  ? (
                    <>
                      Excessive legitimate
                      traffic was blocked,
                      contributing to the
                      outage.
                    </>
                  )
                  : (
                    <>
                      Malicious traffic
                      overwhelmed the
                      protected service.
                    </>
                  )}
              </div>


              <div className="mt-5 text-[10px] tracking-[0.16em] text-red-300/40">
                NETWORK COMPROMISED
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
                &gt; restart patrol
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ========================================
          CONTROLS
      ======================================== */}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-white/25">
        <span>
          W / ↑ · PORT UP
        </span>

        <span>
          S / ↓ · PORT DOWN
        </span>

        <span>
          A / ← · MOVE LEFT
        </span>

        <span>
          D / → · MOVE RIGHT
        </span>
      </div>


      {/* ========================================
          KEY
      ======================================== */}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 text-[10px]">
        <span className="text-cyan-200/50">
          ◎ PACKET POLICE
        </span>

        <span className="text-sky-200/45">
          ▭ CLEAN · ALLOW
        </span>

        <span className="text-red-300/60">
          ▭⚡ CORRUPTED · ARREST
        </span>

        <span className="text-yellow-200/50">
          ⚠ FALSE + · AVAILABILITY LOSS
        </span>

        <span className="text-red-200/45">
          ■ 0% · SERVICE DOWN
        </span>
      </div>
    </div>
  )
}


export default PacketPolice