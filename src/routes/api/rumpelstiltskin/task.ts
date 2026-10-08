import { createFileRoute } from '@tanstack/react-router';

import { AIMediaType, FalProvider } from '@/core/ai';
import { getAuth } from '@/core/auth';
import { RUMPELSTILTSKIN_MODEL } from '@/config/rumpelstiltskin';
import { AITaskStatus, findTask, updateTask } from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { respData, respErr } from '@/lib/resp';

import { isStudioTask, taskView } from './-shared';

async function GET({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id || id.length > 100)
      return respErr('Task id is required', { status: 400 });
    const task = await findTask(id);
    if (!task || !isStudioTask(task, session.user.id))
      return respErr('Task not found', { status: 404 });
    if (!['pending', 'processing'].includes(task.status) || !task.taskId)
      return respData(taskView(task));
    const configs = await getAllConfigs();
    if (!configs.fal_api_key?.trim())
      return respErr('Generation provider is temporarily unavailable', {
        status: 503,
      });
    const provider = new FalProvider({ apiKey: configs.fal_api_key });
    try {
      const result = await provider.query({
        taskId: task.taskId,
        model: RUMPELSTILTSKIN_MODEL,
        mediaType: AIMediaType.VIDEO,
      });
      // Fal can return COMPLETED with an explicit failure payload.
      const status = result.taskResult?.error
        ? AITaskStatus.FAILED
        : (result.taskStatus as unknown as AITaskStatus);
      await updateTask({
        taskId: task.id,
        status,
        taskResult: result.taskResult,
      });
      return respData(
        taskView({
          ...task,
          status,
          taskResult: JSON.stringify(result.taskResult),
        })
      );
    } catch (error) {
      // A 422 result is a rejected generation. Network errors and other HTTP
      // failures remain retryable and must not refund an in-flight paid job.
      if (
        error instanceof Error &&
        error.message === 'request failed with status: 422'
      ) {
        await updateTask({
          taskId: task.id,
          status: AITaskStatus.FAILED,
          taskResult: { error: 'Generation rejected' },
        });
        return respData(taskView({ ...task, status: AITaskStatus.FAILED }));
      }
      return respErr('Unable to check video status. Please retry shortly.', {
        status: 503,
      });
    }
  } catch {
    return respErr('Unable to load video task', { status: 500 });
  }
}

export const Route = createFileRoute('/api/rumpelstiltskin/task')({
  server: { handlers: { GET } },
});
