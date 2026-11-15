# The owner's specification: a 3D fitness avatar evolution platform

> Received from the owner on 2026-11-16 and kept here word for word. The plan that answers it is [design/plans/2026-11-16-avatar-evolution-master-plan.md](../plans/2026-11-16-avatar-evolution-master-plan.md).

---

# Build a 3D Fitness Avatar Evolution Platform

Build a premium, visually stunning, interactive 3D fitness application whose entire purpose is to create a digital version of a person's body and evolve it according to their real-world fitness journey.

## Core Concept

**Your digital body should evolve as your real body evolves.**

When a user starts using the application, they upload their initial photograph and enter their physical details. The application generates a personalized 3D human avatar representing their current physique.

As the user logs workouts, exercises, food intake, protein consumption, calories, body weight, and recovery, the digital avatar gradually evolves.

For example:

- A user starts with relatively underdeveloped biceps.
- They consistently perform dumbbell curls using 15 kg dumbbells.
- They log their sets, repetitions, and workout frequency.
- The system calculates accumulated biceps training stimulus.
- Their recovery and nutritional intake are considered.
- Over several weeks and months, the avatar's biceps gradually become more developed.

The same principle must apply to every muscle group.

The avatar should visually represent the user's fitness journey rather than simply displaying numbers and charts.

# 1. Initial Avatar Generation

Create a beautiful onboarding experience.

Ask the user to provide:

- Initial selfie or full-body photograph.
- Height.
- Weight.
- Age.
- Gender (optional).
- Body fat percentage (optional).
- Fitness experience.
- Fitness goal.

Use the uploaded photographs as visual references to generate a personalized 3D human avatar.

The avatar should resemble the user's starting appearance as closely as the available technology allows.

Consider:
- Body proportions.
- Shoulder width.
- Chest size.
- Arm size.
- Biceps and triceps development.
- Abdominal structure.
- Waist size.
- Leg development.
- Overall muscularity.
- Estimated body-fat distribution.

IMPORTANT:
Do not generate a generic muscular character for every user.

Someone who is skinny, overweight, athletic, muscular, or average should get an avatar that represents their actual starting physique.

Allow users to make minor appearance adjustments after generation.

If automatic photo-to-3D generation is unavailable, implement a customizable parametric 3D human model as a fallback. Do not substitute a static image for an interactive 3D avatar.

# 2. Interactive 3D Human Avatar

This is the most important part of the entire application.

Create a highly realistic 3D human character.

Requirements:

- Full-body human model.
- Realistic anatomical proportions.
- Detailed muscle structure.
- Realistic skin materials and lighting.
- Front, back, and side views.
- 360-degree rotation.
- Zoom in and zoom out.
- Smooth camera transitions.
- Interactive muscle selection.

Users should be able to click on individual muscle groups.

For example, clicking on the biceps should highlight both biceps and display their training history and development.

Support these muscle groups:

UPPER BODY:
- Chest.
- Front deltoids.
- Side deltoids.
- Rear deltoids.
- Biceps.
- Triceps.
- Forearms.
- Traps.
- Lats.
- Upper back.

CORE:
- Upper abs.
- Lower abs.
- Obliques.
- Lower back.

LOWER BODY:
- Quadriceps.
- Hamstrings.
- Glutes.
- Calves.

Each muscle group should have independently tracked progress.

Use anatomically appropriate 3D geometry and materials, not flat colors painted on top of a generic body.

# 3. Muscle Growth and Transformation Engine

Create an intelligent muscle progression system.

Every logged workout should contribute to the relevant muscle groups.

Example workout:

Exercise: Dumbbell Bicep Curl

Weight: 15 kg per dumbbell

Sets: 3

Repetitions: 12

The system should:
1. Identify the primary and secondary muscles involved.
2. Calculate training volume.
3. Estimate training stimulus.
4. Account for workout frequency.
5. Track progressive overload.
6. Estimate recovery requirements.
7. Combine accumulated training with nutritional information.
8. Update the avatar progression estimate.

Exercise-to-muscle mapping examples:

