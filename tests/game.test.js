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

import { createGame, step, queueTurn, placeFood, stepInterval } from "../js/game.js";

import {
  GRID_COLUMNS,
  GRID_ROWS,
  MAX_LEVEL,
  MIN_STEP_MS,
} from "../js/config.js";

// ── Test helpers ────────────────────────────────────────────────────────────

// A fake "random" function that always returns 0. Real games use Math.random,
// which gives a different number each time. Tests need the SAME result every
// run, so they pass this predictable stand-in instead (dependency injection,
// design §5.3). With 0, food always goes to the first empty cell, (0, 0),
// out of the way of the snake in the movement and turning tests.
const alwaysZero = () => 0;

// A new game with predictable food placement. Tests use this instead of
// createGame() so that randomly placed food can never land in the snake's
// path and change a test's result.
function newGame() {
  return createGame(alwaysZero);
}

// Most tests need the snake somewhere specific (e.g. at an edge). This helper
// starts from a predictable new game and replaces only the fields we care about.
// `...newGame()` is "spread" syntax: copy every field of the new game,
// then the fields in `overrides` replace any with the same name.
function gameWith(overrides) {
  return { ...newGame(), ...overrides };
}

// ── New game (design §3.1, §6) ──────────────────────────────────────────────

test("a new game starts with a 3-segment snake at the center, moving right", () => {
  const game = newGame();

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
    const next = step(newGame());

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
    const afterTwoSteps = step(step(newGame()));

    assert.deepEqual(afterTwoSteps.snake, [
      { x: 12, y: 10 },
      { x: 11, y: 10 },
      { x: 10, y: 10 },
    ]);
  });

  test("does not change the original game state (step is pure)", () => {
    const game = newGame();
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
    const game = queueTurn(newGame(), "up");

    assert.deepEqual(game.directionQueue, ["up"]);
    assert.equal(game.direction, "right"); // still moving right until the next step
  });

  test("the next step applies the waiting turn and empties the queue", () => {
    const next = step(queueTurn(newGame(), "up"));

    assert.equal(next.direction, "up");
    assert.deepEqual(next.snake[0], { x: 10, y: 9 }); // moved up, not right
    assert.deepEqual(next.directionQueue, []);
  });

  test("a reversal (opposite of the current direction) is ignored", () => {
    const game = queueTurn(newGame(), "left");
    assert.deepEqual(game.directionQueue, []);
  });

  test("pressing the current direction again is ignored", () => {
    const game = queueTurn(newGame(), "right");
    assert.deepEqual(game.directionQueue, []);
  });

  test("a second press while a turn is waiting is ignored (first press wins)", () => {
    // "down" would be valid on its own, but a turn is already waiting.
    const game = queueTurn(queueTurn(newGame(), "up"), "down");
    assert.deepEqual(game.directionQueue, ["up"]);
  });

  test("'up then left' pressed within one step can never reverse the snake", () => {
    // Moving right. The player quickly presses up, then left.
    let game = queueTurn(newGame(), "up");
    game = queueTurn(game, "left"); // ignored: a turn is already waiting

    game = step(game); // applies "up"
    assert.equal(game.direction, "up");

    game = step(game); // nothing waiting, so it keeps going up
    assert.equal(game.direction, "up");
    assert.deepEqual(game.snake[0], { x: 10, y: 8 });
  });

  test("after a step applies a turn, a new turn can be queued", () => {
    let game = step(queueTurn(newGame(), "up")); // now moving up
    game = queueTurn(game, "left"); //                 valid when moving up

    assert.deepEqual(game.directionQueue, ["left"]);
  });

  test("reversal is checked against the direction after the last turn", () => {
    // After turning up, "down" is now the reversal, and "right" is allowed again.
    const movingUp = step(queueTurn(newGame(), "up"));

    assert.deepEqual(queueTurn(movingUp, "down").directionQueue, []);
    assert.deepEqual(queueTurn(movingUp, "right").directionQueue, ["right"]);
  });

  test("does not change the original game state (queueTurn is pure)", () => {
    const game = newGame();
    const before = structuredClone(game);

    queueTurn(game, "up");

    assert.deepEqual(game, before);
  });
});

