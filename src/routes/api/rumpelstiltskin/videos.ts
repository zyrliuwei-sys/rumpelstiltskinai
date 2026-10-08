import { createFileRoute } from '@tanstack/react-router';
import { and, count, desc, eq, isNull, like, or } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask, type AiTask } from '@/config/db/schema';
import {
  RUMPELSTILTSKIN_LEGACY_MODEL,
  RUMPELSTILTSKIN_MODEL,
} from '@/config/rumpelstiltskin';
import { respData, respErr } from '@/lib/resp';

import { taskView } from './-shared';

async function GET({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const search = new URL(request.url).searchParams;
    const page = Number(search.get('page') || 1);
    const pageSize = Number(search.get('pageSize') || 12);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50
    )
      return respErr('Invalid pagination', { status: 400 });
    const where = and(
      eq(aiTask.userId, session.user.id),
      or(
        and(
          eq(aiTask.model, RUMPELSTILTSKIN_MODEL),
          eq(aiTask.provider, 'evolink')
        ),
        and(
          eq(aiTask.model, RUMPELSTILTSKIN_LEGACY_MODEL),
          eq(aiTask.provider, 'fal')
        )
      ),
      isNull(aiTask.deletedAt),
      like(aiTask.taskInfo, '%"app":"rumpelstiltskin"%')
    );
    const [items, totals] = await Promise.all([
      db()
        .select()
        .from(aiTask)
        .where(where)
        .orderBy(desc(aiTask.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db().select({ n: count() }).from(aiTask).where(where),
    ]);
    return respData({
      items: (items as AiTask[]).map(taskView),
      total: Number(totals[0]?.n || 0),
    });
  } catch {
    return respErr('Unable to load your videos', { status: 500 });
  }
}

export const Route = createFileRoute('/api/rumpelstiltskin/videos')({
  server: { handlers: { GET } },
});
