// Browser QA fixture for login → paywall → payment return → generation.
// Uses a temporary SQLite DB and mocks PayPal/EvoLink; no real payments or API costs.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { createClient } from '@libsql/client';

const port = Number(process.env.FLOW_TEST_PORT || 3002);
const origin = `http://localhost:${port}`;
const fixture = join(
  mkdtempSync(join(tmpdir(), 'studio-flow-')),
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
  AUTH_URL: origin,
  VITE_APP_URL: origin,
  AUTH_TRUSTED_ORIGINS: origin,
  CONFIG_ENCRYPTION_KEY: '',
});
const db = createClient({ url: `file:${fixture}` });
for (const [name, value] of Object.entries({
  evolink_api_key: 'fixture-key',
  app_url: origin,
  email_auth_enabled: 'true',
  email_verification_enabled: 'false',
  paypal_enabled: 'true',
  default_payment_provider: 'paypal',
  paypal_client_id: 'fixture',
  paypal_client_secret: 'fixture',
  paypal_environment: 'sandbox',
  initial_credits_enabled: 'false',
}))
  await db.execute({
    sql: 'INSERT INTO config(name,value) VALUES (?,?)',
    args: [name, value],
  });
const orders = new Map();
let uploads = 0;
let generations = 0;
let generationBody;
globalThis.fetch = async (target, init) => {
  const url = String(target);
  if (url.startsWith('https://files-api.evolink.ai/'))
    return Response.json({
      success: true,
      data: { file_url: `https://files.evolink.ai/fixture-${++uploads}.jpg` },
    });
  if (url === 'https://api.evolink.ai/v1/videos/generations') {
    generationBody = JSON.parse(init.body);
    generations++;
    return Response.json({
      id: `fixture-video-${generations}`,
      status: 'pending',
    });
  }
  if (url.startsWith('https://api.evolink.ai/v1/tasks/'))
    return Response.json({
      id: 'fixture',
      status: 'completed',
      results: ['https://example.com/fixture-video.mp4'],
    });
  if (url.endsWith('/v1/oauth2/token'))
    return Response.json({ access_token: 'fixture-token', expires_in: 3600 });
  if (url.endsWith('/v2/checkout/orders') && init.method === 'POST') {
    const body = JSON.parse(init.body);
    const id = `fixture-order-${orders.size + 1}`;
    orders.set(id, { body, paid: false });
    return Response.json({
      id,
      status: 'CREATED',
      links: [{ rel: 'approve', href: `${origin}/fixture/checkout?id=${id}` }],
    });
  }
  const id = url.match(/\/v2\/checkout\/orders\/([^/]+)$/)?.[1];
  if (id && orders.has(id)) {
    const row = orders.get(id);
    return Response.json({
      id,
      status: row.paid ? 'COMPLETED' : 'CREATED',
      purchase_units: row.body.purchase_units.map((unit) => ({
        ...unit,
        ...(row.paid
          ? {
              payments: {
                captures: [
                  {
                    id: `capture-${id}`,
                    amount: unit.amount,
                    create_time: new Date().toISOString(),
                  },
                ],
              },
            }
          : {}),
      })),
    });
  }
  throw new Error(
    `Unexpected fixture outbound request: ${new URL(url).origin}`
  );
};
const ssr = await import('../.output/server/_ssr/ssr.mjs');
const handler = Object.values(ssr).find(
  (value) => typeof value?.default?.fetch === 'function'
)?.default;
const mime = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (url.pathname === '/fixture/stats') {
      const rows = await db.execute(
        'SELECT transaction_type,credits,remaining_credits,status FROM credit'
      );
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          generations,
          uploads,
          generationBody,
          orders: orders.size,
          credits: rows.rows,
        })
      );
      return;
    }
    if (url.pathname === '/fixture/checkout') {
      const id = url.searchParams.get('id');
      const row = orders.get(id);
      if (!row) throw new Error('Unknown fixture order');
      res.setHeader('content-type', 'text/html');
      res.end(
        `<h1>Simulated payment</h1><a href="/fixture/approve?id=${id}">Complete test payment</a><br><a href="${row.body.application_context.cancel_url}">Cancel test payment</a>`
      );
      return;
    }
    if (url.pathname === '/fixture/approve') {
      const row = orders.get(url.searchParams.get('id'));
      if (!row) throw new Error('Unknown fixture order');
      row.paid = true;
      res.writeHead(302, { Location: row.body.application_context.return_url });
      res.end();
      return;
    }
    if (
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/imgs/') ||
      url.pathname.startsWith('/videos/') ||
      url.pathname === '/logo.svg'
    ) {
      for (const base of ['.output/public', 'public']) {
        const root = resolve(base);
        const file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
        if (!file.startsWith(root + '/')) continue;
        try {
          const bytes = await readFile(file);
          res.setHeader(
            'content-type',
            mime[extname(file)] || 'application/octet-stream'
          );
          res.end(bytes);
          return;
        } catch {}
      }
      res.writeHead(404);
      res.end();
      return;
    }
    const bytes = [];
    for await (const chunk of req) bytes.push(chunk);
    const response = await handler.fetch(
      new Request(url, {
        method: req.method,
        headers: req.headers,
        ...(!['GET', 'HEAD'].includes(req.method)
          ? { body: Buffer.concat(bytes) }
          : {}),
      })
    );
    res.statusCode = response.status;
    for (const [name, value] of response.headers)
      if (name !== 'set-cookie') res.setHeader(name, value);
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Fixture request failed:', error.message);
    res.writeHead(500);
    res.end('Fixture error');
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Isolated studio flow fixture: ${origin}/create`)
);
