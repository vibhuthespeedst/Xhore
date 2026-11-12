# Architecture

How the project is put together, and the plan for the 3D avatar and the first game. [Decision.md](Decision.md) records why each choice was made. [ProjectFlow.md](ProjectFlow.md) records what is built so far. This file describes the design we are building toward.

*Last updated: 2026-11-13. Built so far: the growth engine, the prototype page, the avatar kit, and the pipeline that builds the real 3D body. Everything else here is the plan.*

## 1. What shaped this design

| Requirement | What it means for the design | Decision |
| --- | --- | --- |
| The owner is new to coding and cannot hire yet | Everything must be buildable and testable as code. Tools that need hand work in a visual editor, such as Unity and Unreal, are out for now. | D-030 |
| Free at the start | Only free tools and free art sources. | D-025 |
| Muscles grow one by one | The body needs a separate growable shape for each of the 19 regions. | D-022, D-028 |
| A fighting-game look | A realistic 3D human body, not a flat drawing. | D-026, D-029 |
| More games later, and any game can be removed | Games are plug-ins. Nothing outside a game depends on it. | D-027, D-034 |
| Fights decide who tops the leaderboard, and the gym makes your fighter stronger | Games report who won. They never change muscle scores, and only the leaderboard counts wins. | D-007, D-056 |
| Fights are realistic | Strength and body weight follow real physics and real strength data. Technique is the player's own skill. | D-058 |

## 2. The layers

Each layer is built on the ones below it in this table, never the other way round.

| Layer | Folder | Its job | Status |
| --- | --- | --- | --- |
| Shell | [prototype/](prototype/) now, `app/` later | The screens: logging sets, the avatar screen, the leaderboard, and the list of games. | Started: the avatar screen exists |
| Games | `games/arena-fight/`, more later | One folder per game. Each is a plug-in that can be removed. | Planned |
| Shared kits | [shared/avatar-kit/](shared/avatar-kit/), `shared/game-api/` | What every game needs: the 3D avatar, and the contract that games follow. | The avatar kit is built and shows the real body. The game contract is planned. |
| Rules | [engine/](engine/) | The growth maths. The leaderboard's ranking rules join it later in their own folder. It has no screen. | Growth is built |
| Server | `functions/` | The online side. It reuses the rules. | Later |

### Who may use whom

| Part | May use | May never use |
| --- | --- | --- |
| `engine` | Nothing | Everything else |
| `shared/game-api` | `engine`, for the shape of the data only | Any game, the shell |
| `shared/avatar-kit` | `engine`, for the list of regions and the shape of the data only, and the 3D library | Any game, the shell |
| A game in `games/` | `engine` and the shared kits | Another game, the shell |
| The shell | `engine`, the shared kits, and games through the game list only | The inside of any game |

An automated test will check these rules and fail if any file breaks them. It is built together with the game contract.

### The 3D technology

Everything 3D is drawn with three.js, a free library for 3D in web pages. The reasons:

- It is all code, so it can be written and tested without a visual editor.
- It is the same language as the growth engine, so games read the engine's data directly.
- The prototype is a web page, so it runs there with no extra step. The same code can later run inside the phone app.

Unity, Unreal and Godot were considered and set aside for now. Section 9 says when that could change.

## 3. How a game plugs in

A game is a self-contained folder. It connects to the rest of the project in exactly three places.

1. **The game list.** One file in the shell lists every game, one line each, with an on/off switch. The shell shows a button for each game that is switched on.
2. **What the shell hands the game when it starts.** A read-only snapshot: who is playing, which of them is at the controls, each player's avatar scores, body weight and height, a seed, and a place on screen to draw.
3. **What the game hands back.** Events only: "started", "finished" with the result, or "failed". The shell and other features can listen for them. The game never calls them directly.

A game may never:

- change an avatar's size or definition, because only the growth engine does that,
- count a win itself, because only the leaderboard does that from the "finished" event,
- use another game's code or saved data,
- be used by anything except through the game list.

Each game keeps its own saved data, such as a player's chosen fighting style, in its own drawer under its own name, with a version number.

### The leaderboard

The leaderboard belongs to the shell, not to any game. It listens for "finished" events and counts each player's wins, and whoever has won the most fights is on top (D-056). There is no points score. The rules for ranking live in the engine, so the server can use the same ones later. Who is on one board, over what period, and how many fights count are still open (Q-14).

### The contract, sketched

This is for whoever writes the code. The exact fields are settled when it is built. After that, fields are only ever added.

