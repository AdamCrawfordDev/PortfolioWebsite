// ========================================
// CANVAS
// ========================================

export const GAME_WIDTH =
  1100

export const GAME_HEIGHT =
  580


// ========================================
// HEAP
// ========================================

export const HEAP_LEFT =
  55

export const HEAP_TOP =
  80

export const HEAP_RIGHT =
  805

export const HEAP_BOTTOM =
  525

export const HEAP_WIDTH =
  HEAP_RIGHT - HEAP_LEFT

export const HEAP_HEIGHT =
  HEAP_BOTTOM - HEAP_TOP


// ========================================
// MEMORY
// ========================================

export const MEMORY_CAPACITY =
  1024

/*
 * The application starts with memory
 * already occupied by things outside
 * the allocations represented on screen.
 */

export const BASE_MEMORY_USAGE =
  190


// ========================================
// SPAWNING
// ========================================

export const INITIAL_SPAWN_INTERVAL =
  950

export const MIN_SPAWN_INTERVAL =
  300

export const DIFFICULTY_RAMP_SECONDS =
  90


// ========================================
// LEAKS
// ========================================

export const INITIAL_LEAK_CHANCE =
  0.12

export const MAX_LEAK_CHANCE =
  0.25


/*
 * Listener leaks periodically create
 * additional retained allocations.
 */

export const LISTENER_CHILD_INTERVAL =
  4.2


// ========================================
// GAMEPLAY
// ========================================

export const FALSE_FREE_STABILITY_DAMAGE =
  7

export const MAX_STABILITY =
  100


// ========================================
// SCORING
// ========================================

export const LEAK_SCORE =
  250

export const FALSE_FREE_SCORE_PENALTY =
  75