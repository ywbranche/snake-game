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

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { createGame, step } from "../js/game.js";

// ── Test helper ─────────────────────────────────────────────────────────────
// Most tests need the snake somewhere specific (e.g. at an edge). This helper
// starts from a normal new game and replaces only the fields we care about.
// `...createGame()` is "spread" syntax: copy every field of the new game,
// then the fields in `overrides` replace any with the same name.
function gameWith(overrides) {
  return { ...createGame(), ...overrides };
}

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

// ── Movement (FR-3, design §5.2) ────────────────────────────────────────────
// `describe` groups related tests into a "suite", so the output reads as
// "movement > moves one cell to the right", and so on.

describe("movement", () => {
  test("moves one cell to the right; the body follows and the length stays 3", () => {
    const next = step(createGame());

    assert.deepEqual(next.snake, [
      { x: 11, y: 10 }, // new head: one cell right of the old head
      { x: 10, y: 10 }, // old head is now the second segment
      { x: 9, y: 10 }, //  the old tail (8, 10) has been left behind
    ]);
  });

  test("moves one cell up (y gets smaller)", () => {
    const game = gameWith({
      snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
      direction: "up",
    });
    assert.deepEqual(step(game).snake[0], { x: 10, y: 9 });
  });

  test("moves one cell down (y gets larger)", () => {
    const game = gameWith({
      snake: [{ x: 10, y: 10 }, { x: 10, y: 9 }, { x: 10, y: 8 }],
      direction: "down",
    });
    assert.deepEqual(step(game).snake[0], { x: 10, y: 11 });
  });

  test("moves one cell left", () => {
    const game = gameWith({
      snake: [{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 }],
      direction: "left",
    });
    assert.deepEqual(step(game).snake[0], { x: 9, y: 10 });
  });

  test("keeps moving over several steps", () => {
    const afterTwoSteps = step(step(createGame()));

    assert.deepEqual(afterTwoSteps.snake, [
      { x: 12, y: 10 },
      { x: 11, y: 10 },
      { x: 10, y: 10 },
    ]);
  });

  test("does not change the original game state (step is pure)", () => {
    const game = createGame();
    const before = structuredClone(game); // an independent deep copy

    step(game);

    // If step() had modified `game` directly, this would fail.
    assert.deepEqual(game, before);
  });
});

// ── Wraparound (FR-5, design §5.2) ──────────────────────────────────────────
// The board is 20×20, so x and y run from 0 to 19.

describe("wraparound", () => {
  test("leaving the right edge re-enters on the left", () => {
    const game = gameWith({
      snake: [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }],
      direction: "right",
    });
    assert.deepEqual(step(game).snake[0], { x: 0, y: 5 });
  });

  test("leaving the left edge re-enters on the right", () => {
    const game = gameWith({
      snake: [{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }],
      direction: "left",
    });
    assert.deepEqual(step(game).snake[0], { x: 19, y: 5 });
  });

  test("leaving the top edge re-enters at the bottom", () => {
    const game = gameWith({
      snake: [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }],
      direction: "up",
    });
    assert.deepEqual(step(game).snake[0], { x: 5, y: 19 });
  });

  test("leaving the bottom edge re-enters at the top", () => {
    const game = gameWith({
      snake: [{ x: 5, y: 19 }, { x: 5, y: 18 }, { x: 5, y: 17 }],
      direction: "down",
    });
    assert.deepEqual(step(game).snake[0], { x: 5, y: 0 });
  });

  test("hitting an edge never ends the game", () => {
    const game = gameWith({
      snake: [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }],
      direction: "right",
    });
    assert.equal(step(game).status, "running");
  });
});
