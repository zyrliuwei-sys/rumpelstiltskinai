// In-process SSR checks: no listener, production DB connection or paid request.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const fixtureDir = mkdtempSync(join(tmpdir(), 'rumpel-smoke-'));
const fixtureDb = join(fixtureDir, 'fixture.sqlite');
execFileSync('sqlite3', [fixtureDb], {
  input: readFileSync('drizzle/0000_wooden_venom.sql', 'utf8'),
});
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_URL = `file:${fixtureDb}`;
process.env.D1_REMOTE_HTTP = 'false';
process.env.AUTH_SECRET = randomBytes(32).toString('base64');
const ssrModule = await import('../.output/server/_ssr/ssr.mjs');
// Nitro's generated export aliases can change between builds.
const handler = Object.values(ssrModule).find(
  (value) => typeof value?.default?.fetch === 'function'
)?.default;
assert.ok(handler, 'Built SSR handler missing');
const request = (path, options) =>
  handler.fetch(new Request(`http://localhost:3000${path}`, options));
for (const path of [
  '/',
  '/zh',
  '/create',
  '/zh/create',
  '/pricing',
  '/sign-in',
  '/sign-up',
  '/privacy-policy',
  '/terms-of-service',
  '/acceptable-use-policy',
]) {
  const response = await request(path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(!html.includes('Hotel Lobby AI'), `${path}: old brand`);
  assert.ok(html.includes('<html'), `${path}: HTML missing`);
  assert.ok(
    !html.includes('Switch language'),
    `${path}: language switcher should be hidden`
  );
  if (path === '/' || path === '/zh' || path.endsWith('/create')) {
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${path}: one H1`);
    assert.match(html, /rel="canonical"/, `${path}: canonical missing`);
    assert.match(
      html,
      /hrefLang="zh"|hreflang="zh"/,
      `${path}: hreflang missing`
    );
  }
  if (path === '/') {
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    assert.ok(main, 'Homepage main content');
    const text = main
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = text.split(/\s+/).length;
    assert.ok(
      words >= 1150 && words <= 1300,
      `Homepage has ${words} words, expected about 1200`
    );
    assert.match(text, /Rumpelstiltskin AI video/i);
    assert.ok(!/[—–]/.test(text), 'No decorative em-dashes');
    assert.match(html, /WebApplication/);
    assert.match(html, /WebSite/);
    console.log(
      `Homepage SEO: ${words} main-content words, one H1, keywords and metadata present`
    );
  }
  console.log(`${path} SSR 200`);
}
const status = await request('/api/rumpelstiltskin/status');
assert.equal(status.status, 200);
const { data } = await status.json();
assert.equal(data.configured, false);
assert.deepEqual(data.costs, { 5: 40, 8: 60 });
for (const path of [
  '/api/rumpelstiltskin/videos',
  '/api/rumpelstiltskin/task?id=unknown',
]) {
  const response = await request(path);
  assert.equal(response.status, 401, path);
}
const generation = await request('/api/rumpelstiltskin/generate', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A fictional goblin dancing.',
    preset: 'castle',
    duration: 5,
    aspectRatio: '9:16',
  }),
});
assert.equal(generation.status, 401);
console.log(
  'Studio configuration and anonymous API guards passed. No provider requests.'
);
// libsql can retain a worker handle after the final local fixture query.
process.exit(0);
