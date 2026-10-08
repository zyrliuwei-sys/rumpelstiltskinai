# Rumpelstiltskin AI brand system

## Direction

A cinematic fairytale studio for short-video creators, inspired by Vidu's product clarity rather than its identity. Cold charcoal, silver typography and candlelight gold come from the tension between a digital editing room and the practical-lit fantasy scenes. This is a dark-only identity, not a light/dark section collage.

Design read: premium creator landing and production workspace, cinematic language. DESIGN_VARIANCE 7, MOTION_INTENSITY 4, VISUAL_DENSITY 4. The existing page had a generic mint accent, equal template cards and the same sans display/body face. This revision replaces those with a film-title hierarchy, asymmetric scene selection and a calmer workspace.

## Tokens

| Token    | OKLCH             | Use                                              |
| -------- | ----------------- | ------------------------------------------------ |
| Charcoal | `0.16 0.007 255`  | Page canvas                                      |
| Stage    | `0.205 0.009 255` | Editing panels                                   |
| Silver   | `0.95 0.004 255`  | Headlines and body                               |
| Candle   | `0.81 0.095 82`   | Actions, selected states, focus                  |
| Smoke    | `0.74 0.009 255`  | Secondary copy                                   |
| Moss     | `0.47 0.035 145`  | Supporting brand swatch, not competing CTA color |

Both `:root` and `.dark` share the committed dark palette. Semantic tokens cover cards, popovers, borders, inputs, rings and the sidebar. Danger remains a semantic red rather than another brand accent.

Bebas Neue is the film-title display face; DM Sans handles navigation, body, forms and data. Both are self-hosted from existing Fontsource packages. Chinese uses locally available PingFang SC and sans fallbacks. No new font dependency is required.

Media and panels have 12px corners, inputs and buttons 8px, small selection chips 6px. The R monogram is candle gold on charcoal. The signature is a framed cinematic hero with a working prompt composer, carried into the studio's frame-and-control layout. Original concept art is clearly distinguished from generated video output. No fake performance figures, testimonials, songs or movie affiliations.

## Application

`src/styles/globals.css` holds semantic colors and type tokens. `src/styles/brand.css` applies the identity to homepage, studio, library, pricing, sign-in/sign-up and policy pages. Existing shared UI primitives and business logic are retained. Entrance motion indicates hierarchy, hover movement indicates an action, and reduced-motion preferences disable both.

## SEO and voice

Primary query: **rumpelstiltskin ai**. Supporting query: **rumpelstiltskin ai video**. Use descriptive titles, one homepage H1, useful scene/prompt guides, readable paragraphs and contextual internal links. English homepage targets approximately 1,200 words; Chinese carries corresponding content. Main-content counts include FAQ answers in the DOM but exclude navigation/footer, image alt text, metadata and hidden feature-panel alternatives.

Voice: imaginative about ideas, precise about capabilities. Explain AI variability, separate new creations from the original meme, disclose provider-hosted output and soundtrack limitations. Do not promise rankings or virality. Google does not prescribe an ideal word count: [people-first guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Titles follow [Google's descriptive title guidance](https://developers.google.com/search/docs/appearance/title-link).

Homepage includes WebSite/WebApplication structured data without fabricated ratings or offers. `/create` has localized canonical/hreflang and sharing metadata. No VideoObject is attached to still concept art. Pricing remains noindex while the payment configuration is unfinished.

## Verification

The English homepage contains **1,241 words** in its server-rendered main content. `scripts/smoke-rumpelstiltskin.mjs` checks a 1,150-1,300 range, a single H1, localized canonical/hreflang, both search phrases, and WebSite/WebApplication markup. Both translation files have matching keys. This is an approximate editorial length target, not a ranking claim.

Build, TypeScript and isolated in-process SSR/API smoke tests. Self-contained HTML and screenshots under `docs/design-references` are static design artifacts, not a live interactive preview. Verify desktop, tablet and mobile widths; single dark theme; button/form contrast; no overflow; natural copy and zero decorative em-dashes. Deployment and paid provider calls are outside this revision.

Revision evidence: `home-desktop.png` shows the new homepage; `studio-mobile.png` shows the new mobile controls. Subsequent screenshot captures timed out, so older `home-mobile.png` and `home-tablet.png` remain first-version comparisons, not updated visual acceptance evidence. Current `home-en.html`, `home-zh.html` and `studio-*.html` contain the updated layouts. Browser measurements found no horizontal overflow at 390px on homepage/studio or 1440px on studio. The primary button text/background contrast measured 10.33:1. No live browser generation or sign-in test was performed in the restricted socket environment.