```ts
// shared/game-api: the whole contract between the shell and a game
export interface GameModule {
  readonly id: string             // 'arena-fight'
  readonly title: string          // shown on the game's button
  readonly schemaVersion: number  // version of the data this game saves
  start(host: GameHost): GameSession
}

export interface GameHost {
  readonly container: HTMLElement              // where the game draws
  readonly players: readonly PlayerSnapshot[]  // read-only copies
  readonly seed: string                        // same seed, same game
  readonly humanPlayerId: string               // at the controls; the others are computer-controlled
  emit(event: GameEvent): void                 // the only way a game talks back
}

export interface PlayerSnapshot {
  readonly playerId: string
  readonly displayName: string
  readonly avatar: AvatarState   // from the growth engine
  readonly body: { readonly weightKg: number; readonly heightCm: number }  // entered by the player
}

export type GameEvent =
  | { readonly type: 'game.started'; readonly gameId: string }
  | { readonly type: 'game.finished'; readonly gameId: string; readonly winnerId: string | null }
  | { readonly type: 'game.failed'; readonly gameId: string; readonly reason: string }

export interface GameSession {
  stop(): void
}
```

```ts
// prototype/src/games.ts: the only place the shell names a game
export const GAMES = [
  { id: 'arena-fight', enabled: true, load: () => import('@xhore/arena-fight') },
]
```

## 4. Switching off or deleting a game

| What you want | What to do | What happens |
| --- | --- | --- |
| Hide a game for now | Turn its switch off in the game list. | Its button disappears. Nothing else changes. Later the switch can live on the server, so no app update is needed. |
| A game is broken | Nothing, at first. | A game that fails to load or crashes shows "not available", and the rest of the app keeps working. Then switch it off. |
| Remove a game for good | Delete its folder and its one line in the game list. | Nothing else refers to it, so nothing else changes. Its saved data is simply no longer read. |

With no games at all, the core still works: logging sets, muscle growth and the avatar screen. No new fights happen, so the leaderboard stops changing but still shows the wins already counted.

Two automated tests keep this true. One checks the "who may use whom" rules. The other runs the shell with an empty game list.

## 5. The avatar

### 5.1 What it is

One 3D body file holds everything that is the same for every player:

- the body's surface and skin,
- a standard human skeleton, so ready-made animations fit it,
- one size shape for each of the 19 regions, named after the region, such as `calves_size`. Definition shapes, named like `calves_definition`, are planned and not in the file yet.

A player's avatar is that shared body plus their own scores from the growth engine. Each shape is blended in by `score / 100`, so a calf score of 60 shows the calf shape at 60%. Training calves grows the calves and nothing else.

### 5.2 Where the body comes from

The body is built for free (D-025) with Blender, a free 3D program, and MPFB, a free add-on that generates human bodies. Bodies made with it may be used in a commercial, closed-source game. Both are kept in `E:\XhoreTools`, outside the project (D-037).

A script does the work, so nobody models by hand. `npm run build:body` runs it and takes about a minute. This is built and working (D-043, D-044).

1. Generate the body slim and untrained. This is the body at a score of 0.
2. Generate the same body heavily muscled, and measure how far every point moved between the two.
3. Split that movement into the 19 regions with soft-edged masks. A region's shape is the slim body plus that region's share of the movement, so one shape grows one muscle, and all of them together give the muscled body back.
4. Add the skeleton that matches the free animation libraries.
5. Colour trunks onto the body, cutting the mesh along the waistband and the hem so their edges are straight.
6. Save pictures of every region grown to 100 with its area marked in red, from the front, back and side. They are in [tools/avatar-pipeline/previews/](tools/avatar-pipeline/previews/).
7. Lower the arms into a relaxed stance and write one `.glb` file into the avatar kit.

Where MPFB has its own muscle shape for a body part, that shape's area decides where the region is:

| Our regions | Area taken from MPFB's shape | How |
| --- | --- | --- |
| biceps, triceps | Upper-arm muscle | Split into front and back |
| forearms | Lower-arm muscle | Used as it is |
| delt_front, delt_side, delt_rear | Shoulder muscle | Split into three by which way the skin faces |
| chest_upper, chest_mid, chest_lower | Pectoral muscle | Split into three bands by height |
| lats | Dorsi muscle | Used as it is |
| quads, hamstrings | Upper-leg muscle | Split into front and back |
| glutes | Buttocks volume | Used as it is |
| calves | Lower-leg muscle | Used as it is |
| abs, obliques, traps, mid_back, lower_back | None | Placed by where they sit on the torso: height, distance from the spine, and which way the skin faces |

