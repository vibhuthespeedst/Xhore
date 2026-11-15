# Avatar evolution platform: the master plan

> **Status**: Proposed. Nothing is built until the owner answers the questions in section 2.
> **Date**: 2026-11-16
> **Answers**: the owner's specification, kept word for word in [design/vision/avatar-evolution-spec.md](../vision/avatar-evolution-spec.md)
> **How it will be used**: this is the map. Each numbered piece in section 6 gets its own design document and its own step-by-step build plan when its turn comes (D-060).

## 1. The short version

You asked for an app whose whole point is a 3D copy of your body that changes as your real body changes: it starts from your photo and details, and then your logged workouts, food, weight and sleep slowly reshape it, muscle by muscle.

My recommendation:

1. **Build it on Xhore, not from zero.** The three hardest parts already exist and are tested: the growth engine (173 tests), the 3D body with 19 separately growing and separately defined muscles (105 tests), and the script that builds that body for free.
2. **Five phases, in the order your specification gives.** Each one ends with something you can use on your own phone.
3. **Photo to avatar in three levels.** Level 1 needs no photo. Level 2 reads your photo on your phone and never uploads it. Level 3 is a cloud AI scan at about 2 US cents a scan, added later. All three feed the same body.
4. **Real-life pace.** Size changes over months. Muscle lines, body fat and the after-workout pump change faster, and those give the quick feedback. A preview button plays your next 90 days.
5. **A web app you install on your phone's home screen**, built with the tools the prototype already uses. It can be wrapped for the Play Store and App Store later without a rewrite.
6. **One free hosted service, Supabase,** for sign-in, the database and private photo storage.
7. **The fight and the leaderboard are parked.** Their code stays, switched off.

Three things in the specification that today's technology cannot fully deliver, and what the plan does instead:

| The specification asks | The honest position | What we do |
| --- | --- | --- |
| An avatar that looks like you from a photo | A photo gives proportions and a rough body-fat level. It cannot see muscle size reliably, and a matching face costs real money (section 3.2). | Body shape from the photo, muscle level from your answers, both adjustable by you. A face that is yours waits. |
| A highly realistic human | Film-quality digital humans are made by teams of artists. Our body is a free, generated one. | Raise the quality in steps: skin shading, shadows, lighting, camera. Leave the door open for an artist later. |
| An avatar that tracks real muscle growth | Logs cannot measure muscle. Your specification says this itself. | Every number is labelled measured or estimated, every rule comes from a published study, and optional tape measurements correct the estimate. |

## 2. Decisions I need from you

Each has my recommendation. They are also in [Decision.md](../../Decision.md) under "Waiting on a decision".

| # | Question | Recommendation | Why |
| --- | --- | --- | --- |
| Q-18 | Does this become Xhore's main product, with the fight parked? | Yes. | Your specification says the avatar is the product. The fight needs animations, a computer opponent and tuning, and it competes for the same time. Games are plug-ins, so nothing is lost by switching it off. Sets you log yourself count in full, because there are no friends yet to confirm them (D-014 waits with the friends feature). |
| Q-19 | What kind of app? | A web app that installs on the phone's home screen, built with Vite and React like the prototype. Not Next.js. three.js stays as it is, not React Three Fiber. | Section 3.7. In short: it wraps into store apps later, it is lighter on your laptop, free hosting allows commercial use, and the 3D code is already written and tested. |
| Q-20 | Where do accounts and data live? | Supabase, replacing Firebase from D-002. Until you create the free account, the app keeps everything on the device. | One service covers sign-in, a Postgres database and private photo storage, which is what your specification lists. |
| Q-21 | How is the avatar made from a photo? | Levels 1 and 2 in Phase 1. Level 3 (cloud scan) in Phase 5. No face likeness for now. | Levels 1 and 2 cost nothing and keep your photo on your phone. Section 3.1. |
| Q-22 | How fast does the avatar change? | Real-life pace, with a preview of the future. This settles Q-17. | Your specification asks for gradual change over weeks and months. Today a beginner reaches "advanced" in 3 to 4 months, which real training takes years to do. |
| Q-23 | Which muscle list? | Keep our 19 regions inside, split abs into upper and lower to make 20, and show the chest as one group with its three parts inside the detail panel. "Upper back" is our mid back. | It matches your list of 18 without throwing away detail we already have. |

