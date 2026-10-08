// Render the built homepage without opening a listening socket. This is a
// static visual QA artifact; use `pnpm dev` for live application interactions.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

process.env.DATABASE_PROVIDER = 'd1';
process.env.D1_REMOTE_HTTP = 'false';
const ssrModule = await import('../.output/server/_ssr/ssr.mjs');
const handler = Object.values(ssrModule).find(
  (value) => typeof value?.default?.fetch === 'function'
)?.default;
if (!handler) throw new Error('Built SSR handler missing');
const root = resolve('.output/public');
async function dataUrl(path) {
  const mime = path.endsWith('.svg')
    ? 'image/svg+xml'
    : path.endsWith('.woff2')
      ? 'font/woff2'
      : 'image/webp';
  return `data:${mime};base64,${(await readFile(resolve(root, `.${path}`))).toString('base64')}`;
}
async function render(locale, route = '', name = 'home') {
  const response = await handler.fetch(
    new Request(
      `http://localhost:3000/${locale === 'zh' ? 'zh' + (route ? '/' : '') : ''}${route}`
    )
  );
  if (response.status !== 200)
    throw new Error(`SSR returned ${response.status}`);
  let html = await response.text();
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  const sheets = [...html.matchAll(/<link[^>]*href="([^"]+\.css)"[^>]*>/g)];
  for (const [tag, path] of sheets) {
    let css = await readFile(resolve(root, `.${path}`), 'utf8');
    for (const match of [...css.matchAll(/url\(([^)]+\.woff2)\)/g)]) {
      const font = match[1].replace(/^['"]|['"]$/g, '');
      const fontPath = font.startsWith('/') ? font : `/assets/${font}`;
      css = css.replace(match[0], `url(${await dataUrl(fontPath)})`);
    }
    html = html.replace(tag, `<style>${css}</style>`);
  }
  for (const path of [
    '/logo.svg',
    '/favicon.svg',
    '/imgs/generated/rumpelstiltskin-hero.webp',
    '/imgs/generated/rumpelstiltskin-forest.webp',
    '/imgs/generated/rumpelstiltskin-ballroom.webp',
  ]) {
    html = html.replaceAll(path, await dataUrl(path));
  }
  html = html.replace(/<html /, '<html class="dark" ');
  await mkdir('docs/design-references', { recursive: true });
  const path = `docs/design-references/${name}-${locale}.html`;
  await writeFile(path, html);
  console.log(
    JSON.stringify({
      path,
      status: response.status,
      bytes: html.length,
      staticPreview: true,
    })
  );
}
await render('en');
await render('zh');
await render('en', 'create', 'studio');
await render('zh', 'create', 'studio');
await render('en', 'pricing', 'pricing');
await render('en', 'sign-in', 'sign-in');
await render('en', 'privacy-policy', 'privacy');
