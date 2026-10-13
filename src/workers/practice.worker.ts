import { createCubeEngine } from '../core/cube';
import { handlePracticeRequest } from './practice-request';
import { isPracticeRequest, type PracticeReply } from './practice-protocol';
self.onmessage = async ({ data }: MessageEvent<unknown>) => {
  if (!isPracticeRequest(data)) return;
  try {
    const reply = handlePracticeRequest(await createCubeEngine(), data);
    if (reply) self.postMessage(reply);
  } catch (e) {
    const reply: PracticeReply = {
      requestId: data.requestId,
      caseId: data.caseId,
      fixtureId: data.fixtureId,
      variantId: data.variantId,
      result: {
        ok: false,
        message: e instanceof Error ? e.message : 'The exercise worker could not start.',
      },
    };
    self.postMessage(reply);
  }
};
