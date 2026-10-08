# Project flow

What we are building, the order we are building it in, how the parts connect, and how it is going. Updated every time something is done on the project. Decisions and their reasons live in [Decision.md](Decision.md). The design we are building toward lives in [Architecture.md](Architecture.md).

## Where we are now

*Last updated: 2026-10-09*

Phase 0, the web prototype, is in progress. The growth engine is built and all 172 of its automated tests pass. The prototype page now runs and reads its numbers from the growth engine. The design for the 3D avatar and for the first game, a one-on-one arena fighter, is written down in [Architecture.md](Architecture.md). The avatar is being built next.

## Waiting on the owner

The owner gave the OK for three.js and for Blender with MPFB on 2026-10-09 (D-036).

| What | Why it is needed | Needed for |
| --- | --- | --- |
| A free Adobe account, later | The largest free set of fight animations, Mixamo, needs a sign-in. Only the owner can do that. | Step 12 |

## The road map

| Phase | What it delivers | Status |
| --- | --- | --- |
| Phase 0: web prototype | One web page where you log sets, watch the avatar grow, skip ahead a week and replay a fight. No backend, no accounts. | In progress since 2026-10-07 |
| Later: mobile app | The real app for Android and iOS, built with Expo. | Not started |
| Later: server | The online side, built with Firebase. | Not started |

The later phases are described in the owner's architecture doc. They will be broken into steps here when they begin.

## Phase 0 steps

Phase 0 is done when the tests pass, `npm run dev` shows the page, and a non-coder can use it without help. The spec allowed 1 to 2 weeks for it. The real 3D body and the fight game have been added since, so it will take longer than that.

| # | Step | Status | Notes |
| --- | --- | --- | --- |
| 1 | Set up the repository and workspaces | Done 2026-10-07 | |
| 2 | Build the growth engine rules | Done 2026-10-07 | |
| 3 | Write tests for every engine rule | Done 2026-10-07 | 172 tests passing when checked on 2026-10-09 |
| 4 | Create the prototype page (Vite, React, TypeScript) | Done 2026-10-09 | `npm run dev` opens it |
| 5 | Log sets on the page | Not started | Needs Q-6 settled |
| 6 | Show a 3D avatar that grows, using a stand-in body built in code | Not started | |
| 7 | Build the real 3D body and swap it in | Not started | Blender is downloaded to `E:\XhoreTools` and waiting to be unpacked |
| 8 | Skip ahead a week | Not started | |
| 9 | Score the weekly match | Not started | The rules are in the spec but are not built yet |
| 10 | Add the game contract and the game list | Not started | This is what lets a game be switched off or deleted safely |
| 11 | Build the fight rules with one fighting style, boxing | Not started | Tested without graphics, like the growth engine |
| 12 | Replay a fight between two avatars | Not started | Needs fight animations |

After Phase 0: a second fighting style (Q-10), then a fight you play against a computer-controlled copy of your opponent (Q-9), then the phone app.

## The parts and how they connect

This is the map of the project. Each part does one job and is kept apart from the others, so any change can be traced to one place. When a part is added or changed, its row here is updated in the same step. The full design, including the parts that are not built yet, is in [Architecture.md](Architecture.md).

### The big parts

| Part | Folder | Its one job | Status |
| --- | --- | --- | --- |
| Growth engine | [engine/](engine/) | The rules of the game. It turns logged sets into muscle size and definition, and has no screen of its own. | Built |
| Shared kits | `shared/avatar-kit/`, `shared/game-api/` | What every game needs: the 3D avatar, and the contract that games follow. | Planned |
| Games | `games/arena-fight/` | One folder per game. Each is a plug-in that can be removed. The first is the arena fighter. | Planned |
| Prototype page | [prototype/](prototype/) | The web page for trying everything. It shows things and collects what you type. | Started. The page runs and reads the engine. |
| Mobile app | `app/` | The real Android and iOS app. | Later |
| Server | `functions/` | The online side, built with Firebase. | Later |

The page, the app, the games and the server all use the same engine, and the engine uses none of them. That is why the rules only have to be written and tested once.

### How the parts are kept separate

- Each feature gets its own folder and never reaches into another feature's code.
- Features do not call each other. One feature produces a piece of data or announces that something happened, and the next one reacts to it. The pieces of data are listed under "What gets handed from part to part" below.
- Each piece of data has one writer. Only the growth engine may work out an avatar's size and definition.
- Optional features have an off switch, and the game still works with one switched off.
- Everything outside the engine reaches it through one front door, [engine/src/index.ts](engine/src/index.ts). The inside of the engine can then change without breaking the page or the app.
- Every game is a plug-in. It is named in one place only, the game list, so switching it off or deleting its folder affects nothing else. Sections 3 and 4 of [Architecture.md](Architecture.md) describe how.

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
| Avatar state | For each of the 19 regions: size, definition, starting size, best size reached and when it was last trained. It also keeps the last 4 weeks of hard-set counts, which definition needs. | Growth engine only | Avatar view, games | Yes |
| Week report | What one week did: sets counted and skipped, average intensity, and each region's size and definition before and after. | Growth engine only | Weekly match, the page | Yes |
| Match points | A player's score for the week, 0 to 100. | Weekly match | The page, games | Not yet |
| Player snapshot | A read-only copy of each player's avatar state and match points, handed to a game when it starts. | The game list | A game | Not yet |
| Game events | "Started", "finished" with the result, or "failed". | A game | The page | Not yet |

