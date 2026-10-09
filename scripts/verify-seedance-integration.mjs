// Exercises the built app with an isolated database and a mocked EvoLink.
// No production records, real credentials, or paid requests are used.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

const fixture = join(
  mkdtempSync(join(tmpdir(), 'seedance-integration-')),
  'fixture.sqlite'
);
execFileSync('sqlite3', [fixture], {
  input: readFileSync('drizzle/0000_wooden_venom.sql', 'utf8'),
});
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${fixture}`,
  D1_REMOTE_HTTP: 'false',
  AUTH_SECRET: randomBytes(32).toString('base64'),
  AUTH_URL: 'http://localhost:3000',
  VITE_APP_URL: 'http://localhost:3000',
  CONFIG_ENCRYPTION_KEY: '',
});
const db = createClient({ url: `file:${fixture}` });
await db.execute(
  "INSERT INTO config (name, value) VALUES ('evolink_api_key', 'test-only'), ('email_sign_enabled', 'true')"
);
let mode = 'completed';
let submitted = 0;
let body;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const target = String(url);
  if (target.startsWith('https://files-api.evolink.ai/')) {
    if (mode === 'upload-failure') return new Response('', { status: 500 });
    return Response.json({
      success: true,
      data: { file_url: 'https://files.evolink.ai/test.jpg' },
    });
  }
  if (target === 'https://api.evolink.ai/v1/videos/generations') {
    submitted++;
    body = JSON.parse(init.body);
    if (mode === 'rejected')
      return Response.json(
        { error: { code: 'invalid_request' } },
        { status: 400 }
      );
    return Response.json({ id: `provider-${submitted}`, status: 'pending' });
  }
  if (target.startsWith('https://api.evolink.ai/v1/tasks/')) {
    return Response.json(
      mode === 'failed'
        ? { id: 'provider', status: 'failed' }
        : {
            id: 'provider',
            status: 'completed',
            results: ['https://example.com/result.mp4'],
          }
    );
  }
  throw new Error(`Unexpected outbound request: ${new URL(target).origin}`);
};
const ssr = await import('../.output/server/_ssr/ssr.mjs');
const handler = Object.values(ssr).find(
  (value) => typeof value?.default?.fetch === 'function'
)?.default;
assert.ok(handler);
const request = (path, options = {}) =>
  handler.fetch(new Request(`http://localhost:3000${path}`, options));
const signup = await request('/api/auth/sign-up/email', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: 'http://localhost:3000',
  },
  body: JSON.stringify({
    name: 'Integration test',
    email: 'seedance-test@example.com',
    password: randomBytes(24).toString('hex'),
  }),
});
assert.equal(signup.status, 200, await signup.clone().text());
const { user } = await signup.json();
const cookie = signup.headers
  .getSetCookie()
  .map((value) => value.split(';')[0])
  .join('; ');
assert.ok(cookie);
await db.execute({
  sql: 'INSERT INTO credit (id,user_id,user_email,transaction_no,transaction_type,transaction_scene,credits,remaining_credits,status) VALUES (?,?,?,?,?,?,?,?,?)',
  args: [
    'test-credit',
    user.id,
    user.email,
    'test-grant',
    'grant',
    'gift',
    2000,
    2000,
    'active',
  ],
});
const balance = async () =>
  Number(
    (
      await db.execute(
        "SELECT remaining_credits FROM credit WHERE id='test-credit'"
      )
    ).rows[0].remaining_credits
  );
const jpeg = `data:image/jpeg;base64,${btoa('\xff\xd8\xff' + 'x'.repeat(200))}`;
const generate = async (suffix, extra = {}) =>
  request('/api/rumpelstiltskin/generate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
      origin: 'http://localhost:3000',
      'x-forwarded-for': `192.0.2.${suffix}`,
    },
    body: JSON.stringify({
      prompt: 'A playful original fantasy dance with two adult characters.',
      preset: 'custom',
      duration: 5,
      aspectRatio: '9:16',
      photoA: jpeg,
      photoB: jpeg,
      consent: true,
      quality: '720p',
      ...extra,
    }),
  });
const poll = (id, authenticated = true) =>
  request(`/api/rumpelstiltskin/task?id=${id}`, {
    headers: authenticated ? { cookie } : {},
  });
try {
  const status = await (await request('/api/rumpelstiltskin/status')).json();
  assert.equal(status.data.configured, true);
  assert.deepEqual(status.data.qualityCosts, {
    '480p': { 5: 167, 10: 333 },
    '720p': { 5: 350, 10: 700 },
  });
  const changedQuote = await generate(8, { expectedCredits: 1 });
  assert.equal(changedQuote.status, 409);
  assert.equal(await balance(), 2000);
  assert.equal(submitted, 0);
  const created = await generate(1, { expectedCredits: 350 });
  assert.equal(created.status, 200, await created.clone().text());
  const { data: task } = await created.json();
  assert.equal(await balance(), 1650);
  assert.equal(body.model, 'seedance-2.0-mini-reference-to-video');
  assert.equal(body.quality, '720p');
  assert.equal(body.image_urls.length, 2);
  assert.equal((await poll(task.id, false)).status, 401);
  const done = await (await poll(task.id)).json();
  assert.equal(done.data.status, 'success');
  assert.equal(done.data.videoUrl, 'https://example.com/result.mp4');
  const history = await (
    await request('/api/rumpelstiltskin/videos', { headers: { cookie } })
  ).json();
  assert.equal(history.data.items[0].id, task.id);
  console.log(
    'PASS: authenticated generate → two uploads → 720p task → 350-credit debit → poll → video history'
  );

  mode = 'upload-failure';
  const beforeUpload = submitted;
  assert.equal((await generate(2)).status, 502);
  assert.equal(await balance(), 1650);
  assert.equal(submitted, beforeUpload);
  console.log(
    'PASS: upload failure never starts a paid task or deducts credits'
  );

  mode = 'rejected';
  assert.equal((await generate(3)).status, 502);
  assert.equal(await balance(), 1650);
  console.log('PASS: provider rejects submission → credits returned');

  mode = 'failed';
  const rejected = await (await generate(4)).json();
  assert.ok(rejected.data?.id, JSON.stringify(rejected));
  assert.equal(await balance(), 1300);
  const failures = await Promise.all([
    poll(rejected.data.id),
    poll(rejected.data.id),
  ]);
  const failed = await failures[0].json();
  assert.equal(failed.data.status, 'failed');
  assert.equal(await balance(), 1650);
  await poll(rejected.data.id);
  assert.equal(await balance(), 1650);
  console.log(
    'PASS: terminal generation failure refunds once; repeat poll does not re-refund'
  );

  const invalid = await generate(5, { quality: '1080p' });
  assert.equal(invalid.status, 400);
  assert.equal(await balance(), 1650);
  const insufficient = await generate(6, { duration: 10 });
  // 700 credits still fit. Complete this task, then drain balance for guard.
  assert.equal(insufficient.status, 200);
  await db.execute(
    "UPDATE credit SET remaining_credits=0 WHERE id='test-credit'"
  );
  const beforeInsufficient = submitted;
  assert.equal((await generate(7)).status, 402);
  assert.equal(submitted, beforeInsufficient);
  console.log(
    'PASS: unsupported options and insufficient balance cannot create paid jobs'
  );
} finally {
  globalThis.fetch = originalFetch;
  db.close();
}
process.exit(0);