## 3. What the research found

Sources are listed in section 11 by number.

### 3.1 From a photo to a 3D body

- **Our body and the research world's newest free body are the same family.** In November 2025 NAVER LABS released Anny, a free (Apache 2.0) body model built on MakeHuman, the same source our body comes from. Its controls are plain ones: gender, age, weight, height, muscle, plus 256 local shapes such as waist size [1][2][5]. So a body described in those terms maps directly onto ours.
- **A single photo can now be turned into a 3D body with a licence that allows commercial use.** Meta's SAM 3D Body does it, and a hosted version costs about $0.02 a photo [3][4]. One developer wrote up the full route, photo to SAM 3D Body to Anny's plain controls, at about $0.09 a scan on their own cloud machine, which they expect to cut to $0.03 [5].
- **The older standard is closed to us.** SMPL and SMPL-X, used by most research, are free for research only. A commercial licence goes through Meshcapade and is priced for companies [6].
- **Paid body-scan services exist**, such as 3DLOOK, which reads two phone photos. Their accuracy figures are their own and I found no independent test [7].
- **A phone's browser can find the body in a photo by itself.** Google's MediaPipe gives 33 body points and the person's outline, free, with nothing uploaded [8].

What this means: three levels, one body.

| Level | What you give | How it works | Cost | Photo leaves the phone? |
| --- | --- | --- | --- | --- |
| 1 | Height, weight, age, experience, and a pick from a grid of body types, then sliders | Your answers set the body directly | Free | No photo |
| 2 | A front and a side photo in fitted clothes | The phone finds your outline, measures shoulders, chest, waist, hips and limbs against your height, and fits the body to them | Free | No |
| 3 | One photo | A cloud AI builds a 3D body, which is measured the same way | About $0.02 a scan | Yes, to the scan service |

All three, and a tape measure, feed one fitter: measurements in, body settings out. You can always adjust the result by hand.

### 3.2 Faces

Ready Player Me, the best-known selfie-to-avatar service, closed on 31 January 2026 after Netflix bought it, and Union Avatars is reported to have gone offline in mid 2026 [9]. Of those still running, Avaturn's entry plan is reported at $800 a month [10]. Even with one of them, their head would have to be joined onto our muscle body, which is hard. Recommendation: skin tone, hair and a few faces to choose from now, and your own face later (Q-4 stays open).

### 3.3 How muscle actually grows, and what the engine should do about it

