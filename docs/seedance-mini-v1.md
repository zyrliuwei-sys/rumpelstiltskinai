# Seedance Mini integration v1

## Generator

- `/create` and `/settings/studio`: two portraits, extra direction, 5/10 seconds, 480p/720p, portrait/landscape.
- Server-only admin key `evolink_api_key`; fixed official EvoLink hosts.
- Both uploads finish before credits are reserved. Submission uses `seedance-2.0-mini-reference-to-video`, ordered image tags, and content filtering.
- Provider task IDs are stored server-side. The browser polls through the authenticated app API and can resume a task after refreshing.
- Rejected submissions and failed/cancelled jobs return credits. Ambiguous submissions are not retried; without a provider ID they reconcile as failed after 15 minutes when queried.
- Task ownership is checked before polling or exposing results. Terminal task updates are conditional to prevent concurrent polling from causing duplicate refunds.

## Pricing (USD)

| Billing | Plan     | Price | Credits |
| ------- | -------- | ----: | ------: |
| Once    | Starter  | $9.90 |     990 |
| Once    | Standard |   $23 |   2,300 |
| Once    | Pro      |   $44 |   4,400 |
| Monthly | Basic    |   $23 |   2,300 |
| Monthly | Pro      |   $44 |   4,400 |
| Monthly | Studio   |   $88 |   8,800 |

Visible plans all sell 100 credits for $1. One-time credits have no expiration. New monthly credits expire at the provider's billing-period end (31 days is the fallback if no period end is available). The old Mini Pack ID remains compatible with existing checkout references but is not displayed.

Credit charge = ceil(account USD rate per second × output seconds × 7 ÷ 0.01).

[Official pricing](https://evolink.ai/seedance-2-0-mini), checked October 9, 2026, still displays 60% promotional rates of $0.019/second (480p) and $0.040/second (720p), with an October 6 expiry. Since the offer is expired, the conservative default estimates remove that discount: $0.0475 and $0.10 per second. These are inferred list rates, not verified account charges. Verify `usage.cost.usd` on a live completed task and update the account rates under Admin → Settings → AI → EvoLink.

| Quality |   5 seconds |  10 seconds |
| ------- | ----------: | ----------: |
| 480p    | 167 credits | 333 credits |
| 720p    | 350 credits | 700 credits |

Admin fields: `seedance_mini_480p_usd_per_second`, `seedance_mini_720p_usd_per_second`. Blank/invalid fields use the default above. Old flat `rumpelstiltskin_credits_*` overrides no longer bypass cost-based billing.

## Verification

```bash
pnpm build
pnpm exec tsc --noEmit
pnpm exec tsx --test src/routes/api/rumpelstiltskin/-shared.test.ts
node scripts/smoke-rumpelstiltskin.mjs
node scripts/verify-seedance-integration.mjs
```

The integration script uses an isolated temporary SQLite fixture and a mocked provider, checking authenticated generation, charging, polling, history, upload rejection, submission rejection, concurrent failure refunds, parameter validation, and insufficient credits. It makes no paid calls.

Live generation remains unverified: Cloudflare OAuth is expired and local access to the admin key in remote D1 fails. Restore with `pnpm exec wrangler login`, then verify a real upload/generation/poll and `usage.cost.usd`. No new version has been deployed by this task. Existing deployed status reports the key is configured.

Official contracts: [reference generation](https://evolink.ai/docs/en/api-manual/video-series/seedance2.0/seedance-2.0-mini-reference-to-video), [stream upload](https://evolink.ai/docs/en/api-manual/file-series/upload-stream), [task polling](https://evolink.ai/docs/en/api-manual/task-management/get-task-detail).
