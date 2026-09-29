import {

  useEffect,

  useRef,

  useState,

} from "react"

import PrimaryListItem from "./PrimaryListItem"

import SectionPanel from "./SectionPanel"

import PlanItProject from "./features/projects/projects/planit/PlanItProject"

import SelfDrivingCarProject from "./features/projects/projects/car-rl/SelfDrivingCarProject"

import RestaurantManagementProject from "./features/projects/projects/restaurant-management/RestaurantManagementProject"

import SpotifyRekordboxProject from "./features/projects/projects/spotify-rekordbox/SpotifyRekordboxProject"

import {

  navigation,

  underlines,

} from "./data/navigation"

import {

  isMiniGame,

} from "./types/minigames"

import type {

  NavigationItem,

} from "./types/navigation"

import type {

  MiniGameId,

} from "./types/minigames"

// ========================================

// CONFIG

// ========================================

const PANEL_OUT_DURATION = 220

const DIRECTORY_OUT_DURATION = 180

const PROJECT_OUT_DURATION = 200

// ========================================

// TRANSITION TYPES

// ========================================

type PanelPhase =

  | "visible"

  | "out"

  | "ready"

type DirectoryPhase =

  | "visible"

  | "out-forward"

  | "ready-forward"

  | "out-back"

  | "ready-back"

type ProjectPhase =

  | "visible"

  | "out-forward"

  | "ready-forward"

  | "out-back"

  | "ready-back"

// ========================================

// PROPS

// ========================================

type ListProps = {

  onLaunchMiniGame:

    (game: MiniGameId) => void

  returnToMiniGame?:

    MiniGameId | null

}

// ========================================

// FIND MINIGAMES DIRECTORY

// ========================================

function findMinigamesDirectory() {

  return (

    navigation.find(

      (item) =>

        item.id ===

        "minigames"

    ) ?? null

  )

}

// ========================================

// INITIAL NAVIGATION STATE

// ========================================

function getInitialNavigationStack(

  returnToMiniGame:

    MiniGameId | null | undefined

): NavigationItem[] {

  if (!returnToMiniGame) {

    return []

  }

  const minigamesDirectory =

    findMinigamesDirectory()

  if (!minigamesDirectory) {

    return []

  }

  return [

    minigamesDirectory,

  ]

}

function getInitialSelectedIndex(

  returnToMiniGame:

    MiniGameId | null | undefined

) {

  if (!returnToMiniGame) {

    return 0

  }

  const minigamesDirectory =

    findMinigamesDirectory()

  const children =

    minigamesDirectory

      ?.children ??

    []

  const index =

    children.findIndex(

      (item) =>

        item.id ===

        returnToMiniGame

    )

  return index >= 0

    ? index

    : 0

}

// ========================================

// PROJECTS

// ========================================

type ProjectId =

  | "planit"

  | "car-rl"

  | "restaurant"

  | "rekordbox"

function isProjectId(

  id: string

): id is ProjectId {

  return (

    id === "planit" ||

    id === "car-rl" ||

    id === "restaurant" ||

    id === "rekordbox"

  )

}

// ========================================

// COMPONENT

// ========================================

