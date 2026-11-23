// game.test.js — automated tests for the game rules in js/game.js.
//
// How these tests work:
//   - `test(name, fn)` registers one test. The runner calls `fn`; if nothing
//     inside it throws an error, the test passes.
//   - `assert.equal` / `assert.deepEqual` throw an error when the actual value
//     doesn't match the expected one — that's what makes a test fail.
//
// Run all tests with:  npm test
// Plan: planning/design.md §7.1

import { test } from "node:test";
import assert from "node:assert/strict";

import { createGame } from "../js/game.js";

// ── New game (design §3.1, §6) ──────────────────────────────────────────────

test("a new game starts with a 3-segment snake at the center, moving right", () => {
  const game = createGame();

  // The snake is a list of cells, head first. With the head at (10, 10)
  // moving right, the body trails off to the left.
  assert.deepEqual(game.snake, [
    { x: 10, y: 10 }, // head
    { x: 9, y: 10 },
    { x: 8, y: 10 }, //  tail
  ]);
  assert.equal(game.direction, "right");

  // Nothing has happened yet: no waiting turn, no points, level 1, still going.
  assert.deepEqual(game.directionQueue, []);
  assert.equal(game.score, 0);
  assert.equal(game.level, 1);
  assert.equal(game.status, "running");
});
