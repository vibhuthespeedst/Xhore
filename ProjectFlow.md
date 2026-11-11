# Project flow

What we are building, the order we are building it in, how the parts connect, and how it is going. Updated every time something is done on the project. Decisions and their reasons live in [Decision.md](Decision.md). The design we are building toward lives in [Architecture.md](Architecture.md).

## Where we are now

*Last updated: 2026-11-12*

Phase 0, the web prototype, is in progress. The growth engine is built. The prototype page shows a real 3D human body whose muscles grow from the engine's numbers: pick a weekly routine, skip ahead, and the trained muscles get bigger. The body was generated for free with Blender and MPFB by a script, and has a skeleton ready for animation. It has a photographic skin, eyes, eyebrows, eyelashes and hair, and since 2026-11-12 better lighting, so the skin looks less like plastic and the muscle shapes show. The owner has asked for the avatar to be made as realistic as possible before anything else, so that work continues with a breathing stance. All 262 automated tests pass. The design for the avatar and for the first game, a one-on-one arena fighter, is written down in [Architecture.md](Architecture.md).

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
| 6 | Show a 3D avatar that grows, using a stand-in body built in code | Done 2026-10-09 | Driven by a quick simulator until set logging exists |
| 7 | Build the real 3D body and swap it in | Done 2026-10-09 | First version. `npm run build:body` rebuilds it. Skin, eyes and hair are step 13. |
| 8 | Skip ahead a week | Not started | |
| 9 | Score the weekly match | Not started | The rules are in the spec but are not built yet |
| 10 | Add the game contract and the game list | Not started | This is what lets a game be switched off or deleted safely |
| 11 | Build the fight rules with one fighting style, boxing | Not started | Tested without graphics, like the growth engine |
| 12 | Replay a fight between two avatars | Not started | Needs fight animations |
| 13 | Give the body a detailed skin, eyes and hair | Done 2026-10-09 | From MPFB's free asset pack |
| 14 | Show definition muscle by muscle, with sharper muscle lines | Not started | Part of the owner's request to make the avatar realistic |
| 15 | Better lighting, and a breathing stance so the avatar does not stand like a statue | In progress | Part of the same request. Lighting done 2026-11-12. The breathing stance is next. |
| 16 | Make the exercise list far more detailed, with variations such as hammer curls and dumbbell curls | Not started | The owner's request. It comes after the avatar. Needs Q-13 settled. |

The owner's order of work, set on 2026-10-09: finish the avatar properly first (steps 14 and 15), then the exercise list (step 16), then the remaining steps above.

After Phase 0: a second fighting style (Q-10), then a fight you play against a computer-controlled copy of your opponent (Q-9), then the phone app.

## The parts and how they connect

This is the map of the project. Each part does one job and is kept apart from the others, so any change can be traced to one place. When a part is added or changed, its row here is updated in the same step. The full design, including the parts that are not built yet, is in [Architecture.md](Architecture.md).

### The big parts

| Part | Folder | Its one job | Status |
| --- | --- | --- | --- |
| Growth engine | [engine/](engine/) | The rules of the game. It turns logged sets into muscle size and definition, and has no screen of its own. | Built |
| Avatar kit | [shared/avatar-kit/](shared/avatar-kit/) | Shows a 3D body with every muscle at its score. Every screen and game uses it. It never works a score out. | Built, with the real body and the stand-in as a fallback |
| Body pipeline | [tools/avatar-pipeline/](tools/avatar-pipeline/) | Builds the body file with Blender and MPFB, and saves pictures of every muscle region for checking. It runs on the owner's computer, not in the app. | Built |
| Game contract | `shared/game-api/` | The small contract every game follows. | Planned |
| Games | `games/arena-fight/` | One folder per game. Each is a plug-in that can be removed. The first is the arena fighter. | Planned |
| Prototype page | [prototype/](prototype/) | The web page for trying everything. It shows things and collects what you type. | Started. It has the avatar screen, a quick simulator and a muscle list. |
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

### Inside the avatar kit

All of these are built. Their tests live in [shared/avatar-kit/tests/](shared/avatar-kit/tests/).

