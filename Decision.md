# Decision log

Every decision made on this project, in the order it was made. Look here to find out what was decided, when, and why.

## How this log works

- Each decision gets a number (D-001, D-002, and so on) that never changes.
- Entries are never deleted or rewritten. If we change our mind, we add a new entry that says which older one it replaces, and mark the older one "Replaced by D-0xx".
- A choice that is still open sits under "Waiting on a decision". Once settled, it moves into the log with a number.
- The log is updated in the same step as the work the decision affects.

## Waiting on a decision

**Q-1: How do we build the 3D avatar?**
- Recommendation: make our own body model with one "fully grown" shape per muscle region, and blend each shape in as that region's size goes up. This technique is called morph targets.
- Why not a ready-made avatar service: Ready Player Me closed on 31 January 2026. Snap removed its Bitmoji kit for developers in March 2022. Avatar SDK still runs, but costs $800 a month and does not let us grow muscles one by one.
- Fit with the requirements: D-022 (muscles grow one by one) and D-025 (free at the start) rule out the paid services, which leaves this approach.
- Needed by: the avatar step of the prototype.

**Q-2: Does a 3D placeholder replace the SVG placeholder in the prototype?**
- Recommendation: yes. Build the placeholder body in code from simple 3D shapes, one per region. Rotating it gives front and back views, and it avoids drawing about 150 SVG files.
- What it changes: replaces D-017 and adds two dependencies, `three` and `@react-three/fiber`.
- Needed by: the avatar step of the prototype.

**Q-3: Where does the 3D body come from?**
- For the start, D-025 means the free route. Recommendation: MPFB, a free add-on for Blender whose output is free for commercial use. It makes a realistic human body with a built-in muscle shape, which we split into our 19 regions.
- What it needs: Blender installed on the owner's computer. Blender is free, but installing it needs the owner's OK.
- Later, if the game does well: hire a 3D artist to restyle or replace the body. The file format stays the same, so the code does not change.
- Needed by: after the code-built placeholder is working.

**Q-4: Do players get a face made from a selfie?**
- Recommendation: treat it as a separate optional feature for later. Fitting a ready-made head onto our muscle body is not straightforward.
- Needed by: not before the mobile app.

**Q-5: What do we build the real 3D game in?**
- Recommendation: Unity. It is free until the project passes $200,000 in revenue or funding, it is the most used engine for phone games, it runs well on mid-range Android phones, and it has the largest pool of people to hire.
- Other options: Unreal, which Tekken 8 uses. It has the best graphics and is free until a game earns $1 million, but it is heavy on phones. Godot, which is free forever and can sit inside an Expo app, but has fewer people to hire. Staying with web 3D, which is fine for an avatar viewer and simple replays but not for a full fighting game.
- What carries over whichever we pick: the 3D body file and the growth engine's numbers.
- Needed by: the start of the mobile app phase. The web prototype does not depend on it.

**Q-6: Where do a player's usual weights and reps come from?**
- Background: the engine judges effort by comparing each set with the player's usual weight or reps for that exercise. The spec does not say who supplies those usual numbers.
- Options: the player types them in, or they are worked out from past sessions.
- Recommendation for the prototype: treat the first weight logged for an exercise as the usual one. This matches D-019, where the first session defines what "usual" means.
- Needed by: the set logging step of the prototype.

**Q-7: Which game do we build first: one-on-one fighting, 11-a-side football, or an open world?**
- Recommendation: one-on-one fighting, in the style of Tekken.
- Why: the camera is close, so the muscles people earned are easy to see. It needs two characters and one arena, where football needs 22 players, team behaviour and ball physics, and an open world needs a whole city. It also fits couples and friends, who compete one against one.
- Football and other sports: possible later as extra modes that reuse the same avatar (D-027). An open world is the most expensive kind of game to make and is not a starting point.
- Needed by: before work starts on the fight replay.

**Q-8: Is the fight played with controls, or watched?**
- Background: D-016 says points from the gym week decide the winner and the fight is a replay. A Tekken-style game is normally played with controls, where the more skilled player wins.
- Recommendation: keep D-016 and build the fight as a replay you watch first. A played mode can come later, where gym stats set the fighter's power and you fight a computer-controlled copy of your opponent's avatar. That avoids live online fighting, which is one of the hardest things to build in games.
- Needed by: before work starts on the fight replay.

## Decided

Entries D-001 to D-018 were copied from the project spec on 2026-10-09 to start this log, so their date reads "By 2026-10-07", the day of the first commit. Where the spec gives no reason, the Why column says so.

