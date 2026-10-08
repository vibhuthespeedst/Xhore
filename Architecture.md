# Architecture

How the project is put together, and the plan for the 3D avatar and the first game. [Decision.md](Decision.md) records why each choice was made. [ProjectFlow.md](ProjectFlow.md) records what is built so far. This file describes the design we are building toward.

*Last updated: 2026-10-09. Only the growth engine exists today. Everything else here is the plan.*

## 1. What shaped this design

| Requirement | What it means for the design | Decision |
| --- | --- | --- |
| The owner is new to coding and cannot hire yet | Everything must be buildable and testable as code. Tools that need hand work in a visual editor, such as Unity and Unreal, are out for now. | D-030 |
| Free at the start | Only free tools and free art sources. | D-025 |
| Muscles grow one by one | The body needs a separate growable shape for each of the 19 regions. | D-022, D-028 |
| A fighting-game look | A realistic 3D human body, not a flat drawing. | D-026, D-029 |
| More games later, and any game can be removed | Games are plug-ins. Nothing outside a game depends on it. | D-027, D-034 |
| The gym decides who wins the week | Games show results. They never change muscle scores or match points. | D-007, D-016 |

## 2. The layers

Each layer is built on the ones below it in this table, never the other way round.

| Layer | Folder | Its job | Status |
| --- | --- | --- | --- |
| Shell | `prototype/` now, `app/` later | The screens: logging sets, the avatar screen, the weekly match, and the list of games. | Not started |
| Games | `games/arena-fight/`, more later | One folder per game. Each is a plug-in that can be removed. | Planned |
| Shared kits | `shared/avatar-kit/`, `shared/game-api/` | What every game needs: the 3D avatar, and the contract that games follow. | Planned |
| Rules | [engine/](engine/) | The growth maths. Weekly match scoring joins it later in its own folder. It has no screen. | Growth is built |
| Server | `functions/` | The online side. It reuses the rules. | Later |

### Who may use whom

| Part | May use | May never use |
| --- | --- | --- |
| `engine` | Nothing | Everything else |
| `shared/game-api` | `engine`, for the shape of the data only | Any game, the shell |
| `shared/avatar-kit` | `engine`, for the shape of the data only, and the 3D library | Any game, the shell |
| A game in `games/` | `engine` and the shared kits | Another game, the shell |
| The shell | `engine`, the shared kits, and games through the game list only | The inside of any game |

An automated test checks these rules and fails if any file breaks them.

### The 3D technology

Everything 3D is drawn with three.js, a free library for 3D in web pages. The reasons:

- It is all code, so it can be written and tested without a visual editor.
- It is the same language as the growth engine, so games read the engine's data directly.
- The prototype is a web page, so it runs there with no extra step. The same code can later run inside the phone app.

Unity, Unreal and Godot were considered and set aside for now. Section 9 says when that could change.

## 3. How a game plugs in

A game is a self-contained folder. It connects to the rest of the project in exactly three places.

1. **The game list.** One file in the shell lists every game, one line each, with an on/off switch. The shell shows a button for each game that is switched on.
2. **What the shell hands the game when it starts.** A read-only snapshot: who is playing, each player's avatar scores, the weekly match result if there is one, a seed, and a place on screen to draw.
3. **What the game hands back.** Events only: "started", "finished" with the result, or "failed". The shell and other features can listen for them. The game never calls them directly.

A game may never:

- change an avatar's size or definition, because only the growth engine does that,
- change weekly match points, because only the weekly match does that,
- use another game's code or saved data,
- be used by anything except through the game list.

Each game keeps its own saved data, such as a player's chosen fighting style, in its own drawer under its own name, with a version number.

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
  readonly decided?: { readonly winnerId: string | null }  // set for a weekly match replay
  emit(event: GameEvent): void                 // the only way a game talks back
}

