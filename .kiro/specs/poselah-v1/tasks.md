# PoseLah v1 — Tasks

Follows the task order and cut list in `design.md`. Each task does one thing.
Conventions for every task:

- **Done** always means `npm run build` passes (the `tech.md` build gate). Where a
  task adds tests, `npm test` passes too. Fix errors before the next task.
- **Verify on phone**: on your Android phone, Chrome, over the Vercel HTTPS URL.
  For pure-logic tasks there is no phone step — verify with `npm test` +
  `npm run build` and list what stays untested on a real phone.
- Commit after each task using the suggested message.
- The AI Coach (Tier 2) is built before the Spooky fog/flicker and polish tasks.

## Tasks

### T1 — Test harness
- **Goal:** add the property-based test setup.
- **Files:** `package.json`, `vitest.config.ts`, `lib/smoke.test.ts`.
- **Done:** `npm run build` passes; `npm test` passes the smoke test. Adds
  `vitest` + `fast-check` devDependencies and `"test": "vitest run"` /
  `"test:watch": "vitest"` scripts; `vitest.config.ts` runs node over
  `lib/**/*.test.ts`.
- **Verify on phone:** none (tooling).
- **Commit:** `chore: add Vitest + fast-check test harness`

### T2 — `lib/heading.ts`: orientation + angular math
- **Goal:** pure orientation and angular math.
- **Files:** `lib/heading.ts`, `lib/heading.test.ts`.
- **Done:** `npm run build` passes; `npm test` passes. `headingFromOrientation`
  (degrees in; radians converted inside; not alpha alone), `tiltFromBeta = beta - 90`,
  `rollFromOrientation` with `ROLL_SIGN` (default 1), `headingDelta` in
  `[-180, 180]`, `shortestTurn` 0 when equal. Angle tests use a ~1e-9 tolerance.
- **Verify on phone:** none (pure logic). Untested: `headingFromOrientation`
  accuracy across attitudes; `ROLL_SIGN`.
- **Commit:** `feat(heading): orientation + angular math with property tests`

### T3 — `lib/heading.ts`: tolerances + smoothing + orientForCamera
- **Goal:** circular/linear tolerance, smoothing, and camera correction.
- **Files:** `lib/heading.ts`, `lib/heading.test.ts`.
- **Done:** `npm run build` passes; `npm test` passes. `headingWithinTolerance`
  (circular via `headingDelta`), `withinTolerance` (plain), `orientForCamera`
  (front: `+180`, `-tilt`; no `360 - heading`), `smoothAngle` (circular, `[0,360)`),
  `smooth` (linear). Property tests for ranges, wraparound
  (`smoothAngle(359,1,0.5) ≈ 0`), equal inputs.
- **Verify on phone:** none. Untested: `orientForCamera` front transform;
  smoothing factor.
- **Commit:** `feat(heading): tolerances, smoothing, orientForCamera`

### T4 — `lib/slices.ts`
- **Goal:** 12-slice mapping + coverage.
- **Files:** `lib/slices.ts`, `lib/slices.test.ts`.
- **Done:** `npm run build` passes; `npm test` passes. `SLICE_COUNT=12`,
  `sliceIndex` → `0..11`, `Coverage` with `isComplete` (≥11) / `canStop` (≥3).
- **Verify on phone:** none. Untested: slice assignment under heading jitter.
- **Commit:** `feat(slices): 12-slice mapping + coverage`

### T5 — `lib/crop.ts`
- **Goal:** cover-crop math.
- **Files:** `lib/crop.ts`, `lib/crop.test.ts`.
- **Done:** `npm run build` passes; `npm test` passes.
  `coverCrop(srcW, srcH, aspect)` → `{sx, sy, sw, sh}`.
- **Verify on phone:** none. Untested: the crop matches the viewfinder on device.
- **Commit:** `feat(crop): cover-crop math`

### T6 — Camera + viewfinder
- **Goal:** full-screen camera, front/back flip, resolution readout.
- **Files:** `hooks/useCamera.ts`, `components/CameraView.tsx`,
  `components/StatusMessage.tsx`, `components/CoachView.tsx`, `app/page.tsx`.
- **Done:** `npm run build` passes. `getUserMedia` up to 1920x1080, cover-fit via
  `coverCrop`, mirrored front preview, resolution debug readout, FR-10
  camera-denied copy, camera released when hidden.
- **Verify on phone:** on Android Chrome over Vercel HTTPS, grant the camera;
  see the full-screen cover-fit viewfinder; tap flip (front/back) and see the
  mirrored front preview and the negotiated-resolution readout.
- **Commit:** `feat(camera): full-screen viewfinder, flip, resolution readout`

### T7 — Redeploy and verify on phone
- **Goal:** redeploy and verify the camera viewfinder on the phone.
- **Files:** none (verification step).
- **Done:** `npm run build` passes; the latest commit is pushed and Vercel has
  redeployed; the camera viewfinder loads on the phone.
- **Verify on phone:** on Android Chrome over Vercel HTTPS, confirm the
  viewfinder loads, cover-fit, flip, and the resolution readout work; note the
  actual negotiated resolution. This is the phone gate before sensors/scan.
