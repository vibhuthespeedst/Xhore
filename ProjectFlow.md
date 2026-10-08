# Project flow

What we are building, the order we are building it in, how the parts connect, and how it is going. Updated every time something is done on the project. Decisions and their reasons live in [Decision.md](Decision.md).

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
| 5 | Log sets on the page | Not started | Needs Q-6 settled |
| 6 | Show an avatar that grows, with front and back views | Waiting on a decision | Q-1 and Q-2 |
| 7 | Skip ahead a week | Not started | |
| 8 | Score the weekly match | Not started | The rules are in the spec but are not built yet |
| 9 | Replay a fight between two avatars | Not started | |

## The parts and how they connect

This is the map of the project. Each part does one job and is kept apart from the others, so any change can be traced to one place. When a part is added or changed, its row here is updated in the same step.

### The four big parts

| Part | Folder | Its one job | Status |
| --- | --- | --- | --- |
| Growth engine | [engine/](engine/) | The rules of the game. It turns logged sets into muscle size and definition, and has no screen of its own. | Built |
| Prototype page | `prototype/` | The web page for trying the game. It shows things and collects what you type. | Not started |
| Mobile app | `app/` | The real Android and iOS app. | Later |
| Server | `functions/` | The online side, built with Firebase. | Later |

The page, the app and the server all use the same engine, and the engine uses none of them. That is why the rules only have to be written and tested once.

### How the parts are kept separate

- Each feature gets its own folder and never reaches into another feature's code.
- Features do not call each other. One feature produces a piece of data or announces that something happened, and the next one reacts to it. The pieces of data are listed under "What gets handed from part to part" below.
- Each piece of data has one writer. Only the growth engine may work out an avatar's size and definition.
- Optional features have an off switch, and the game still works with one switched off.
- Everything outside the engine reaches it through one front door, [engine/src/index.ts](engine/src/index.ts). The inside of the engine can then change without breaking the page or the app.

### Inside the growth engine

All of these are built. Their tests live in [engine/tests/](engine/tests/), in files named after the rule they check.

| Part | What it does | File |
| --- | --- | --- |
| Settings | Holds every tuning number and the on/off switches for the optional rules. | [config.ts](engine/src/config.ts) |
| Muscle regions | Lists the 19 regions the avatar is made of. | [regions.ts](engine/src/regions.ts) |
| Exercises | Lists the 14 exercises and how much each one trains each region. | [exercises.ts](engine/src/exercises.ts) |
| Intensity | Judges how hard one set was compared with your usual. | [intensity.ts](engine/src/intensity.ts) |
| Weekly stimulus | Leaves out sets that don't count, adds up the week's training for each region, and applies trust credit. | [stimulus.ts](engine/src/stimulus.ts) |
| Size | Works out weekly growth, shrinking after a break, and faster regrowth. | [growth.ts](engine/src/growth.ts) |
| Definition | Works out the definition score from how consistent the last 4 weeks were. | [definition.ts](engine/src/definition.ts) |
| Avatar | Creates a new avatar and moves one forward by a week. It runs the parts above in order: shrink, grow, then definition. | [avatar.ts](engine/src/avatar.ts) |
| Data shapes | Describes exactly what a session, an avatar and a week's report contain. | [types.ts](engine/src/types.ts) |
| Helpers | Small date and number tools used by the parts above. | [time.ts](engine/src/time.ts), [math.ts](engine/src/math.ts) |

### What gets handed from part to part

These pieces of data are the only way the parts talk to each other.

| Data | What it holds | Made by | Read by | Exists today |
| --- | --- | --- | --- | --- |
| Session | One gym visit: when it happened, whether it was self-reported or friend-confirmed, and its sets (exercise, reps, weight). | Set logging | Growth engine | Shape defined, nothing makes it yet |
| Baselines | Your usual weight or reps for each exercise, used to judge effort. | Not decided yet (Q-6) | Growth engine | Shape defined, nothing makes it yet |
| Avatar state | For each of the 19 regions: size, definition, starting size, best size reached and when it was last trained. It also keeps the last 4 weeks of hard-set counts, which definition needs. | Growth engine only | Avatar view, fight replay | Yes |
| Week report | What one week did: sets counted and skipped, average intensity, and each region's size and definition before and after. | Growth engine only | Weekly match, the page | Yes |
| Match points | A player's score for the week, 0 to 100. | Weekly match | Fight replay | Not yet |

