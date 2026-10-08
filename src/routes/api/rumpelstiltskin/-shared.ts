import { z } from 'zod';

import type { AiTask } from '@/config/db/schema';
import {
  RUMPELSTILTSKIN_DURATIONS,
  RUMPELSTILTSKIN_MODEL,
  RUMPELSTILTSKIN_PRESETS,
  RUMPELSTILTSKIN_RATIOS,
  type RumpelstiltskinTaskView,
} from '@/config/rumpelstiltskin';

export const generateInput = z
  .object({
    prompt: z.string().trim().min(10).max(1800),
    preset: z.enum(RUMPELSTILTSKIN_PRESETS),
    duration: z.union([
      z.literal(RUMPELSTILTSKIN_DURATIONS[0]),
      z.literal(RUMPELSTILTSKIN_DURATIONS[1]),
    ]),
    aspectRatio: z.enum(RUMPELSTILTSKIN_RATIOS),
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
    task.model === RUMPELSTILTSKIN_MODEL &&
    task.provider === 'fal' &&
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
