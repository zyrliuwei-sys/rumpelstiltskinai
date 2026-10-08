# First version handoff

Name: rumpelstiltskin ai. Intended production URL: https://rumpelstiltskinai.org.
Worker configuration: rumpelstiltskinai. D1: rumpelstiltskinai, cdc01709-03ba-4147-bc0b-edbb152f4849. No deployment performed.

## Included

Brand/SEO revision: see [brand system](../BRAND.md). English homepage main content is 1,241 words focused on `rumpelstiltskin ai` and `rumpelstiltskin ai video`, with matching Chinese content, prompt guidance, use cases and sourced meme context. The cinematic charcoal/silver/candle-gold system now spans public pages, studio, library and auth pages. Homepage and studio metadata include localized canonical/hreflang and sharing fields.
Vidu-inspired cinematic homepage, original AI stills for castle/forest/ballroom, bilingual navigation and content, prompt-to-studio handoff, /create and /settings/studio, authenticated video history, 5/8-second 720p text-to-video API through a fixed Fal Wan model, authentication/credits/payment primitives, bilingual legal content and a new logo/favicon.

The screenshots and self-contained HTML files in docs/design-references are static visual QA artifacts, not an interactive app. The screenshot checks cover 1440px, 768px, and 390px. `node scripts/render-design-preview.mjs` regenerates static English/Chinese previews after a build.

## Run and configure

Run `pnpm dev` on the user's machine. If port 3000 belongs to another project, choose an unused port with `pnpm dev --port 3001`. Sign in to /sign-in with the previously created administrator, then open /admin/settings. AI credentials are configured in the AI section. Payment providers are unconfigured in the fresh D1 database. Do not copy another project's provider configuration.

## Validation

`pnpm build`, `pnpm exec tsc --noEmit`, `node --import tsx --test src/routes/api/rumpelstiltskin/-shared.test.ts`, and `node scripts/smoke-rumpelstiltskin.mjs`.
Smoke checks use a temporary isolated SQLite fixture, not production D1; render checks do not access D1. No paid provider request was made. Live browser interactions were not tested because the execution sandbox denied listening sockets.

## Before paid launch

The original D1 compatibility layer does not provide a real transaction for credit operations. Its read-then-update consumption and refund paths can race under concurrent requests. A provider key is absent in the new database, so generation currently returns a setup notice and never charges credits. Review and replace the credit ledger path with atomic D1 operations before opening paid generation. Provider URLs can expire; configure persistent output storage if permanent retention is promised. Do not promise that original meme choreography or soundtrack is included.

## Asset generation

The Pollinations skill failed with fetch failed. Built-in image generation produced three original fantasy film stills, subsequently encoded to WebP under public/imgs/generated/rumpelstiltskin-{hero,forest,ballroom}.webp. Prompts describe an original adult fairy-tale goblin dancing on tiptoe with practical 1980s fantasy-film texture in a candlelit castle, moonlit forest, and royal ballroom. Images are concept art, not rendered video samples.
