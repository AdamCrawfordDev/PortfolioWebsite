import {
  useState,
} from "react"

import MemoryGame from "./game/MemoryGame"

import {
  MEMORY_CAPACITY,
} from "./game/config"

import type {
  MemoryStats,
} from "./game/types"


// ========================================
// INITIAL STATS
// ========================================

function makeInitialStats():
  MemoryStats {
  return {
    memoryUsed: 190,

    memoryCapacity:
      MEMORY_CAPACITY,

    memoryPercent:
      (
        190 /
        MEMORY_CAPACITY
      ) *
      100,

    score: 0,

    leaksFixed: 0,

    falseFrees: 0,

    activeAllocations: 0,

    allocationRate: 0,

    gameState: "idle",
  }
}


// ========================================
// COMPONENT
// ========================================

function MemoryLeak() {
  const [runId, setRunId] =
    useState(0)


  const [running, setRunning] =
    useState(false)


  const [stability, setStability] =
    useState(100)


  const [stats, setStats] =
    useState<MemoryStats>(
      makeInitialStats()
    )


  // ========================================
  // START
  // ========================================

  function startGame() {
    setRunId(
      (current) =>
        current + 1
    )


    setStats(
      makeInitialStats()
    )


    setStability(100)


    setRunning(false)


    requestAnimationFrame(
      () => {
        setRunning(true)
      }
    )
  }


  // ========================================
  // STATE
  // ========================================

  const isGameOver =
    stats.gameState ===
    "game-over"


  const memoryCritical =
    stats.memoryPercent >=
    85


  const memoryWarning =
    stats.memoryPercent >=
      65 &&
    !memoryCritical


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
          /minigames/memory-leak.exe
        </div>

        <h2 className="mt-2 font-comic-serif text-3xl text-white">
          Memory Leak
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
          The heap keeps growing.
          Inspect live allocations,
          identify objects that should
          have been released and free
          the leaks before the process
          runs out of memory.
        </p>
      </div>


      {/* ========================================
          HUD
      ======================================== */}

      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <div>
          <span className="text-white/25">
            score:{" "}
          </span>

          <span className="text-white/65">
            {stats.score}
          </span>
        </div>


        <div>
          <span className="text-white/25">
            leaks fixed:{" "}
          </span>

          <span className="text-emerald-200/65">
            {stats.leaksFixed}
          </span>
        </div>


        <div>
          <span className="text-white/25">
            invalid frees:{" "}
          </span>

          <span
            className={
              stats.falseFrees >
              0
                ? "text-red-200/70"
                : "text-white/65"
            }
          >
            {stats.falseFrees}
          </span>
        </div>


        <div>
          <span className="text-white/25">
            allocations:{" "}
          </span>

          <span className="text-white/65">
            {
              stats.activeAllocations
            }
          </span>
        </div>


        <div className="ml-auto hidden text-[10px] tracking-[0.18em] text-white/20 sm:block">
          HEAP PROFILER
        </div>
      </div>


      {/* ========================================
          STATUS
      ======================================== */}

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* RAM */}

        <div>
          <div className="mb-1 flex items-center justify-between text-[9px] tracking-[0.08em]">
            <span
              className={
                memoryCritical
                  ? "text-red-300/75"
                  : memoryWarning
                    ? "text-yellow-200/65"
                    : "text-white/30"
              }
            >
              RAM
            </span>

            <span
              className={
                memoryCritical
                  ? "text-red-300/70"
                  : memoryWarning
                    ? "text-yellow-200/55"
                    : "text-white/20"
              }
            >
              {Math.round(
                stats.memoryPercent
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
                    memoryCritical
                      ? "bg-red-300/70"
                      : memoryWarning
                        ? "bg-yellow-200/55"
                        : "bg-emerald-200/40"
                  }
                `
              }
              style={{
                width:
                  `${Math.min(
                    100,
                    stats.memoryPercent
                  )}%`,
              }}
            />
          </div>
        </div>


        {/* STABILITY */}

        <div>
          <div className="mb-1 flex items-center justify-between text-[9px] tracking-[0.08em]">
            <span className="text-white/30">
              PROCESS STABILITY
            </span>

            <span className="text-white/20">
              {Math.round(
                stability
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
                    stability <= 25
                      ? "bg-red-300/70"
                      : stability <= 50
                        ? "bg-yellow-200/55"
                        : "bg-cyan-200/40"
                  }
                `
              }
              style={{
                width:
                  `${stability}%`,
              }}
            />
          </div>
        </div>


        {/* GROWTH */}

        <div>
          <div className="mb-1 flex items-center justify-between text-[9px] tracking-[0.08em]">
            <span className="text-white/30">
              HEAP GROWTH
            </span>

            <span
              className={
                stats.allocationRate >
                10
                  ? "text-yellow-200/55"
                  : "text-white/20"
              }
            >
              {stats.allocationRate >=
              0
                ? "+"
                : ""}
              {stats.allocationRate.toFixed(
                1
              )}
              {" MB/s"}
            </span>
          </div>

          <div className="h-1 bg-white/[0.06]">
            <div
              className="h-full bg-violet-200/35"
              style={{
                width:
                  `${Math.min(
                    100,
                    Math.abs(
                      stats.allocationRate
                    ) *
                      2
                  )}%`,
              }}
            />
          </div>
        </div>
      </div>


      {/* ========================================
          GAME
      ======================================== */}

      <div className="relative overflow-hidden border border-white/5">
        <MemoryGame
          key={runId}
          running={
            running &&
            !isGameOver
          }
          onStatsChange={
            setStats
          }
          onStabilityChange={
            setStability
          }
        />


        {/* ========================================
            START
        ======================================== */}

        {!running &&
          !isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-dark/85 px-5 backdrop-blur-[1px]">
              <div className="w-full max-w-lg border border-white/15 bg-navy-dark/95 p-6 text-center shadow-[8px_8px_0_rgba(255,255,255,0.04)]">
                <div className="text-[10px] tracking-[0.2em] text-white/25">
                  PROFILER ATTACHED
                </div>

                <div className="mt-2 font-comic-serif text-3xl text-white">
                  Find the leak.
                </div>

                <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-white/40">
                  Memory is being allocated
                  continuously. Most objects
                  are legitimate and will
                  disappear naturally.
                  Something in the heap is
                  holding on when it should
                  not.
                </p>


                <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2 text-left text-[10px]">
                  <div className="border border-white/[0.08] px-3 py-3">
                    <div className="text-white/20">
                      01
                    </div>

                    <div className="mt-1 text-white/55">
                      SELECT
                    </div>

                    <div className="mt-1 text-white/25">
                      an allocation
                    </div>
                  </div>


                  <div className="border border-white/[0.08] px-3 py-3">
                    <div className="text-white/20">
                      02
                    </div>

                    <div className="mt-1 text-white/55">
                      INSPECT
                    </div>

                    <div className="mt-1 text-white/25">
                      profiler data
                    </div>
                  </div>


                  <div className="border border-white/[0.08] px-3 py-3">
                    <div className="text-white/20">
                      03
                    </div>

                    <div className="mt-1 text-white/55">
                      FREE
                    </div>

                    <div className="mt-1 text-white/25">
                      suspicious memory
                    </div>
                  </div>
                </div>


                <div className="mx-auto mt-4 max-w-md border border-yellow-200/[0.08] bg-yellow-100/[0.015] px-3 py-2 text-left">
                  <div className="text-[9px] tracking-[0.14em] text-yellow-100/35">
                    DEBUGGER NOTE
                  </div>

                  <div className="mt-1 text-[10px] leading-4 text-white/35">
                    Old allocations and
                    objects with no active
                    references are suspicious,
                    but neither guarantees
                    that an allocation is
                    actually leaking.
                  </div>

                  <div className="mt-1 text-[10px] leading-4 text-yellow-100/45">
                    Freeing live memory
                    damages process stability.
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
                  &gt; attach profiler
                </button>
              </div>
            </div>
          )}


        {/* ========================================
            GAME OVER
        ======================================== */}

        {isGameOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#17070b]/95 px-5">
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_14px,rgba(248,113,113,0.15)_14px,rgba(248,113,113,0.15)_15px)]" />
            </div>


            <div className="relative w-full max-w-lg border-2 border-red-300/70 bg-[#12060a]/95 px-6 py-8 text-center shadow-[10px_10px_0_rgba(248,113,113,0.12)]">
              <div className="text-[10px] tracking-[0.3em] text-red-300/60">
                PROCESS TERMINATED
              </div>

              <div className="mt-3 font-comic-serif text-4xl text-red-200 md:text-5xl">
                {stability <= 0
                  ? "SEGMENTATION FAULT"
                  : "OUT OF MEMORY"}
              </div>


              <div className="mx-auto mt-4 h-px max-w-xs bg-red-300/25" />


              <div className="mt-4 text-sm text-red-100/65">
                {stability <= 0
                  ? "Too much live memory was freed."
                  : "The heap exhausted available memory."}
              </div>


              <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 border border-red-200/15">
                <div className="border-r border-red-200/10 px-2 py-3">
                  <div className="text-[9px] text-red-200/35">
                    SCORE
                  </div>

                  <div className="mt-1 text-sm text-red-100/80">
                    {stats.score}
                  </div>
                </div>


                <div className="border-r border-red-200/10 px-2 py-3">
                  <div className="text-[9px] text-red-200/35">
                    LEAKS
                  </div>

                  <div className="mt-1 text-sm text-emerald-100/80">
                    {stats.leaksFixed}
                  </div>
                </div>


                <div className="px-2 py-3">
                  <div className="text-[9px] text-red-200/35">
                    BAD FREES
                  </div>

                  <div className="mt-1 text-sm text-yellow-100/80">
                    {stats.falseFrees}
                  </div>
                </div>
              </div>


              <div className="mt-5 text-[10px] tracking-[0.16em] text-red-300/40">
                CORE DUMPED
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
                &gt; restart process
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
          MOUSE · SELECT ALLOCATION
        </span>

        <span>
          F / DELETE · FREE
        </span>
      </div>


      {/* ========================================
          LEGEND
      ======================================== */}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 text-[10px]">
        <span className="text-white/40">
          □ ALLOCATION
        </span>

        <span className="text-cyan-200/50">
          □ SELECTED
        </span>

        <span className="text-yellow-200/50">
          ● LONG-LIVED
        </span>

        <span className="text-emerald-200/50">
          FREE LEAK · +SCORE
        </span>

        <span className="text-red-200/50">
          FREE LIVE · -STABILITY
        </span>
      </div>
    </div>
  )
}


export default MemoryLeak