# Snake Game — Architecture & Design

| | |
|---|---|
| **Project** | Project 001 – Snake Game |
| **Document version** | 1.0 |
| **Status** | **Approved by owner (2026-11-23)** |
| **Date** | 2026-11-23 |
| **Based on** | `planning/requirements.md` v1.0 |

> Requirements say **what** the game must do. This document says **how** we will build it.
> Requirement IDs (FR-*, NFR-*, TC-*) show which requirement each decision serves.

---

## 1. Architecture at a Glance

The game is a **static website**: one HTML page, one CSS file, and a handful of JavaScript modules. There is no server code, no framework, and no build step (TC-1 to TC-4).

The code is split into small modules, each with **one job**. The key idea is to keep **pure logic** (rules and calculations) separate from the **browser-facing parts** (drawing, keyboard, storage, the page). Pure logic can be tested automatically without a browser (TC-5, TC-8).

**Pure function:** a function whose result depends only on its inputs and which changes nothing outside itself. You give it the same inputs and you always get the same output. That makes it easy to test and easy to reason about.

```
                        ┌──────────────┐
                        │   main.js    │  "The conductor": owns the game loop,
                        │ (wiring/loop)│  connects everything else
                        └──────┬───────┘
          ┌───────────┬────────┼─────────┬────────────┬───────────┐
          ▼           ▼        ▼         ▼            ▼           ▼
   ┌───────────┐ ┌─────────┐ ┌───────┐ ┌──────────┐ ┌────────┐ ┌─────────┐
   │  game.js  │ │ state-  │ │input. │ │renderer. │ │ ui.js  │ │storage. │
   │  (rules)  │ │machine. │ │  js   │ │   js     │ │(screens│ │   js    │
   │           │ │   js    │ │       │ │ (canvas) │ │ & HUD) │ │         │
   └─────┬─────┘ └─────────┘ └───────┘ └──────────┘ └────────┘ └─────────┘
         │            PURE LOGIC (no browser)    │   BROWSER-FACING
         ▼                                       │
   ┌───────────┐                                 │
   │ config.js │  ← tunable numbers, imported by any module that needs them
   └───────────┘
```

**Dependency rule:** modules only import "downward". The pure modules (`game.js`, `state-machine.js`, `input.js`, `config.js`) never touch the page, canvas, keyboard events, or `localStorage`. Only `main.js` knows about every other module.

---

## 2. File and Module Structure

```
snake-game/
├── index.html              Page structure: canvas, HUD, screen overlays
├── styles.css              Neon-arcade theme, layout, reduced-motion rules
├── package.json            Test command only — no dependencies (see A4)
├── js/
│   ├── main.js             Entry point: game loop, wiring, browser events
│   ├── config.js           All tunable constants in one place
│   ├── game.js             Game rules: movement, food, scoring, collisions  [pure]
│   ├── state-machine.js    Which screen we're on, and allowed transitions   [pure]
│   ├── input.js            Turns a key + current screen into an action      [pure]
│   ├── renderer.js         Draws the board, snake, and food on the canvas
│   ├── ui.js               Shows/hides screens; updates score/best/level text
│   └── storage.js          Loads/saves personal best in localStorage
├── tests/
│   ├── game.test.js
│   ├── state-machine.test.js
│   ├── input.test.js
│   └── storage.test.js
├── planning/
│   ├── requirements.md
│   ├── design.md           (this document)
│   └── manual-test-checklist.md   (created during implementation)
├── CLAUDE.md
└── .gitattributes
```

| File | Responsibility | Serves |
|---|---|---|
| `index.html` | The page skeleton: a `<canvas>` for the board; HTML elements for the HUD (score, best, level) and for each screen overlay (start, paused, game over, victory) plus the mobile message. Loads `main.js` as a module. | FR-1, FR-9, FR-11, FR-13, FR-14, FR-18 |
| `styles.css` | Colors (as CSS variables), fonts, layout, glow effects on text and overlays, and a `prefers-reduced-motion` section that turns off decorative animation. | NFR-5, NFR-6, NFR-7, NFR-9 |
| `js/config.js` | Every tunable number (board size, speeds, points, colors used by the canvas). No logic. | §6 |
| `js/game.js` | Creates a new game, queues direction changes, advances the game by one step, places food, scores, detects collision and victory. **No browser code.** | FR-3 – FR-8, FR-10, FR-14 |
| `js/state-machine.js` | A transition table: given the current screen and an event, returns the next screen. **No browser code.** | FR-2, FR-11 – FR-14 |
| `js/input.js` | Maps a key name and the current screen to an action (e.g. `ArrowUp` on Playing → "turn up"; `Enter` on Start → "start"). **No browser code.** The actual keyboard listener lives in `main.js`. | FR-2, FR-3, FR-11 |
| `js/renderer.js` | Draws one frame on the canvas from the current game state. Handles sizing the canvas to the window and to high-resolution screens. | FR-17, NFR-1, NFR-5, NFR-8, NFR-9 |
| `js/ui.js` | Shows the correct overlay for the current screen and updates the HUD text, including the "NEW HIGH SCORE!" message. | FR-1, FR-9, FR-13, FR-14, FR-16 |
| `js/storage.js` | Reads and writes the personal best. Never crashes if storage is blocked. | FR-15 |
| `js/main.js` | Starts everything: reads the personal best, listens for keys, focus changes, and window resizes, runs the game loop, and calls the other modules. | All |

