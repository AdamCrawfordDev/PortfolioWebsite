import {
  useState,
} from "react"

import PipelineGame from "./game/PipelineGame"

import {
  PIPELINE_STAGES,
  PLAYER_MAX_HEALTH,
} from "./game/config"

import type {
  GameStats,
} from "./game/types"


function BugSquasher() {
  const [runId, setRunId] =
    useState(0)

  const [running, setRunning] =
    useState(false)

  const [stats, setStats] =
    useState<GameStats>({
      score: 0,

      health:
        PLAYER_MAX_HEALTH,

      maxHealth:
        PLAYER_MAX_HEALTH,

      stageIndex: 0,

      stageProgress: 0,

      gameState: "idle",
    })


  function startGame() {
    setRunId(
      (current) =>
        current + 1
    )

    setStats({
      score: 0,

      health:
        PLAYER_MAX_HEALTH,

      maxHealth:
        PLAYER_MAX_HEALTH,

      stageIndex: 0,

      stageProgress: 0,

      gameState: "running",
    })

    setRunning(false)

    requestAnimationFrame(() => {
      setRunning(true)
    })
  }


  const isProd =
    stats.stageIndex >=
    PIPELINE_STAGES.length

  const stage =
    isProd
      ? null
      : PIPELINE_STAGES[
          stats.stageIndex
        ]

  const stageName =
    isProd
      ? "PROD"
      : stage?.name ??
        "SOURCE"


  const isGameOver =
    stats.gameState ===
    "game-over"

  const isComplete =
    stats.gameState ===
    "complete"


  return (
    <div className="font-comic">
      <div className="mb-5">
        <div className="text-xs text-white/30">
          /minigames/ci-cd-defense.exe
        </div>

        <h2 className="mt-2 font-comic-serif text-3xl text-white">
          CI/CD Defense
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
          Something has gone very wrong
          in the pipeline. Keep the build
          alive and make it to production.
        </p>
      </div>


      {/* ========================================
          HUD
      ======================================== */}

      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <div>
          <span className="text-white/25">
            stage:{" "}
          </span>

          <span className="text-white/65">
            {stageName}
          </span>
        </div>

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
            integrity:{" "}
          </span>

          <span className="text-white/65">
            {"■".repeat(
              Math.max(
                Math.min(
                  stats.health,
                  stats.maxHealth
                ),
                0
              )
            )}

            <span className="text-white/15">
              {"□".repeat(
                Math.max(
                  stats.maxHealth -
                    stats.health,
                  0
                )
              )}
            </span>
          </span>
        </div>

        <div className="ml-auto hidden text-[10px] tracking-[0.18em] text-white/20 sm:block">
          CI/CD DEFENCE SYSTEM
        </div>
      </div>


      {/* ========================================
          PIPELINE PROGRESS
      ======================================== */}

      <div className="mb-2">
        <div className="mb-1 flex justify-between text-[9px] tracking-[0.12em] text-white/20">
          <span>
            {stageName}
          </span>

          <span>
            {Math.round(
              stats.stageProgress *
                100
            )}
            %
          </span>
        </div>

        <div className="h-1 overflow-hidden bg-white/5">
          <div
            className="h-full bg-white/45 transition-[width] duration-100"
            style={{
              width:
                `${stats.stageProgress * 100}%`,
            }}
          />
        </div>
      </div>


      {/* ========================================
          GAME
      ======================================== */}

      <div className="relative overflow-hidden border border-white/5">
        <PipelineGame
          key={runId}
          running={running}
          onStatsChange={
            setStats
          }
        />


        {/* ========================================
            START SCREEN
        ======================================== */}

        {!running &&
          !isGameOver &&
          !isComplete && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-dark/80 px-5 backdrop-blur-[1px]">
              <div className="w-full max-w-md border border-white/15 bg-navy-dark/95 p-6 text-center shadow-[8px_8px_0_rgba(255,255,255,0.04)]">
                <div className="text-[10px] tracking-[0.2em] text-white/25">
                  PIPELINE OFFLINE
                </div>

                <div className="mt-2 font-comic-serif text-3xl text-white">
                  Initialise defence?
                </div>

                <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-white/40">
                  Bugs are already entering
                  the pipeline. Destroy them
                  before they reach production.
                </p>

                <button
                  type="button"
                  onClick={startGame}
                  className="
                    mt-6
                    border
                    border-white/25
                    bg-white/[0.02]
                    px-5
                    py-2
                    text-sm
                    text-white/65
                    transition
                    hover:-translate-y-0.5
                    hover:border-white/60
                    hover:bg-white/[0.05]
                    hover:text-white
                  "
                >
                  &gt; start pipeline
                </button>
              </div>
            </div>
          )}


        {/* ========================================
            FAILURE SCREEN
        ======================================== */}

        {isGameOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#17070b]/95 px-5">
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_14px,rgba(248,113,113,0.15)_14px,rgba(248,113,113,0.15)_15px)]" />
            </div>

            <div className="relative w-full max-w-lg border-2 border-red-300/70 bg-[#12060a]/95 px-6 py-8 text-center shadow-[10px_10px_0_rgba(248,113,113,0.12)]">
              <div className="text-[10px] tracking-[0.3em] text-red-300/60">
                STATUS CODE 500
              </div>

              <div className="mt-3 font-comic-serif text-4xl text-red-200 md:text-5xl">
                BUILD FAILED
              </div>

              <div className="mx-auto mt-4 h-px max-w-xs bg-red-300/25" />

              <div className="mt-4 text-sm text-red-100/65">
                Pipeline integrity reached zero.
              </div>

              <div className="mt-1 text-xs text-white/35">
                bugs escaped into production
              </div>

              <div className="mt-6 inline-flex border border-red-200/20 px-4 py-2 text-xs text-red-100/70">
                final score&nbsp;
                <span className="text-red-100">
                  {stats.score}
                </span>
              </div>

              <div className="mt-6 text-[10px] tracking-[0.16em] text-red-300/40">
                DEPLOYMENT ABORTED
              </div>

              <button
                type="button"
                onClick={startGame}
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
                &gt; retry pipeline
              </button>
            </div>
          </div>
        )}


        {/* ========================================
            SUCCESS SCREEN
        ======================================== */}

        {isComplete && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#03140f]/95 px-5">
            <div className="absolute inset-0 opacity-25">
              <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(110,231,183,0.16),transparent_55%)]" />
            </div>

            <div className="relative w-full max-w-lg border-2 border-emerald-200/70 bg-[#03110d]/95 px-6 py-8 text-center shadow-[10px_10px_0_rgba(110,231,183,0.12)]">
              <div className="text-[10px] tracking-[0.3em] text-emerald-200/55">
                STATUS CODE 200
              </div>

              <div className="mt-3 font-comic-serif text-4xl text-emerald-100 md:text-5xl">
                PRODUCTION SURVIVED
              </div>

              <div className="mx-auto mt-4 h-px max-w-xs bg-emerald-200/25" />

              <div className="mt-4 text-sm text-emerald-50/70">
                The end user ran out of ways to break it.
              </div>

              <div className="mt-1 text-xs text-white/35">
                pipeline cleared · PROD incident resolved
              </div>

              <div className="mt-6 inline-flex border border-emerald-100/20 px-4 py-2 text-xs text-emerald-50/70">
                final score&nbsp;
                <span className="text-emerald-50">
                  {stats.score}
                </span>
              </div>

              <div className="mt-6 animate-pulse text-[10px] tracking-[0.16em] text-emerald-200/55">
                ● PROD STABLE (FOR NOW)
              </div>

              <button
                type="button"
                onClick={startGame}
                className="
                  mt-5
                  border
                  border-emerald-100/35
                  px-5
                  py-2
                  text-xs
                  text-emerald-50/70
                  transition
                  hover:-translate-y-0.5
                  hover:border-emerald-50/70
                  hover:bg-emerald-100/[0.05]
                  hover:text-white
                "
              >
                &gt; ship another build
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ========================================
          CONTROLS / ENEMY KEY
      ======================================== */}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-white/25">
        <span>
          A / D · MOVE
        </span>

        <span>
          ← / → · MOVE
        </span>

        <span>
          SPACE · FIRE
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 text-[10px]">
        <span className="text-red-300/55">
          ◆ SYNTAX
        </span>

        <span className="text-yellow-300/55">
          ∿ FLAKY
        </span>

        <span className="text-purple-300/55">
          ▣ BUILD
        </span>

        <span className="text-orange-300/55">
          ↶ REGRESSION
        </span>

        <span className="text-sky-300/55">
          ◉ END USER
        </span>
      </div>
    </div>
  )
}

export default BugSquasher