| Exercise | Primary muscles |
|---|---|
| Dumbbell curls | Biceps |
| Hammer curls | Biceps, brachialis, forearms |
| Bench press | Chest, triceps, front deltoids |
| Shoulder press | Shoulders, triceps |
| Pull-ups | Back, biceps |
| Squats | Quadriceps, glutes |
| Deadlifts | Posterior chain |
| Tricep extensions | Triceps |
| Calf raises | Calves |
| Leg raises | Core |

Important scientific requirements:

- A single workout must not instantly increase muscle size.
- A workout generates a stimulus, not immediate hypertrophy.
- Adaptation should accumulate gradually across weeks and months.
- Recovery must be considered.
- Progressive overload should influence development.
- Training the same muscle excessively should not generate unlimited growth.
- Different people should have different estimated progression trajectories.

The system must distinguish temporary muscle pump from long-term muscular development.

# 4. Nutrition and Calorie Tracking

The avatar's evolution must also depend on the user's nutrition.

Build a food logging interface.

Users can enter:

- Food name.
- Quantity.
- Calories.
- Protein.
- Carbohydrates.
- Fat.

Display daily nutritional totals.

Example:

Calories: 2,200 kcal

Protein: 110 g

Carbohydrates: 220 g

Fat: 65 g

Consider:
- Total calorie intake.
- Estimated calorie expenditure.
- Calorie surplus or deficit.
- Daily protein consumption.
- Weekly average protein intake.
- Carbohydrate intake.
- Fat intake.
- Body weight trends.

The avatar should respond to long-term nutritional patterns.

For example:

A sustained calorie deficit combined with resistance training may gradually reduce estimated body-fat levels while helping preserve muscle.

Adequate protein, appropriate calorie intake, resistance training, and recovery can support muscle development.

Avoid unrealistic transformations based on one day's food intake.

# 5. Recovery and Sleep Tracking

Create a recovery module.

Allow users to log:

- Sleep duration.
- Sleep quality.
- Rest days.
- Muscle soreness.
- Training frequency.

Every muscle group should have an estimated recovery status.

For example:

Biceps:
- Recently trained.
- Recovering.
- Ready for training.

Chest:
- Recovered.
- Ready for training.

Use recovery information when estimating future muscle development.

# 6. Main Avatar Dashboard

Create the central dashboard around the 3D character.

The avatar should occupy the majority of the screen.

Use a premium, immersive experience.

Dashboard components:

**Main 3D Avatar**
- Large interactive character.
- 360-degree rotation.
- Muscle selection.
- Front, rear and side camera controls.
- Before-and-after comparison.

**Physical Statistics**
- Current weight.
- Height.
- Estimated body-fat percentage.
- Estimated lean body mass.
- Muscle development.
- Strength progress.

**Muscle Development Panel**

Display individual muscle groups with progression indicators.

Example:

Biceps: 64/100

Chest: 52/100

Shoulders: 70/100

Back: 58/100

Abs: 42/100

These should be relative progression or development indicators, not claims of scientifically measured muscle mass.

**Daily Nutrition**
- Calories consumed.
- Protein consumed.
- Carbohydrates.
- Fat.

**Training Summary**
- Workouts completed.
- Weekly training volume.
- Personal records.
- Muscle groups trained.

# 7. Avatar Evolution Timeline

Create an impressive transformation timeline.

Users must be able to compare their avatar across different dates.

Include:

- Day 1.
- Day 7.
- Day 30.
- Day 60.
- Day 90.
- Day 180.
- Day 365.

Allow users to select any previous date and see how their avatar looked at that point.

Implement a transformation slider:

BEFORE ← → AFTER

Users should be able to compare their initial avatar against their current avatar.

Also provide a playback feature showing the avatar gradually evolving from its initial state to its current state.

Every saved avatar version must be persisted.

# 8. Muscle Intelligence Panel

When a user selects an individual muscle, show a dedicated detailed panel.

Example: BICEPS

Display:

- Current development score.
- Total number of biceps workouts.
- Total training volume.
- Recent exercises.
- Personal records.
- Recovery status.
- Historical progression.
- Estimated development trend.

