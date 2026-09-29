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

// TIME FORMATTER

// ========================================

function formatPortfolioTime(

  totalSeconds: number

) {

  const hours =

    Math.floor(

      totalSeconds / 3600

    )

  const minutes =

    Math.floor(

      (totalSeconds % 3600) /

        60

    )

  const seconds =

    totalSeconds % 60

  const parts: string[] = []

  if (hours > 0) {

    parts.push(

      `${hours} ${

        hours === 1

          ? "hour"

          : "hours"

      }`

    )

  }

  if (

    minutes > 0 ||

    hours > 0

  ) {

    parts.push(

      `${minutes} ${

        minutes === 1

          ? "minute"

          : "minutes"

      }`

    )

  }

  parts.push(

    `${seconds} ${

      seconds === 1

        ? "second"

        : "seconds"

    }`

  )

  return parts.join(" ")

}

// ========================================

// COMPONENT

// ========================================

function Container() {

  // ========================================

  // APP STATE

  // ========================================

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

  // ========================================

  // HIRE ME EASTER EGG

  // ========================================

  const [

    showHireMe,

    setShowHireMe,

  ] =

    useState(false)

  const [

    hireMeTime,

    setHireMeTime,

  ] =

    useState(0)

  /*

   * Store the time the portfolio was

   * first mounted.

   *

   * Date.now() is used instead of

   * incrementing state every second,

   * so the rest of the portfolio does

   * not rerender constantly.

   */

  const portfolioStartTime =

    useRef(

      Date.now()

    )

  // ========================================

  // TRANSITION REFS

  // ========================================

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

    showHireMe ||

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

    setLastMiniGame(

      game

    )

    setAppPhase(

      "out-forward"

    )

    transitionTimeoutRef.current =

      window.setTimeout(

        () => {

          setActiveApp(

            game

          )

          setAppPhase(

            "ready-forward"

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

    setAppPhase(

      "out-back"

    )

    transitionTimeoutRef.current =

      window.setTimeout(

        () => {

          setActiveApp(

            "portfolio"

          )

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

  // OPEN HIRE ME SCREEN

  // ========================================

  function openHireMe() {

    const elapsedMilliseconds =

      Date.now() -

      portfolioStartTime.current

    const elapsedSeconds =

      Math.max(

        1,

        Math.floor(

          elapsedMilliseconds /

            1000

        )

      )

    setHireMeTime(

      elapsedSeconds

    )

    setShowHireMe(

      true

    )

  }

  // ========================================

  // CLOSE HIRE ME SCREEN

  // ========================================

  function closeHireMe() {

    setShowHireMe(

      false

    )

  }

  // ========================================

  // LIVE HIRE ME TIMER

  // ========================================

  useEffect(() => {

    if (!showHireMe) {

      return

    }

    function updateHireMeTime() {

      const elapsedMilliseconds =

        Date.now() -

        portfolioStartTime.current

      const elapsedSeconds =

        Math.max(

          1,

          Math.floor(

            elapsedMilliseconds /

              1000

          )

        )

      setHireMeTime(

        elapsedSeconds

      )

    }

    updateHireMeTime()

    const intervalId =

      window.setInterval(

        updateHireMeTime,

        1000

      )

    return () => {

      window.clearInterval(

        intervalId

      )

    }

  }, [showHireMe])

  // ========================================

  // ESCAPE

  // ========================================

  useEffect(() => {

    function handleKeyDown(

      event: KeyboardEvent

    ) {

      /*

       * Hire Me screen gets first

       * priority when open.

       */

      if (showHireMe) {

        if (

          event.key ===

          "Escape"

        ) {

          event.preventDefault()

          closeHireMe()

        }

        return

      }

      /*

       * Otherwise Escape closes a

       * running minigame.

       */

      if (

        !gameOpen ||

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

    showHireMe,

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

                gameOpen ||

                showHireMe

                  ? ""

                  : "min-h-[365px] md:min-h-[380px]"

              }

            `}

          >

            {/* ======================================== */}

            {/* WINDOW CONTROLS */}

            {/* ======================================== */}

            {!showHireMe && (

              <div

                className="

                  absolute

                  right-0

                  top-0

                  z-10

                  flex

                  items-center

                  gap-2

                  font-comic

                  text-xs

                  text-white/25

                "

              >

                <button

                  type="button"

                  onClick={

                    openHireMe

                  }

                  aria-label="Minimise"

                  className="

                    transition-colors

                    hover:text-white/70

                  "

                >

                  [ _ ]

                </button>

                <button

                  type="button"

                  onClick={

                    openHireMe

                  }

                  aria-label="Maximise"

                  className="

                    transition-colors

                    hover:text-white/70

                  "

                >

                  [ □ ]

                </button>

                <button

                  type="button"

                  onClick={

                    openHireMe

                  }

                  aria-label="Close"

                  className="

                    transition-colors

                    hover:text-red-400

                  "

                >

                  [ × ]

                </button>

              </div>

            )}

            {/* ======================================== */}

            {/* HIRE ME EASTER EGG */}

            {/* ======================================== */}

            {showHireMe && (

              <div

                className="

                flex

                min-h-[450px]

                w-full

                items-center

                justify-center

                px-3

                py-12

                sm:px-6

                md:px-10

                lg:px-14

              "

              >

              <div

                className="

                  flex

                  w-full

                  max-w-3xl

                  flex-col

                  items-center

                  justify-center

                  text-center

                "

              >

                <p

                  className="

                    w-full

                    max-w-2xl

                    px-2

                    font-comic

                    text-sm

                    leading-6

                    text-white/45

                    sm:px-4

                    md:text-base

                  "

                >

                  you've spent{" "}

                  <span className="text-white/70">

                    {formatPortfolioTime(

                      hireMeTime

                    )}

                  </span>{" "}

                  on my portfolio, you may as well

                </p>

                <div

                  className="

                    my-6

                    font-comic-serif

                    text-6xl

                    leading-none

                    text-red-500

                    sm:text-7xl

                    md:text-8xl

                  "

                >

                  HIRE ME

                </div>

                <button

                  type="button"

                  onClick={

                    closeHireMe

                  }

                  className="

                    group

                    mt-3

                    flex

                    items-center

                    gap-3

                    font-comic

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

                    go back

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

            </div>

            )}

            {/* ======================================== */}

            {/* NORMAL APP CONTENT */}

            {/* ======================================== */}

            {!showHireMe && (

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

                      {/* GAME */}

                      {/* ======================================== */}

                      {renderActiveGame()}

                    </div>

                  )}

              </div>

            )}

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

          {showHireMe

            ? "worth a shot :)"

            : gameOpen &&

              activeGameInfo

              ? activeGameInfo.footer

              : "keyboard recommended :)"}

        </p>

      </section>

    </main>

  )

}

export default Container