### Features on the page

None of these are built yet. Each gets its own folder inside `prototype/` when its step starts.

| Feature | What it does | Reads | Hands on | Step |
| --- | --- | --- | --- | --- |
| Set logging | You pick an exercise, enter reps and weight, and mark the session as self-reported or friend-confirmed. | What you type | Sessions | 5 |
| Avatar view | Draws the avatar, front and back, with each region at its current size. | Avatar state | Nothing, it only displays | 6 |
| Skip a week | Moves time forward one week and asks the engine to process it. | Sessions, avatar state | New avatar state, week report | 7 |
| Weekly match | Scores a player's week out of 100 for plan completion, effort and personal bests. | Week report, sessions planned and done | Match points | 8 |
| Fight replay | Plays a repeatable fight between two avatars. Points decide the winner, and muscles only shape the style. | Match points, two avatar states | Nothing, it only displays | 9 |

### The loop, from a set to a fight

1. **You log your sets.** Each set is an exercise, a number of reps and a weight.
2. **The growth engine does the maths.** Once a week it turns the logged sets into a size and a definition score for each of the 19 muscle regions.
3. **The avatar is drawn from those scores.** Each region is shown at its current size, so a muscle you train gets visibly bigger.
4. **The weekly match is scored.** Each player gets 0 to 100 points for plan completion, effort and personal bests.
5. **The fight replay plays.** Points decide who wins. The avatars' muscles only shape how the fight looks.

Only step 2 is built today. Steps 1, 3, 4 and 5 are still to build.

### Where to look when something needs changing

| If you want to... | Look here |
| --- | --- |
| Make muscles grow, shrink or regrow faster or slower | [config.ts](engine/src/config.ts) |
| Switch off decay, definition, trust credit or double-speed regrowth | The `features` switches in [config.ts](engine/src/config.ts) |
| Add an exercise, or change which muscles one trains | [exercises.ts](engine/src/exercises.ts) |
| Add a muscle region | [regions.ts](engine/src/regions.ts), then give it exercises in [exercises.ts](engine/src/exercises.ts) |
| Change how a set's effort is judged | [intensity.ts](engine/src/intensity.ts) |
| Change which sets count, or how trust credit is applied | [stimulus.ts](engine/src/stimulus.ts) |
| Change the formula for growth, shrinking or regrowth | [growth.ts](engine/src/growth.ts) |
| Change how definition is worked out | [definition.ts](engine/src/definition.ts) |
| Change what a saved avatar stores | [types.ts](engine/src/types.ts). Add fields only, never rename or remove them (D-008). |
| Find out why a test failed | [engine/tests/](engine/tests/), in the file named after the rule |
| Change how the avatar looks | Not built yet (step 6) |
| Change match scoring or the fight | Not built yet (steps 8 and 9) |

## How to check things yourself

Type these in the terminal from the project folder.

| Command | What it does |
| --- | --- |
| `npm test` | Runs every engine test. All of them should say "passed". |
| `npm run curve` | Prints a week-by-week table of how one muscle grows for a beginner. |

`npm run dev`, which opens the prototype page, will work once step 4 is done.

## Progress log

Newest first.

- **2026-10-09:** Researched ways to add a 3D avatar. The ready-made avatar services either closed or cost too much, so the proposal is our own body model (Q-1 and Q-2). Started the decision log and this file, then added the map of parts to this file. Writing the map showed that nobody has decided where a player's usual weights come from, so that is now Q-6.
- **2026-10-07:** Set up the repository with the `engine` workspace. Built the growth engine rules and a test for every rule. A beginner doing 9 hard sets a week reaches size 50 in week 15, 80 in week 34 and 90 in week 49, which matches the targets in the spec.

## Next up

1. Settle Q-1 and Q-2 so the avatar step can start.
2. Create the prototype page (step 4).
3. Settle Q-6, then add set logging to the page (step 5).