| Part | What it does | File |
| --- | --- | --- |
| Body contract | Says what any body must be able to do: show scores, change skin tone, light up a region. The stand-in and the real body both follow it, which is why one can replace the other. | [body.ts](shared/avatar-kit/src/body.ts) |
| Scores | Turns a 0 to 100 score into a 0 to 1 strength for blending shapes. | [scores.ts](shared/avatar-kit/src/scores.ts) |
| Stand-in shapes | The stand-in body as a list of numbers: where each shape sits, and how big it is at a score of 0 and at 100. | [standInLayout.ts](shared/avatar-kit/src/standInLayout.ts) |
| Stand-in body | Builds the body from that list and reshapes it when scores change. It is shown only if the body file cannot be loaded. | [standInBody.ts](shared/avatar-kit/src/standInBody.ts) |
| Real body | Wraps the loaded body file: sets each region's shape to its score, colours the skin, and lights up a region by making its points glow. | [modelBody.ts](shared/avatar-kit/src/modelBody.ts) |
| Body file | The body itself: about 13,500 points, a 52-bone skeleton with standard Mixamo names, one shape per region named like `calves_size`, a photographic skin, and separate small meshes for the eyes, eyebrows, eyelashes and hair. Made by the body pipeline, never edited by hand. | [body-male.glb](shared/avatar-kit/assets/body-male.glb) |
| Viewer | Puts a body on screen: soft light from all round plus a key, rim and fill light that turn with the camera, soft shadows, a floor ring, a camera you can drag, and smooth easing when scores change. | [viewer.ts](shared/avatar-kit/src/viewer.ts) |
| Front door | The only file other parts import from. It also holds the one call that loads the body, which hands back the real body, or the stand-in if the file cannot be loaded. | [index.ts](shared/avatar-kit/src/index.ts) |

### Inside the body pipeline

| Part | What it does | File |
| --- | --- | --- |
| Launcher | Finds Blender in `E:\XhoreTools` and runs the build script without opening Blender's window. `npm run build:body` starts it. | [run.mjs](tools/avatar-pipeline/run.mjs) |
| Build script | Makes the slim body and the muscled body with MPFB, splits the difference between them into the 19 regions, adds the skeleton, the skin, eyes, eyebrows, eyelashes, hair and trunks, and writes the body file. Its tuning numbers are at the top. | [build_body.py](tools/avatar-pipeline/build_body.py) |
| Checking pictures | Every region grown to 100 with its area in red, from the front, back and side (`regions-…`), plus the finished character's face and body, slim and fully grown (`look-…`). Rewritten on every build. | [previews/](tools/avatar-pipeline/previews/) |
| Asset pack | MPFB's free pack of skins, eyes, eyebrows, eyelashes and hair, unpacked inside the Blender folder in `E:\XhoreTools`. The build script picks from it. | Not in the project |

### What gets handed from part to part

These pieces of data are the only way the parts talk to each other.

| Data | What it holds | Made by | Read by | Exists today |
| --- | --- | --- | --- | --- |
| Session | One gym visit: when it happened, whether it was self-reported or friend-confirmed, and its sets (exercise, reps, weight). | The quick simulator today, set logging later | Growth engine | Yes, simulated ones |
| Baselines | Your usual weight or reps for each exercise, used to judge effort. | Not decided yet (Q-6) | Growth engine | Shape defined, nothing makes it yet |
| Avatar state | For each of the 19 regions: size, definition, starting size, best size reached and when it was last trained. It also keeps the last 4 weeks of hard-set counts, which definition needs. | Growth engine only | Avatar view, muscle list, games | Yes |
| Week report | What one week did: sets counted and skipped, average intensity, and each region's size and definition before and after. | Growth engine only | Weekly match, the page | Yes |
| Match points | A player's score for the week, 0 to 100. | Weekly match | The page, games | Not yet |
| Player snapshot | A read-only copy of each player's avatar state and match points, handed to a game when it starts. | The game list | A game | Not yet |
| Game events | "Started", "finished" with the result, or "failed". | A game | The page | Not yet |

### Features on the page

Each feature has its own folder inside [prototype/src/features/](prototype/src/features/). No feature imports another. The page, [App.tsx](prototype/src/App.tsx), holds the avatar and passes it to each one.

| Feature | What it does | Reads | Hands on | Status |
| --- | --- | --- | --- | --- |
| Avatar view | Shows the 3D avatar with each region at its current size. You can drag it round, jump to the front, side or back, and pick a skin tone. It uses the avatar kit. | Avatar state, which region to light up | Nothing, it only displays | Built ([avatar-view/](prototype/src/features/avatar-view/)). It shows the real body. |
| Muscle list | Lists the 19 regions with bars for size and definition, and what the last skip changed. Pointing at a row lights that muscle up on the body. | Avatar state | Which region is pointed at | Built ([muscle-readout/](prototype/src/features/muscle-readout/)) |
| Quick simulator | A temporary stand-in for set logging. You pick a starting level and a weekly routine, then skip 1, 4 or 12 weeks. It invents the sessions and the growth engine does the maths. | What you click | Sessions for the engine, then the new avatar state | Built ([quick-sim/](prototype/src/features/quick-sim/)). To be replaced by steps 5 and 8. |
| Set logging | You pick an exercise, enter reps and weight, and mark the session as self-reported or friend-confirmed. | What you type | Sessions | Step 5 |
| Skip a week | Moves time forward one week and asks the engine to process it. | Sessions, avatar state | New avatar state, week report | Step 8 |
| Weekly match | Scores a player's week out of 100 for plan completion, effort and personal bests. | Week report, sessions planned and done | Match points | Step 9 |
| Game list | Shows a button for each game that is switched on, and starts the one you pick. | Avatar state, match points | A player snapshot for the game | Step 10 |

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