**Why this many files?** Each file is small (roughly 30–150 lines) and has one job. When something goes wrong ("the snake goes through itself"), you know which file to open. A single-file version would be shorter to set up, but much harder to read, test, or explain.

---

## 3. Data Model

### 3.1 Game state (owned by `game.js`)

The **game state** is a plain JavaScript object describing everything about the current game at one moment:

| Field | Example | Meaning |
|---|---|---|
| `snake` | `[{x:10,y:10}, {x:9,y:10}, {x:8,y:10}]` | List of cells; **first item is the head** |
| `direction` | `"right"` | Direction the snake moved on its last step |
| `directionQueue` | `["up"]` | The next turn waiting to be applied. Holds **at most 1**; applied on the next step (FR-4, A7) |
| `food` | `{x:15,y:4}` or `null` | Food position; `null` only after victory |
| `score` | `120` | Current score |
| `level` | `4` | Current speed level (1 to `MAX_LEVEL`) |
| `status` | `"running"`, `"dead"`, `"won"` | Whether the game is still going |

**Coordinates:** `x` counts columns from the left (0 to 19), and `y` counts rows from the top (0 to 19).

The **step interval** (time between moves) is **not stored**. It is calculated from `level` whenever needed (§6). Storing only `level` means the two can never disagree. This idea is called a **single source of truth**.

### 3.2 App state (owned by `main.js`)

Information about the app around the game:

| Field | Meaning |
|---|---|
| `screen` | `"start"`, `"playing"`, `"paused"`, `"gameOver"`, `"victory"` |
| `game` | The current game state (above), or `null` before the first game |
| `personalBest` | Best score; updates live when beaten (FR-16) |
| `bestAtGameStart` | Personal best when this game began. Used to decide whether to show "NEW HIGH SCORE!" |
| `storageAvailable` | `false` if `localStorage` is blocked |
| `reducedMotion` | `true` if the OS "reduce motion" setting is on |

---

## 4. State Machine (Screens)

A **state machine** is a model where the app is always in exactly **one state** (here, one screen), and only specific **events** can move it to another state. Writing it as a table makes every allowed move explicit and testable. It also makes every *unlisted* move impossible by design.

```
            Enter                     Space / focus lost
   ┌───────┐ ─────► ┌───────────┐ ────────────────────► ┌──────────┐
   │ START │        │  PLAYING  │                        │  PAUSED  │
   └───────┘        │           │ ◄──────────────────── └──────────┘
                    └───────────┘          Space
                      │       │
     snake hits itself│       │ board completely filled
                      ▼       ▼
               ┌───────────┐ ┌───────────┐
               │ GAME OVER │ │  VICTORY  │
               └─────┬─────┘ └─────┬─────┘
                     │   Enter     │   Enter
                     └──────┬──────┘
                            ▼
                    new game → PLAYING
```

### Transition table

| Current screen | Event | Next screen | Side effect |
|---|---|---|---|
| Start | Enter | Playing | Create new game |
| Playing | Space | Paused | — |
| Playing | Tab hidden **or** window loses focus | Paused | — (FR-12) |
| Playing | Snake hits itself | Game Over | Save personal best |
| Playing | Board filled | Victory | Save personal best |
| Paused | Space | Playing | Reset loop timer (so no "catch-up" jump) |
| Game Over | Enter | Playing | Create new game |
| Victory | Enter | Playing | Create new game |
| *any* | *anything else* | *(unchanged)* | Ignored |

Arrow keys are only handled on the **Playing** screen. In every other screen they are ignored.

