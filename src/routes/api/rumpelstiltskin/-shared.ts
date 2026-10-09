import { z } from 'zod';

import type { AiTask } from '@/config/db/schema';
import {
  RUMPELSTILTSKIN_DURATIONS,
  RUMPELSTILTSKIN_LEGACY_MODEL,
  RUMPELSTILTSKIN_MODEL,
  RUMPELSTILTSKIN_PRESETS,
  RUMPELSTILTSKIN_QUALITIES,
  RUMPELSTILTSKIN_RATIOS,
  type RumpelstiltskinTaskView,
} from '@/config/rumpelstiltskin';

export const portraitData = z
  .string()
  .max(2_800_000)
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
  .refine((value) => {
    try {
      const bytes = atob(value.split(',')[1]);
      if (bytes.length < 100 || bytes.length > 2 * 1024 * 1024) return false;
      if (value.startsWith('data:image/jpeg'))
        return (
          bytes.charCodeAt(0) === 255 &&
          bytes.charCodeAt(1) === 216 &&
          bytes.charCodeAt(2) === 255
        );
      if (value.startsWith('data:image/png'))
        return bytes.slice(0, 8) === '\x89PNG\r\n\x1a\n';
      return bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP';
    } catch {
      return false;
    }
  });
export const generateInput = z
  .object({
    prompt: z.string().trim().min(10).max(1800),
    preset: z.enum(RUMPELSTILTSKIN_PRESETS),
    duration: z.union([
      z.literal(RUMPELSTILTSKIN_DURATIONS[0]),
      z.literal(RUMPELSTILTSKIN_DURATIONS[1]),
    ]),
    aspectRatio: z.enum(RUMPELSTILTSKIN_RATIOS),
    quality: z.enum(RUMPELSTILTSKIN_QUALITIES).default('480p'),
    requestId: z.uuid().optional(),
    expectedCredits: z.number().int().positive().max(100000).optional(),
    photoA: portraitData,
    photoB: portraitData,
    consent: z.literal(true),
  })
  .strict();

export function parseRecord(
  value: string | null | undefined
): Record<string, unknown> {
  try {
    const parsed: unknown = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function isStudioTask(task: AiTask, userId: string) {
  return (
    task.userId === userId &&
    !task.deletedAt &&
    ((task.model === RUMPELSTILTSKIN_MODEL && task.provider === 'evolink') ||
      (task.model === RUMPELSTILTSKIN_LEGACY_MODEL &&
        task.provider === 'fal')) &&
    parseRecord(task.taskInfo).app === 'rumpelstiltskin'
  );
}

export function taskView(task: AiTask): RumpelstiltskinTaskView {
  const result = parseRecord(task.taskResult);
  const video = result.video as { url?: unknown } | undefined;
  const rawUrl = video?.url;
  let videoUrl: string | null = null;
  if (task.status === 'success' && typeof rawUrl === 'string') {
    try {
      if (new URL(rawUrl).protocol === 'https:') videoUrl = rawUrl;
    } catch {
      /* Invalid URL. */
    }
  }
  return {
    id: task.id,
    status: task.status,
    videoUrl,
    error:
      task.status === 'failed'
        ? 'Generation failed. Your credits have been returned.'
        : null,
    prompt: task.prompt,
    createdAt: task.createdAt,
  };
}