- **Commit:** none (verification step; redeploy by `git push`).

### T8 — Sensors + motion permission
- **Goal:** device orientation readings + motion permission tap.
- **Files:** `hooks/useDeviceOrientation.ts`, `components/StatusMessage.tsx`.
- **Done:** `npm run build` passes. Prefer `deviceorientationabsolute`; start
  the `deviceorientation` fallback timer only after permission or the first
  event; iOS `requestPermission` tap; derive heading/tilt/roll via
  `lib/heading.ts`; smooth; throttle ~25 Hz; raw values in refs; debug readout;
  FR-10 motion copy.
- **Verify on phone:** on Android Chrome, tap the motion-permission button;
  see heading/tilt/roll debug readings update as you move the phone; confirm
  `deviceorientationabsolute` fires.
- **Commit:** `feat(sensors): device orientation readings + permission tap`

### T9 — Guidance overlays
- **Goal:** arrows, level line, ready state, neutral state, front flip.
- **Files:** `components/overlays/HeadingArrows.tsx`, `TiltArrows.tsx`,
  `LevelLine.tsx`, `ReadyState.tsx`, `components/CoachView.tsx`.
- **Done:** `npm run build` passes. Heading arrows L/R (flipped for front),
  tilt arrows T/B, level line solid within 1.5°, ready state at 5/5/3°, neutral
  before a scan, camera-corrected heading via `orientForCamera`.
- **Verify on phone:** turn/tilt the phone; see heading arrows, tilt arrows, the
  level line solid near level, and the ready state; front-camera arrows flip;
  neutral before a scan.
- **Commit:** `feat(guidance): arrows, level line, ready state`

### T10 — `lib/regions.ts` + `lib/metrics.ts`
- **Goal:** region masks + frame metrics.
- **Files:** `lib/regions.ts`, `lib/metrics.ts`, `lib/metrics.test.ts`.
- **Done:** `npm run build` passes; `npm test` passes. `outerStrips` /
  `centerRect` / `ovalMask`; `computeMetrics` → `FrameMetrics`; luma formula;
  finite for all-black and all-white.
- **Verify on phone:** none. Untested: region positions vs real frames.
- **Commit:** `feat(metrics): region masks + frame metrics`

### T11 — `lib/scoring.ts`
- **Goal:** per-mode slice scoring.
- **Files:** `lib/scoring.ts`, `lib/scoring.test.ts`.
- **Done:** `npm run build` passes; `npm test` passes. `TUNING`
  (back/selfie/spooky); `scoreSlice` per the design formulas; clamp to `[0,1]`;
  finite for all-black and all-white.
- **Verify on phone:** none. Untested: whether `TUNING` constants feel right in
  real light.
- **Commit:** `feat(scoring): per-mode slice scoring`

### T12 — `useScan` + ScanRing
- **Goal:** 360° scan state machine + coverage ring.
- **Files:** `hooks/useScan.ts`, `components/overlays/ScanRing.tsx`.
- **Done:** `npm run build` passes. Sample the cover-crop area at ~64px
  (`willReadFrequently`), ≤5 Hz; assign by `sliceIndex` on the camera-corrected
  heading; `computeMetrics` → `scoreSlice`; best score per slice; auto-finish
  11/12, manual stop ≥3; set target; clear on mode/camera change.
- **Verify on phone:** run a scan turning in place; the ring fills; auto-finish
  at 11/12 (or stop ≥3); arrows then guide to the target.
- **Commit:** `feat(scan): 360° scan + coverage ring`

### T13 — Modes + outlines
- **Goal:** four modes, pose library, outlines, camera↔mode link.
- **Files:** `lib/modes.ts`, `lib/outline.ts`, `lib/poses.ts`,
  `lib/poses.test.ts`, `components/ModeSwitcher.tsx`,
  `components/overlays/ModeOutline.tsx`, `components/CoachView.tsx`.
- **Done:** `npm run build` passes; `npm test` passes. Four modes + target tilts
  + scoring profiles + draft pose tips; outline + selfie oval + `SAFE_BOTTOM`;
  ≤6 poses per mode; `isValidPoseId` tested. Selecting a mode sets its camera;
  flip front → Selfie, back → last back mode (default Full body); switching
  clears the target; Spooky = low angle + ghostly outline.
- **Verify on phone:** switch modes; the outline shows above the safe area; flip
  to front selects Selfie, flip to back selects the last back mode; Spooky shows
  the ghostly outline + low-angle tilt target.
- **Commit:** `feat(modes): four modes, pose library, outlines, camera link`

### T14 — Capture + gallery
- **Goal:** capture from the raw frame + session gallery + Save.
- **Files:** `lib/vignette.ts`, `hooks/useCapture.ts`, `hooks/useGallery.ts`,
  `components/CaptureButton.tsx`, `components/Gallery.tsx`,
  `components/GalleryPhoto.tsx`.
- **Done:** `npm run build` passes. Render from the raw video frame at the
  negotiated resolution: `coverCrop`, mirror for front, bake the Spooky vignette,
  no overlays, `toBlob` → blob URL. Most-recent-8, revoke oldest. Save via
  `<a download>` plus the open fallback.
