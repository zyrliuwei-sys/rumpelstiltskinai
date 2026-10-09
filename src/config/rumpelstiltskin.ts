/** Fixed, server-approved generation settings. Never accept a model from clients. */
export const RUMPELSTILTSKIN_MODEL = 'seedance-2.0-mini-reference-to-video';
export const RUMPELSTILTSKIN_LEGACY_MODEL =
  'fal-ai/wan/v2.2-a14b/text-to-video';
export const RUMPELSTILTSKIN_PRESETS = [
  'castle',
  'forest',
  'ballroom',
  'custom',
] as const;
export const RUMPELSTILTSKIN_DURATIONS = [5, 10] as const;
export const RUMPELSTILTSKIN_RATIOS = ['9:16', '16:9'] as const;
export type RumpelstiltskinPreset = (typeof RUMPELSTILTSKIN_PRESETS)[number];
export type RumpelstiltskinDuration =
  (typeof RUMPELSTILTSKIN_DURATIONS)[number];
export type RumpelstiltskinRatio = (typeof RUMPELSTILTSKIN_RATIOS)[number];

export const RUMPELSTILTSKIN_QUALITIES = ['480p', '720p'] as const;
export type RumpelstiltskinQuality = (typeof RUMPELSTILTSKIN_QUALITIES)[number];
export const GENERATION_MARKUP = 7;
export const USD_PER_CREDIT = 0.01;

/**
 * Image-only reference input is billed by output seconds (audio is free).
 * Source: https://evolink.ai/seedance-2-0-mini, checked 2026-10-09.
 * Published promotional rates $0.019 / $0.040 expire October 6. Use the
 * undiscounted rates (promo / 0.4) until an admin verifies their account rate.
 */
export const SEEDANCE_USD_PER_SECOND = { '480p': 0.0475, '720p': 0.1 } as const;

export function generationRate(
  configs: Record<string, unknown>,
  quality: RumpelstiltskinQuality
) {
  const value = Number(configs[`seedance_mini_${quality}_usd_per_second`]);
  return Number.isFinite(value) && value > 0 && value <= 10
    ? value
    : SEEDANCE_USD_PER_SECOND[quality];
}

export function generationCredits(
  configs: Record<string, unknown>,
  duration: RumpelstiltskinDuration,
  quality: RumpelstiltskinQuality = '480p'
) {
  // Fixed markup and credit denomination; legacy flat-price overrides no
  // longer bypass cost-based billing. Round up to the next whole credit.
  return Math.ceil(
    Number(
      (
        (generationRate(configs, quality) * duration * GENERATION_MARKUP) /
        USD_PER_CREDIT
      ).toFixed(8)
    )
  );
}

export type RumpelstiltskinTaskView = {
  id: string;
  status: string;
  videoUrl: string | null;
  error: string | null;
  prompt: string;
  createdAt: Date | string;
};
