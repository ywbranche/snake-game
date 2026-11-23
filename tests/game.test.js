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

import { createGame, step, queueTurn } from "../js/game.js";

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

// ── Turning: the direction queue (FR-4, design §5.4, decisions A7 + Q1) ─────
// queueTurn(game, direction) is how a key press asks the snake to turn.
// The turn isn't applied immediately: it waits in `directionQueue` and is
// applied by the next step(). At most ONE turn can wait at a time.
// A new game moves "right", so in these tests "left" is the reversal.

describe("turning", () => {
  test("a valid turn waits in the queue and is not applied yet", () => {
    const game = queueTurn(createGame(), "up");

    assert.deepEqual(game.directionQueue, ["up"]);
    assert.equal(game.direction, "right"); // still moving right until the next step
  });

  test("the next step applies the waiting turn and empties the queue", () => {
    const next = step(queueTurn(createGame(), "up"));

    assert.equal(next.direction, "up");
    assert.deepEqual(next.snake[0], { x: 10, y: 9 }); // moved up, not right
    assert.deepEqual(next.directionQueue, []);
  });

  test("a reversal (opposite of the current direction) is ignored", () => {
    const game = queueTurn(createGame(), "left");
    assert.deepEqual(game.directionQueue, []);
  });

  test("pressing the current direction again is ignored", () => {
    const game = queueTurn(createGame(), "right");
    assert.deepEqual(game.directionQueue, []);
  });

  test("a second press while a turn is waiting is ignored (first press wins)", () => {
    // "down" would be valid on its own, but a turn is already waiting.
    const game = queueTurn(queueTurn(createGame(), "up"), "down");
    assert.deepEqual(game.directionQueue, ["up"]);
  });

  test("'up then left' pressed within one step can never reverse the snake", () => {
    // Moving right. The player quickly presses up, then left.
    let game = queueTurn(createGame(), "up");
    game = queueTurn(game, "left"); // ignored: a turn is already waiting

    game = step(game); // applies "up"
    assert.equal(game.direction, "up");

    game = step(game); // nothing waiting, so it keeps going up
    assert.equal(game.direction, "up");
    assert.deepEqual(game.snake[0], { x: 10, y: 8 });
  });

  test("after a step applies a turn, a new turn can be queued", () => {
    let game = step(queueTurn(createGame(), "up")); // now moving up
    game = queueTurn(game, "left"); //                 valid when moving up

    assert.deepEqual(game.directionQueue, ["left"]);
  });

  test("reversal is checked against the direction after the last turn", () => {
    // After turning up, "down" is now the reversal, and "right" is allowed again.
    const movingUp = step(queueTurn(createGame(), "up"));

    assert.deepEqual(queueTurn(movingUp, "down").directionQueue, []);
    assert.deepEqual(queueTurn(movingUp, "right").directionQueue, ["right"]);
  });

  test("does not change the original game state (queueTurn is pure)", () => {
    const game = createGame();
    const before = structuredClone(game);

    queueTurn(game, "up");

    assert.deepEqual(game, before);
  });
});