// ── Food placement (FR-6, design §5.3) ──────────────────────────────────────
// Food goes on a random EMPTY cell. The empty cells are listed row by row,
// from the top-left (0, 0) to the bottom-right (19, 19), and the random number
// (from 0 up to, but not including, 1) picks a position in that list.

describe("food placement", () => {
  test("a new game places food on the board, never on the snake", () => {
    // Uses the REAL Math.random, 200 times, to check the rule holds no matter
    // which random numbers come up.
    for (let i = 0; i < 200; i++) {
      const game = createGame(Math.random);
      const { x, y } = game.food;

      assert.ok(x >= 0 && x < GRID_COLUMNS, `food x out of range: ${x}`);
      assert.ok(y >= 0 && y < GRID_ROWS, `food y out of range: ${y}`);
      const onSnake = game.snake.some((cell) => cell.x === x && cell.y === y);
      assert.equal(onSnake, false, `food placed on the snake at (${x}, ${y})`);
    }
  });

  test("a random number of 0 picks the first empty cell (top-left)", () => {
    const game = createGame(() => 0);
    assert.deepEqual(game.food, { x: 0, y: 0 });
  });

  test("a random number just below 1 picks the last empty cell (bottom-right)", () => {
    const game = createGame(() => 0.9999);
    assert.deepEqual(game.food, { x: 19, y: 19 });
  });

  test("when only one cell is empty, food always goes there", () => {
    // Build a snake covering every cell EXCEPT (7, 3).
    const snake = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLUMNS; x++) {
        if (!(x === 7 && y === 3)) snake.push({ x, y });
      }
    }

    assert.deepEqual(placeFood(snake, () => 0), { x: 7, y: 3 });
    assert.deepEqual(placeFood(snake, () => 0.9999), { x: 7, y: 3 });
  });

  test("when no cell is empty, there is nowhere for food: returns null", () => {
    const snake = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLUMNS; x++) {
        snake.push({ x, y });
      }
    }

    assert.equal(placeFood(snake, () => 0), null);
  });
});

// ── Eating: growth, scoring, levels (FR-6, FR-7, FR-8, design §5.2) ─────────
// A new test game has its head at (10, 10) moving right, so food placed at
// (11, 10) is eaten on the very next step.

const FOOD_AHEAD = { x: 11, y: 10 };

describe("eating", () => {
  test("eating grows the snake by one segment: the tail stays", () => {
    const next = step(gameWith({ food: FOOD_AHEAD }), alwaysZero);

    assert.deepEqual(next.snake, [
      { x: 11, y: 10 }, // new head, where the food was
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }, //  old tail: NOT removed this step, so length is now 4
    ]);
  });

  test("eating at level 1 scores 10 and raises the level to 2", () => {
    const next = step(gameWith({ food: FOOD_AHEAD }), alwaysZero);

    assert.equal(next.score, 10);
    assert.equal(next.level, 2);
  });

  test("points use the level BEFORE it increases (level 3 → +30, not +40)", () => {
    const game = gameWith({ food: FOOD_AHEAD, level: 3, score: 50 });
    const next = step(game, alwaysZero);

    assert.equal(next.score, 80); // 50 + 10 × 3
    assert.equal(next.level, 4);
  });

  test("at the maximum level, the level stops rising and each food stays at 160", () => {
    const game = gameWith({ food: FOOD_AHEAD, level: MAX_LEVEL, score: 1000 });
    const next = step(game, alwaysZero);

    assert.equal(next.level, MAX_LEVEL); // still 16
    assert.equal(next.score, 1160); //      1000 + 10 × 16
  });

  test("after eating, new food appears on an empty cell", () => {
    // alwaysZero picks the first empty cell, (0, 0), which the snake isn't on.
    const next = step(gameWith({ food: FOOD_AHEAD }), alwaysZero);

    assert.deepEqual(next.food, { x: 0, y: 0 });
  });

  test("a step without eating changes no score, level, or food", () => {
    const game = gameWith({ food: { x: 3, y: 3 }, level: 5, score: 200 });
    const next = step(game, alwaysZero);

    assert.equal(next.snake.length, 3); // no growth
    assert.equal(next.score, 200);
    assert.equal(next.level, 5);
    assert.deepEqual(next.food, { x: 3, y: 3 });
  });
});

