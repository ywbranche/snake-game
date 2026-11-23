// game.js — the rules of Snake.
//
// This module is PURE LOGIC: it never touches the web page, the canvas,
// the keyboard, or localStorage. It only creates and updates plain data.
// That's what lets us test it with Node, without a browser (design §1, TC-8).
//
// Design reference: planning/design.md §3.1 (game state), §5.2 (one step).

import {
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
