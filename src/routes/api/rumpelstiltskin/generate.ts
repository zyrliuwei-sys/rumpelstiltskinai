import { createFileRoute } from '@tanstack/react-router';

import { AIMediaType } from '@/core/ai';
import { EvoLinkHttpError, EvoLinkProvider } from '@/core/ai/evolink';
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
import { submitPerformance } from '@/modules/rumpelstiltskin/service';
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
    // Bound the actual stream, not just the optional Content-Length header.
    const reader = request.body?.getReader();
    if (!reader) return respErr('Request body required', { status: 400 });
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 5_650_000) {
        await reader.cancel();
        return respErr('Photos too large', { status: 413 });
      }
      chunks.push(value);
    }
    const text = await new Blob(chunks as BlobPart[]).text();
    const parsed = generateInput.safeParse(JSON.parse(text));
    if (!parsed.success)
      return respErr(
        'Upload two valid portraits, confirm consent, and select a supported duration and ratio',
        { status: 400 }
      );
    const { prompt, duration, aspectRatio, preset, photoA, photoB } =
      parsed.data;
    const configs = await getAllConfigs();
    if (!configs.evolink_api_key?.trim())
      return respErr(
        'An administrator must add an EvoLink API key in Settings. No credits were charged.',
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
      provider: 'evolink',
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
      const provider = new EvoLinkProvider(configs.evolink_api_key);
      const result = await submitPerformance(provider, {
        photoA,
        photoB,
        prompt,
        duration,
        aspectRatio,
      });
      await setProviderTaskId(task.id, result.id);
      return respData({ id: task.id, status: AITaskStatus.PENDING });
    } catch (error) {
      // An ambiguous network failure may have created a paid provider job.
      // Never resubmit or instantly refund such a request.
      if (!(error instanceof EvoLinkHttpError && error.status < 500)) {
        await mergeTaskInfo(task.id, { submissionUncertain: true });
        return respData({ id: task.id, status: AITaskStatus.PENDING });
      }
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
