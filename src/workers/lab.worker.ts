import { handleLabRequest } from './lab-request';
let generation = 0;
self.onmessage = ({ data }: MessageEvent<unknown>) => {
  const token = ++generation;
  if (data && typeof data === 'object' && 'kind' in data && data.kind === 'cancel') return;
  void handleLabRequest(data, {
    cancelled: () => token !== generation,
    emit: (reply) => {
      if (token === generation) self.postMessage(reply);
    },
  });
};
