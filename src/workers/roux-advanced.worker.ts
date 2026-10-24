import { handleRouxAdvancedRequest } from './roux-advanced-request';
import { isRouxRequest } from './roux-advanced-protocol';
let generation = 0,
  requestId = -1;
self.onmessage = ({ data }: MessageEvent<unknown>) => {
  if (!isRouxRequest(data)) return;
  if (data.kind === 'cancel') {
    if (data.requestId === requestId) generation++;
    return;
  }
  const current = ++generation;
  requestId = data.requestId;
  void handleRouxAdvancedRequest(data, {
    cancelled: () => generation !== current,
    emit: (reply) => {
      if (current === generation) self.postMessage(reply);
    },
  });
};
