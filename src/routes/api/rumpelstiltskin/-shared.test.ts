import assert from 'node:assert/strict';
import test from 'node:test';

import { AIMediaType, FalProvider } from '@/core/ai';
import { EvoLinkProvider } from '@/core/ai/evolink';
import type { AiTask } from '@/config/db/schema';
import {
  generationCredits,
  RUMPELSTILTSKIN_LEGACY_MODEL,
  RUMPELSTILTSKIN_MODEL,
} from '@/config/rumpelstiltskin';
import { submitPerformance } from '@/modules/rumpelstiltskin/service';

import { generateInput, isStudioTask, taskView } from './-shared';

// Minimal valid JPEG header padded past the 100-byte floor.
const jpeg = `data:image/jpeg;base64,${btoa('\xff\xd8\xff' + 'x'.repeat(200))}`;
const input = {
  prompt: 'A fictional fairy-tale character dances on tiptoe.',
  preset: 'custom',
  duration: 10,
  aspectRatio: '9:16',
  photoA: jpeg,
  photoB: jpeg,
  consent: true,
};

test('generation rejects arbitrary models, unsupported options and oversized prompts', () => {
  assert.equal(generateInput.safeParse(input).success, true);
  for (const invalid of [
    { ...input, model: 'expensive/arbitrary-model' },
    { ...input, duration: 60 },
    { ...input, duration: 8 },
    { ...input, photoB: undefined },
    { ...input, consent: false },
    { ...input, photoA: `data:image/png;base64,${btoa('x'.repeat(200))}` },
    { ...input, photoA: 'https://example.com/photo.jpg' },
    { ...input, preset: 'hotel' },
    { ...input, aspectRatio: '99:1' },
    { ...input, prompt: 'x'.repeat(1801) },
  ])
    assert.equal(generateInput.safeParse(invalid).success, false);
  assert.equal(generationCredits({ rumpelstiltskin_credits_5s: '-40' }, 5), 40);
  assert.equal(
    generationCredits({ rumpelstiltskin_credits_10s: '75' }, 10),
    75
  );
  assert.equal(generationCredits({}, 10), 80);
});

test('task ownership, product scope and output URLs are enforced', () => {
  const task = {
    id: 'task',
    userId: 'owner',
    provider: 'evolink',
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
    isStudioTask(
      { ...task, provider: 'fal', model: RUMPELSTILTSKIN_LEGACY_MODEL },
      'owner'
    ),
    true
  );
  assert.equal(isStudioTask({ ...task, provider: 'fal' }, 'owner'), false);
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
    assert.equal(
      String(url),
      `https://queue.fal.run/${RUMPELSTILTSKIN_LEGACY_MODEL}`
    );
    submitted = JSON.parse(String(init?.body));
    return Response.json({ request_id: 'mock-request' });
  };
  try {
    const provider = new FalProvider({ apiKey: 'mock-key' });
    const result = await provider.generate({
      params: {
        mediaType: AIMediaType.VIDEO,
        model: RUMPELSTILTSKIN_LEGACY_MODEL,
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

test('EvoLink submission uploads both portraits in order and pins the model', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  let submitted: Record<string, unknown> = {};
  let uploads = 0;
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    if (String(url).startsWith('https://files-api.evolink.ai/')) {
      uploads += 1;
      return Response.json({
        success: true,
        data: { file_url: `https://files.evolink.ai/f/${uploads}` },
      });
    }
    submitted = JSON.parse(String(init?.body));
    return Response.json({ id: 'task-1', status: 'pending' });
  };
  try {
    const result = await submitPerformance(new EvoLinkProvider('mock-key'), {
      photoA: jpeg,
      photoB: jpeg,
      prompt: input.prompt,
      duration: 10,
      aspectRatio: '9:16',
    });
    assert.equal(result.id, 'task-1');
    assert.equal(calls.at(-1), 'https://api.evolink.ai/v1/videos/generations');
    assert.equal(submitted.model, RUMPELSTILTSKIN_MODEL);
    assert.deepEqual(submitted.image_urls, [
      'https://files.evolink.ai/f/1',
      'https://files.evolink.ai/f/2',
    ]);
    assert.equal(submitted.duration, 10);
    assert.match(String(submitted.prompt), /@image1.*@image2/s);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
