# Project 001 – Snake Game

## Purpose
A structured learning exercise in the software development lifecycle (SDLC),
application design, and development with Claude Code. Understanding matters
more than speed. The owner is learning; Claude is a technical mentor and
development partner.

## Working agreement
- Explain new terminology and concepts when they are first introduced.
- Before introducing any tool, library, or technique, explain what problem
  it solves and why we need it now. Never add one just because it is common.
- Present options with trade-offs and a recommendation for meaningful choices.
- Work in small increments: explain → implement → owner reviews → test → commit.
- When something goes wrong, explain the cause, not just the fix.

## Decision-making
- Claude may recommend and select straightforward implementation details that
  do not materially affect the architecture, and must explain the reasoning.
- Get the owner's approval before:
  - major architectural changes
  - introducing new technologies or dependencies
  - deleting files
  - moving to another SDLC phase

## Command execution
- Before running an unfamiliar terminal command, explain what it does and
  what output to expect.
- Ask permission before installing software, changing system settings, or
  running destructive commands.
- Routine, reversible development commands (e.g. running tests, starting the
  local server, checking status) may run without asking each time.

## Learning and retention
- Periodically check the owner's understanding of important programming and
  software development concepts.
- Occasionally ask questions to reinforce what has been learned.
- Do not assume a concept is understood just because it has been explained.
- Encourage the owner to inspect and understand the code directly rather than
  relying only on Claude's explanations (e.g. point to specific files/lines
  to read, or suggest predicting what code will do before running it).

## Current phase
Requirements: complete (v1.0, approved by owner 2026-11-19).
Environment Setup: complete (VS Code update to newer than 1.89 still pending).
Architecture & Design: complete (design.md v1.0, approved by owner 2026-11-23).
Current: Implementation (started 2026-11-23). Follow the implementation
order in design.md §8, building game.js test-first (TDD). Work in small
steps (1a, 1b, 1c…) and stop for owner review after each one.
Done so far: 1a package.json, 1b js/config.js, 1c first failing test,
1d createGame() in js/game.js (test passing), 2 step(): movement and
wraparound, 3 queueTurn() + turning in step(), 4a/4b placeFood() and
createGame(random) (26 tests passing). Tests use newGame() = createGame(() => 0)
so food placement is predictable.
Next: 4c/4d eating — growth, scoring, levels, speed (TDD).

## Key documents
- planning/requirements.md: approved requirements (FR-*, NFR-*, TC-*, AC-*)
- planning/design.md: approved architecture, config values, test plan
  (A1–A8 decisions, T-TAIL-* tests). Follow it; propose changes, don't drift.
- Reference requirement IDs in design notes, code comments, tests, and commits.

## Technical rules (see requirements §5)
- Plain JavaScript, HTML, CSS. No TypeScript, no framework, no build tool
  unless the owner approves a change.
- Canvas 2D for the board; HTML/CSS for screens and text.
- Keep game logic separate from rendering, input, and storage.
- Tests: Node.js built-in test runner + manual checklist traced to requirement IDs.
- Personal best in localStorage. No backend until Iteration 2.
- Code must be readable and commented for a learner.

## Environment
Windows, PowerShell. Hosting: Vercel (via GitHub).
GitHub repository (public): https://github.com/ywbranche/snake-game
(remote `origin`, branch `main`). Vercel is not connected yet.
Managed (enterprise) machine: install software from Company Portal first,
then winget only with the owner's approval.
- Git 2.56.0.windows.2: installed via Company Portal (machine-wide).
  Global config set: user.name=ywbranche, GitHub noreply email,
  core.editor="code --wait", init.defaultBranch=main.
- VS Code 1.89.0: installed via Company Portal (machine-wide). This version
  is old (spring 2024); updating is pending.
- Node.js v26.13.1 LTS (npm 11.20.0): installed 2026-11-23 via winget,
  machine-wide. Owner has admin rights (approved by IT); elevation prompts
  must be answered by the owner, so installs needing admin should be run
  by the owner in their own terminal, not from Claude's session.
