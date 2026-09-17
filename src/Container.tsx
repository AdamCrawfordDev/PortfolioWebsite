import {
  useEffect,
  useRef,
  useState,
} from "react"

import List from "./List"

import BugSquasher from "./features/bug-squasher/BugSquasher"
import PacketPolice from "./features/packet-police/PacketPolice"
import MemoryLeak from "./features/memory-leak/MemoryLeak"

import type {
  MiniGameId,
} from "./types/minigames"


// ========================================
// TYPES
// ========================================

type ActiveApp =
  | "portfolio"
  | MiniGameId


type AppPhase =
  | "visible"
  | "out-forward"
  | "ready-forward"
  | "out-back"
  | "ready-back"


// ========================================
// CONFIG
// ========================================

const APP_OUT_DURATION = 220


// ========================================
// GAME INFO
// ========================================

const GAME_INFO: Record<
  MiniGameId,
  {
    footer: string
  }
> = {
  "ci-cd-defense": {
    footer:
      "don't ship bugs :)",
  },

  "packet-police": {
    footer:
      "inspect before you accept :)",
  },

  "memory-leak": {
    footer:
      "where did that memory go?",
  },
}


// ========================================
// COMPONENT
// ========================================

function Container() {
  const [
    activeApp,
    setActiveApp,
  ] =
    useState<ActiveApp>(
      "portfolio"
    )


  const [
    lastMiniGame,
    setLastMiniGame,
  ] =
    useState<MiniGameId | null>(
      null
    )


  const [
    appPhase,
    setAppPhase,
  ] =
    useState<AppPhase>(
      "visible"
    )


  const transitionTimeoutRef =
    useRef<number | null>(
      null
    )


  const transitionFrameRef =
    useRef<number | null>(
      null
    )


  // ========================================
  // CURRENT MODE
  // ========================================

  const gameOpen =
    activeApp !==
    "portfolio"


  const activeGameInfo =
    gameOpen
      ? GAME_INFO[
          activeApp
        ]
      : null


  // ========================================
  // FRAME SIZE STATE
  // ========================================

  /*
   * The frame size deliberately does not
   * depend only on gameOpen.
   *
   * When opening a game we start expanding
   * during the outgoing portfolio fade.
   *
   * When closing a game we start collapsing
   * during the outgoing game fade.
   *
   * This makes the frame resize and content
   * transition happen as one movement.
   */

  const expandingForward =
    appPhase ===
      "out-forward" ||
    appPhase ===
      "ready-forward"


  const collapsingBack =
    appPhase ===
      "out-back" ||
    appPhase ===
      "ready-back"


  const expanded =
    expandingForward ||
    (
      gameOpen &&
      !collapsingBack
    )


  // ========================================
  // TRANSITION HELPERS
  // ========================================

  function clearTransitionTimers() {
    if (
      transitionTimeoutRef.current !==
      null
    ) {
      window.clearTimeout(
        transitionTimeoutRef.current
      )

      transitionTimeoutRef.current =
        null
    }


    if (
      transitionFrameRef.current !==
      null
    ) {
      cancelAnimationFrame(
        transitionFrameRef.current
      )

      transitionFrameRef.current =
        null
    }
  }


  function runNextFrame(
    callback: () => void
  ) {
    transitionFrameRef.current =
      requestAnimationFrame(
        () => {
          transitionFrameRef.current =
            requestAnimationFrame(
              callback
            )
        }
      )
  }


  // ========================================
  // OPEN MINIGAME
  // ========================================

  function launchMiniGame(
    game: MiniGameId
  ) {
    if (
      appPhase !==
      "visible"
    ) {
      return
    }


    clearTransitionTimers()


    /*
     * Remember the game so that when List
     * mounts again after closing, it can
     * return directly to Minigames with the
     * previous game still selected.
     */

    setLastMiniGame(
      game
    )


    /*
     * Fade the portfolio out while the
     * outer frame expands.
     */

    setAppPhase(
      "out-forward"
    )


    transitionTimeoutRef.current =
      window.setTimeout(
        () => {
          /*
           * Portfolio is now invisible.
           * Swap in the selected game.
           */

          setActiveApp(
            game
          )


          /*
           * Position the game at its
           * incoming starting point.
           */

          setAppPhase(
            "ready-forward"
          )


          /*
           * Give the browser a frame to
           * paint the starting position,
           * then animate to visible.
           */

          runNextFrame(
            () => {
              setAppPhase(
                "visible"
              )
            }
          )
        },
        APP_OUT_DURATION
      )
  }


  // ========================================
  // CLOSE MINIGAME
  // ========================================

  function closeActiveApp() {
    if (
      !gameOpen ||
      appPhase !==
        "visible"
    ) {
      return
    }


    clearTransitionTimers()


    /*
     * Fade the game out while the frame
     * begins collapsing.
     */

    setAppPhase(
      "out-back"
    )


    transitionTimeoutRef.current =
      window.setTimeout(
        () => {
          /*
           * Game is now invisible.
           * Return to the portfolio.
           */

          setActiveApp(
            "portfolio"
          )


          /*
           * The restored Minigames
           * directory starts slightly
           * left of its final position.
           */

          setAppPhase(
            "ready-back"
          )


          runNextFrame(
            () => {
              setAppPhase(
                "visible"
              )
            }
          )
        },
        APP_OUT_DURATION
      )
  }


  // ========================================
  // ESCAPE FROM RUNNING APP
  // ========================================

  useEffect(() => {
    if (!gameOpen) {
      return
    }


    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key !==
        "Escape"
      ) {
        return
      }


      event.preventDefault()


      closeActiveApp()
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
  }, [
    gameOpen,
    appPhase,
  ])


  // ========================================
  // CLEANUP
  // ========================================

  useEffect(() => {
    return () => {
      clearTransitionTimers()
    }
  }, [])


  // ========================================
  // CONTENT TRANSITION CLASS
  // ========================================

  function getAppTransitionClassName() {
    if (
      appPhase ===
      "out-forward"
    ) {
      return "app-view-out-forward"
    }


    if (
      appPhase ===
      "ready-forward"
    ) {
      return "app-view-ready-forward"
    }


    if (
      appPhase ===
      "out-back"
    ) {
      return "app-view-out-back"
    }


    if (
      appPhase ===
      "ready-back"
    ) {
      return "app-view-ready-back"
    }


    return "app-view-visible"
  }


  // ========================================
  // RENDER ACTIVE GAME
  // ========================================

  function renderActiveGame() {
    if (
      activeApp ===
      "ci-cd-defense"
    ) {
      return (
        <BugSquasher />
      )
    }


    if (
      activeApp ===
      "packet-police"
    ) {
      return (
        <PacketPolice />
      )
    }


    if (
      activeApp ===
      "memory-leak"
    ) {
      return (
        <MemoryLeak />
      )
    }


    return null
  }


  // ========================================
  // RENDER
  // ========================================

  return (
    <main
      className="
        min-h-screen
        bg-navy-dark
        px-4
        pb-6
        pt-3

        md:px-8
        md:pb-8
        md:pt-5
      "
    >
      <section
        className={`
          mx-auto
          transition-[max-width]
          duration-[440ms]
          ease-[cubic-bezier(0.22,1,0.36,1)]

          ${
            expanded
              ? "max-w-6xl"
              : "max-w-4xl"
          }
        `}
      >
        <fieldset
          className="
            w-full
            rounded-[8px_18px_10px_22px]
            border-2
            border-white/75
            px-5
            pb-5
            shadow-[8px_8px_0_rgba(255,255,255,0.06)]

            md:px-8
            md:pb-7
          "
        >
          <legend
            className="
              ml-2
              px-2

              md:ml-4
            "
          >
            <div className="relative px-2">

              {/* ======================================== */}
              {/* SOFT LEFT BORDER ENDING */}
              {/* ======================================== */}

              <span
                className="
                  absolute
                  -left-2
                  top-1/2
                  h-3
                  w-3
                  -translate-y-1/2
                  rotate-[-45deg]
                  rounded-full
                  border-2
                  border-white/75
                  border-b-transparent
                  border-r-transparent
                "
              />


              {/* ======================================== */}
              {/* NAME */}
              {/* ======================================== */}

              <h1
                className="
                  font-comic-serif
                  text-3xl
                  leading-none
                  text-white

                  md:text-5xl
                "
              >
                Adam Crawford
              </h1>


              {/* ======================================== */}
              {/* SOFT RIGHT BORDER ENDING */}
              {/* ======================================== */}

              <span
                className="
                  absolute
                  -right-2
                  top-1/2
                  h-3
                  w-3
                  -translate-y-1/2
                  rotate-[45deg]
                  rounded-full
                  border-2
                  border-white/75
                  border-b-transparent
                  border-l-transparent
                "
              />

            </div>
          </legend>


          <div
            className={`
              relative
              flex
              flex-col
              overflow-hidden
              pt-5

              md:pt-6

              ${
                gameOpen
                  ? ""
                  : "min-h-[365px] md:min-h-[380px]"
              }
            `}
          >

            {/* ======================================== */}
            {/* WINDOW CONTROLS */}
            {/* ======================================== */}

            <div
              className="
                absolute
                right-0
                top-0
                z-10
                font-comic
                text-xs
                text-white/25
              "
            >
              [ _ ] [ □ ] [ × ]
            </div>


            {/* ======================================== */}
            {/* TRANSITIONING APP CONTENT */}
            {/* ======================================== */}

            <div
              className={`
                app-view-transition
                ${getAppTransitionClassName()}
              `}
            >

              {/* ======================================== */}
              {/* PORTFOLIO MODE */}
              {/* ======================================== */}

              {!gameOpen && (
                <>
                  <div className="mb-5 md:mb-7">

                    


                    <p
                      className="
                        mt-1
                        font-comic
                        text-sm
                        text-white/60

                        md:text-base
                      "
                    >
                      Select a directory to continue.
                    </p>

                  </div>


                  <div className="flex-1">

                    <List
                      onLaunchMiniGame={
                        launchMiniGame
                      }
                      returnToMiniGame={
                        lastMiniGame
                      }
                    />

                  </div>
                </>
              )}


              {/* ======================================== */}
              {/* MINIGAME MODE */}
              {/* ======================================== */}

              {gameOpen &&
                activeGameInfo && (
                  <div className="min-w-0">

                    {/* ======================================== */}
                    {/* APP TITLE BAR */}
                    {/* ======================================== */}

                    <div
                      className="
                        mb-3
                        flex
                        items-center
                        border-b
                        border-dashed
                        border-white/15
                        pb-3
                        font-comic
                      "
                    >

                      <button
                        type="button"
                        onClick={
                          closeActiveApp
                        }
                        className="
                          group
                          flex
                          items-center
                          gap-2
                          text-xs
                          text-white/35
                          transition-colors
                          hover:text-white/75
                        "
                      >

                        <span
                          className="
                            transition-transform
                            duration-150
                            group-hover:-translate-x-1
                          "
                        >
                          &lt;
                        </span>


                        <span>
                          back to minigames
                        </span>


                        <span
                          className="
                            ml-1
                            border
                            border-white/15
                            px-1.5
                            py-0.5
                            text-[9px]
                            text-white/25
                          "
                        >
                          ESC
                        </span>

                      </button>

                    </div>


                    {/* ======================================== */}
                    {/* GAME */}
                    {/* ======================================== */}

                    {renderActiveGame()}

                  </div>
                )}

            </div>

          </div>
        </fieldset>


        {/* ======================================== */}
        {/* FOOTER */}
        {/* ======================================== */}

        <p
          className="
            mt-2
            rotate-[-1deg]
            text-right
            font-comic
            text-xs
            text-white/20
            transition-opacity
            duration-200
          "
        >
          {gameOpen &&
          activeGameInfo
            ? activeGameInfo.footer
            : "keyboard recommended :)"}
        </p>

      </section>
    </main>
  )
}


export default Container