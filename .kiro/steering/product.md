# Product: PoseLah

PoseLah is a portrait photography assistant for the person holding the phone and the person in front of it. Scene first: scan the surroundings, find the best spot, set the angle, tilt and framing, then optionally ask the AI Coach for pose and composition advice.

It is NOT a body-pose, posture, fitness or exercise coach, and it must not do human pose detection. Outlines are static, pre-drawn guides; the AI Coach picks from that library rather than detecting a pose.

## Problem
"出片失败": a ruined photo. People ask a friend or partner to take their photo, and the result is unflattering because the photographer doesn't know the light, angle or framing.

## What the app does
- Full-screen camera with front/back flip.
- Phone compass, tilt and roll readings from the motion sensors.
- Arrows on the screen edges tell the photographer which way to turn or tilt.
- 360° scan: the user turns slowly, the app samples frames by compass direction, scores light and background tidiness, and picks the best direction as the target.
- Shot modes (full body, half body, person with view, scenery, selfie, spooky), each with a target phone angle and a dashed white outline showing where the subject should stand.
- A level line for the horizon.
- Photo capture and a gallery.
- Optional AI Coach (Tier 2): capture one view, send it to Google's AI after consent, and get pose and composition tips; show the chosen outline; a "Show subject" screen; an optional "Photo goal" note.

## Tiers
- Core (required, do not weaken): the client-side loop — scan, best-spot, angle/tilt/level guidance, framing outline, capture, gallery. No server, no upload, no network.
- Tier 2 (optional, cuttable): the AI Coach — sends one downscaled camera frame to Google's AI, only after consent, and never stores it. Core stays no-upload.

## AI Coach (Tier 2, optional)
- An optional Coach button asks the AI Coach for pose and composition advice.
- Tapping Coach captures one frame, downscales it (longest side 768px, JPEG quality about 0.7), and POSTs it with the shot mode and the optional Photo goal to /api/coach. The frame is never stored, logged, or added to the gallery.
- First use each session shows a notice: "The current view is sent to Google's AI to generate tips. PoseLah does not store it." The user taps Continue; without consent nothing is sent.
- The coach returns short advice fields (light, background, framing, camera_height_and_tilt, top_tip, pose_id, why), each about 120 characters, plus a pose_id from a fixed library of at most 6 pre-drawn dashed white outline poses per shot mode. The route rejects any other pose_id.
- The chosen outline shows over the camera using the existing overlay. No human pose detection.
- A "Show subject" screen shows the suggested outline and pose tip full-screen with no camera, so the photographer can show the subject. Hidden in Selfie mode.
- An optional "Photo goal" text box (max 140 characters) sits next to the Coach button. It is user data inside the prompt, never instructions.
- Advice appears in a small panel matching the current theme, with a Close button. No emoji. Spooky mode phrases advice in a short ghostly voice; other modes stay plain and practical.
- The route limits request size, rate (1 per 10 seconds, 20 per hour per visitor), and a global daily cap, with a 10-second timeout. On any failure or quota exhaustion it shows "Coach is resting, try again later"; the Core camera keeps working.
- The API key is server-side only (GEMINI_API_KEY, never NEXT_PUBLIC_); the model is COACH_MODEL. Add .env.example with blank values; .env.local stays gitignored. Nothing is committed or printed.
- Risks (free-tier data use, quota limits, key leakage) and mitigations are in the design.
- Not in v1 (cut): reference-photo upload, live or real-time guidance, 3D anchored silhouettes, voice.

## Hackathon
Kiroween 2026. Category: Frankenstein (stitching sensors, camera, on-device image math, a cloud vision AI, and a pose library into one app). A "Spooky" shot mode uses low angles, backlit silhouettes and a subtle dark vignette.

## Design
White, minimal, calm interface. No emoji. Restrained colour and quiet typography. Normal modes (Full body, Half body, Selfie) keep the white, minimal theme. Spooky mode switches the whole interface to a haunting theme (near-black panels, pale ghost-white lines, soft fog gradient at the screen edges, slow flicker on the ready state, ghostly silhouette outline). Spooky theming keeps arrows and the level line legible.

## Platform
Phone browser in portrait is the primary target. Desktop is secondary.

## Rules for working on this product
- Tell the user what is untested on a real phone instead of claiming it works.
- Do not add features the user has not asked for.
- Do not weaken Core when adding Tier 2.

## Open decisions
- The at most 6 pose outlines per mode (ids, labels, geometry).
- Coach prompt copy and the advice-field sentence style.