Steps 2 and 3 are built today. Step 1 is simulated for now, and steps 4 and 5 are still to build.

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
| Make a score of 100 look more or less muscular | `GROWTH_GAIN` and `DETAIL_WEIGHT` at the top of [build_body.py](tools/avatar-pipeline/build_body.py), then `npm run build:body` |
| Change how slim the body is at a score of 0 | `BASE_MACRO` at the top of [build_body.py](tools/avatar-pipeline/build_body.py), then `npm run build:body` |
| Change which part of the body a muscle region covers | `region_masks` in [build_body.py](tools/avatar-pipeline/build_body.py). Check the result in the [checking pictures](tools/avatar-pipeline/previews/). |
| Change the trunks' length or colour, or how the arms hang | The trunks and stance numbers at the top of [build_body.py](tools/avatar-pipeline/build_body.py) |
| Change the skin, the hairstyle, the eyebrows or the eye colour | `SKIN` and `ASSETS` at the top of [build_body.py](tools/avatar-pipeline/build_body.py), then `npm run build:body`. The choices are the folders in the asset pack. |
| See the finished character without opening the page | [look-face.png](tools/avatar-pipeline/previews/look-face.png), [look-slim-front.png](tools/avatar-pipeline/previews/look-slim-front.png) and [look-grown-front.png](tools/avatar-pipeline/previews/look-grown-front.png) |
| See what each muscle region does to the body | [regions-front.png](tools/avatar-pipeline/previews/regions-front.png), [regions-back.png](tools/avatar-pipeline/previews/regions-back.png) and [regions-side.png](tools/avatar-pipeline/previews/regions-side.png). The tiles run: slim body, the 19 regions in the muscle list's order, then everything at 100. |
| Change how definition looks, or the highlight colour, on the real body | The settings at the top of [modelBody.ts](shared/avatar-kit/src/modelBody.ts) |
| Change the stand-in body's shape or proportions | [standInLayout.ts](shared/avatar-kit/src/standInLayout.ts). Every shape is one line of numbers. |
| Change the lighting, the camera or the floor ring | [viewer.ts](shared/avatar-kit/src/viewer.ts) |
| Change the skin tones on offer, or the view buttons | [AvatarView.tsx](prototype/src/features/avatar-view/AvatarView.tsx) |
| Change what a simulated week of training contains | [simulate.ts](prototype/src/features/quick-sim/simulate.ts) |
| Change a muscle's display name | `REGION_LABELS` in [regions.ts](engine/src/regions.ts) |
| Change the page's colours | The list at the top of [styles.css](prototype/src/styles.css) |
| Change which body file the page loads | The `bodyModelUrl` line at the top of [AvatarView.tsx](prototype/src/features/avatar-view/AvatarView.tsx) |
| Change match scoring | Not built yet (step 9) |
| Switch a game off, or remove one | Not built yet (step 10). It will be the game list on the page. |
| Change a fighting move or a style | Not built yet (step 11). It will live in `games/arena-fight/content/`. |
| Change the rules of a fight | Not built yet (step 11). It will live in `games/arena-fight/core/`. |
| Change how a fight looks | Not built yet (step 12). It will live in `games/arena-fight/view/`. |

## How to check things yourself

Type these in the terminal from the project folder.

| Command | What it does |
| --- | --- |
| `npm test` | Runs every test: 173 for the growth engine, then 89 for the avatar kit. Both groups should say "passed". |
| `npm run build:body` | Rebuilds the 3D body file and its checking pictures with Blender. It takes about a minute and needs Blender in `E:\XhoreTools`. Only needed after changing the build script. |
| `npm run curve` | Prints a week-by-week table of how one muscle grows for a beginner. |
| `npm run dev` | Starts the prototype page. It prints an address, normally `http://localhost:5173`. Open that in your browser. Press `Ctrl+C` in the terminal to stop it. |
| `npm run typecheck` | Checks all the code for mistakes without running it. No output after the headings means no mistakes. |