### Features on the page

None of these are built yet. Each gets its own folder inside `prototype/` when its step starts.

| Feature | What it does | Reads | Hands on | Step |
| --- | --- | --- | --- | --- |
| Set logging | You pick an exercise, enter reps and weight, and mark the session as self-reported or friend-confirmed. | What you type | Sessions | 5 |
| Avatar view | Shows the 3D avatar with each region at its current size. You can turn it to see the front and back. It uses the avatar kit. | Avatar state | Nothing, it only displays | 6 and 7 |
| Skip a week | Moves time forward one week and asks the engine to process it. | Sessions, avatar state | New avatar state, week report | 8 |
| Weekly match | Scores a player's week out of 100 for plan completion, effort and personal bests. | Week report, sessions planned and done | Match points | 9 |
| Game list | Shows a button for each game that is switched on, and starts the one you pick. | Avatar state, match points | A player snapshot for the game | 10 |

### Games

Every game is a separate plug-in that only reads the avatar state. Adding a game never changes the growth engine, and a game can be switched off or deleted without breaking the rest.

| Game | What it is | Folder | Status |
| --- | --- | --- | --- |
| Arena fight, watched | The weekly match replay. You watch your avatar fight your opponent's, and the week's points decide the winner. | `games/arena-fight/` | Planned for Phase 0 (steps 11 and 12) |
| Arena fight, played | You control your avatar against a computer-controlled copy of your opponent's. | `games/arena-fight/` | Planned after Phase 0 |
| Football and other sports | Team matches that reuse the same avatars. | A new folder under `games/` | Idea for later |
| Open world | A shared world to walk around in. | A new folder under `games/` | Idea for later |

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
| Change how the avatar looks | Not built yet (steps 6 and 7). It will live in `shared/avatar-kit/`. |
| Change match scoring | Not built yet (step 9) |
| Switch a game off, or remove one | Not built yet (step 10). It will be the game list on the page. |
| Change a fighting move or a style | Not built yet (step 11). It will live in `games/arena-fight/content/`. |
| Change the rules of a fight | Not built yet (step 11). It will live in `games/arena-fight/core/`. |
| Change how a fight looks | Not built yet (step 12). It will live in `games/arena-fight/view/`. |

## How to check things yourself

Type these in the terminal from the project folder.

| Command | What it does |
| --- | --- |
| `npm test` | Runs every engine test. All of them should say "passed". |
| `npm run curve` | Prints a week-by-week table of how one muscle grows for a beginner. |
| `npm run dev` | Starts the prototype page. It prints an address, normally `http://localhost:5173`. Open that in your browser. Press `Ctrl+C` in the terminal to stop it. |
| `npm run typecheck` | Checks all the code for mistakes without running it. No output after the headings means no mistakes. |

## Progress log

Newest first.

- **2026-10-09:**
  - The owner said yes to three.js and to Blender with MPFB, and asked to start with the avatar (D-036). Blender 4.5.14 was downloaded to `E:\XhoreTools`, outside the project (D-037).
  - Step 4 done: the prototype page exists. It shows the 19 muscle regions and their starting sizes, read straight from the growth engine, and the numbers change when you pick a different experience level. Checked by opening the page in a browser and clicking the buttons.
  - Researched ways to add a 3D avatar. The ready-made avatar services either closed or cost too much, so we build our own body.
  - Started the decision log and this file, then added the map of parts. Writing the map showed that nobody has decided where a player's usual weights come from, so that is now Q-6.
  - The owner set the avatar requirements: free at the start, a fighting-game look, and room for other game modes (D-025 to D-027).
  - The owner asked for the method to be chosen for a team that cannot use a game-engine editor or hire. Checked how to get the avatar and how a Tekken-style fighter is built, then wrote [Architecture.md](Architecture.md). The decisions are D-028 to D-035.
  - What the checks found: the free body tool already has muscle shapes for separate body parts. Fighting games are built as a set of rules that runs in fixed steps, kept separate from the graphics. Blender is not yet on the owner's computer.
- **2026-10-07:** Set up the repository with the `engine` workspace. Built the growth engine rules and a test for every rule. A beginner doing 9 hard sets a week reaches size 50 in week 15, 80 in week 34 and 90 in week 49, which matches the targets in the spec.

## Next up

1. Add the avatar screen with the stand-in body (step 6). The owner asked for the avatar first, so it comes before set logging.
2. Build the real 3D body with Blender and swap it in (step 7).
3. Settle Q-6, then add set logging to the page (step 5).
