# Snake Game — Requirements Specification

| | |
|---|---|
| **Project** | Project 001 – Snake Game |
| **Document version** | 1.0 |
| **Status** | Approved |
| **Date** | 2026-11-19 |
| **Phase** | Planning & Requirements (complete) → next: Architecture & Design |

---

## 1. Project Overview

A browser-based Snake game with a modern neon-arcade look, playable by anyone with a desktop browser and shareable through a public URL.

The project's **primary purpose is learning**: it is a structured exercise for understanding the software development lifecycle (SDLC), application design, and development with Claude Code. Where learning value and convenience conflict, learning value wins. Visual polish matters where it improves the player experience, but it is not the main goal.

## 2. Scope and Objectives

### 2.1 Objectives

1. Complete a full pass through the SDLC: requirements → design → implementation → testing → deployment.
2. Build a complete, playable game that meets every acceptance criterion in Section 6.
3. Deploy it publicly on Vercel so it can be shared by link.
4. Understand the purpose of every tool, technique, and design decision used.

### 2.2 Target Users

Anyone on the internet using a **desktop browser with a keyboard**. Players need no account, installation, or instructions beyond what the start screen shows.

### 2.3 In Scope (MVP)

- Single-player Snake gameplay with wraparound edges, increasing speed, and level-based scoring
- Start, playing, paused, game-over, and victory screens
- Personal best saved in the player's browser
- Neon-arcade visual design that meets accessibility requirements
- Public deployment on Vercel

### 2.4 Out of Scope (MVP)

- Global leaderboard, backend, database (→ Iteration 2, Section 7)
- Mobile/touch controls, sound and music, and other enhancements (→ Section 7.2)

---

## 3. Functional Requirements

Functional requirements describe **what the system does**. Priorities follow **MoSCoW**: Must / Should / Could / Won't (this time).

### 3.1 Game Flow and Screens

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | The start screen shows the game title, the controls, and the player's personal best. | Must |
| FR-2 | Pressing **Enter** on the start screen starts a new game. | Must |
| FR-11 | Pressing **Spacebar** during play pauses the game and shows a pause screen. Pressing **Spacebar** on the pause screen resumes play. | Must |
| FR-12 | The game pauses automatically when the browser tab or window loses focus. It stays paused until the player presses **Spacebar**. | Must |
| FR-13 | When the game ends, a game-over screen shows the final score and personal best. Pressing **Enter** starts a new game. | Must |
| FR-14 | When the snake fills every cell of the board, a victory screen shows the final score and personal best. Pressing **Enter** starts a new game. | Must |

### 3.2 Movement and Controls

| ID | Requirement | Priority |
|---|---|---|
| FR-3 | The snake moves continuously in its current direction. The **arrow keys** change its direction. | Must |
| FR-4 | Direction inputs are **queued**, and at most one direction change is applied per movement step. An input that would reverse the snake directly into itself is ignored. This check is made against the direction the snake will be travelling when that input is applied. | Must |
| FR-5 | When the snake's head leaves one edge of the board, it re-enters from the opposite edge (wraparound). | Must |

### 3.3 Food, Growth, Speed, and Scoring

| ID | Requirement | Priority |
|---|---|---|
| FR-6 | Exactly one food item is on the board at a time, placed in a random cell the snake does not occupy. Eating it grows the snake by one segment and places a new food item. | Must |
| FR-7 | The **speed level** starts at 1 and increases by 1 each time food is eaten. Each level is approximately 5–8% faster than the previous one. Speed is capped at approximately 2.5× the starting speed. Once the cap is reached, the speed level stops increasing. *(Exact values are set in technical design.)* | Must |
| FR-8 | Each food awards **10 × the speed level at the moment it is eaten**, before the level increases. Once the speed cap is reached, points per food stop increasing. | Must |
| FR-10 | The game ends when the snake's head collides with its own body. Hitting the board's edges never ends the game (see FR-5). | Must |

### 3.4 Score Display and Personal Best

| ID | Requirement | Priority |
|---|---|---|
| FR-9 | During play, the screen shows the current score, personal best, and speed level. | Must |
| FR-15 | The personal best is saved in the player's browser and persists between visits. If browser storage is unavailable, the game still works without saving. | Must |
| FR-16 | When the current score passes the stored personal best, the personal-best display updates immediately. The game-over or victory screen then shows a noticeable **"NEW HIGH SCORE!"** message. On a player's first-ever game, any score above zero counts as a new high score. | Must |

### 3.5 Display and Devices

| ID | Requirement | Priority |
|---|---|---|
| FR-17 | The board has a **fixed number of cells** (the same for every player). It scales to fit the browser window. | Must |
| FR-18 | Visitors on mobile or touch-only devices see a message saying the game is designed for desktop browsers with a keyboard. | Should |

### 3.6 Controls Summary

| Key | Context | Action |
|---|---|---|
| Enter | Start screen | Start game |
| Enter | Game-over / victory screen | Start new game |
| Arrow keys | Playing | Change direction |
| Spacebar | Playing | Pause |
| Spacebar | Paused | Resume |

---

## 4. Non-Functional Requirements