| Finding | Source | What the engine does |
| --- | --- | --- |
| More weekly sets grow more muscle, but each extra set adds less. | Pelland 2025, 67 studies [11] | Growth rises with weekly sets on a flattening curve. Piling on sets stops paying. |
| A set for a helper muscle counts about half. | Same study [11] | The main muscle of an exercise gets a full set, helpers half. |
| How often you train a muscle matters little for size, for the same weekly total. | Same study [11] | No bonus for frequency, but a limit on what one session can count. |
| Sets taken closer to failure grow more muscle. Strength does not depend on it. | Robinson 2024, 55 studies [12] | Each set gets an effort factor, from the effort you log or from how it compares with your recent best. |
| Light and heavy weights grow muscle about equally when the sets are hard. Heavy weights build more strength. | Schoenfeld 2017 [13] | Weight on the bar feeds the strength score. Size comes from hard sets. |
| Beginners gain fastest: roughly 1 to 1.5% of body weight a month, about half that in the second year and half again in the third. | Coaches' models (Aragon, McDonald), rough averages [14] | Gains slow as a muscle nears its ceiling, and the ceiling differs between people. |
| Eating about 500 kcal a day under your needs roughly cancels muscle gain, though strength still rises. Most of the people studied were beginners, and the exact figure is disputed. | Murphy and Koehler, 2021 [15] | A food factor on growth, built from weekly averages, never from one day. |
| Protein helps up to about 1.6 g per kg of body weight a day, and little beyond that. | Morton 2018, Nunes 2022 [16][17] | A protein factor that tops out at 1.6 g/kg. |
| One night with no sleep cut muscle building by 18%. Short sleep while dieting shifted weight loss from fat to muscle. | Lamon 2021, Nedeltcheva 2010 (both small) [18][19] | A modest sleep factor. |
| After a 10-week break, muscle came back within 5 weeks. A third or a ninth of the usual volume kept size in young adults, though not in older ones. | Halonen 2024, Bickel 2011 [20][21] | Size holds on a third of your usual sets, declines slowly below that, and regrows fast up to your previous best. The engine already has the last part. |
| A muscle needs about 24 to 72 hours to recover, longer after sets to failure. | Morán-Navarro 2017 and reviews [22] | Each muscle has a fatigue level that fades over days and gives "recently trained", "recovering" or "ready". |
| A muscle swells right after training. The swelling is still there an hour later and gone within a day. | Ultrasound studies [23] | A pump that fades over a few hours and is never saved as growth. |

### 3.4 Food, weight and body fat

- Body weight follows the gap between energy eaten and energy burned, but not by a fixed rule: the body burns less as it gets lighter. The standard model is Hall's, behind the US health institute's Body Weight Planner [24].
- The burn figure from a formula is a guess. The app MacroFactor starts from a formula and then corrects it from your logged food and your weight trend [25]. We do the same.
- For food data, the US government's database is public domain, Open Food Facts covers barcoded products but requires sharing any database built from it, and an open Indian database covers raw foods and over a thousand Indian recipes, though I could not confirm its licence [26][27][28].

Plan: typing in a food with its calories and macros, as your specification describes, plus "my foods" and "recent" so the same meal is one tap. A searchable database is an add-on.

### 3.5 Similar apps

| App | What it does | What it lacks |
| --- | --- | --- |
| Avatone (iPhone) | Workouts earn points, and an avatar gets "stronger, leaner, more defined" [29] | A game character, not your body. No food or recovery. |
| Visual Fitness 3D | An avatar follows your weight, body fat and measurements [30] | Driven by measurements you type, not by training. |
| MuscleMap Fitness | A 3D figure coloured by muscle fatigue [31] | Shows tiredness, not development. |
| Body Visualizer & Simulator | Morphs a figure towards a goal weight [32] | A planner, not a tracker. |
| Fitbod | A recovery percentage for each muscle, over about 6 to 7 days [33] | A flat body map. No evolving body. |

I found no app that joins all four: a body fitted to you, growth muscle by muscle from logged sets, food and sleep changing the result, and a timeline to replay. That gap is the product.

### 3.6 Privacy and law

- India's data protection rules were notified in November 2025. The main duties (clear notice, consent, deletion) apply from May 2027, and anyone under 18 needs a parent's verified consent [34].
- Body photos are among the most sensitive things an app can hold.

Plan: adults only, photos read on the phone and not stored unless you choose to keep progress photos, private storage when you do, and one button that deletes everything.

### 3.7 Technology

| Your specification suggests | Recommendation | Reason |
| --- | --- | --- |
| Next.js | Vite and React, as in the prototype | Next.js's main gift is pages that search engines can read. This is a signed-in tool. A plain web app can be bundled into store apps, while a Next.js app that uses its server features cannot. Vercel's free plan forbids commercial use, and Cloudflare Pages's free plan has unlimited bandwidth [35][36]. It is also lighter on an 8 GB laptop. |
| React Three Fiber and Drei | three.js directly, as now | The avatar kit works and has 105 tests. Fiber's next version is still in alpha [37]. Wrapping the kit in one React component is all the page needs. |
| PostgreSQL, Supabase Auth, Supabase Storage | Supabase for all three | The free plan is reported as about 500 MB of database, 1 GB of files and 50,000 monthly users, and a free project pauses after a week without use [39]. Guest sign-in is built in and can be upgraded to a real account later [38]. |
| Prisma or Drizzle | Decide in Phase 1's design | With Supabase the app can talk to the database directly under per-user rules, so this may not be needed. |
| Tailwind, shadcn/ui, Recharts | Yes | They fit the dark, glassy look you described. |

