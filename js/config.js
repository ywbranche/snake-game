// config.js — every tunable number for the game, in one place.
//
// Why a separate file? If these values were typed directly into the code
// wherever they're used ("magic numbers"), changing one would mean hunting
// through many files, and a reader would have to guess what a bare `150` means.
// Here each value has a name and an explanation, and changing it in this one
// file changes it everywhere.
//
// This file contains no logic — only values. Other modules `import` what they need.
// Source: planning/design.md §6 (approved decisions A1, A2, A7, A8).

// ── Board (FR-17, decision A1) ──────────────────────────────────────────────
// The board is always the same number of cells for every player; only the
// size of each cell on screen changes to fit the window.
export const GRID_COLUMNS = 20;
export const GRID_ROWS = 20;

// ── Starting snake ──────────────────────────────────────────────────────────
export const START_LENGTH = 3;
// Where the head starts. x counts columns from the left, y counts rows from
// the top, both starting at 0. (10, 10) is roughly the center of a 20×20 board.
export const START_POSITION = Object.freeze({ x: 10, y: 10 });
export const START_DIRECTION = "right";

// ── Speed (FR-7, decision A2) ───────────────────────────────────────────────
// Speed is expressed as the time between moves, in milliseconds (ms).
// Smaller number = less waiting = faster snake.
//
//   time per move at a given level = max(MIN_STEP_MS, BASE_STEP_MS × SPEED_FACTOR^(level − 1))
//
// Level 1: 150 ms. Each level waits 94% as long as the one before
// (≈6.4% faster). Level 16 reaches the 60 ms floor, which is exactly
// 2.5× the starting speed (150 ÷ 60 = 2.5).
export const BASE_STEP_MS = 150;
export const SPEED_FACTOR = 0.94;
export const MIN_STEP_MS = 60;
// The first level whose formula result reaches MIN_STEP_MS. After this,
// the level stops increasing (FR-7) and so do the points per food (FR-8).
// A test will check that this number agrees with the three values above.
export const MAX_LEVEL = 16;

// ── Scoring (FR-8) ──────────────────────────────────────────────────────────
// Each food is worth POINTS_PER_LEVEL × the level at the moment it's eaten.
export const POINTS_PER_LEVEL = 10;

// ── Input (FR-4, decision A7, question Q1) ─────────────────────────────────
// At most one turn can wait for the next step; extra presses are ignored.
export const MAX_QUEUED_TURNS = 1;

// ── Game loop safety (design §5.1) ─────────────────────────────────────────
// If the browser reports a very long gap between frames (e.g. after the
// computer sleeps), treat it as at most this long, so the snake doesn't make
// many moves at once.
export const MAX_FRAME_GAP_MS = 250;

// ── Storage (FR-15) ─────────────────────────────────────────────────────────
// The name under which the personal best is saved in the browser.
export const STORAGE_KEY = "snakeGame.personalBest";

// ── Canvas colors (NFR-5, NFR-7, decision A8) ───────────────────────────────
// Used by the canvas renderer. The same palette is also defined in
// styles.css for the HTML parts of the page. Contrast ratios are against
// BACKGROUND and were calculated with the WCAG formula (design §6).
export const COLORS = Object.freeze({
  BACKGROUND: "#0A0E1A", // near-black navy
  GRID: "#1A2238", //       subtle grid lines (decorative only)
  SNAKE_BODY: "#39FF14", // neon green, 14.2:1
  SNAKE_HEAD: "#B6FF9E", // pale green, 16.3:1 (head also differs by shape)
  FOOD: "#FF2E88", //       hot pink, 5.5:1 (food is a circle, not a square)
});
