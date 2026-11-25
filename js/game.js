// game.js — the rules of Snake.
//
// This module is PURE LOGIC: it never touches the web page, the canvas,
// the keyboard, or localStorage. It only creates and updates plain data.
// That's what lets us test it with Node, without a browser (design §1, TC-8).
//
// Design reference: planning/design.md §3.1 (game state), §5.2 (one step),
// §5.3 (food), §5.4 (direction queue), §6 (speed).

import {
  GRID_COLUMNS,
  GRID_ROWS,
  START_POSITION,
  START_LENGTH,
  START_DIRECTION,
  MAX_QUEUED_TURNS,
  BASE_STEP_MS,
  SPEED_FACTOR,
  MIN_STEP_MS,
  MAX_LEVEL,
  POINTS_PER_LEVEL,
} from "./config.js";

// How each direction moves the head, as a change in x (columns) and y (rows).
// Remember: y counts DOWN from the top, so "up" means y gets smaller.
export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ dx: 0, dy: -1 }),
  down: Object.freeze({ dx: 0, dy: 1 }),
  left: Object.freeze({ dx: -1, dy: 0 }),
  right: Object.freeze({ dx: 1, dy: 0 }),
});

// The reverse of each direction. Turning to the opposite direction would
// drive the head straight into the body, so it's never allowed (FR-4).
const OPPOSITES = Object.freeze({
  up: "down",
  down: "up",
  left: "right",
  right: "left",
});

/**
 * Create the state for a brand-new game (design §3.1).
 *
 * The snake starts at START_POSITION, facing START_DIRECTION, with its body
 * trailing out behind the head (in the opposite direction). Food is placed on
 * a random empty cell.
 *
 * @param {() => number} [random=Math.random] - Returns a number from 0 up to
 *   (not including) 1. The real game uses Math.random; tests pass a
 *   predictable stand-in (dependency injection, design §5.3).
 * @returns {object} A new game state.
 */
export function createGame(random = Math.random) {
  const { dx, dy } = DIRECTIONS[START_DIRECTION];

  // Build the snake head-first. Segment 0 is the head; each next segment is
  // one cell further BEHIND it, i.e. one step against the direction of travel.
  // (Using `push` is fine here: this is a brand-new local array that no other
  // code can see yet. Purity is about not changing data we were GIVEN.)
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
    food: placeFood(snake, random), // FR-6
    score: 0,
    level: 1,
    status: "running", //  "running" | "dead" | "won"
  };
}

/**
 * Choose a random empty cell for the food (FR-6, design §5.3).
 *
 * Lists every cell the snake does NOT occupy (row by row, from the top-left),
 * then uses `random` to pick one. Because only empty cells are in the list,
 * the food can never land on the snake.
 *
 * @param {Array<{x: number, y: number}>} snake - The snake's cells.
 * @param {() => number} random - Returns a number from 0 up to (not including) 1.
 * @returns {{x: number, y: number} | null} The food's cell, or null if the
 *   board is completely full (only possible at victory).
 */
export function placeFood(snake, random) {
  const emptyCells = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLUMNS; x++) {
      const onSnake = snake.some((cell) => cell.x === x && cell.y === y);
      if (!onSnake) {
        emptyCells.push({ x, y });
      }
    }
  }

  if (emptyCells.length === 0) {
    return null; // nowhere left to put food
  }

  // random() is in [0, 1), so random() × length is in [0, length).
  // Math.floor rounds DOWN, giving a whole index from 0 to length − 1.
  const index = Math.floor(random() * emptyCells.length);
  return emptyCells[index];
}

/**
 * Advance the game by one movement step (design §5.2).
 *
 * PURE: `game` is never changed. A brand-new state is returned instead.
 * Callers learn what happened by looking at the new state (for example,
 * `status` or `score`).
 *
 * Implemented so far: turning (FR-4), movement (FR-3), wraparound (FR-5),
 * and eating: growth, scoring, levels, new food (FR-6, FR-7, FR-8).
 * Still to come, each with its own tests first: collisions, victory.
 *
 * @param {object} game - The current game state.
 * @param {() => number} [random=Math.random] - Used to place new food after
 *   eating. Tests pass a predictable stand-in (design §5.3).
 * @returns {object} The game state after one step.
 */
