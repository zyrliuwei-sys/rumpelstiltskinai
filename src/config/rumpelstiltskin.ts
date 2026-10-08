/** Fixed, server-approved generation settings. Never accept a model from clients. */
export const RUMPELSTILTSKIN_MODEL = 'fal-ai/wan/v2.2-a14b/text-to-video';
export const RUMPELSTILTSKIN_PRESETS = [
  'castle',
  'forest',
  'ballroom',
  'custom',
] as const;
export const RUMPELSTILTSKIN_DURATIONS = [5, 8] as const;
export const RUMPELSTILTSKIN_RATIOS = ['9:16', '16:9'] as const;
export type RumpelstiltskinPreset = (typeof RUMPELSTILTSKIN_PRESETS)[number];
export type RumpelstiltskinDuration =
  (typeof RUMPELSTILTSKIN_DURATIONS)[number];
export type RumpelstiltskinRatio = (typeof RUMPELSTILTSKIN_RATIOS)[number];

export function generationCredits(
  configs: Record<string, unknown>,
  duration: RumpelstiltskinDuration
) {
  const value = Number(configs[`rumpelstiltskin_credits_${duration}s`]);
  return Number.isSafeInteger(value) && value > 0 && value <= 10000
    ? value
    : duration === 5
      ? 40
      : 60;
}

export type RumpelstiltskinTaskView = {
  id: string;
  status: string;
  videoUrl: string | null;
  error: string | null;
  prompt: string;
  createdAt: Date | string;
};
