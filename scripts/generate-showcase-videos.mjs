// Private asset-generation utility. Reads the admin-configured key from D1;
// never exposes it to the browser bundle or writes it to the asset manifest.
import { execFile } from 'node:child_process';
import { createDecipheriv, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = `${root}public/videos/`;
const manifestPath = `${root}docs/video-showcase.json`;
const model = 'doubao-seedance-1.0-pro-fast';
const scenes = [
  {
    name: 'castle',
    prompt:
      'An original cinematic dark fairy tale: Rumpelstiltskin, a tiny mischievous goblin with pointed ears, a crooked grin, wiry hair and a weathered burgundy coat, tiptoe dances in a candlelit medieval stone castle. Full body visible, nimble alternating toe steps and one playful spin, flowing coat, warm candle gold against charcoal shadows, realistic handcrafted fantasy creature, subtle film grain, slow camera push in, elegant composition, no text, no watermark.',
  },
  {
    name: 'forest',
    prompt:
      'An original cinematic fairy tale: Rumpelstiltskin, a tiny mischievous goblin with pointed ears, wiry hair and a weathered burgundy coat, tiptoe dances on moss in an enchanted night forest. Full body visible, playful toe steps and a small twirl, glowing fireflies, moonlit mist and warm golden sparks, realistic handcrafted fantasy creature, subtle film grain, steady camera, elegant composition, no text, no watermark.',
  },
  {
    name: 'ballroom',
    prompt:
      'An original cinematic fairy tale: Rumpelstiltskin, a tiny mischievous goblin with pointed ears, a crooked grin, wiry hair and a weathered burgundy coat, performs a joyful tiptoe dance in an abandoned royal ballroom. Full body visible, nimble toe steps then a playful spin, ornate gold mirrors, candle chandeliers, drifting dust, warm amber light and charcoal shadows, realistic handcrafted fantasy creature, subtle film grain, slow camera movement, no text, no watermark.',
  },
];

async function credentials() {
  const text = await readFile(`${root}.env.development`, 'utf8');
  const env = Object.fromEntries(
    [...text.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map((m) => [
      m[1],
      m[2].trim().replace(/^(['"])(.*)\1$/, '$2'),
    ])
  );
  const token =
    env.CLOUDFLARE_API_TOKEN ||
    (
      await promisify(execFile)(
        `${root}node_modules/.bin/wrangler`,
        ['auth', 'token'],
        { cwd: root, timeout: 60000 }
      )
    ).stdout
      .trim()
      .split(/\s+/)
      .pop();
  if (!token)
    throw new Error('Cloudflare session unavailable; log in locally.');
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${env.D1_DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: 'SELECT name, value FROM config WHERE name IN (?, ?)',
        params: ['evolink_api_key', 'evolink_base_url'],
      }),
    }
  );
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(`D1 read failed (${response.status}).`);
  const configs = Object.fromEntries(
    (data.result?.[0]?.results || []).map((r) => [r.name, r.value])
  );
  let key = configs.evolink_api_key;
  if (!key)
    throw new Error('Set EvoLink API Key in Admin → Settings → AI first.');
  if (key.startsWith('enc:v1:')) {
    if (!env.CONFIG_ENCRYPTION_KEY)
      throw new Error('Local config encryption key unavailable.');
    const packed = Buffer.from(key.slice(7), 'base64');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      createHash('sha256').update(env.CONFIG_ENCRYPTION_KEY).digest(),
      packed.subarray(0, 12)
    );
    decipher.setAuthTag(packed.subarray(12, 28));
    key = Buffer.concat([
      decipher.update(packed.subarray(28)),
      decipher.final(),
    ]).toString();
  }
  // Never send this key to an arbitrary configured host.
  const base = (configs.evolink_base_url || 'https://api.evolink.ai').replace(
    /\/+$/,
    ''
  );
  if (base !== 'https://api.evolink.ai')
    throw new Error('Expected official EvoLink API origin.');
  return { key, base };
}

export async function run(mode = 'inspect') {
  const { key, base } = await credentials();
  async function api(path, body) {
    const response = await fetch(`${base}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        `EvoLink ${response.status}: ${data.error?.message || 'request failed'}`
      );
    return data;
  }
  if (mode === 'inspect') {
    const balance = await api('/v1/credits');
    return {
      model,
      quality: '480p',
      count: 3,
      duration: 5,
      estimatedUsd: 0.09,
      balance: balance.data?.user,
    };
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    manifest = { model, quality: '480p', duration: 5, clips: [] };
  }
  await mkdir(output, { recursive: true });
  async function save() {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  for (const scene of scenes) {
    let clip = manifest.clips.find((c) => c.name === scene.name);
    if (mode === 'submit' && !clip) {
      // Persist intent BEFORE charging. An ambiguous network failure must be
      // reconciled manually, never automatically retried as a new paid task.
      clip = { name: scene.name, prompt: scene.prompt, status: 'submitting' };
      manifest.clips.push(clip);
      await save();
      const task = await api('/v1/videos/generations', {
        model,
        prompt: scene.prompt,
        duration: 5,
        quality: '480p',
        aspect_ratio: '16:9',
      });
      Object.assign(clip, {
        taskId: task.id,
        status: task.status,
        usage: task.usage,
      });
      await save();
    }
    if (mode === 'poll' && clip?.taskId && !clip.file) {
      const task = await api(`/v1/tasks/${encodeURIComponent(clip.taskId)}`);
      clip.status = task.status;
      clip.usage = task.usage || clip.usage;
      if (task.status === 'completed') {
        const url = task.results?.[0];
        if (typeof url !== 'string' || !url.startsWith('https://'))
          throw new Error('Unexpected video result format.');
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`Asset download failed (${response.status}).`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length < 1000 || bytes.length > 25 * 1024 * 1024)
          throw new Error('Unexpected asset size.');
        await writeFile(`${output}rumpelstiltskin-${clip.name}.mp4`, bytes);
        clip.file = `/videos/rumpelstiltskin-${clip.name}.mp4`;
        clip.bytes = bytes.length;
      }
      if (task.status === 'failed') clip.error = task.error;
      await save();
    }
  }
  return manifest;
}