// ── Speed (FR-7, design §6, decision A2) ────────────────────────────────────
// stepInterval(level) = milliseconds between moves at that level.

describe("speed", () => {
  test("matches the approved speed table in design §6", () => {
    const expected = { 1: 150, 2: 141, 3: 133, 5: 117, 8: 97, 10: 86, 12: 76, 15: 63, 16: 60 };

    for (const [level, ms] of Object.entries(expected)) {
      assert.equal(stepInterval(Number(level)), ms, `level ${level}`);
    }
  });

  test("each level is about 5–8% faster than the one before (FR-7)", () => {
    for (let level = 2; level <= MAX_LEVEL; level++) {
      const speedUp = stepInterval(level - 1) / stepInterval(level);
      assert.ok(
        speedUp >= 1.05 && speedUp <= 1.08,
        `level ${level - 1} → ${level} speed-up was ${speedUp.toFixed(3)}`,
      );
    }
  });

  test("top speed is exactly 2.5× the starting speed (FR-7)", () => {
    assert.equal(stepInterval(1) / stepInterval(MAX_LEVEL), 2.5);
  });

  test("MAX_LEVEL in config.js agrees with the speed settings", () => {
    // MAX_LEVEL must be the FIRST level that reaches the 60 ms floor.
    // If someone changes SPEED_FACTOR or BASE_STEP_MS and forgets to update
    // MAX_LEVEL, this test fails and points at the problem.
    assert.equal(stepInterval(MAX_LEVEL), MIN_STEP_MS);
    assert.ok(stepInterval(MAX_LEVEL - 1) > MIN_STEP_MS);
  });
});

// ── Self-collision (FR-10, design §5.2.1, tests T-TAIL-1 to 5) ──────────────
// Rule: the head may move into the cell the TAIL is in (the tail leaves that
// cell in the same step). Moving into any other body cell ends the game.
//
// Many of these tests use a 2×2 loop. Picture it (H = head, T = tail):
//
//      x=5  x=6
//  y=5  H ← T      the head at (5,5) moving right would enter (6,5),
//  y=6  ■ → ■      which is exactly where the tail is.

describe("self-collision", () => {
  test("running into the middle of the body ends the game", () => {
    const game = gameWith({
      snake: [
        { x: 5, y: 5 }, // head, about to move right into (6, 5)
        { x: 5, y: 6 },
        { x: 6, y: 6 },
        { x: 6, y: 5 }, // ← middle of the body
        { x: 6, y: 4 },
        { x: 6, y: 3 }, // tail
      ],
      direction: "right",
    });
    const next = step(game, alwaysZero);

    assert.equal(next.status, "dead");
    assert.deepEqual(next.snake, game.snake); // the snake doesn't move into itself
  });

  test("T-TAIL-1: moving into the tail's cell is allowed (2×2 loop)", () => {
    const game = gameWith({
      snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }],
      direction: "right",
    });
    const next = step(game, alwaysZero);

    assert.equal(next.status, "running");
    assert.deepEqual(next.snake, [
      { x: 6, y: 5 }, // head moved into the old tail cell
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 6, y: 6 }, // new tail
    ]);
  });

  test("T-TAIL-2: moving into the segment just before the tail ends the game", () => {
    // Same loop, but one segment longer: (6, 5) is now second-to-last.
    const game = gameWith({
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
        { x: 6, y: 5 }, // ← just before the tail
        { x: 7, y: 5 }, //   tail
      ],
      direction: "right",
    });

    assert.equal(step(game, alwaysZero).status, "dead");
  });

  test("T-TAIL-3: chasing its own tail around a 2×2 loop never dies", () => {
    // Head at (5, 5) arrived by moving up. Turning right, down, left, up on
    // each step keeps the head going round, always into the tail's cell.
    let game = gameWith({
      snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }],
      direction: "up",
    });
    const turns = ["right", "down", "left", "up"];

    for (let lap = 0; lap < 3; lap++) {
      for (const turn of turns) {
        game = step(queueTurn(game, turn), alwaysZero);
        assert.equal(game.status, "running", `died on lap ${lap + 1} turning ${turn}`);
      }
    }
    assert.equal(game.snake.length, 4); // still the same snake, no growth
  });

  test("T-TAIL-4: right after eating, moving into the tail's cell is still allowed", () => {
    // Eat food at (5, 5): the snake grows to the 2×2 loop and its tail stays at (6, 5).
    let game = gameWith({
      snake: [{ x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }],
      direction: "up",
      food: { x: 5, y: 5 },
    });
    game = step(game, alwaysZero);
    assert.equal(game.snake.length, 4); // it ate and grew
    assert.deepEqual(game.snake.at(-1), { x: 6, y: 5 }); // tail didn't move

    // Next step: turn right into (6, 5), the tail's cell. The tail leaves now.
    game = step(queueTurn(game, "right"), alwaysZero);
    assert.equal(game.status, "running");
  });

  test("T-TAIL-5: the tail's cell reached through wraparound is allowed", () => {
    // The same 2×2 loop, split across the left and right edges.
    const game = gameWith({
      snake: [{ x: 19, y: 5 }, { x: 19, y: 6 }, { x: 0, y: 6 }, { x: 0, y: 5 }],
      direction: "right",
    });
    const next = step(game, alwaysZero);

    assert.equal(next.status, "running");
    assert.deepEqual(next.snake[0], { x: 0, y: 5 });
  });

  test("a finished game no longer changes when stepped", () => {
    const deadGame = gameWith({ status: "dead" });
    assert.equal(step(deadGame, alwaysZero), deadGame);
  });
});

