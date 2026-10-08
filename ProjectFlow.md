# Project flow

What we are building, the order we are building it in, and how it is going. Updated after every working step. Decisions and their reasons live in [Decision.md](Decision.md).

## Where we are now

*Last updated: 2026-10-09*

Phase 0, the web prototype, is in progress. The growth engine is built and all 172 of its automated tests pass. The prototype page has not been started. The avatar step is waiting on two open questions, Q-1 and Q-2 in [Decision.md](Decision.md).

## The road map

| Phase | What it delivers | Status |
| --- | --- | --- |
| Phase 0: web prototype | One web page where you log sets, watch the avatar grow, skip ahead a week and replay a fight. No backend, no accounts. | In progress since 2026-10-07 |
| Later: mobile app | The real app for Android and iOS, built with Expo. | Not started |
| Later: server | The online side, built with Firebase. | Not started |

The later phases are described in the owner's architecture doc. They will be broken into steps here when they begin.

## Phase 0 steps

Phase 0 is done when the tests pass, `npm run dev` shows the page, and a non-coder can use it without help. The spec allows 1 to 2 weeks for it.

| # | Step | Status | Notes |
| --- | --- | --- | --- |
| 1 | Set up the repository and workspaces | Done 2026-10-07 | |
| 2 | Build the growth engine rules | Done 2026-10-07 | |
| 3 | Write tests for every engine rule | Done 2026-10-07 | 172 tests passing when checked on 2026-10-09 |
| 4 | Create the prototype page (Vite, React, TypeScript) | Not started | |
| 5 | Log sets on the page | Not started | |
| 6 | Show an avatar that grows, with front and back views | Waiting on a decision | Q-1 and Q-2 |
| 7 | Skip ahead a week | Not started | |
| 8 | Score the weekly match | Not started | The rules are in the spec but are not built yet |
| 9 | Replay a fight between two avatars | Not started | |

## How the pieces fit together

1. **You log your sets.** Each set is an exercise, a number of reps and a weight.
2. **The growth engine does the maths.** Once a week it turns the logged sets into a size and a definition score for each of the 19 muscle regions. It is the only part allowed to compute those scores.
3. **The avatar is drawn from those scores.** Each region is shown at its current size, so a muscle you train gets visibly bigger.
4. **The weekly match is scored.** Each player gets 0 to 100 points for plan completion, effort and personal bests.
5. **The fight replay plays.** Points decide who wins. The avatars' muscles only shape how the fight looks.

Parts 1 and 2 exist in the engine today. Parts 3 to 5 are still to build.

## How to check things yourself

Type these in the terminal from the project folder.

| Command | What it does |
| --- | --- |
| `npm test` | Runs every engine test. All of them should say "passed". |
| `npm run curve` | Prints a week-by-week table of how one muscle grows for a beginner. |

`npm run dev`, which opens the prototype page, will work once step 4 is done.

## Progress log

Newest first.

- **2026-10-09:** Researched ways to add a 3D avatar. The ready-made avatar services either closed or cost too much, so the proposal is our own body model (Q-1 and Q-2). Started the decision log and this file.
- **2026-10-07:** Set up the repository with the `engine` workspace. Built the growth engine rules and a test for every rule. A beginner doing 9 hard sets a week reaches size 50 in week 15, 80 in week 34 and 90 in week 49, which matches the targets in the spec.

## Next up

1. Settle Q-1 and Q-2 so the avatar step can start.
2. Create the prototype page (step 4).
3. Add set logging to the page (step 5).
