import { createFileRoute } from '@tanstack/react-router';

import {
  GENERATION_MARKUP,
  generationCredits,
  generationRate,
  RUMPELSTILTSKIN_MODEL,
  USD_PER_CREDIT,
} from '@/config/rumpelstiltskin';
import { getAllConfigs } from '@/modules/config/service';
import { respData, respErr } from '@/lib/resp';

async function GET() {
  try {
    const configs = await getAllConfigs({ required: true });
    return respData(
      {
        configured: Boolean(configs.evolink_api_key?.trim()),
        costCredits: generationCredits(configs, 5),
        costs: {
          5: generationCredits(configs, 5),
          10: generationCredits(configs, 10),
        },
        qualityCosts: {
          '480p': {
            5: generationCredits(configs, 5, '480p'),
            10: generationCredits(configs, 10, '480p'),
          },
          '720p': {
            5: generationCredits(configs, 5, '720p'),
            10: generationCredits(configs, 10, '720p'),
          },
        },
        rates: {
          '480p': generationRate(configs, '480p'),
          '720p': generationRate(configs, '720p'),
        },
        markup: GENERATION_MARKUP,
        usdPerCredit: USD_PER_CREDIT,
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
