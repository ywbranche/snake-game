// game.js — the rules of Snake.
//
// This module is PURE LOGIC: it never touches the web page, the canvas,
// the keyboard, or localStorage. It only creates and updates plain data.
// That's what lets us test it with Node, without a browser (design §1, TC-8).
//
// Design reference: planning/design.md §3.1 (game state), §5.2 (one step).

import {
  GRID_COLUMNS,
  GRID_ROWS,
  START_POSITION,
  START_LENGTH,
  START_DIRECTION,
} from "./config.js";

// How each direction moves the head, as a change in x (columns) and y (rows).
// Remember: y counts DOWN from the top, so "up" means y gets smaller.
export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ dx: 0, dy: -1 }),
  down: Object.freeze({ dx: 0, dy: 1 }),
  left: Object.freeze({ dx: -1, dy: 0 }),
  right: Object.freeze({ dx: 1, dy: 0 }),
});

/**
 * Create the state for a brand-new game (design §3.1).
 *
 * The snake starts at START_POSITION, facing START_DIRECTION, with its body
 * trailing out behind the head (in the opposite direction).
 *
 * @returns {object} A new game state.
 */
export function createGame() {
  const { dx, dy } = DIRECTIONS[START_DIRECTION];

  // Build the snake head-first. Segment 0 is the head; each next segment is
  // one cell further BEHIND it, i.e. one step against the direction of travel.
  const snake = [];
  for (let i = 0; i < START_LENGTH; i++) {
    snake.push({
      x: START_POSITION.x - dx * i,
      y: START_POSITION.y - dy * i,
    });
  }

  return {
    snake,
    direction: START_DIRECTION,
    directionQueue: [], // no turn waiting yet (FR-4)
    food: null, //         food placement comes in a later step, with its own test
    score: 0,
    level: 1,
    status: "running", //  "running" | "dead" | "won"
  };
}

/**
 * Advance the game by one movement step (design §5.2).
 *
 * PURE: `game` is never changed. A brand-new state is returned instead.
 * Callers learn what happened by looking at the new state (for example,
 * `status` or `score`).
 *
 * Implemented so far: movement (FR-3) and wraparound (FR-5).
 * Still to come, each with its own tests first: turning, food, scoring,
 * collisions, victory.
 *
 * @param {object} game - The current game state.
 * @returns {object} The game state after one step.
 */
export function step(game) {
  const { dx, dy } = DIRECTIONS[game.direction];
  const head = game.snake[0];

  // Work out the new head position, wrapping around the edges (FR-5).
  const newHead = {
    x: wrap(head.x + dx, GRID_COLUMNS),
    y: wrap(head.y + dy, GRID_ROWS),
  };

  // Move: put the new head on the front, and drop the last segment (the tail).
  // `slice(0, -1)` returns a NEW array containing every segment except the
  // last one. It doesn't change `game.snake`.
  const snake = [newHead, ...game.snake.slice(0, -1)];

  // Return a new state: copy every field of `game`, then replace `snake`.
  return { ...game, snake };
}

/**
 * Wrap a coordinate so it stays on the board (FR-5).
 *
 * Examples on a 20-cell row: 20 → 0, −1 → 19, 7 → 7.
 *
 * Why "+ size" before "% size"? In JavaScript, `%` (remainder) keeps the
 * sign of the left side: −1 % 20 is −1, not 19. Adding `size` first makes the
 * number non-negative (−1 + 20 = 19), and then `% size` turns 20 back into 0.
 * This works because the value is never more than one cell off the board.
 *
 * @param {number} value - A coordinate, at most one cell outside the board.
 * @param {number} size - The number of cells in that direction.
 * @returns {number} A coordinate from 0 to size − 1.
 */
function wrap(value, size) {
  return (value + size) % size;
}
