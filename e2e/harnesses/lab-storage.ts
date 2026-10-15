import { createLabClient } from '../../src/lab/client';
import { createExperiment } from '../../src/lab/experiments/snapshots';
export async function storageFixture() {
  const client = createLabClient();
  let complete = false;
  return new Promise<ReturnType<typeof createExperiment>>((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.dispose();
      reject(Error('Fixture timed out'));
    }, 30000);
    client.subscribe(() => {
      if (complete) return;
      const s = client.snapshot();
      if (s.routes.length >= 2) {
        complete = true;
        clearTimeout(timeout);
        client.stop();
        const ready = client.snapshot();
        resolve(
          createExperiment(
            ready,
            ready.routes.slice(0, 2).map((r) => r.route.id),
            'Example storage fixture',
          ),
        );
        client.dispose();
      } else if (s.phase === 'error') {
        complete = true;
        clearTimeout(timeout);
        client.dispose();
        reject(Error(s.issue?.message));
      }
    });
    client.analyze(
      { kind: 'scramble', moves: ['R', 'U', 'F2', 'L', 'D2', 'B', 'R2'] },
      { allowedColors: ['white', 'yellow'], modelVersion: 'lab-execution-v1' },
    );
  });
}