function List({

  onLaunchMiniGame,

  returnToMiniGame = null,

}: ListProps) {

  const initialSelectedIndex =

    getInitialSelectedIndex(

      returnToMiniGame

    )

  // ========================================

  // NAVIGATION STATE

  // ========================================

  const [

    navigationStack,

    setNavigationStack,

  ] =

    useState<NavigationItem[]>(

      () =>

        getInitialNavigationStack(

          returnToMiniGame

        )

    )

  const [

    selectedIndex,

    setSelectedIndex,

  ] =

    useState(

      initialSelectedIndex

    )

  const [

    displayedIndex,

    setDisplayedIndex,

  ] =

    useState(

      initialSelectedIndex

    )

  // ========================================

  // PROJECT STATE

  // ========================================

  const [

    activeProject,

    setActiveProject,

  ] =

    useState<ProjectId | null>(

      null

    )

  const [

    projectPhase,

    setProjectPhase,

  ] =

    useState<ProjectPhase>(

      "visible"

    )

  // ========================================

  // PANEL STATE

  // ========================================

  const [

    panelPhase,

    setPanelPhase,

  ] =

    useState<PanelPhase>(

      "visible"

    )

  // ========================================

  // DIRECTORY STATE

  // ========================================

  const [

    directoryPhase,

    setDirectoryPhase,

  ] =

    useState<DirectoryPhase>(

      "visible"

    )

  // ========================================

  // ANIMATION REFS

  // ========================================

  const timeoutRef =

    useRef<number | null>(

      null

    )

  const frameRef =

    useRef<number | null>(

      null

    )

  // ========================================

  // CURRENT DIRECTORY

  // ========================================

  const currentDirectory =

    navigationStack.length === 0

      ? null

      : navigationStack[

          navigationStack.length - 1

        ]

  const currentItems =

    currentDirectory?.children ??

    navigation

  const selectedItem =

    currentItems[

      selectedIndex

    ]

  const displayedItem =

    currentItems[

      displayedIndex

    ]

  // ========================================

  // ANIMATION HELPERS

  // ========================================

  function clearAnimationTimers() {

    if (

      timeoutRef.current !==

      null

    ) {

      window.clearTimeout(

        timeoutRef.current

      )

      timeoutRef.current =

        null

    }

    if (

      frameRef.current !==

      null

    ) {

      cancelAnimationFrame(

        frameRef.current

      )

      frameRef.current =

        null

    }

  }

  function runNextFrame(

    callback: () => void

  ) {

    frameRef.current =

      requestAnimationFrame(

        () => {

          frameRef.current =

            requestAnimationFrame(

              callback

            )

        }

      )

  }

  function startPanelEntrance(

    index: number

  ) {

    setDisplayedIndex(

      index

    )

    setPanelPhase(

      "ready"

    )

    runNextFrame(() => {

      setPanelPhase(

        "visible"

      )

    })

  }

  // ========================================

  // SELECTION

  // ========================================

  function changeSelection(

    index: number

  ) {

    if (

      index ===

      selectedIndex

    ) {

      return

    }

    clearAnimationTimers()

    setSelectedIndex(

      index

    )

    setPanelPhase(

      "out"

    )

    timeoutRef.current =

      window.setTimeout(

        () => {

          startPanelEntrance(

            index

          )

        },

        PANEL_OUT_DURATION

      )

  }

  // ========================================

  // OPEN PROJECT

  // ========================================

  function openProject(

    project: ProjectId

  ) {

    if (

      projectPhase !==

      "visible"

    ) {

      return

    }

    clearAnimationTimers()

    /*

     * The project directory leaves to

     * the left first.

     */

    setProjectPhase(

      "out-forward"

    )

    timeoutRef.current =

      window.setTimeout(

        () => {

          /*

           * The directory is now invisible,

           * so swap in the README.

           */

          setActiveProject(

            project

          )

          /*

           * Start the README just outside

           * the right-hand side.

           */

          setProjectPhase(

            "ready-forward"

          )

          /*

           * Give React/browser time to paint

           * that starting position before

           * animating it into view.

           */

          runNextFrame(() => {

            setProjectPhase(

              "visible"

            )

          })

        },

        PROJECT_OUT_DURATION

      )

  }

  // ========================================

  // CLOSE PROJECT

  // ========================================

  function closeProject() {

    if (

      !activeProject ||

      projectPhase !==

        "visible"

    ) {

      return

    }

    clearAnimationTimers()

    /*

     * README leaves to the right.

     */

    setProjectPhase(

      "out-back"

    )

    timeoutRef.current =

      window.setTimeout(

        () => {

          /*

           * Once invisible, restore the

           * Projects directory.

           *

           * selectedIndex is deliberately

           * NOT changed, so the project the

           * user just viewed stays selected.

           */

          setActiveProject(

            null

          )

          /*

           * Restored directory starts just

           * outside the left-hand side.

           */

          setProjectPhase(

            "ready-back"

          )

          runNextFrame(() => {

            setProjectPhase(

              "visible"

            )

          })

        },

        PROJECT_OUT_DURATION

      )

  }

  // ========================================

  // OPEN SELECTED ITEM

  // ========================================

  function openSelectedItem() {

    if (!selectedItem) {

      return

    }

    // ========================================

    // PROJECT README

    // ========================================

    if (

      currentDirectory?.id ===

        "projects" &&

      isProjectId(

        selectedItem.id

      )

    ) {

      openProject(

        selectedItem.id

      )

      return

    }

    // ========================================

    // MINIGAME EXECUTABLE

    // ========================================

    if (

      isMiniGame(

        selectedItem.id

      )

    ) {

      onLaunchMiniGame(

        selectedItem.id

      )

      return

    }

    // ========================================

    // NORMAL DIRECTORY

    // ========================================

    if (

      !selectedItem.children

        ?.length

    ) {

      return

    }

    clearAnimationTimers()

    setDirectoryPhase(

      "out-forward"

    )

    timeoutRef.current =

      window.setTimeout(

        () => {

          setNavigationStack(

            (current) => [

              ...current,

              selectedItem,

            ]

          )

          setSelectedIndex(

            0

          )

          setDisplayedIndex(

            0

          )

          setPanelPhase(

            "visible"

          )

          setDirectoryPhase(

            "ready-forward"

          )

          runNextFrame(

            () => {

              setDirectoryPhase(

                "visible"

              )

            }

          )

        },

        DIRECTORY_OUT_DURATION

      )

  }

  // ========================================

  // GO BACK

  // ========================================

  function goBack() {

    if (

      navigationStack.length ===

      0

    ) {

      return

    }

    clearAnimationTimers()

    setDirectoryPhase(

      "out-back"

    )

    timeoutRef.current =

      window.setTimeout(

        () => {

          const directoryBeingClosed =

            navigationStack[

              navigationStack.length -

                1

            ]

          const parentStack =

            navigationStack.slice(

              0,

              -1

            )

          const parentDirectory =

            parentStack.length === 0

              ? null

              : parentStack[

                  parentStack.length -

                    1

                ]

          const parentItems =

            parentDirectory

              ?.children ??

            navigation

          const previousIndex =

            parentItems.findIndex(

              (item) =>

                item.id ===

                directoryBeingClosed.id

            )

          const restoredIndex =

            previousIndex >= 0

              ? previousIndex

              : 0

          setNavigationStack(

            parentStack

          )

          setSelectedIndex(

            restoredIndex

          )

          setDisplayedIndex(

            restoredIndex

          )

          setPanelPhase(

            "visible"

          )

          setDirectoryPhase(

            "ready-back"

          )

          runNextFrame(

            () => {

              setDirectoryPhase(

                "visible"

              )

            }

          )

        },

        DIRECTORY_OUT_DURATION

      )

  }

  // ========================================

  // CLICK

  // ========================================

  function handleItemClick(

    index: number

  ) {

    if (

      index ===

      selectedIndex

    ) {

      const item =

        currentItems[

          index

        ]

      if (!item) {

        return

      }

      // ========================================

      // PROJECT

      // ========================================

      if (

        currentDirectory?.id ===

          "projects" &&

        isProjectId(

          item.id

        )

      ) {

        openProject(

          item.id

        )

        return

      }

      // ========================================

      // MINIGAME

      // ========================================

      if (

        isMiniGame(

          item.id

        )

      ) {

        onLaunchMiniGame(

          item.id

        )

        return

      }

      // ========================================

      // DIRECTORY

      // ========================================

      if (

        item.children

          ?.length

      ) {

        openSelectedItem()

      }

      return

    }

    changeSelection(

      index

    )

  }

  // ========================================

  // KEYBOARD NAVIGATION

  // ========================================

  useEffect(() => {

    function handleKeyDown(

      event: KeyboardEvent

    ) {

      // ========================================

      // PROJECT README

      // ========================================

      if (activeProject) {

        if (

          event.key ===

          "Escape"

        ) {

          event.preventDefault()

          closeProject()

        }

        return

      }

      // ========================================

      // MOVE DOWN

      // ========================================

      if (

        event.key ===

        "ArrowDown"

      ) {

        event.preventDefault()

        const nextIndex =

          selectedIndex ===

          currentItems.length -

            1

            ? 0

            : selectedIndex +

              1

        changeSelection(

          nextIndex

        )

        return

      }

      // ========================================

      // MOVE UP

      // ========================================

      if (

        event.key ===

        "ArrowUp"

      ) {

        event.preventDefault()

        const nextIndex =

          selectedIndex === 0

            ? currentItems.length -

              1

            : selectedIndex -

              1

        changeSelection(

          nextIndex

        )

        return

      }

      // ========================================

      // OPEN

      // ========================================

      if (

        event.key ===

        "Enter"

      ) {

        event.preventDefault()

        openSelectedItem()

        return

      }

      // ========================================

      // BACK

      // ========================================

      if (

        event.key ===

        "Escape"

      ) {

        event.preventDefault()

        goBack()

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

  })

  // ========================================

  // CLEANUP

  // ========================================

  useEffect(() => {

    return clearAnimationTimers

  }, [])

  // ========================================

  // PANEL ANIMATION CLASS

  // ========================================

  function getPanelClassName() {

    if (

      panelPhase ===

      "out"

    ) {

      return "panel-slide-out"

    }

    if (

      panelPhase ===

      "ready"

    ) {

      return "panel-slide-ready"

    }

    return "panel-slide-in"

  }

  // ========================================

  // DIRECTORY ANIMATION CLASS

  // ========================================

  function getDirectoryClassName() {

    if (

      directoryPhase ===

      "out-forward"

    ) {

      return "directory-out-forward"

    }

    if (

      directoryPhase ===

      "ready-forward"

    ) {

      return "directory-ready-forward"

    }

    if (

      directoryPhase ===

      "out-back"

    ) {

      return "directory-out-back"

    }

    if (

      directoryPhase ===

      "ready-back"

    ) {

      return "directory-ready-back"

    }

    return "directory-visible"

  }

  // ========================================

  // PROJECT ANIMATION CLASS

  // ========================================

  function getProjectClassName() {

    if (

      projectPhase ===

      "out-forward"

    ) {

      return "project-view-out-forward"

    }

    if (

      projectPhase ===

      "ready-forward"

    ) {

      return "project-view-ready-forward"

    }

    if (

      projectPhase ===

      "out-back"

    ) {

      return "project-view-out-back"

    }

    if (

      projectPhase ===

      "ready-back"

    ) {

      return "project-view-ready-back"

    }

    return "project-view-visible"

  }

  // ========================================

  // DIRECTORY PATH

  // ========================================

  const directoryPath =

    currentDirectory?.path ??

    "/"

  // ========================================

  // ACTIVE PROJECT

  // ========================================

  function renderActiveProject() {

    if (

      activeProject ===

      "planit"

    ) {

      return (

        <PlanItProject

          onBack={

            closeProject

          }

        />

      )

    }

    if (

      activeProject ===

      "car-rl"

    ) {

      return (

        <SelfDrivingCarProject

          onBack={

            closeProject

          }

        />

      )

    }

    if (

      activeProject ===

      "restaurant"

    ) {

      return (

        <RestaurantManagementProject

          onBack={

            closeProject

          }

        />

      )

    }

    if (

      activeProject ===

      "rekordbox"

    ) {

      return (

        <SpotifyRekordboxProject

          onBack={

            closeProject

          }

        />

      )

    }

    return null

  }

  // ========================================

  // DIRECTORY VIEW

  // ========================================

  function renderDirectoryView() {

    return (

      <div

        className={

          getDirectoryClassName()

        }

      >

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

        {/* ======================================== */}

        {/* TERMINAL PROMPT */}

        {/* ======================================== */}

        <div className="mb-5 flex items-center gap-2 font-comic text-xs text-white/35 sm:text-sm">

          <span className="text-white/60">

            $

          </span>

          <span>

            {currentDirectory

              ? `cd ${directoryPath}`

              : "~"}

          </span>

          <span className="animate-pulse text-white">

            _

          </span>

        </div>

        {/* ======================================== */}

        {/* DIRECTORY + PANEL */}

        {/* ======================================== */}

        <div

          className="

            grid

            grid-cols-[210px_minmax(0,1fr)]

            gap-7

            max-[520px]:grid-cols-1

            max-[520px]:gap-5

          "

        >

          {/* ======================================== */}

          {/* DIRECTORY LIST */}

          {/* ======================================== */}

          <div className="min-w-0">

            <nav className="flex flex-col items-start">

              {currentItems.map(

                (

                  item,

                  index

                ) => (

                  <div

                    key={

                      item.id

                    }

                    className="w-full"

                  >

                    <PrimaryListItem

                      name={

                        item.name

                      }

                      underline={

                        underlines[

                          index %

                            underlines.length

                        ]

                      }

                      selected={

                        index ===

                        selectedIndex

                      }

                      directory={

                        Boolean(

                          item.children

                            ?.length

                        ) ||

                        (

                          currentDirectory

                            ?.id ===

                            "projects" &&

                          isProjectId(

                            item.id

                          )

                        )

                      }

                      onClick={() =>

                        handleItemClick(

                          index

                        )

                      }

                    />

                  </div>

                )

              )}

            </nav>

            {/* ======================================== */}

            {/* KEYBOARD LEGEND */}

            {/* ======================================== */}

            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 font-comic text-[11px] text-white/35">

              <div className="flex items-center gap-2">

                <span className="border border-white/20 px-1.5 py-0.5 text-white/60">

                  ↑

                </span>

                <span className="border border-white/20 px-1.5 py-0.5 text-white/60">

                  ↓

                </span>

                <span>

                  MOVE

                </span>

              </div>

              <div className="flex items-center gap-2">

                <span className="border border-white/20 px-2 py-0.5 text-white/60">

                  ENTER

                </span>

                <span>

                  {selectedItem &&

                  isMiniGame(

                    selectedItem.id

                  )

                    ? "RUN"

                    : "OPEN"}

                </span>

              </div>

              {navigationStack.length >

                0 && (

                <div className="flex items-center gap-2">

                  <span className="border border-white/20 px-2 py-0.5 text-white/60">

                    ESC

                  </span>

                  <span>

                    BACK

                  </span>

                </div>

              )}

            </div>

          </div>

          {/* ======================================== */}

          {/* CONTENT PANEL */}

          {/* ======================================== */}

          <div className="relative min-w-0 overflow-hidden">

            {displayedItem && (

              <div

                key={`${directoryPath}-${displayedItem.id}`}

                className={

                  getPanelClassName()

                }

              >

                <SectionPanel

                  item={

                    displayedItem

                  }

                  onLaunchMiniGame={

                    onLaunchMiniGame

                  }

                />

              </div>

            )}

          </div>

        </div>

        {/* ======================================== */}

        {/* PATH */}

        {/* ======================================== */}

        <div className="mt-7 border-t border-dashed border-white/15 pt-3 font-comic text-[11px] text-white/25 sm:text-xs">

          PATH: {directoryPath}

        </div>

      </div>

    )

  }

  // ========================================

  // RENDER

  // ========================================

  return (

    <div className="w-full overflow-hidden">

      <div

        className={`

          project-view

          ${getProjectClassName()}

        `}

      >

        {activeProject

          ? renderActiveProject()

          : renderDirectoryView()}

      </div>

    </div>

  )

}

export default List