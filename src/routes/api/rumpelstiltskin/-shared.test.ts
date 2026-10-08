import assert from 'node:assert/strict';
import test from 'node:test';

import { AIMediaType, FalProvider } from '@/core/ai';
import type { AiTask } from '@/config/db/schema';
import {
  generationCredits,
  RUMPELSTILTSKIN_MODEL,
} from '@/config/rumpelstiltskin';

import { generateInput, isStudioTask, taskView } from './-shared';

const input = {
  prompt: 'A fictional fairy-tale character dances on tiptoe.',
  preset: 'castle',
  duration: 5,
  aspectRatio: '9:16',
};

test('generation rejects arbitrary models, unsupported options and oversized prompts', () => {
  assert.equal(generateInput.safeParse(input).success, true);
  for (const invalid of [
    { ...input, model: 'expensive/arbitrary-model' },
    { ...input, duration: 60 },
    { ...input, preset: 'hotel' },
    { ...input, aspectRatio: '99:1' },
    { ...input, prompt: 'x'.repeat(1801) },
  ])
    assert.equal(generateInput.safeParse(invalid).success, false);
  assert.equal(generationCredits({ rumpelstiltskin_credits_5s: '-40' }, 5), 40);
  assert.equal(generationCredits({ rumpelstiltskin_credits_8s: '75' }, 8), 75);
});

test('task ownership, product scope and output URLs are enforced', () => {
  const task = {
    id: 'task',
    userId: 'owner',
    provider: 'fal',
    model: RUMPELSTILTSKIN_MODEL,
    deletedAt: null,
    taskInfo: '{"app":"rumpelstiltskin"}',
    status: 'success',
    prompt: input.prompt,
    createdAt: new Date(),
    taskResult: '{"video":{"url":"https://example.com/video.mp4"}}',
  } as AiTask;
  assert.equal(isStudioTask(task, 'owner'), true);
  assert.equal(isStudioTask(task, 'someone-else'), false);
  assert.equal(
    isStudioTask({ ...task, taskInfo: '{"app":"hotel-lobby"}' }, 'owner'),
    false
  );
  assert.equal(
    isStudioTask({ ...task, deletedAt: new Date() }, 'owner'),
    false
  );
  assert.equal(taskView(task).videoUrl, 'https://example.com/video.mp4');
  assert.equal(taskView({ ...task, status: 'pending' }).videoUrl, null);
  assert.equal(
    taskView({ ...task, taskResult: '{"video":{"url":"javascript:alert(1)"}}' })
      .videoUrl,
    null
  );
});

test('existing Fal provider forwards Wan frame and ratio options without paid requests', async () => {
  const originalFetch = globalThis.fetch;
  let submitted: Record<string, unknown> = {};
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), `https://queue.fal.run/${RUMPELSTILTSKIN_MODEL}`);
    submitted = JSON.parse(String(init?.body));
    return Response.json({ request_id: 'mock-request' });
  };
  try {
    const provider = new FalProvider({ apiKey: 'mock-key' });
    const result = await provider.generate({
      params: {
        mediaType: AIMediaType.VIDEO,
        model: RUMPELSTILTSKIN_MODEL,
        prompt: input.prompt,
        options: {
          num_frames: 129,
          frames_per_second: 16,
          resolution: '720p',
          aspect_ratio: '9:16',
          enable_safety_checker: true,
        },
      },
    });
    assert.equal(result.taskId, 'mock-request');
    assert.equal(submitted.num_frames, 129);
    assert.equal(submitted.aspect_ratio, '9:16');
    assert.equal(submitted.enable_safety_checker, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