**Assumption:** Enter on Game Over/Victory goes straight into a new game, not back to the Start screen. This matches FR-13 and FR-14 ("starts a new game").

---

## 5. How the Parts Work

### 5.1 Game loop and timing

A **game loop** repeats: *handle input → update → draw*. We use the browser's `requestAnimationFrame`, which calls our loop just before each screen refresh, usually 60 times a second.

The snake, however, moves at its **own** pace: one cell every *N* milliseconds, and *N* shrinks as the level rises. We separate the two with a **fixed-timestep accumulator**:

1. Each frame, measure how much time passed since the last frame and add it to an `accumulator`.
2. While `accumulator ≥ stepInterval`: advance the game one step and subtract `stepInterval`.
3. Draw the current state.

The result: movement timing is exact and steady regardless of the monitor's refresh rate (NFR-1, NFR-2). Drawing still happens every frame, so glow and pulse effects stay smooth.

**Safety cap:** if a single frame reports a huge time gap (for example after the computer sleeps), the gap is capped at 250 ms. Otherwise the snake would make many moves at once. Auto-pause (FR-12) covers most cases; this is a backup.

**Decision (A3): movement is cell-by-cell**, like classic Snake. The snake jumps one cell per step and does not glide between cells. Gliding (called **interpolation**) looks fancier but adds noticeable complexity to drawing and collision visuals. We interpret NFR-1 ("no visible stutter") as perfectly even step timing plus smooth visual effects.

### 5.2 One game step (`game.js`)

Order matters. Each step does the following:

1. **Turn:** if the queue has a direction, take the first one and make it the current direction.
2. **Next head:** move the head one cell in that direction. **Wrap** around edges using remainder arithmetic: `(x + 1) % 20` turns 20 into 0, and `(x − 1 + 20) % 20` turns −1 into 19 (FR-5).
3. **Will it eat?** Check whether the next head cell is the food.
4. **Collision:** check whether the next head cell is part of the body, **not counting the current tail cell** (see 5.2.1).
   - Collision → `status = "dead"` (FR-10). Stop.
5. **Move:** add the new head to the front. If not eating, remove the tail; if eating, keep it (growth, FR-6).
6. **If eating:**
   - `score += 10 × level` using the level **before** it increases (FR-8).
   - If `level < MAX_LEVEL`, then `level += 1` (FR-7).
   - If the snake now fills all 400 cells → `status = "won"`, `food = null` (FR-14).
   - Otherwise place new food (5.3).

`step()` reports what happened (e.g. "ate food", "died", "won") so `main.js` can update the HUD, the screens, and storage.

#### 5.2.1 Tail-collision rule (explicit)

**Rule:** the head may move into the cell currently occupied by the tail. Every other body cell is a collision.

**Why:** on a normal (non-eating) step, the tail leaves its cell in the same step as the head arrives, so the two never actually overlap. If we counted the tail, the snake would "die" when chasing its own tail in a tight loop, even though nothing touches. Players would see that as a bug.

**What about eating steps?** On an eating step the tail stays put. But the head is moving onto the **food**, and food is never placed on the snake (FR-6). So the head can't be entering the tail's cell on an eating step. The rule above is therefore correct in every case, and no special "eating" branch is needed.

**Implementation note:** check the next head cell against `snake` **excluding its last element**. Do the collision check **before** moving (step 4 before step 5).

| Situation | Result |
|---|---|
| Head enters the cell the tail is leaving (normal step) | ✅ Allowed |
| Head enters any other body cell, including the segment just before the tail | ❌ Collision, game over |
| Head enters the food cell | ✅ Eats (food is never on the body) |

### 5.3 Food placement

Build the list of all **empty** cells and pick one at random. This always succeeds when any cell is empty. Trying random cells until one is free can take a long time when the board is nearly full.

The random-number function is **passed in** as a parameter (normally `Math.random`). Tests can pass a fake, predictable one so results are repeatable. This technique is called **dependency injection**: giving a function the tools it uses, instead of letting it grab them itself.

### 5.4 Input handling