export function step(game, random = Math.random) {
  // 1. Turn: if a turn is waiting, it becomes the direction for THIS step
  //    (FR-4). This must happen before the head moves, so the snake moves in
  //    the new direction straight away.
  //    `[nextTurn, ...remainingQueue]` is array destructuring: the first item
  //    goes into `nextTurn`, and everything after it into a NEW array.
  //    If the queue is empty, `nextTurn` is `undefined`.
  const [nextTurn, ...remainingQueue] = game.directionQueue;
  // `??` means "use the left side, unless it's null or undefined".
  const direction = nextTurn ?? game.direction;

  // 2. Move the head one cell in that direction.
  const { dx, dy } = DIRECTIONS[direction];
  const head = game.snake[0];

  // Work out the new head position, wrapping around the edges (FR-5).
  const newHead = {
    x: wrap(head.x + dx, GRID_COLUMNS),
    y: wrap(head.y + dy, GRID_ROWS),
  };

  // 3. Will the snake eat? (The food can be null only after victory.)
  const ateFood =
    game.food !== null && newHead.x === game.food.x && newHead.y === game.food.y;

  if (!ateFood) {
    // 4. Normal move: put the new head on the front and drop the last
    //    segment (the tail). `slice(0, -1)` returns a NEW array with every
    //    segment except the last; it doesn't change `game.snake`.
    const snake = [newHead, ...game.snake.slice(0, -1)];

    // Return a new state: copy every field of `game`, then replace the ones
    // that changed. `remainingQueue` is a new array, so the old state's queue
    // is never shared with or changed by the new state.
    return { ...game, snake, direction, directionQueue: remainingQueue };
  }

  // 5. Eating: put the new head on the front and KEEP the tail. That's how
  //    the snake grows by one segment (FR-6).
  const snake = [newHead, ...game.snake];

  // 6. Score with the level BEFORE it rises (FR-8), then raise the level,
  //    but never above MAX_LEVEL (FR-7). Math.min picks the smaller number.
  const score = game.score + POINTS_PER_LEVEL * game.level;
  const level = Math.min(game.level + 1, MAX_LEVEL);

  // 7. New food, placed using the snake AFTER it has moved and grown, so the
  //    food can't appear under the new head.
  const food = placeFood(snake, random);

  return {
    ...game,
    snake,
    direction,
    directionQueue: remainingQueue,
    food,
    score,
    level,
  };
}

/**
 * Time between moves, in milliseconds, at a given speed level
 * (FR-7, design §6, decision A2).
 *
 *   level 1 → 150 ms, each level × 0.94, never below 60 ms (reached at level 16)
 *
 * The interval is calculated from the level rather than stored in the game
 * state, so the two can never disagree (single source of truth, design §3.1).
 *
 * @param {number} level - Speed level, 1 to MAX_LEVEL.
 * @returns {number} Whole milliseconds between moves.
 */
export function stepInterval(level) {
  // `**` means "to the power of": 0.94 ** 2 is 0.94 × 0.94.
  const ms = Math.round(BASE_STEP_MS * SPEED_FACTOR ** (level - 1));
  return Math.max(MIN_STEP_MS, ms); // Math.max picks the larger number
}

/**
 * Ask the snake to turn on its next step (FR-4, design §5.4).
 *
 * PURE: returns a new state (or the same state, unchanged, if the turn is
 * ignored). The turn is NOT applied here; `step()` applies it.
 *
 * A turn is ignored when:
 *   - a turn is already waiting (only MAX_QUEUED_TURNS = 1 allowed; first
 *     press wins, decision Q1), or
 *   - it's the same as the direction the snake will be moving, or
 *   - it's the exact opposite of that direction (a reversal).
 *
 * @param {object} game - The current game state.
 * @param {string} direction - "up", "down", "left", or "right".
 * @returns {object} The game state with the turn queued, or unchanged.
 */
export function queueTurn(game, direction) {
  const queue = game.directionQueue;

  if (queue.length >= MAX_QUEUED_TURNS) {
    return game; // a turn is already waiting: ignore this press
  }

  // The direction the snake will be moving when this turn is applied:
  // the last waiting turn if there is one, otherwise the current direction.
  // (With a limit of 1, the queue is always empty here, but this keeps the
  // rule correct if MAX_QUEUED_TURNS is ever raised.)
  const plannedDirection = queue.at(-1) ?? game.direction;

  if (direction === plannedDirection || direction === OPPOSITES[plannedDirection]) {
    return game; // no change of direction, or a reversal: ignore
  }

  // Build a NEW queue array rather than using `push`, which would modify the
  // old state's array and break purity.
  return { ...game, directionQueue: [...queue, direction] };
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
