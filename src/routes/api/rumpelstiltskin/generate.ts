import { createFileRoute } from '@tanstack/react-router';

import { AIMediaType, FalProvider } from '@/core/ai';
import { getAuth } from '@/core/auth';
import {
  generationCredits,
  RUMPELSTILTSKIN_MODEL,
} from '@/config/rumpelstiltskin';
import {
  AITaskStatus,
  createTask,
  mergeTaskInfo,
  setProviderTaskId,
  updateTask,
} from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { getBalance } from '@/modules/credits/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

import { generateInput } from './-shared';

async function POST({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    // Browsers should submit only from the same site; reject cross-site form posts.
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
      return respErr('Forbidden', { status: 403 });
    if (!request.headers.get('content-type')?.includes('application/json'))
      return respErr('JSON body required', { status: 400 });
    const parsed = generateInput.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success)
      return respErr(
        'Enter a 10–1800 character prompt and select a supported preset, duration and ratio',
        { status: 400 }
      );
    const { prompt, duration, aspectRatio, preset } = parsed.data;
    const configs = await getAllConfigs();
    if (!configs.fal_api_key?.trim())
      return respErr(
        'Video generation is not configured yet. An administrator must add a Fal API key in Settings. No credits were charged.',
        { status: 503 }
      );
    const costCredits = generationCredits(configs, duration);
    if ((await getBalance(session.user.id)) < costCredits)
      return respErr('Insufficient credits', { status: 402 });
    const throttled = enforceMinIntervalRateLimit(request, {
      intervalMs: 10000,
      keyPrefix: 'rumpel-generation',
      extraKey: session.user.id,
    });
    if (throttled)
      return respErr('Please wait a few seconds before generating again', {
        status: 429,
      });
    const task = await createTask({
      userId: session.user.id,
      mediaType: AIMediaType.VIDEO,
      provider: 'fal',
      model: RUMPELSTILTSKIN_MODEL,
      prompt,
      costCredits,
    });
    try {
      await mergeTaskInfo(task.id, {
        app: 'rumpelstiltskin',
        preset,
        duration,
        aspectRatio,
      });
      const provider = new FalProvider({ apiKey: configs.fal_api_key });
      const result = await provider.generate({
        params: {
          mediaType: AIMediaType.VIDEO,
          model: RUMPELSTILTSKIN_MODEL,
          prompt,
          options: {
            num_frames: duration * 16 + 1,
            frames_per_second: 16,
            aspect_ratio: aspectRatio,
            resolution: '720p',
            enable_safety_checker: true,
            enable_output_safety_checker: true,
          },
        },
      });
      await setProviderTaskId(task.id, result.taskId);
      return respData({ id: task.id, status: AITaskStatus.PENDING });
    } catch {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
        taskResult: { error: 'Provider submission failed' },
      });
      return respErr(
        'Unable to start generation. Your credits have been returned. Please try again later.',
        { status: 502 }
      );
    }
  } catch (error) {
    return respErr(
      error instanceof Error && error.message === 'Insufficient credits'
        ? 'Insufficient credits'
        : 'Unable to start generation',
      { status: 500 }
    );
  }
}

export const Route = createFileRoute('/api/rumpelstiltskin/generate')({
  server: { handlers: { POST } },
});