## Progress log

Newest first.

- **2026-11-12:**
  - Step 15, first half: the lighting. The body is now lit by soft light from all round, as in a photo studio, made in code so nothing is downloaded, plus a warm key light set higher, so the top of each muscle is lit and the underside shaded. Shadows are softer, and the body now shades itself, under the chest and the arms for example. Skin at full definition is less glossy than before (D-054).
  - Checked by taking pictures of the page before and after: the whole body from the front and back, and close-ups of the face and chest. Four colour settings were compared side by side; the chosen one gave the most natural skin. Before, the skin shone like plastic; now it reads as skin, and the chest, shoulders and back show their shape.
- **2026-10-09:**
  - Step 13 done: the body has a photographic skin, brown eyes, eyebrows, eyelashes and short black hair, all from MPFB's free asset pack (268 MB, public domain, unpacked into `E:\XhoreTools`). The textures added only 0.6 MB to the body file. Skin tones now tint the photographic skin instead of painting a flat colour. Checked on the page in four skin tones.
  - The owner looked at the first body and said it was only okay: dull and robot-like. The owner asked for the avatar to be made very realistic before anything else, and for the exercise list to become far more detailed afterwards (D-050).
  - Everything up to here was pushed to the private GitHub repository at the owner's request. Git's own saved GitHub login on this computer had gone stale, so the push went through the GitHub command-line tool's sign-in instead. The saved login still needs refreshing before a plain `git push` will work.
  - The owner said yes to three.js and to Blender with MPFB, and asked to start with the avatar (D-036). Blender 4.5.14 was downloaded to `E:\XhoreTools`, outside the project (D-037).
  - Step 7 done, first version: the page now shows a real human body. Blender 4.5.14 and MPFB 2.0.17 were set up in `E:\XhoreTools`. A script generates a slim body and a heavily muscled one, splits the difference into the 19 regions, adds a 52-bone skeleton with standard Mixamo names, colours trunks onto the body, lowers the arms into a relaxed stance and writes one 2.1 MB file. Checked in a browser: calves alone grow when only calf raises are trained, and 72 weeks of everything gives a heavyweight build. Checked in Blender's pictures: all 19 regions sit in the right place. Bugs found and fixed on the way: the skeleton did not fit until MPFB's helper points were kept, the trunks first covered the hands and then left a bare patch, and the muscle highlight lit the wrong points. What it does not have yet: detailed skin, eyes, hair, and definition shown muscle by muscle.
  - Step 6 done: the page shows a 3D avatar that grows. The avatar kit builds a stand-in body from simple shapes, one or more per muscle region. Checked in a browser: 12 weeks of calf raises took calves from 10 to 45.1 and changed no other muscle, and 60 weeks of every exercise produced a visibly muscular body. Dragging, the front, side and back buttons, skin tones and the muscle highlight all work. Three things were fixed after looking at it: the untrained body was too thin, the back view was too dark, and the camera could go under the floor.
  - Step 4 done: the prototype page exists. It shows the 19 muscle regions and their starting sizes, read straight from the growth engine, and the numbers change when you pick a different experience level. Checked by opening the page in a browser and clicking the buttons.
  - Researched ways to add a 3D avatar. The ready-made avatar services either closed or cost too much, so we build our own body.
  - Started the decision log and this file, then added the map of parts. Writing the map showed that nobody has decided where a player's usual weights come from, so that is now Q-6.
  - The owner set the avatar requirements: free at the start, a fighting-game look, and room for other game modes (D-025 to D-027).
  - The owner asked for the method to be chosen for a team that cannot use a game-engine editor or hire. Checked how to get the avatar and how a Tekken-style fighter is built, then wrote [Architecture.md](Architecture.md). The decisions are D-028 to D-035.
  - What the checks found: the free body tool already has muscle shapes for separate body parts. Fighting games are built as a set of rules that runs in fixed steps, kept separate from the graphics. Blender is not yet on the owner's computer.
- **2026-10-07:** Set up the repository with the `engine` workspace. Built the growth engine rules and a test for every rule. A beginner doing 9 hard sets a week reaches size 50 in week 15, 80 in week 34 and 90 in week 49, which matches the targets in the spec.

## Next up

1. A breathing stance, so the avatar does not stand like a statue (the rest of step 15).
2. Show definition muscle by muscle, with sharper muscle lines (step 14).
3. The owner looks at the avatar again and says what should still change.
4. Settle Q-13, then make the exercise list far more detailed (step 16).
5. Settle Q-6, then add set logging to the page (step 5).