- `main.js` listens for `keydown` events. It asks `input.js` what the key means **on the current screen**, then acts.
- Keys we use get `preventDefault()`, so arrows and Space don't scroll the page.
- **Key repeat:** holding a key fires repeated events. Repeats are ignored for Enter and Space, so holding Space doesn't flicker between paused and playing.
- **Direction queue (FR-4, A7): one queued turn at most.** When an arrow key is pressed during play:
  1. If a turn is **already waiting** for the next step, the new key is **ignored**. The first valid press wins (Q1).
  2. Otherwise, the key is **ignored** if it's the same as the current direction or its exact opposite (a reversal).
  3. Otherwise, it becomes the waiting turn, applied on the next movement step.

  Because a turn is only accepted when nothing is waiting, it's always checked against the direction the snake will actually be moving when it's applied. That's what FR-4 requires, and it prevents the classic "Up-then-Left reverses into yourself" bug.

  **Trade-off of the 1-turn limit:** if a player presses two arrows very quickly (both within one step, 60–150 ms), the second press is dropped. They have to press it again on the next step. It's simple and predictable, but it can feel slightly less responsive in very fast U-turns at high speed. The value lives in `config.js`, so it can be revisited after play-testing.
- **Auto-pause (FR-12):** listen for the page becoming hidden (`visibilitychange`) and the window losing focus (`blur`). If the screen is Playing, switch to Paused.

### 5.5 Rendering

Responsibilities are split between the canvas and HTML (TC-3):

| On the canvas (`renderer.js`) | In HTML/CSS (`ui.js`, `styles.css`) |
|---|---|
| Board background and faint grid | Score, personal best, level (HUD) |
| Snake body: rounded, glowing segments | Start / Paused / Game Over / Victory overlays |
| Snake head: distinct shape with "eyes" facing its direction (NFR-8) | "NEW HIGH SCORE!" message |
| Food: bright, glowing, gently pulsing | Mobile "desktop only" message |

- **Every frame** the canvas is cleared and fully redrawn from the game state. The renderer only *reads* state; it never changes it.
- **Scaling (FR-17, NFR-9):**
  - The board is always 20×20 cells.
  - Cell size = the largest whole number of pixels that fits the window, leaving room for the HUD.
  - On window resize, the size is recalculated.
- **Sharp on high-resolution screens:** the canvas's internal pixel size is multiplied by `devicePixelRatio`, so 4K and Retina displays aren't blurry.
- **Reduced motion (NFR-6):** if the OS setting is on, food stops pulsing and overlay animations are turned off. Static glow remains, because it doesn't move.
- **Overlays:** each screen is an HTML `<section>` shown or hidden by `ui.js`. The game board stays visible, dimmed, behind Paused, Game Over and Victory.

### 5.6 Personal best and `localStorage` (`storage.js`)

- **Key:** `snakeGame.personalBest`; **value:** a whole number stored as text.
- **Load:** if the value is missing or invalid, treat it as `0`.
- **Save:** whenever a new best is reached. That's at most once per food eaten, which is cheap, and means the best survives even if the tab is closed mid-game.
- **Blocked storage:** every read and write is wrapped in `try…catch`. If storage is blocked (some privacy modes), the game still plays normally, just without saving (FR-15).
- **"NEW HIGH SCORE!" (FR-16):** shown on Game Over/Victory when `score > bestAtGameStart` **and** `score > 0`. A first-ever game has a best of 0, so any positive score counts.
- `storage.js` also receives the storage object as a parameter (dependency injection), so tests can use a fake one.

### 5.7 Mobile detection (FR-18)

Use the CSS media query `(hover: none) and (pointer: coarse)`. It's true for devices whose main input is a finger rather than a mouse. If it matches, show the "best played on desktop" message **instead of** the start screen. Touch laptops with a mouse or trackpad don't match, so they can still play.

---

## 6. Configuration Values (`config.js`)

| Constant | Proposed value | Reasoning |
|---|---|---|
| `GRID_COLUMNS` × `GRID_ROWS` | **20 × 20** (400 cells) | Classic size; cells stay large and readable from 720p to 4K; victory is reachable in principle |
| `START_LENGTH` | **3** | Visible as a snake from the start |
| Start position / direction | Head at (10, 10), moving **right** | Centered, with space ahead |
| `BASE_STEP_MS` | **150 ms** (≈6.7 moves/sec) | Comfortable start speed for new players |
| `SPEED_FACTOR` | **0.94** (each level waits 94% as long) | ≈6.4% faster per level, inside the 5–8% range (FR-7) |
| `MIN_STEP_MS` | **60 ms** | 150 ÷ 60 = exactly **2.5×** the starting speed (FR-7) |
| `MAX_LEVEL` | **16** | The first level at which the formula reaches the 60 ms floor |
| `POINTS_PER_LEVEL` | **10** | FR-8 |
| `MAX_QUEUED_TURNS` | **1** | Owner decision (A7): one waiting turn, applied on the next step |
| `MAX_FRAME_GAP_MS` | **250 ms** | Safety cap for the game loop (§5.1) |
| `STORAGE_KEY` | `"snakeGame.personalBest"` | §5.6 |