Show a visual highlight of the selected muscle on the 3D character.

Also explain which workouts and habits contributed to its estimated development.

# 9. Workout Logging

Create a fully functional workout tracker.

Users must be able to:

- Add exercises.
- Select exercises from a library.
- Enter weight.
- Enter sets.
- Enter repetitions.
- Track workout duration.
- Save workouts.
- Edit historical workouts.
- View exercise history.
- Track personal records.
- Create workout routines.

Each exercise must have a predefined mapping to primary and secondary muscle groups.

Once the workout is saved, update the progression engine.

# 10. Visually Appealing Design

The visual quality is extremely important.

I want the application to feel like a premium next-generation fitness simulation product.

Design direction:

- Dark cinematic interface.
- Black and charcoal backgrounds.
- Neon blue, purple and orange accents.
- Premium glassmorphism panels.
- Subtle glowing elements.
- Smooth transitions.
- High-quality typography.
- Beautiful charts.
- Realistic 3D lighting.
- Minimal clutter.

The 3D character should be the centerpiece.

Use camera movement, lighting, shadows, and interactive muscle highlights to make the avatar feel alive.

Do not make the interface look like a traditional fitness tracker or a basic admin dashboard.

It should feel like a futuristic digital human simulation platform.

# 11. Technical Architecture

Suggested technology:

Frontend:
- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- Shadcn UI.

3D Engine:
- Three.js.
- React Three Fiber.
- Drei.
- GLTF/GLB models.
- Skeletal animation where appropriate.

Backend:
- Node.js.
- PostgreSQL.
- Prisma or Drizzle ORM.

Authentication:
- Clerk or Supabase Auth.

Storage:
- Supabase Storage for photographs and avatar assets.

Charts:
- Recharts.

Build independent modules for:

- User authentication.
- User profiles.
- Photo uploads.
- Avatar generation.
- 3D avatar rendering.
- Body measurements.
- Workout tracking.
- Exercise-to-muscle mapping.
- Nutrition tracking.
- Recovery tracking.
- Muscle progression calculations.
- Avatar version history.

All important data must be stored persistently.

# 12. Avatar Evolution Accuracy

Do not create arbitrary changes to the 3D character.

Implement a configurable progression model that considers:

- Initial physique.
- Training frequency.
- Exercise selection.
- Training volume.
- Progressive overload.
- Recovery.
- Protein intake.
- Calorie balance.
- Weight trends.
- Historical training consistency.

Clearly differentiate estimated values from measured values.

A photo alone cannot reliably measure exact muscle mass, and workout logs cannot directly measure actual hypertrophy.

The system should represent its visual changes as plausible estimates, not medical measurements.

The progression logic should be modular, so that its calculations can be improved without rebuilding the entire application.

# 13. Development Priorities

Build the application in this order:

PHASE 1:
- Authentication.
- User onboarding.
- Initial body information.
- Photograph upload.
- Personalized 3D avatar creation.
- Interactive 3D viewer.

PHASE 2:
- Exercise library.
- Workout logging.
- Exercise-to-muscle mapping.
- Muscle development tracking.

PHASE 3:
- Food logging.
- Calorie and protein tracking.
- Recovery tracking.
- Progression calculation engine.

PHASE 4:
- Dynamic avatar evolution.
- Historical avatar snapshots.
- Before-and-after comparison.
- Transformation playback.

PHASE 5:
- UI polish.
- Performance optimization.
- Mobile responsiveness.
- Persistent data validation.

# Final Requirement

The main thing I want users to experience is this:

They upload their photograph on day one and receive a digital version of their current body.

They start working out, eating properly, tracking protein, and maintaining consistency.

Their digital character gradually develops alongside their real-world fitness journey.

When they open the application after 90 days, they should be able to see a visually meaningful difference between their original avatar and their evolved avatar.

**The avatar is the product. Everything else exists to make that avatar evolve realistically.**

Build the actual working application, not just a landing page, prototype screenshot, or collection of static UI components.

Prioritize a functional interactive 3D avatar and a reliable progression engine over unnecessary features.
