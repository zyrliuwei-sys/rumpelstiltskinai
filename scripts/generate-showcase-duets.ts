// Generates the barn duet showcase clips through the production submitPerformance path.
// Usage: S=<scratch dir with cast/> npx tsx scripts/generate-showcase-duets.ts balance|portraits|submit|poll
import { readFile, writeFile } from 'node:fs/promises';

import { EvoLinkProvider } from '@/core/ai/evolink';
import { submitPerformance } from '@/modules/rumpelstiltskin/service';

import { credentials } from './generate-showcase-videos.mjs';

const S = process.env.S!;
const state = `${S}/duets.json`;
const casts = [
  {
    name: 'castle',
    man: 'a fictional short adult man in his forties, impish face, bushy eyebrows, messy grey-brown hair, plain grey t-shirt',
    woman:
      'a fictional young adult woman in her twenties, long auburn hair, freckles, plain cream sweater',
    direction:
      'Keep the comedic timing playful: a sly tiptoe approach, a dramatic shhh, then an exuberant bouncing dance in the straw.',
  },
  {
    name: 'forest',
    man: 'a fictional short adult man in his thirties, round cheerful face, curly black hair, short black beard, plain navy t-shirt',
    woman:
      'a fictional adult woman in her thirties, dark straight bob haircut, plain white blouse',
    direction:
      'Hold a little longer on the shhh close-up and the wide toothy grin before the dance explodes.',
  },
  {
    name: 'ballroom',
    man: 'a fictional short adult man in his fifties, bald head, mischievous grin, grey stubble, plain olive t-shirt',
    woman:
      'a fictional young adult woman, blonde braided hair, rosy cheeks, plain light blue top',
    direction:
      'End on an energetic close shot of the pointed shoes prancing and kicking up straw.',
  },
];
const portrait =
  'head and shoulders portrait photograph, front facing, looking at camera, neutral grey studio background, soft natural daylight, sharp focus, realistic skin texture, no text';

async function main() {
  const { key } = await credentials();
  const evo = new EvoLinkProvider(key);
  const st: any = JSON.parse(await readFile(state, 'utf8').catch(() => '{}'));
  const save = () => writeFile(state, JSON.stringify(st, null, 2));
  const api = async (path: string, body?: object) => {
    const r = await fetch(`https://api.evolink.ai${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const d: any = await r.json();
    if (!r.ok)
      throw new Error(`${r.status} ${JSON.stringify(d).slice(0, 300)}`);
    return d;
  };
  const waitTask = async (id: string, ms = 5000) => {
    for (;;) {
      const t = await evo.query(id);
      if (t.status === 'completed') return t;
      if (t.status === 'failed' || t.status === 'cancelled')
        throw new Error(`task ${id} ${JSON.stringify(t).slice(0, 400)}`);
      await new Promise((r) => setTimeout(r, ms));
    }
  };
  const mode = process.argv[2];
  if (mode === 'balance')
    return console.log(JSON.stringify((await api('/v1/credits')).data?.user));
  if (mode === 'portraits') {
    for (const c of casts)
      for (const role of ['man', 'woman'] as const) {
        const k = `${c.name}-${role}`;
        if (st[k]) continue;
        const t = await api('/v1/images/generations', {
          model: 'z-image-turbo',
          prompt: `${(c as any)[role]}, ${portrait}`,
          size: '3:4',
        });
        const done = await waitTask(t.id, 3000);
        const bytes = Buffer.from(
          await (await fetch(done.results![0])).arrayBuffer()
        );
        await writeFile(`${S}/cast/${k}.png`, bytes);
        st[k] = `${S}/cast/${k}.png`;
        await save();
        console.log('portrait', k, bytes.length);
      }
  }
  if (mode === 'submit') {
    for (const c of casts) {
      if (st[`${c.name}-task`]) continue;
      const toData = async (p: string) => {
        const b = await readFile(p);
        return `data:image/${p.endsWith('.png') ? 'png' : 'jpeg'};base64,${b.toString('base64')}`;
      };
      st[`${c.name}-task`] = 'submitting';
      await save();
      const t = await submitPerformance(evo, {
        photoA: await toData(st[`${c.name}-man`]),
        photoB: await toData(st[`${c.name}-woman`]),
        prompt: c.direction,
        duration: 10,
        aspectRatio: '16:9',
      });
      st[`${c.name}-task`] = t.id;
      await save();
      console.log('submitted', c.name, JSON.stringify(t).slice(0, 300));
    }
  }
  if (mode === 'poll') {
    for (const c of casts) {
      const id = st[`${c.name}-task`];
      if (!id || id === 'submitting' || st[`${c.name}-file`]) continue;
      const t = await waitTask(id, 15000);
      const bytes = Buffer.from(
        await (await fetch(t.results![0])).arrayBuffer()
      );
      const f = `${S}/out-${c.name}.mp4`;
      await writeFile(f, bytes);
      st[`${c.name}-file`] = f;
      await save();
      console.log(
        'video',
        c.name,
        bytes.length,
        JSON.stringify((t as any).usage ?? {})
      );
    }
  }
}
main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