- **Verify on phone:** capture; the saved photo has no overlays (except the
  Spooky vignette); the gallery shows most-recent-8; Save downloads on Android
  Chrome.
- **Commit:** `feat(capture): photo capture, gallery, Save fallback`

### T15 — Tier 2 pure logic (downscale, coach JSON, rate limit)
- **Goal:** pure Tier 2 helpers.
- **Files:** `lib/downscale.ts`, `lib/coach.ts`, `lib/ratelimit.ts`,
  `lib/downscale.test.ts`, `lib/coach.test.ts`, `lib/ratelimit.test.ts`.
- **Done:** `npm run build` passes; `npm test` passes.
  `computeDownscaleDimensions` (longest side 768, aspect preserved);
  `validateCoachJSON` (fields present, ≤120 chars, `pose_id` in the mode
  library); `allow()` rate-limit (1 per 10s, 20 per hour) with property tests.
- **Verify on phone:** none (pure logic).
- **Commit:** `feat(coach-lib): downscale, JSON validation, rate-limit logic`

### T16 — Coach route
- **Goal:** `/api/coach` route handler (image, env, validate, limits, failure).
- **Files:** `app/api/coach/route.ts` (and confirm `.env.example` is committed).
- **Done:** `npm run build` passes. Receives frame + mode + photoGoal; reads
  `GEMINI_API_KEY` / `COACH_MODEL` (server only, never `NEXT_PUBLIC_`); calls
  Gemini with the coach prompt; 10s timeout; validates JSON via `lib/coach.ts`;
  rejects bad `pose_id`; request size limit; per-visitor 1/10s + 20/hr + global
  daily cap via `lib/ratelimit.ts`; never logs/stores the image; returns
  429/422/503 on limit/failure.
- **Verify on phone:** indirect (exercised by T17). On desktop, POST a 768px
  JPEG to `/api/coach` and check valid JSON; repeat quickly to confirm 429.
- **Commit:** `feat(coach): /api/coach route handler (image, validation, limits)`

### T17 — AICoach + CoachPanel
- **Goal:** Coach button, Photo goal box, consent, capture + POST, advice
  panel, failure UX.
- **Files:** `components/AICoach.tsx`, `components/CoachPanel.tsx`,
  `components/CoachView.tsx`.
- **Done:** `npm run build` passes. Coach button + Photo goal box (≤140 chars);
  first-use consent once per session (FR-15 copy); on Continue, capture +
  downscale one frame (768px, q0.7) and POST to `/api/coach`; show the returned
  fields in a theme-matching panel with a Close button (no emoji); set the
  outline to `pose_id`; Spooky ghostly voice; on failure/timeout/quota show
  "Coach is resting, try again later".
- **Verify on phone:** tap Coach; the consent notice appears the first time;
  Continue; the advice panel shows the fields; the outline switches to
  `pose_id`; Spooky → ghostly voice; with a missing/invalid key, see "Coach is
  resting".
- **Commit:** `feat(coach): AICoach button, consent, advice panel, failure UX`

### T18 — Show subject screen
- **Goal:** full-screen outline + tip for the subject, hidden in Selfie.
- **Files:** `components/ShowSubject.tsx`, `components/CoachView.tsx`.
- **Done:** `npm run build` passes. Full-screen chosen outline + pose tip, no
  camera; hidden in Selfie mode.
- **Verify on phone:** open Show subject (not shown in Selfie); full-screen
  outline + tip, no camera.
- **Commit:** `feat(coach): Show subject screen`

### T19 — Spooky fog + flicker
- **Goal:** atmospheric Spooky theming (extras); keep legibility.
- **Files:** `components/overlays/SpookyFog.tsx`,
  `components/overlays/ReadyState.tsx`, `app/globals.css`.
- **Done:** `npm run build` passes. Soft fog gradient at the screen edges; slow
  flicker on `ReadyState`; Spooky theme tokens in CSS; arrows and the level line
  stay legible. (Spooky stays a minimal mode without this: low angle, vignette,
  ghostly outline.)
- **Verify on phone:** in Spooky mode, see the fog + slow flicker; confirm the
  arrows and level line are still legible.
- **Commit:** `feat(spooky): fog gradient + slow flicker (legible)`

### T20 — Polish
- **Goal:** copy, spacing, transitions, edge states; lint.
- **Files:** various.
- **Done:** `npm run build` passes; `npm run lint` passes. Tighten
  copy/spacing/transitions; handle edge states (camera denied, sensors
  unavailable, no target, coach resting).
- **Verify on phone:** general pass on Android Chrome over Vercel HTTPS; edge
  states render; nothing regressed.
- **Commit:** `chore: polish copy, spacing, transitions, edge states`

## Cut list

See `design.md`. If time runs short, drop in this order (most expendable first):
Spooky fog/flicker, polish, secondary modes, Show subject + Photo goal box, scan
ring + auto-finish, gallery extras — and the AI Coach last (it is the core of
the Frankenstein story).
