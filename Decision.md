# Decision log

Every decision made on this project, in the order it was made. Look here to find out what was decided, when, and why.

## How this log works

- Each decision gets a number (D-001, D-002, and so on) that never changes.
- Entries are never deleted or rewritten. If we change our mind, we add a new entry that says which older one it replaces, and mark the older one "Replaced by D-0xx".
- A choice that is still open sits under "Waiting on a decision". Once settled, it moves into the log with a number.
- The log is updated in the same step as the work the decision affects.

## Waiting on a decision

Q-1, Q-2, Q-5, Q-7 and Q-8 are settled. See D-028 to D-031 and D-033.

**Q-3: Where does the 3D body come from?**
- Recommendation: MPFB, a free add-on for Blender. Bodies made with it may be used in a commercial game. It already contains muscle shapes for separate body parts (upper arm, forearm, shoulder, chest, lats, stomach, thigh, buttocks and calf), which a script turns into our 19 regions. The method is in section 5 of [Architecture.md](Architecture.md).
- What it needs: the owner's OK to download Blender. It is free, about 300 to 400 MB to download and under 1 GB on the E: drive. It runs from its own folder and is not installed into Windows.
- Later, if the game does well: hire a 3D artist to restyle or replace the body. The file format stays the same, so the code does not change.
- Needed by: the real-body step of the prototype.

**Q-4: Do players get a face made from a selfie?**
- Recommendation: treat it as a separate optional feature for later. Fitting a ready-made head onto our muscle body is not straightforward.
- Needed by: not before the mobile app.

**Q-6: Where do a player's usual weights and reps come from?**
- Background: the engine judges effort by comparing each set with the player's usual weight or reps for that exercise. The spec does not say who supplies those usual numbers.
- Options: the player types them in, or they are worked out from past sessions.
- Recommendation for the prototype: treat the first weight logged for an exercise as the usual one. This matches D-019, where the first session defines what "usual" means.
- Needed by: the set logging step of the prototype.

**Q-9: Do played fights count toward the weekly match?**
- Background: D-016 says the gym week decides who wins the weekly match. A played fight is won by skill with the controls.
- Recommendation: no. Played fights are a separate, friendly mode with their own win record. The weekly match stays decided by gym points.
- Needed by: before the played fight is built.

**Q-10: Which fighting style is second, after boxing?**
- Recommendation: a kicking style, either kickboxing or taekwondo, so that leg training has a style that rewards it. The choice between the two is made once we see which free kick animations look best.
- Needed by: after the first style works.

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
| D-017 | By 2026-10-07 | The placeholder avatar is layered SVG drawings with front and back views, using file names like `biceps_size_33.svg`. | So real art can replace the files later without code changes. | Replaced by D-029 |
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
| D-028 | 2026-10-09 | We build our own 3D body: one body with a "fully grown" shape for each muscle region, blended in by that region's score. This settles Q-1. | It is the only approach found that grows muscles one by one (D-022) at no cost (D-025). Chosen on the owner's behalf, as asked. | Active |
| D-029 | 2026-10-09 | The prototype's avatar is 3D and replaces the layered SVG placeholder (D-017). It starts as a stand-in body built in code from simple shapes, and the real body file is swapped in afterwards. The 3D library is three.js. This settles Q-2. | One avatar system instead of two, and turning the body gives the front and back views. Chosen on the owner's behalf, as asked. | Active |
| D-030 | 2026-10-09 | The avatar and the games are built with web 3D technology written entirely in code, not in Unity, Unreal or Godot. This settles Q-5 for now, and is looked at again if a team is hired. | The owner cannot use a game-engine editor or hire yet, so everything must be buildable and testable as code. It is also the same language as the growth engine. | Active |
| D-031 | 2026-10-09 | The first game is a one-on-one arena fighter in the style of Tekken. Football, other sports and an open world stay as ideas for later. This settles Q-7. | The camera is close, so earned muscles are easy to see, and it needs far less building than a team sport or an open world. | Active |
| D-032 | 2026-10-09 | The fighter's moves come from a real martial art that the player chooses. Every style and every move is open to every player. All styles use the same simple buttons, with no complicated input motions. A style is data rather than code. Boxing is first, and throw-based styles such as judo and wrestling come later. | The owner asked for martial arts styles that are easy to perform and open to everyone. Throws need two bodies animated together, which is the hardest kind of move to build. | Active |
| D-033 | 2026-10-09 | One set of fight rules serves both a watched fight and a played fight. The watched weekly match replay is built first and keeps D-016. A played fight against a computer-controlled copy of the opponent comes second. Live online fighting is not planned. This settles Q-8. | The replay is the smaller build and is already in the spec. Live online fighting is among the hardest things in games to build. | Active |
| D-034 | 2026-10-09 | Every game is a plug-in: its own folder under `games/`, connected only through a small contract and events, and listed in one game list with an on/off switch. Switching off or deleting a game must not affect anything else. | The owner's requirement, so a game can be taken down safely. It follows D-006 to D-009. | Active |
| D-035 | 2026-10-09 | An architecture file describes the design we are building toward, and is kept current alongside this log and the project flow file. | So the plan for how the parts fit together is written down in one place. | Active |
| D-036 | 2026-10-09 | The owner approved adding the 3D library three.js to the project, and downloading Blender with the MPFB add-on. The avatar is built before set logging. | The owner's answer: "Yes start with the Avatar." | Active |
| D-037 | 2026-10-09 | Blender and other large tools live in `E:\XhoreTools`, outside the project folder. | So they are never mixed into the code or the project history, the C: drive is left alone, and removing them is one folder delete. | Active |
| D-038 | 2026-10-09 | Until set logging exists, a quick simulator drives the avatar: pick a starting level and a weekly routine, then skip 1, 4 or 12 weeks. It only invents the sessions. The growth engine still does all the maths. It is temporary and is replaced by set logging and skip a week. | The owner asked for the avatar first, and an avatar that cannot be made to grow proves nothing. | Active |
| D-039 | 2026-10-09 | How the stand-in body shows the two scores: size makes a muscle's shape swell, and definition turns its surface from soft and matte to tight and glossy. The arms also hang further out as the lats grow. | Size and definition have to look different from each other, and wide lats would otherwise push through the arms. | Active |
| D-040 | 2026-10-09 | Every body, stand-in or real, follows one contract: show scores, change skin tone, light up a region. Screens and games ask the avatar kit to load "the body" and never name which kind. | So the real body can replace the stand-in without changing any screen or game. | Active |
| D-041 | 2026-10-09 | The display names of the 19 regions, such as "Front delts", live in the growth engine beside the region ids. | So the page, the app and the server all show the same names. The ids used in stored data do not change. | Active |
| D-042 | 2026-10-09 | The lights in the avatar screen turn with the camera, and the camera cannot go below the floor. | So whichever side of the body is being looked at is lit, and the floor ring and shadow never disappear. | Active |