// ── Victory (FR-14, design §5.2 step 6) ─────────────────────────────────────
// To test victory we need a snake that fills almost the whole board. This
// helper lists all 400 cells in "lawnmower" order: row 0 left→right, row 1
// right→left, row 2 left→right, and so on. Each cell in the list is next to
// the one before it, so any run of this list is a valid snake body.
//
//   row 0:  (0,0) → (1,0) → … → (19,0)
//                                   ↓
//   row 1:  (0,1) ← … ← (18,1) ← (19,1)
//             ↓
//   row 2:  (0,2) → …

function lawnmowerPath() {
  const path = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let i = 0; i < GRID_COLUMNS; i++) {
      const x = y % 2 === 0 ? i : GRID_COLUMNS - 1 - i; // even rows go right, odd rows go left
      path.push({ x, y });
    }
  }
  return path;
}

describe("victory", () => {
  test("eating the last food, filling all 400 cells, wins the game", () => {
    const path = lawnmowerPath();
    // Snake = every cell except path[0] = (0, 0). Head at path[1] = (1, 0),
    // moving left toward (0, 0), where the last food is.
    const game = gameWith({
      snake: path.slice(1), // 399 segments, head first
      direction: "left",
      food: path[0],
      level: MAX_LEVEL,
      score: 5000,
    });
    const next = step(game, alwaysZero);

    assert.equal(next.snake.length, GRID_COLUMNS * GRID_ROWS); // 400
    assert.equal(next.status, "won");
    assert.equal(next.food, null); // nowhere left for food
    assert.equal(next.score, 5160); // the winning bite still scores 10 × 16
  });

  test("eating with one cell still empty does NOT win; food goes to that cell", () => {
    const path = lawnmowerPath();
    // Snake = every cell except path[0] and path[1]. Head at path[2] = (2, 0)
    // moving left to eat food at path[1]. Afterwards only (0, 0) is empty.
    const game = gameWith({
      snake: path.slice(2), // 398 segments
      direction: "left",
      food: path[1],
    });
    const next = step(game, alwaysZero);

    assert.equal(next.snake.length, 399);
    assert.equal(next.status, "running");
    assert.deepEqual(next.food, { x: 0, y: 0 }); // the only empty cell left
  });

  test("a won game no longer changes when stepped", () => {
    const wonGame = gameWith({ status: "won", food: null });
    assert.equal(step(wonGame, alwaysZero), wonGame);
  });
});