| # | Date | Decision | Why | Status |
| --- | --- | --- | --- | --- |
| D-001 | By 2026-10-07 | Build a web prototype first (Phase 0), with no backend, no accounts and no paid services. | To prove the core loop is fun before building the real app. | Active |
| D-002 | By 2026-10-07 | The real app will be one Expo app for Android and iOS, with Firebase for the server side. | Reason not recorded in the spec. | Active |
| D-003 | By 2026-10-07 | One repository split into workspaces: `engine` and `prototype` now, `app` and `functions` later. | So every part uses the same copy of the engine. | Active |
| D-004 | By 2026-10-07 | The growth engine is plain TypeScript with no file or network access, no React and no clock. The current time is handed to it. | So the prototype, the app and the server all run the same maths, and the prototype can skip ahead a week. | Active |
| D-005 | By 2026-10-07 | Every tuning number lives in one settings object in the engine. | So the feel of the game can be retuned in one place. | Active |
| D-006 | By 2026-10-07 | Each feature lives in its own folder and never imports another feature's code. Features talk through events and documented data fields. | To keep features independent of each other. | Active |
| D-007 | By 2026-10-07 | One writer per field: only the growth engine computes avatar scores. | To keep features independent of each other. | Active |
| D-008 | By 2026-10-07 | Stored data only ever gains fields. Nothing is renamed or removed, and stored data carries a version number. | So older saved avatars keep loading. | Active |
| D-009 | By 2026-10-07 | Optional features fail safe, and each one has an off switch. | So the core game still works when one is missing or switched off. | Active |
| D-010 | By 2026-10-07 | The avatar's body has 19 muscle regions, each with a size and a definition score from 0 to 100. | Reason not recorded in the spec. | Active |
| D-011 | By 2026-10-07 | Starting growth numbers: only sets of 3 to 30 reps count, intensity is limited to between 0.5 and 1.2, weekly gain is capped at 3 and slows as a muscle gets bigger. Beginners start at 10, intermediates at 30, advanced at 50. | Chosen so a beginner doing 9 hard sets a week for one muscle reaches about 50 in 3 to 4 months, about 80 in about 8 months and about 90 in about a year. | Active |
| D-012 | By 2026-10-07 | Untrained muscles shrink. After 14 days without training, a region loses 0.5 a week, never below its starting size. Lost size regrows at double speed up to the previous peak. | Reason not recorded in the spec. | Active |
| D-013 | By 2026-10-07 | Definition follows consistency. The target is the share of the last 4 weeks that had at least 3 hard sets, and each week the score moves 25% of the way there. | Reason not recorded in the spec. | Active |
| D-014 | By 2026-10-07 | Self-reported sessions earn 50% credit. Friend-confirmed sessions earn 100%. | Reason not recorded in the spec. | Active |
| D-015 | By 2026-10-07 | The weekly match is scored out of 100: 50 for plan completion, 30 for effort, 20 for personal bests. | Reason not recorded in the spec. | Active |
| D-016 | By 2026-10-07 | In the fight replay, points decide the winner and avatar stats only shape the fighting style. The replay is built from a seed. | The seed makes the same replay play back the same way every time. | Active |
| D-017 | By 2026-10-07 | The placeholder avatar is layered SVG drawings with front and back views, using file names like `biceps_size_33.svg`. | So real art can replace the files later without code changes. | Active (Q-2 proposes replacing it) |
| D-018 | By 2026-10-07 | Working style: small steps, a one-line explanation before each command, ask before adding dependencies or installing anything globally, and commit after each working step. | The owner is new to coding. | Active |
| D-019 | 2026-10-07 | A set with nothing to compare against, such as a new user's first session, counts at normal intensity (1.0). | The first session defines what "usual" means, instead of being scored against nothing. | Active |
| D-020 | 2026-10-07 | Helper muscles count toward a region's hard sets for definition. One setting can restrict this to direct work only. | Reason not recorded. | Active |
| D-021 | 2026-10-07 | The engine's optional rules each have an off switch: decay, definition, trust credit and double-speed regrowth. | Follows D-009. | Active |
| D-022 | 2026-10-09 | The avatar will be 3D, and its muscles will visibly grow. How it gets built is still open (Q-1 and Q-2). | The owner's choice for the game. No further reason recorded. | Active |
| D-023 | 2026-10-09 | Keep this decision log and a project flow file, and update both as part of each step. | So every decision and the state of the project can be looked up in one place. | Active |
| D-024 | 2026-10-09 | The project flow file carries a map of the project: what each part and feature does, how the parts are kept separate, what data they hand to each other, and where to look for a given change. The map is updated whenever a part is added or changed. | So we can pinpoint where any future change belongs. | Active |
| D-025 | 2026-10-09 | The 3D avatar must cost nothing to build and use at the start. Paid tools or artists can be considered later if the game does well. | The owner's requirement. | Active |
| D-026 | 2026-10-09 | The look to aim for is a fighting game such as Tekken or WWE, with good graphics, rather than a simple cartoon. | The owner's choice. The game is about people competing by fighting. | Active |
| D-027 | 2026-10-09 | The avatar and the game are built so that other modes can be added later, such as football, other sports or an open world. | The owner wants room to grow the game if it does well. | Active |
