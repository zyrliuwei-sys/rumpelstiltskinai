import { createFileRoute } from '@tanstack/react-router';

import {
  generationCredits,
  RUMPELSTILTSKIN_MODEL,
} from '@/config/rumpelstiltskin';
import { getAllConfigs } from '@/modules/config/service';
import { respData, respErr } from '@/lib/resp';

async function GET() {
  try {
    const configs = await getAllConfigs();
    return respData(
      {
        configured: Boolean(configs.fal_api_key?.trim()),
        costCredits: generationCredits(configs, 5),
        costs: {
          5: generationCredits(configs, 5),
          8: generationCredits(configs, 8),
        },
        model: RUMPELSTILTSKIN_MODEL,
      },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch {
    return respErr('Unable to check generation configuration', { status: 503 });
  }
}

export const Route = createFileRoute('/api/rumpelstiltskin/status')({
  server: { handlers: { GET } },
});