Each new package is still asked for when its turn comes, as the project rules say.

## 4. What exists and what is missing

| Specification section | Already in Xhore | Missing | Phase |
| --- | --- | --- | --- |
| 1. Avatar from a photo | One male body, slim to muscular | Height, frame, body fat, female body, onboarding, photo fitting | 1, 5 |
| 2. Interactive 3D human | Turn, zoom, front/side/back, muscle highlight, per-muscle size and definition, breathing | Clicking a muscle, camera moves, better skin and shadows | 1 |
| 3. Growth engine | Sets to stimulus to growth, slowing with size, shrinking when idle, fast regrowth | Daily steps, effort, overload, recovery, food, pump, personal pace | 2, 3 |
| 4. Nutrition | Nothing | All of it | 3 |
| 5. Recovery and sleep | Nothing | All of it | 3 |
| 6. Dashboard | A prototype page | The real screen | 1 to 4 |
| 7. Timeline | Nothing | Snapshots, slider, playback | 4 |
| 8. Muscle panel | A list of scores | History, records, explanation | 2 |
| 9. Workout logging | A simulator with 14 exercises | Real logging, about 120 exercises, routines, records | 2 |
| 10. Look | A dark page with an orange accent | The full design | 1 |
| 11. Accounts and storage | Nothing | All of it | 1 |
| 12. Accuracy | Tested rules, one settings object | Measured and estimated labels, model versions | 2, 3 |

## 5. The design in outline

### 5.1 The parts

```
logs you enter ──► engine (rules, no screen) ──► avatar state for each day ──► avatar kit (3D) ──► app screens
  sets, food,        pure TypeScript,              scores for 20 muscles,        the body file,       dashboard,
  weight, sleep      tested without graphics       body fat, pump                three.js             timeline
```

- **Logs are the truth.** The avatar for any day is worked out again from your profile and your logs. So editing an old workout corrects the history, and when the rules improve, the whole history is replayed with the new rules. Each saved avatar notes which version of the rules made it.
- **The engine stays free of screens, clocks and networks** (D-004), so the same rules run in the app, in tests and later on a server.
- **One writer per number** (D-007): only the engine works out scores.

### 5.2 The body: three layers

| Layer | What it holds | Changes | Set by |
| --- | --- | --- | --- |
| Build | Height, shoulder and hip width, limb proportions, sex | Hardly ever | Onboarding |
| Fat | How much body fat, and whether it sits at the belly or the hips first | Over weeks | Food, weight, the engine |
| Muscle | Size and definition for each of 20 muscles, plus the pump | Size over months, definition over weeks, pump over minutes | Training, the engine |

The body file gains shapes for the build and fat layers, built by the same script from the same free source. It also gets smaller through compression, because phones will load it.

Muscle lines will also depend on body fat: the same abs show clearly on a lean body and faintly under more fat. That is how real bodies work, and it makes losing fat visible on the avatar in the right way.

### 5.3 The engine, second version

What it keeps for each day: every muscle's size, definition and fatigue; body weight (measured when you log it); body fat, lean mass and daily energy burned (estimated); and your best lifts.

How one day is worked out, in order:

1. **Stimulus.** Each logged set gives its muscles a share (1 for the main one, 0.5 for helpers), times an effort factor, times a freshness factor that drops if the muscle was not yet recovered. Effort is judged against your own recent best, so as you get stronger the same weight and reps count for less. To keep growing you have to add weight or reps, which is progressive overload.
2. **Fatigue.** It rises with the stimulus and fades over the following days, faster with good sleep.
3. **Growth.** A small daily amount: weekly sets on the flattening curve, times the room left before the muscle's ceiling, times the food, sleep and personal factors.
4. **Definition.** As today, from consistency, and now also from leanness.
5. **Fat.** From energy eaten against energy burned, corrected by your weight entries.
6. **Pump.** For display only.

Pace to aim for, to be fixed in the engine's own design document: a beginner's well-trained muscle goes from 10 to about 18 in three months, about 30 in a year and about 50 in four to five years. That keeps the meaning the fight already gives the scores (30 intermediate, 50 advanced, 100 a lifetime ceiling).

What you see at 90 days, then, is modest growth in size, clear muscle lines on what you trained, and whatever your body fat did. That is a real 90-day change, and the before and after slider will show it.

Missing data never counts against you. If you log no food, the food factor is neutral and the screen says "not logged".

### 5.4 Data

Profile; body entries (weight, optional tape measurements, optional body fat); photos (only if you keep them); workouts and their sets; routines; my foods and food entries; sleep and soreness entries; one saved avatar per day; settings. The exercise list ships inside the app, not in the database. Every record belongs to one user, and the database refuses to show it to anyone else.

### 5.5 The app

- **Dashboard.** The avatar fills most of the screen. Panels float over it as dark glass: body stats, muscle list, today's food, this week's training. On a phone the panels become a sheet that slides up.
- **Muscle panel.** Tap a muscle on the body or in the list: both sides light up, the camera moves to it, and its score, history, records, recovery state and a plain explanation of what moved it appear.
- **Log.** Built for the gym: last time's weights filled in, one tap to repeat a set, and it keeps working with no signal, sending the data later.
- **Timeline.** Day 1, 7, 30, 60, 90, 180, 365 or any date; a slider wiping between two dates with the same camera; playback; and the 90-day preview.
- **Look.** Black and charcoal, with blue, purple and orange light, built with the frontend-design guidance.

### 5.6 Safety

No target below a safe calorie floor, no praise for extreme deficits, neutral words about bodies, and "estimated" on every figure that is one. Not a medical tool, and it says so.

## 6. The phases

Each piece is built the way the fight physics and the muscle lines were: a design document, a plan, tests first, a check you can do yourself, then a commit.

### Phase 1: your body on day one

| Piece | What it is |
| --- | --- |
| 1.1 App shell and look | The real app's frame: navigation, the avatar stage as the centrepiece, the design system, phone layout first. |
| 1.2 Body file, third version | Build and fat shapes, compression, clicking a muscle, camera moves, better skin, shadows and lighting. |
| 1.3 Onboarding | Details (height, weight, age, optional sex and body fat, experience, goal), body-type grid, sliders, optional photo fit on the phone, Day 1 saved. |
| 1.4 Saving and accounts | Everything kept on the device, then Supabase: guest first, sign-in later, private photo storage. |

Your specification lists sign-in first. It comes last inside this phase so that the build never waits on an account, and the app already works on the device before it does.

**At the end you can:** make your own avatar on your phone in a few minutes and find it there the next day. A slim, a heavy and a muscular start look clearly different. Tapping the biceps lights both.
**Needs from you:** answers to section 2, a Supabase account when 1.4 starts, and your phone for a speed test.

### Phase 2: training

| Piece | What it is |
| --- | --- |
| 2.1 Exercise list | About 120 exercises with variations, machines and cables, each with its muscle shares. This answers Q-13. |
| 2.2 Workout logging | Log with weight, sets, reps and duration; routines; history; editing; personal records. This answers Q-6: your usual weights come from your own history. |
| 2.3 Engine, part one | Daily steps, replay from logs, effort, fatigue, growth at real pace, strength. |
| 2.4 Muscle panels and pump | The development list, the detail panel, the pump. |

**At the end you can:** log dumbbell curls, 15 kg, 3 sets of 12, and see the biceps marked "recently trained" and pumped for the next few hours. Weeks of logging move the score by the documented amount, and editing an old workout changes the history.

