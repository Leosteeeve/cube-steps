import { createCubeEngine } from '../core/cube';
import { handleSolveMessage } from './solve-request';
import type { WorkerReply } from './solve-protocol';
self.onmessage = async (event: MessageEvent<unknown>) => {
  try {
    const engine = await createCubeEngine();
    const reply = await handleSolveMessage(engine, event.data);
    if (reply) self.postMessage(reply);
  } catch (error) {
    const request = event.data;
    if (
      !request ||
      typeof request !== 'object' ||
      !('requestId' in request) ||
      typeof request.requestId !== 'number' ||
      !Number.isSafeInteger(request.requestId) ||
      request.requestId < 0
    )
      return;
    const reply: WorkerReply = {
      requestId: request.requestId,
      result: {
        ok: false,
        error: {
          kind: 'solver',
          message: `No verified solution was produced: ${error instanceof Error ? error.message : 'Unexpected solver error.'}`,
        },
      },
    };
    self.postMessage(reply);
  }
};