**Step interval formula:** `stepMs(level) = max(60, round(150 × 0.94^(level − 1)))`

| Level | 1 | 2 | 3 | 5 | 8 | 10 | 12 | 15 | 16 (max) |
|---|---|---|---|---|---|---|---|---|---|
| ms per move | 150 | 141 | 133 | 117 | 97 | 86 | 76 | 63 | **60** |
| Points per food | 10 | 20 | 30 | 50 | 80 | 100 | 120 | 150 | **160** |

The cap is reached after 15 foods. From then on every food is worth 160.

### Color palette (proposed; NFR-7)

Contrast ratios below were calculated with the WCAG formula. They'll be re-checked in the browser during implementation, because glow effects can change what's actually seen.

| Role | Color | Approx. contrast vs. background |
|---|---|---|
| Background | `#0A0E1A` (near-black navy) | — |
| Snake body | `#39FF14` (neon green) | 14.2:1 |
| Snake head | `#B6FF9E` (pale green) + eyes | 16.3:1 |
| Food | `#FF2E88` (hot pink) | 5.5:1 |
| Text | `#E6F1FF` (near-white) | 16.9:1 |
| Accent / titles | `#00E5FF` (cyan) | 12.5:1 |
| Grid lines | `#1A2238` (subtle; decorative only) | n/a |

All key elements are well above the 3:1 (graphics) and 4.5:1 (text) targets. Snake and food also differ in **shape**, not just color (NFR-8): the snake is made of rounded squares and the food is a circle.

---

## 7. Testing Strategy

### 7.1 Automated tests (Node.js built-in test runner, TC-5)

Run with `npm test`, which runs `node --test`. Tests cover only the **pure** modules plus `storage.js` (with a fake storage object).

| Test file | What it checks | Requirements |
|---|---|---|
| `game.test.js` | New game starts correctly; moves one cell per step; wraps on all four edges; reversal input ignored; same-direction input ignored; only one turn can wait at a time, and a second press before the next step is ignored; "Up then Left" within one step can't cause a reversal; eating grows the snake and scores 10 × the pre-increase level; level and speed stop at the cap; interval values match the table; self-collision ends the game; **tail-collision cases (below)**; food never spawns on the snake; filling the board triggers victory | FR-3 – FR-8, FR-10, FR-14 |
| `state-machine.test.js` | Every row of the transition table; unlisted events change nothing | FR-2, FR-11 – FR-14 |
| `input.test.js` | Each key maps to the right action on each screen; unused keys map to nothing | FR-2, FR-3, FR-11 |
| `storage.test.js` | Missing or invalid value → 0; save/load round trip; blocked storage never throws | FR-15 |

**Dedicated tail-collision tests (5.2.1):**

| Test | Setup | Expected |
|---|---|---|
| T-TAIL-1 | A 4-segment snake in a 2×2 loop; the head's next cell is the current tail | Game continues; snake moves |
| T-TAIL-2 | The head's next cell is the segment just before the tail | `status = "dead"` |
| T-TAIL-3 | Tail-chasing loop held for several steps | Never dies |
| T-TAIL-4 | Snake eats (so its tail stays put that step); on the very next step the head moves into that tail cell | Allowed: it's still the last segment, and it leaves on this normal step. Confirms the rule always uses the **current** last segment. |
| T-TAIL-5 | Tail cell reached by **wraparound** (head at an edge, tail on the opposite edge) | Allowed, like T-TAIL-1 |

**Test-first for game rules:** for `game.js` we'll write each test *before* the code that makes it pass. This approach is called **test-driven development (TDD)**. It turns each requirement into an executable check, and it's a good way to learn what the code must do.

### 7.2 Manual test checklist (`planning/manual-test-checklist.md`, created in implementation)

These are things automated tests can't judge well: visuals, feel, real browsers. Each item lists its requirement ID and a pass/fail box. Examples:

- Start screen shows title, controls, best (FR-1); a new player starts within 10 s (NFR-4)
- Glow and neon look matches NFR-5; snake head is distinguishable without color (NFR-8)
- Switching tabs auto-pauses; only Space resumes (FR-12)
- "NEW HIGH SCORE!" appears correctly; best survives a page reload (FR-15, FR-16)
- Board fits and stays sharp at 1280×720, 1920×1080, and 4K, and when resizing (FR-17, NFR-9)
- OS reduced-motion setting turns off pulsing (NFR-6)
- Contrast values verified with a checker (NFR-7)
- Phone or touch emulation shows the desktop message (FR-18)
- Full pass in Chrome, Edge, Firefox, Safari (NFR-3, AC-3)
- Live Vercel URL loads and plays within 3 s (NFR-10, NFR-11, AC-1)

---

## 8. Development and Deployment Workflow

- **Local server:** run a static file server from the project folder and open `http://localhost:3000` (see A5).
- **Tests:** `npm test` before every commit that touches `js/`.
- **Commits:** small, one feature or fix each; messages reference requirement IDs where relevant.
- **Deployment:** later, connect Vercel to `ywbranche/snake-game`. Vercel serves the files as-is: no build command and no output directory setting. Every push to `main` deploys automatically.
- **Note:** `planning/` and `tests/` will also be reachable on the public site. That's harmless for a public repo; it can be excluded later if desired.

### Proposed implementation order (preview of Phase 3)

1. `package.json`, `config.js`, and `game.js` with its tests (TDD). The core rules, with no browser needed.
2. `state-machine.js` and `input.js` with tests.
3. `index.html` + `styles.css`: static layout and overlays.
4. `renderer.js`: draw a hard-coded game state.
5. `main.js`: game loop, keyboard, and screens wired together. First playable version.
6. `storage.js` with tests: personal best.
7. Polish: glow, pulse, reduced motion, mobile message, resizing.
8. Manual checklist, then connect Vercel and deploy.

Each step ends with tests passing, a review by the owner, and a commit.

---

## 9. Owner Decisions

| # | Decision | Outcome | Owner decision (2026-11-23) |
|---|---|---|---|
| A1 | Board size | 20 × 20 cells | ✅ Approved |
| A2 | Speed values | 150 ms start, ×0.94 per level, 60 ms floor, max level 16 | ✅ Approved |
| A3 | Movement style | Cell-by-cell jumps (classic) | ✅ Approved |
| A4 | `package.json` | Minimal: `"type": "module"` + a `test` script. **No dependencies.** It's a configuration file that tells Node to treat our files as modern modules and gives a short `npm test` command. | ✅ Approved |
| A5 | Local dev server | `npx serve`. It downloads the small `serve` tool temporarily when run; nothing is added to the project. | ✅ Approved |
| A6 | Mobile behavior | "Desktop only" message shown **instead of** the game | ✅ Approved |
| A7 | Direction queue limit | **1 waiting turn**, applied on the next step (§5.4) | ✏️ **Changed** from the proposed 2 to 1 |
| A8 | Color palette | As in §6, with calculated contrast values | ✅ Approved, conditional on the corrected contrast values being in §6 (done) |

### Assumptions (confirmed by owner, 2026-11-23)

- Enter on Game Over/Victory starts a new game immediately (no return to Start).
- Personal best is saved immediately whenever it increases, not only at game end.
- Pausing is the only effect of losing focus; regaining focus does **not** auto-resume (FR-12).
- Board stays visible, dimmed, behind the Paused, Game Over, and Victory overlays.
- The fonts used are system fonts only, so nothing extra downloads. A custom web font would need approval as a new dependency.
- When a turn is already waiting, further arrow presses in that step are ignored (§5.4, Q1).
- The head may move into the tail's current cell (§5.2.1).

### Resolved questions

| # | Question | Owner decision (2026-11-23) |
|---|---|---|
| Q1 | With one waiting turn, what happens to a second arrow press in the same step: (a) ignore it, or (b) replace the waiting turn? | **(a) Ignore.** The first valid press in a step wins; later presses in that step are dropped. |

No open questions remain.

---

## 10. Revision History

| Version | Date | Summary |
|---|---|---|
| 0.1 | 2026-11-23 | First draft for owner review. |
| 0.2 | 2026-11-23 | Owner decisions A1–A8 recorded. A7 changed to 1 queued turn (§3.1, §5.4, §6, §7.1). Contrast values replaced with calculated ratios. Tail-collision rule made explicit (§5.2.1) with dedicated tests (T-TAIL-1 to 5); the incorrect "eating" exception from v0.1 removed. Open question Q1 added, then resolved: (a) ignore extra presses. Still a draft. |
| 1.0 | 2026-11-23 | Assumptions confirmed; design approved by owner for the Implementation phase. |