Non-functional requirements describe **how well** the system performs its functions.

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Animation shows no visible stutter on a typical desktop computer. |
| NFR-2 | Responsiveness | A queued direction input takes effect on the next movement step. |
| NFR-3 | Compatibility | The game works in the current versions of Chrome, Edge, Firefox, and Safari on desktop. |
| NFR-4 | Usability | A first-time player can start a game within 10 seconds of page load, using only on-screen information. |
| NFR-5 | Visual design | Neon-arcade style with a modern interface: dark background, vibrant glowing snake, bright food, subtle gradients, and clean typography. It should feel like a polished modern arcade game, not a pixel-art recreation. |
| NFR-6 | Accessibility – motion | When the operating system's "reduce motion" preference is on, pulsing, glowing, and other decorative animations are reduced or turned off. |
| NFR-7 | Accessibility – contrast | Text meets WCAG 2.1 AA contrast (at least 4.5:1). The snake, food, and other key game elements have at least 3:1 contrast against the background. |
| NFR-8 | Accessibility – color | Important information is never shown by color alone. For example, the snake's head is visually distinct by shape, and game states are labeled with text. |
| NFR-9 | Display | The layout works correctly in desktop windows from about 1280×720 up to 3840×2160 (4K). |
| NFR-10 | Availability | The game is reachable at a public Vercel URL. |
| NFR-11 | Load time | The game is playable within 3 seconds of opening the URL on a typical broadband connection. |
| NFR-12 | Maintainability | Code is organized into clearly separated responsibilities and commented so the project owner, a learner, can understand and change it. |
| NFR-13 | Cost | The project runs entirely on free tiers. |

---

## 5. Technical Constraints

Constraints are decisions or limits fixed up front. Design choices must work within them.

| ID | Constraint | Rationale |
|---|---|---|
| TC-1 | **Plain JavaScript**, HTML, and CSS (no TypeScript in the MVP) | These are the browser's native languages, and they keep every concept visible. TypeScript is a candidate for a later project. |
| TC-2 | **No frontend framework** (vanilla JS) | Snake is small enough that a framework would hide the concepts being learned: the game loop, state, rendering, and input. |
| TC-3 | **Canvas 2D** for the game board; **HTML/CSS** for screens, text, and score display | Canvas gives smooth, glowing animation. HTML gives sharp, accessible, easily styled text. |
| TC-4 | **No build tool** in the MVP. Plain files are served by a local development server. | The code you write is exactly the code the browser runs. A build tool (e.g. Vite) gets introduced only when the project has a problem it solves. |
| TC-5 | **Node.js built-in test runner** for automated tests of game logic, plus a **manual test checklist** traced to requirement IDs | No extra dependencies. Every requirement can be verified. |
| TC-6 | **Git** for version control, **GitHub** for remote hosting, and **Vercel** connected to GitHub for automatic deployment | Every change is tracked. Pushing a change deploys it. |
| TC-7 | **`localStorage`** for personal-best persistence | Built into every browser; no backend needed for the MVP. |
| TC-8 | Game logic is kept separate from rendering, input, and storage | Makes the logic testable in isolation (TC-5) and easier to understand (NFR-12). |
| TC-9 | Hosting on **Vercel**; free tier only | Project decision (NFR-10, NFR-13). |
| TC-10 | Desktop browsers with keyboard input only | Project decision (see FR-18). |

### 5.1 Development Environment

| Tool | Purpose |
|---|---|
| Code editor (VS Code) | Read, navigate, and edit code |
| Node.js (LTS) | Run JavaScript outside the browser, for the local dev server and automated tests |
| Git | Track every change to the project |
| Browser DevTools | Inspect, debug, and measure the running game |
| Claude Code | Development partner: explains, proposes, and implements in small reviewed steps |

### 5.2 Deferred to Technical Design

These values will be decided during architecture and design. Each one must satisfy the requirements above.

- Board dimensions (in cells), starting snake length, and starting position
- Starting speed (time per movement step), the exact per-level speed multiplier (within 5–8%), and the resulting maximum level
- Game-loop timing approach (rendering rate vs. movement rate)
- Method for detecting mobile/touch devices (FR-18)
- Color palette values that satisfy NFR-7
- File and module structure

---

## 6. Acceptance Criteria

The MVP is **complete** when all of the following are true:

| ID | Criterion | Verified by |
|---|---|---|
| AC-1 | The game is accessible through a public URL. | NFR-10 |
| AC-2 | Core gameplay works as specified: all **Must** functional requirements pass their tests. | FR-1 – FR-17 |
| AC-3 | The game works in major desktop browsers. | NFR-3 |

---

## 7. Iteration 2 and Future Enhancements

### 7.1 Iteration 2 — Global Leaderboard

- Players can submit a score with a display name after a game.
- Anyone can view the top scores.
- Requires introducing a **backend** (e.g. Vercel Functions) and a **database**.
- To be decided in Iteration 2's requirements phase: display-name rules, content moderation, cheating prevention, how many scores are shown, and free-tier limits.
- The fixed grid size (FR-17) keeps scores comparable across players.

### 7.2 Future Enhancements (Won't Have in MVP)

- Sound effects and music
- Touch / mobile controls
- Obstacles or level layouts
- Power-ups and special food
- Visual themes
- Multiplayer
- Migration to TypeScript and/or a build tool, if the project grows enough to need them

---

## 8. Revision History

| Version | Date | Summary of changes |
|---|---|---|
| 0.1 | 2026-11-19 | Round 1: purpose (learning vehicle), target users, web platform on Vercel, arrow-key controls, initial success criteria. |
| 0.2 | 2026-11-19 | Round 2: desktop-only, wraparound walls, increasing speed, speed-scaled scoring, game states, neon visual direction. Global leaderboard moved to Iteration 2; first FR/NFR draft. |
| 0.3 | 2026-11-19 | Round 3: speed-level definition and cap, input queueing, victory screen, full control scheme, auto-pause, personal-best display, no sound in MVP, accessibility requirements, responsive board. Personal-best persistence promoted from Should to Must. |
| 1.0 | 2026-11-19 | Round 4: fixed scaled grid, scoring timing, high-score display rules, technical constraints, development environment. Requirements renumbered and grouped by area; approved for the architecture phase. |