### Phase 3: food, sleep and recovery

| Piece | What it is |
| --- | --- |
| 3.1 Food log | Typed entries, my foods, recent, daily totals and targets. |
| 3.2 Weight and body fat | Weight log and trend, energy burned, estimated body fat driving the avatar's fat layer. |
| 3.3 Sleep and recovery | Sleep, soreness and rest days; a recovery state for every muscle. |
| 3.4 Engine, part two | The food and sleep factors. |

**At the end you can:** see today's calories and protein, see which muscles are ready, and watch the avatar's waist follow a sustained deficit over weeks, not days.

### Phase 4: evolution over time

| Piece | What it is |
| --- | --- |
| 4.1 Snapshots and timeline | One saved avatar a day, and any date viewable. |
| 4.2 Compare and play | The before and after slider, playback, the 90-day preview. |
| 4.3 Dashboard completed | Stats, charts, training summary. |

**At the end you can:** drag between Day 1 and today, and play your whole history.

### Phase 5: polish and reach

Speed on phones, installing to the home screen, export and delete, checks on stored data. Then, in an order you choose: the female body (Q-12), the cloud photo scan, store apps, a searchable food database, friends comparing avatars, and the fight coming back.

## 7. Earlier decisions this would change

| Decision | Today | Proposed |
| --- | --- | --- |
| D-002 | The real app is an Expo app with Firebase | A web app first with Supabase (Q-19, Q-20) |
| D-010 | 19 muscle regions | 20, with abs split (Q-23) |
| D-011 and Q-17 | A beginner reaches 50 in 3 to 4 months | Real-life pace (Q-22) |
| D-014 | Self-logged sessions earn half | Full credit until friends return (Q-18) |
| D-057, D-061 | The fight comes next | The avatar platform comes next (Q-18) |

Nothing else changes: the engine stays pure (D-004), one writer per number (D-007), saved data only gains fields (D-008), three.js directly (D-029), and a design document and plan for every piece (D-060).

## 8. Risks

| Risk | How it is handled |
| --- | --- |
| The avatar from a photo disappoints | Call it an estimate, show the sliders next to it, and keep level 3 for later. |
| The body does not look real enough | Raise it in steps and judge on your phone after 1.2. An artist's sculpt can replace the free body's detail later with no code change. |
| The project is large | Fifteen pieces in the first four phases, each useful by itself, none started without its design document. |
| The laptop has 8 GB of memory and a full C: drive | Light tools, nothing that needs Docker, anything heavy runs in the cloud. |
| The rules look made up | Each rule names its study and has a test, and each number says measured or estimated. |
| A free Supabase project pauses after a week idle | Fine while building. The paid plan is $25 a month if real users arrive. |
| Phones are slower than laptops | A size and speed budget for the body file, checked on your phone at the end of Phase 1. |
| The slower pace feels unrewarding | Pump, muscle lines, body fat and the preview give feedback from the first day. |

## 9. Costs

Free: Supabase's free plan, Cloudflare Pages hosting, the body's source material, three.js, the phone-side photo reading. Optional later: cloud scans at about $0.02 each, a domain name, $25 once for the Play Store, $99 a year for the App Store.

## 10. What happens next

When you answer section 2, I write the design documents for pieces 1.1 and 1.2 and show them to you before building. I will still ask before adding any package, before anything needs an account, and before every push.

## 11. Sources

