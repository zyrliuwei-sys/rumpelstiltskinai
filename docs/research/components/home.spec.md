# Homepage adaptation specification

Reference https://www.vidu.com. User requested its style for a different product, so fidelity is an adaptation rather than an exact clone.

Observed source tokens: rgb(2,11,19) page base, white text with 60% opacity in navigation, 14px system-sans controls, translucent white pill create buttons with radius 9999px, showcase headings 48px/52.8px 600 and secondary section headings 40px/42px 600, FAQ 36px/50.4px 500. Full-bleed top video, overlay composer and two slide selectors. Browser load and reference capture timed out; semantic extraction succeeded.

Product layout: dark transparent nav, full-bleed original castle image, two-line left-aligned heading, overlay prompt composer, three scene templates, click-switched product feature with media, three-step creation explanation, sourced meme-origin note, native disclosure FAQ, concluding studio CTA, footer with ShipAny attribution. DM Sans typography and cool charcoal/mint tokens are intentionally adapted.

States: hero chips select a preset and update prompt; submit stores preset/prompt in sessionStorage then opens /create. Template buttons do the same. Feature tabs switch media and explanation. Mobile menu toggles nav. FAQ is native details/summary with rotating chevron. Links localize through the project router. Entrance motion transforms/opacity only with reduced-motion override.

Responsive: 1440px desktop columns; navigation collapses at 960px; homepage columns collapse at 767px; 390px single-column layout. Assets: three original WebP stills and SVG R letter mark. Caption explicitly identifies concept artwork. Screenshots: docs/design-references/home-{desktop,tablet,mobile}.png.
