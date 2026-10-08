# Rumpelstiltskin AI first version

## Product

An AI short-video studio for the tiptoe-dancing Rumpelstiltskin trend. Independent creative tool, not the original creator and not affiliated with the 1987 film. Domain: https://rumpelstiltskinai.org. Existing D1: rumpelstiltskinai.

## Research

- https://knowyourmeme.com/memes/ai-rumpelstiltskin-tip-toein-in-my-jordans documents the AI fantasy-film clip, the collaborative Instagram upload by Stroinaya, Neuroferma and Anna Glinskaya in August 2026, and later dance-meme remixes. The 1987 film attribution is incorrect.
- https://wegotthiscovered.com/news/a-creepy-and-unsettling-rumpelstiltskin-clip-is-going-viral-and-people-figured-out-it-is-ai/ corroborates the mistaken film attribution. Original production model is not verified, so do not claim this site uses the original model.
- Music is not bundled. Users can add licensed music in their own editor.

## Vidu reference extraction

https://www.vidu.com live browser inspected October 8, 2026. System sans typography, header 14px, white text at 60% opacity; transparent header. Full-bleed video slideshow at the top. Overlay prompt form, 14px create button, translucent white fill, 9999px radius. Two slide selectors. Section order: flagship showcase, real-time showcase, creative tools, creator stories, community, FAQ. Dark base and image-led hierarchy.
Browser navigation reached interactive state but full-load and screenshot calls timed out. Do not claim pixel-perfect reconstruction; user requested style reference, so adapt rather than copy Vidu branding, claims or assets.

## Design direction

Vidu-inspired cinematic consumer creation tool. Neutral charcoal background oklch(0.145 0.008 240), off-white text oklch(0.96 0.006 90), cool-muted gray oklch(0.7 0.013 245), soft mint primary oklch(0.87 0.065 155), elevated panels oklch(0.2 0.009 240). DM Sans display and body. Rounded 16px media and controls; pill CTAs. Signature: an original candlelit fairy-tale still filling the hero, with a working prompt composer. Variance 6, motion 4, density 4.

## Behavior and topology

Sticky translucent nav; mobile menu with expanded links. Hero prompt enters the studio with the prompt saved in sessionStorage. Template chips switch the prompt and selected scenario. Example cards load a preset into studio. FAQ uses accessible native details. Studio selects preset / duration / ratio, requires sign-in, submits a real async generation request, polls status, renders a video only when provided by the generation service. Disabled/loading/error states are explicit. Reduced-motion disables animation. Desktop 1440, tablet 768, mobile 390.

## Backend contract

GET /api/rumpelstiltskin/status -> { configured: boolean, costCredits: number, model: string }
POST /api/rumpelstiltskin/generate {prompt, preset, duration, aspectRatio} -> {id,status}
GET /api/rumpelstiltskin/task?id=... -> {id,status,videoUrl,error,prompt,createdAt}
GET /api/rumpelstiltskin/videos -> {items,total}
Authenticated requests, server-side model allowlist, user-owned tasks, honest missing-key error. Existing ai_task table stores tasks; no schema change.