1. [Anny body model, paper](https://arxiv.org/abs/2511.03589)
2. [Anny, code and licence](https://github.com/naver/anny)
3. [SAM 3D Body, code and licence](https://github.com/facebookresearch/sam-3d-body)
4. [SAM 3D Body hosted on fal.ai](https://fal.ai/models/fal-ai/sam-3/3d-body)
5. [A 3D body scan for nine cents, without SMPL](https://dev.to/arkadiuss/a-3d-body-scan-for-nine-cents-without-smpl-4me1)
6. [Meshcapade body model licences](https://meshcapade.com/assets/body-models)
7. [3DLOOK FitXpress](https://3dlook.ai/fitxpress/for-connected-and-digital-fitness/)
8. [MediaPipe Pose Landmarker for the web](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js)
9. [Avatar platforms in 2026: who is alive, who is gone](https://avatarsdk.com/blog/2026/08/31/avatar-platforms-2026-whos-alive-whos-gone/)
10. [Avaturn pricing, as listed by Toolradar](https://toolradar.com/tools/avaturn/pricing)
11. [Pelland and others, 2025: weekly volume and frequency](https://doi.org/10.1007/s40279-025-02344-w)
12. [Robinson and others, 2024: proximity to failure](https://sportrxiv.org/index.php/server/preprint/view/295)
13. [Schoenfeld and others, 2017: low against high loads](https://pubmed.ncbi.nlm.nih.gov/28834797/)
14. [Realistic rates of muscle gain: the Aragon and McDonald models](https://www.rntfitness.co.uk/realistic-rates-muscle-gain/)
15. [Murphy and Koehler: energy deficiency and lean mass](https://doi.org/10.1111/sms.14075)
16. [Morton and others, 2018: protein and resistance training](https://pubmed.ncbi.nlm.nih.gov/28698222/)
17. [Nunes and others, 2022: protein intake and muscle mass](https://pubmed.ncbi.nlm.nih.gov/35187864/)
18. [Lamon and others, 2021: sleep loss and muscle protein synthesis](https://doi.org/10.14814/phy2.14660)
19. [Nedeltcheva and others, 2010: insufficient sleep while dieting, journal summary](https://www.globalfamilydoctor.com/Resources/A-Ztopiclisting/JournalWatch/Insufficientsleepunderminesweightlossefforts.aspx)
20. [Halonen and others, 2024: a ten-week break, reported by NPR](https://www.wunc.org/2024-11-26/after-a-break-from-strength-training-muscle-memory-may-help-you-bounce-back)
21. [Bickel and others, 2011: how little training keeps the gains](https://pubmed.ncbi.nlm.nih.gov/21131862/)
22. [Morán-Navarro and others, 2017: recovery after training to failure](https://pubmed.ncbi.nlm.nih.gov/28965198/)
23. [The edema illusion: swelling against real growth](https://biolayne.com/reps/issue-46/the-edema-illusion-distinguishing-swelling-from-real-growth/)
24. [NIDDK Body Weight Planner and Hall's model](https://niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner)
25. [MacroFactor: how accurate is the expenditure algorithm](https://macrofactor.com/algorithm-accuracy/)
26. [USDA FoodData Central API guide](https://fdc.nal.usda.gov/api-guide)
27. [Open Food Facts licence](https://wiki.openfoodfacts.org/ODBL_License)
28. [Indian Nutrient Databank](https://pmc.ncbi.nlm.nih.gov/articles/PMC11277795)
29. [Avatone: Fitness Game](https://apps.apple.com/app/id6743415879)
30. [Visual: HIIT and Gym Workouts](https://apps.apple.com/us/app/visual/id1583937016)
31. [MuscleMap Fitness](https://apps.apple.com/app/id6782176731)
32. [Body Visualizer and Simulator](https://apps.apple.com/app/id6761150236)
33. [Fitbod: muscle recovery](https://help.fitbod.me/hc/en-us/articles/360006269014-Muscle-Recovery)
34. [India's data protection rules come into effect, AZB and Partners](https://www.azbpartners.com/bank/update-indias-digital-personal-data-protection-framework-comes-into-effect/)
35. [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
36. [Cloudflare Pages](https://pages.cloudflare.com/)
37. [React Three Fiber 10.0.0-alpha.6 release notes](https://newreleases.io/project/npm/@react-three/fiber/release/10.0.0-alpha.6)
38. [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
39. [Supabase free plan limits in 2026, summarised by Automation Atlas](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)