Each region then spreads a few centimetres into neighbouring skin that no region owns, so the skin between muscles grows too. About 83% of the muscled body's growth ends up in a region. The rest is on the head, hands, feet and joints, which belong to no region and never change.

Trunks are coloured onto the body itself, like tight wrestling trunks, so they grow with the muscles (D-045). Separate clothing would need the same 19 shapes and is left for later.

The skin, eyes, eyebrows, eyelashes and hair come from MPFB's free "makehuman_system_assets" pack, which is in the public domain (D-051). The skin is a photograph wrapped round the body. The others are small separate meshes that MPFB fits to the head and binds to the skeleton. Which skin, hairstyle, eyebrows and eye colour are used is a list at the top of the build script.

What the body does not have yet:

- definition shapes, so definition is shown for the whole body as glossier skin (D-048),
- a female body (Q-12),
- a choice of hairstyle, eye colour or face for each player.

#### Build notes

For whoever changes the script. These were all learned by building it.

- Blender 4.5.14 LTS runs as a portable folder at `E:\XhoreTools\blender-4.5.14-windows-x64`. A folder named `portable` beside `blender.exe` keeps its settings and add-ons out of the Windows profile. MPFB 2.0.17 was installed there with `blender --online-mode --command extension install --sync --enable mpfb`.
- [run.mjs](tools/avatar-pipeline/run.mjs) finds Blender and runs [build_body.py](tools/avatar-pipeline/build_body.py) with `--background`. Set `BLENDER_PATH` to use a Blender somewhere else.
- `HumanService.create_human()` makes the body. It must be called with `detailed_helpers=True`. Without them the skeleton cannot find the joints and comes out in a T-pose that does not match the body.
- The slim and muscled bodies are MPFB's `muscle` and `weight` sliders at two settings. The muscled one also gets MPFB's per-body-part muscle targets (`upperarm-muscle-incr`, `torso-muscle-pectoral-incr` and so on) at a weight of 1.3.
- MPFB's skin weights do not add up to 1 on every point. Treat them as shares of the point's total.
- The helper geometry is deleted after the skeleton is added, because the skeleton needs it, and before the masks are worked out.
- The masks are stored on the mesh as attributes while the trunks are cut, because the cut adds points. Blender fills in the shape keys and attributes for the new points.
- The skeleton is MPFB's `mixamo` rig: 52 bones named `mixamorig:Hips` and so on. three.js drops the colon when it loads them.
- Export uses the current pose rather than the rest pose, so the file opens in the relaxed stance. Shape normals are exported so that grown muscles are lit correctly.
- The asset pack (`makehuman_system_assets_cc0.zip`, 268 MB) is unpacked into MPFB's user data folder, `portable\extensions\.user\blender_org\mpfb\data` inside the Blender folder. `HumanService.add_mhclo_asset(..., material_type="GAMEENGINE")` adds an asset with a plain textured material that exports cleanly. It needs the helper geometry, so assets are added before the helpers are deleted.
- The body's own skin material is built by the script from the skin's picture, not by MPFB, so that the trunks keep their own material.
- Pictures are shrunk and stored as WebP, which keeps the see-through parts of hair and lashes and added only 0.6 MB. The skin picture's average colour is stored on the skin material as `skin_average`, in linear light, for tinting (D-052).
- The file holds the body as two meshes, skin and trunks, each with all 19 shapes, plus the eyes, eyebrows, eyelashes and hair as meshes with no shapes. Code that reads it must treat every growing mesh alike, and must measure anything "largest across the body" over both.
- The file marks hair, eyebrows, eyelashes and eyes as see-through. The avatar kit draws them solid, cutting away the empty parts of the cards (D-053).
- Left and right sides share one shape per region, so both sides grow together.

### 5.3 The avatar kit

[shared/avatar-kit/](shared/avatar-kit/) is the only code that knows how to show an avatar. Every game and screen uses it to:

- load the body,
- apply an avatar's scores to it,
- set the skin tone,
- light up one region, so a person can see where it is,
- breathe while it stands, so it never stands like a statue,
- play a named animation (not built yet).

It never works out a score. It only displays the ones it is given.

Every body follows one contract, so screens and games ask the kit for "the body" and never name which kind (D-040). The kit hands back the real body from the body file. If that file cannot be loaded, it hands back a stand-in built in code from simple shapes instead, so the avatar is never simply missing (D-046). The stand-in was built first, and the real body replaced it without any change to the avatar screen's own logic.