export interface PlayerSnapshot {
  readonly playerId: string
  readonly displayName: string
  readonly avatar: AvatarState   // from the growth engine
  readonly matchPoints?: number  // from the weekly match
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

With no games at all, the core still works: logging sets, muscle growth, the avatar screen and the weekly match, whose winner is decided by points. Only the fight animation is missing, and the result is shown as scores.

Two automated tests keep this true. One checks the "who may use whom" rules. The other runs the shell with an empty game list.

## 5. The avatar

### 5.1 What it is

One 3D body file holds everything that is the same for every player:

- the body's surface and skin,
- a standard human skeleton, so ready-made animations fit it,
- one size shape and one definition shape for each of the 19 regions, named after the region, such as `calves_size` and `calves_definition`.

A player's avatar is that shared body plus their own scores from the growth engine. Each shape is blended in by `score / 100`, so a calf score of 60 shows the calf shape at 60%. Training calves grows the calves and nothing else.

### 5.2 Where the body comes from

The free route (D-025) uses Blender, a free 3D program, with MPFB, a free add-on that generates human bodies. Bodies made with it may be used in a commercial, closed-source game.

A script does the work, so nobody models by hand:

1. Generate one athletic body.
2. Build the 19 size shapes. MPFB already contains muscle shapes for separate body parts, which map onto our regions as shown in the table below.
3. Build the 19 definition shapes in the same way, from sharper versions of the same shapes. This is settled by looking at test pictures.
4. Add the skeleton that matches the free animation libraries.
5. Save pictures of every region at 0 and at 100, from the front, back and side, so the result is checked by eye before it is accepted.
6. Export one `.glb` file.

| Our regions | Built from MPFB's shape | How |
| --- | --- | --- |
| biceps, triceps | Upper-arm muscle | Split into front and back |
| forearms | Lower-arm muscle | Used as it is |
| delt_front, delt_side, delt_rear | Shoulder muscle | Split into three |
| chest_upper, chest_mid, chest_lower | Pectoral muscle | Split into three bands |
| lats | Dorsi muscle | Used as it is |
| abs | Stomach tone | Used as it is |
| quads, hamstrings | Upper-leg muscle | Split into front and back |
| glutes | Buttocks volume | Used as it is |
| calves | Lower-leg muscle | Used as it is |
| traps, mid_back, lower_back, obliques | Overall muscle | Limited to that area of the body |

Shorts are coloured onto the body itself, like tight wrestling trunks, so they grow with the muscles. Separate clothing would need the same 19 shapes and is left for later.

One body is built first to prove the method. A second body type follows from the same script with different settings.

#### Build notes

For whoever writes the script.

- Blender runs without its window from the command line, so the whole pipeline is one command.
- Use a Blender LTS release (4.5 at the time of writing) as a portable folder on the E: drive. The C: drive has little free space. MPFB 2.0.17 needs Blender 4.2 or newer.
- MPFB can be driven from a script. `HumanService.create_human()` is its entry point.
- MPFB's shapes are files of per-vertex offsets (`.target.gz`), so each region shape can be created directly as a Blender shape key. The ones used are `upperarm-muscle-incr`, `lowerarm-muscle-incr`, `upperarm-shoulder-muscle-incr`, `torso-muscle-pectoral-incr`, `torso-muscle-dorsi-incr`, `stomach-tone-incr`, `upperleg-muscle-incr`, `lowerleg-muscle-incr`, `buttocks-volume-incr` and the `maxmuscle` macro shapes.
- Left and right shapes are joined into one shape per region, so both sides grow together.
- Run MPFB's "delete helpers" step before export, and keep our own shape keys. Do not bake them.
- Use MPFB's Mixamo skeleton, so Mixamo animations fit. MPFB's notes say its skin weights are rough in extreme poses.
- A regional shape moves only a small part of the body, so the file stays small if each shape stores only the points it moves.
- three.js reads the shape names from the file, so the kit finds each shape by its region name.

### 5.3 The avatar kit

`shared/avatar-kit/` is the only code that knows how to show an avatar. Every game and screen uses it to:

- load the body file,
- apply an avatar's scores to it,
- play a named animation,
- set the skin tone.

It never works out a score. It only displays the ones it is given.

Muscles change once a week, so before a fight the kit works the muscle shapes into the body once. A fight then costs the same as animating a plain body.

Until the real body file exists, the kit shows a stand-in body built in code from simple shapes, one per region. Games cannot tell the difference, so swapping in the real file changes no game code.

### 5.4 Animations

| Source | Terms | Notes |
| --- | --- | --- |
| Mixamo | Free, including commercial use. Needs a free Adobe account. The downloaded files must not be shared publicly. | The largest free set of fighting moves. Our repository is private, which satisfies the terms. If it ever becomes public, these files must be taken out first. |
| Quaternius Universal Animation Library | Free for any use, and may be shared. | A smaller set of combat moves. Part is free and the rest is paid. |

A script converts each animation into the same file format as the body.

## 6. The arena fight game

### 6.1 What players get, in stages

| Stage | What it is | Who controls the fighters | Order |
| --- | --- | --- | --- |
| A | Weekly match replay. You watch your avatar fight your opponent's. The winner is whoever earned more points that week. | The computer, following a script that knows the result | First |
| B | Played fight. You control your avatar against a computer-controlled copy of your opponent's avatar. | You and the computer | Second |
| C | Live online fight between two people | Two people at once | Not planned |

Stage C is left out because live online fighting needs special networking that is among the hardest things in games to build. Stage B gives the feeling of fighting a friend without it, and the two players do not have to be online at the same time.

### 6.2 Fighting styles

In Tekken, every fighter's moves come from a real martial art. Here the fighter is your own avatar, so you choose a style instead of a character.

- A style is a list of moves: which punches and kicks it has, and what its stance looks like.
- Every style uses the same buttons. Once you can play one style, you can play them all.
- Every style and every move is open to every player from the start. Nothing that affects a fight is sold or locked. The only way to get stronger is the gym.
- Styles are balanced to the same overall strength. They differ in which muscles they reward.
- A style is data, not code. Adding one means adding a move list and its animations.

| Style | Leans on | Rewards training | When |
| --- | --- | --- | --- |
| Boxing | Punches | Arms, chest, shoulders | First |
| Kickboxing or taekwondo | Kicks | Legs | Second |
| Karate, kung fu, MMA | A mix | A mix | Later, as free animations allow |
| Judo, wrestling | Throws | Core and back | Later still. A throw needs two bodies animated together, which is the hardest kind of move to build. |

How muscles shape a fighter, as the spec sets out:

| Muscles | What they power |
| --- | --- |
| Arms, chest, shoulders | Punches |
| Legs | Kicks and speed |
| Core and back | Blocks |
| Definition | Stamina |

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

The same seed and the same inputs always produce exactly the same fight. That gives repeatable replays, which the spec requires. It also lets every rule be tested without graphics, and would let a server re-check a result later.

The two fighters stand on a line facing each other, as in Tekken's side view. A hit is decided by distance and height, not by testing the two 3D bodies against each other. That keeps the rules simple and exact. Side-stepping can be added later.

Each move is a row of numbers:

| Field | Meaning |
| --- | --- |
| startup | Ticks before the move can hit |
| active | Ticks during which it can hit |
| recovery | Ticks afterwards, when the fighter is open |
| reach | How far it reaches |
| height | High, middle or low, which decides what blocks it |
| damage | Health removed by a clean hit |
| stun | Ticks the opponent is frozen after being hit |
| stamina | Stamina it costs |
| limb | Punch or kick, which decides which muscles power it |
| animation | Which animation to play |

A fighter's strength comes from the avatar's scores. They are read at the start of the fight and never changed.

Something has to press the buttons. That is a controller, and the core does not care which kind it is.

| Controller | Who decides the inputs | Used for |
| --- | --- | --- |
| Director | A script that knows who must win | Weekly match replay |
| Computer | Plays to win, at a set skill level | The opponent in a played fight |
| Human | Touch buttons | The player in a played fight |

For a weekly match, the shell tells the game who won. The director then stages a fight that ends that way. The seed chooses the moves, and the points gap decides how close the fight looks.

The fight view only reads the core's state and draws it. It never changes the outcome.

### 6.5 How hard this is

| Piece | How hard | Why |
| --- | --- | --- |
| Watched replay with two styles | Moderate | It is mostly rules and data, and the animations are ready-made. |
| Played fight against the computer | Hard, but doable in stages | It needs responsive controls, a fair computer opponent and a lot of tuning. |
| Throws and grapples | Hard | Two bodies must be animated together. |
| Live online one-on-one | Very hard | It needs special networking and game servers. |
| Tekken's depth: over 100 moves per fighter and hand-made animation | Out of reach without a team | It is years of work by a large studio. |

## 7. Build order

Each step leaves something that works by itself.

1. The prototype page.
2. Set logging.
3. The avatar screen with the stand-in body, driven by the growth engine.
4. The real body from the Blender script, swapped in.
5. Skip a week, and weekly match scoring.
6. The game contract, the game list, and the two tests from section 4.
7. The fight core with boxing, tested without graphics.
8. The fight view in watched mode. This completes the fight replay.
9. A second style.
10. The played fight against the computer.

Step numbers in [ProjectFlow.md](ProjectFlow.md) track progress against this order.

## 8. Risks

| Risk | How we handle it |
| --- | --- |
| A region shape looks wrong where a ready-made shape is split. | Check the test pictures for every region, and adjust the split until they look right. |
| Ready-made animations fit the body loosely in extreme poses. | Try three animations first, before collecting the full set. |
| Phones are slower than computers. | Open the prototype in a phone's browser as soon as the fight view exists. Keep the body light, and work the muscles in once per fight. |
| The owner's computer has 8 GB of memory and a nearly full C: drive. | Keep Blender on the E: drive and build one body at a time. |
| The project is now much bigger than the first prototype plan. | Build in the stages above. Each one is useful without the next. |

## 9. Later

- **Phones.** The games are web code. In the phone app they first run inside the app as a web page. This is checked on a real phone before the app phase begins.
- **More games.** A new game is a new folder under `games/` that uses the same avatar kit and the same contract. Football or another sport reads the same 19 scores in its own way, for example legs for kicking power.
- **A game engine such as Unity.** This becomes worth it only if a team is hired. The body file uses a standard human skeleton that those engines read, and the fight rules and move data carry over as the specification.
- **A face from a selfie.** A separate optional feature (Q-4).