The kit also has a ready-made viewer: lights, a floor ring, a camera that can be dragged round the body, and easing so that growth is seen happening. The lighting is soft light from all round, made in code, plus a high key light, a rim light and a fill light that turn with the camera, so the side being looked at is always the lit side. Shadows are soft, and the body shades itself (D-054). The avatar screen uses it. A game brings its own scene and uses only the body.

Muscles change once a week, so before a fight the kit will work the muscle shapes into the real body once. A fight then costs the same as animating a plain body.

### 5.4 Animations

| Source | Terms | Notes |
| --- | --- | --- |
| Mixamo | Free, including commercial use. Needs a free Adobe account. The downloaded files must not be shared publicly. | The largest free set of fighting moves. Our repository is private, which satisfies the terms. If it ever becomes public, these files must be taken out first. |
| Quaternius Universal Animation Library | Free for any use, and may be shared. | A smaller set of combat moves. Part is free and the rest is paid. |

A script converts each animation into the same file format as the body.

The idle breathing needs no animation file. The avatar kit works it out from the time and turns the chest, neck, shoulder and arm bones a degree or two (D-055). The hips, legs and feet are left alone, so the feet never slide, and the neck undoes the chest's tilt so the head stays level. A body without a skeleton, such as the stand-in, simply stands still.

## 6. The arena fight game

### 6.1 What players get, in stages

| Stage | What it is | Who controls the fighters | Order |
| --- | --- | --- | --- |
| A | Played fight. You control your avatar against a computer-controlled copy of your opponent's avatar. Every win counts on the leaderboard. | You and the computer | First |
| B | Live online fight between two people | Two people at once | Not planned |

Stage B is left out because live online fighting needs special networking that is among the hardest things in games to build. Stage A gives the feeling of fighting a friend without it, and the two players do not have to be online at the same time.

The earlier plan started with a watched replay, where the week's gym points chose the winner. It was dropped with the weekly points score (D-056): a fight is now won by playing it.

### 6.2 Fighting styles

In Tekken, every fighter's moves come from a real martial art. Here the fighter is your own avatar, so you choose a style instead of a character.

- A style is a list of moves: which punches and kicks it has, and what its stance looks like.
- Every style uses the same buttons. Once you can play one style, you can play them all.
- Every style and every move is open to every player from the start. Nothing that affects a fight is sold or locked. The only way to get stronger is the gym.
- Styles are balanced to the same overall strength. They differ in which muscles they reward.
- A style is data, not code. Adding one means adding a move list and its animations.

| Style | Leans on | Rewards training | When |
| --- | --- | --- | --- |
| Boxing | Punches | Legs and trunk first, then arms and shoulders | First |
| Kickboxing or taekwondo | Kicks | Legs | Second |
| Karate, kung fu, MMA | A mix | A mix | Later, as free animations allow |
| Judo, wrestling | Throws | Core and back | Later still. A throw needs two bodies animated together, which is the hardest kind of move to build. |

How the body makes a fighter stronger follows real physics and real strength data (D-058). The formulas, the numbers and where each one comes from are in [design/gdd/fight-physics.md](design/gdd/fight-physics.md).

| What | What it does in a fight |
| --- | --- |
| Body weight | The mass behind every strike, how far a hit pushes you back, and how fast you tire |
| Legs, then trunk, then arms and shoulders | The power of a punch: about 38%, 37% and 24% of a straight punch |
| Arms and shoulders | How much a guard can hold |
| Traps (the neck) | How well the head takes a punch |
| Core | How well the body takes a body shot |
| Definition | Stamina |
| Height | Reach, which matters little in real fights |

### 6.3 Controls

- Move left and right, and block.
- Four attack buttons: light punch, heavy punch, light kick, heavy kick.
- Holding a direction while pressing a button gives a different move, so four buttons give about twelve to sixteen moves.
- Pressing one button repeatedly chains a ready-made combo.
- There are no complicated input motions. Recent fighting games added the same kind of simple mode for newcomers: "Modern" controls in Street Fighter 6 and "Special Style" in Tekken 8.

### 6.4 Inside the game

| Part | Folder | Its job |
| --- | --- | --- |
| Fight core | `games/arena-fight/core/` | The rules of a fight. It has no graphics, and is written and tested like the growth engine. |
| Fight content | `games/arena-fight/content/` | The styles and moves, as data. |
| Fight view | `games/arena-fight/view/` | Shows the fight in 3D: bodies, animations, camera, hit effects, health bars and buttons. |

The fight core advances the fight in fixed steps called ticks, 60 per second. On every tick it:

1. asks each fighter's controller what the fighter wants to do,
2. moves each fighter to its next state: standing, walking, attacking, blocking, stunned, knocked down, getting up or knocked out,
3. checks whether a move that is in its hitting window reaches the opponent, and whether the opponent is blocking it,
4. applies damage and stun, and checks whether the round is over.

The same seed and the same inputs always produce exactly the same fight. That lets every rule be tested without graphics, lets a fight be played back from its inputs, and would let a server re-check a result later.

The two fighters stand on a line facing each other, as in Tekken's side view. A hit is decided by distance and height, not by testing the two 3D bodies against each other. That keeps the rules simple and exact. Side-stepping can be added later.

Each move is a row of numbers:

| Field | Meaning |
| --- | --- |
| startup | Ticks before the move can hit |
| active | Ticks during which it can hit |
| recovery | Ticks afterwards, when the fighter is open |
| reach | How far it reaches, as a share of the fighter's height |
| height | High, middle or low, which decides what blocks it |
| speed and force | How fast and how hard it lands for a 75 kg intermediate. The physics works out the damage for each pair of fighters. |
| power shares | How much of its power comes from the legs, the trunk and the arms |
| rotation | How much it twists the head, which raises the chance of a knockdown |
| stun | Ticks the opponent is frozen after being hit |
| stamina | Stamina it costs |
| animation | Which animation to play |

A fighter's strength comes from the avatar's scores and the player's body weight and height (D-058). They are read at the start of the fight and never changed.

Something has to press the buttons. That is a controller, and the core does not care which kind it is.

| Controller | Who decides the inputs | Used for |
| --- | --- | --- |
| Computer | Plays to win, at a set skill level | The opponent |
| Human | Keys on a computer, touch buttons on a phone | The player |

The fight view only reads the core's state and draws it. It never changes the outcome.

### 6.5 How hard this is

| Piece | How hard | Why |
| --- | --- | --- |
| Fight rules with two styles | Moderate | It is mostly rules and data, and the animations are ready-made. |
| Played fight against the computer | Hard, but doable in stages | It needs responsive controls, a fair computer opponent and a lot of tuning. |
| Throws and grapples | Hard | Two bodies must be animated together. |
| Live online one-on-one | Very hard | It needs special networking and game servers. |
| Tekken's depth: over 100 moves per fighter and hand-made animation | Out of reach without a team | It is years of work by a large studio. |

## 7. Build order

Each step leaves something that works by itself.

1. The prototype page. Done.
2. Set logging.
3. The avatar screen with the stand-in body, driven by the growth engine. Done.
4. The real body from the Blender script, swapped in. Done, as a first version.
5. Skip a week.
6. The game contract, the game list, and the two tests from section 4.
7. The fight core with boxing, tested without graphics.
8. The fight view: you play against a computer-controlled copy of another avatar.
9. The leaderboard.
10. A second style.

Step numbers in [ProjectFlow.md](ProjectFlow.md) track progress against this order.

## 8. Risks

| Risk | How we handle it |
| --- | --- |
| A region shape looks wrong where a ready-made shape is split. | Look at the checking pictures after every rebuild. The first version was checked this way and every region sits in the right place. |
| Ready-made animations fit the body loosely in extreme poses. | Lowering the arms 24 degrees deforms the shoulders cleanly, which is a good sign. Try three animations first, before collecting the full set. |
| Phones are slower than computers. | Open the prototype in a phone's browser as soon as the fight view exists. Keep the body light, and work the muscles in once per fight. |
| The owner's computer has 8 GB of memory and a nearly full C: drive. | Keep Blender on the E: drive and build one body at a time. |
| The project is now much bigger than the first prototype plan. | Build in the stages above. Each one is useful without the next. |

## 9. Later

- **Phones.** The games are web code. In the phone app they first run inside the app as a web page. This is checked on a real phone before the app phase begins.
- **More games.** A new game is a new folder under `games/` that uses the same avatar kit and the same contract. Football or another sport reads the same 19 scores in its own way, for example legs for kicking power.
- **A game engine such as Unity.** This becomes worth it only if a team is hired. The body file uses a standard human skeleton that those engines read, and the fight rules and move data carry over as the specification.
- **A face from a selfie.** A separate optional feature (Q-4).
