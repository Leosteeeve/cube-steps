import React from 'react';
import { createRoot } from 'react-dom/client';
import { createLabClient } from '../../src/lab/client';
import { loadLabContext } from '../../src/workers/lab-request';
import { prepareLabInput } from '../../src/lab/input';
import { createLabPlayback } from '../../src/lab/playback';
import { LabPlayer } from '../../src/club/lab/LabPlayer';
import '../../src/styles.css';
const root = createRoot(document.getElementById('root')!);
const input = { kind: 'scramble' as const, moves: ['R', 'U', 'F2', 'L', 'D2', 'B', 'R2'] as const };
const client = createLabClient();
let loaded = false;
client.subscribe(() => {
  const checked = client.snapshot().routes[0];
  if (!checked || loaded) return;
  loaded = true;
  client.stop();
  void loadLabContext()
    .then((context) => {
      const prepared = createLabPlayback(context, prepareLabInput(context.engine, input), checked);
      Object.assign(window, {
        labFixture: {
          moves: prepared.timeline.moves,
          states: prepared.timeline.states,
          actions: prepared.timeline.actions,
          boundaries: checked.route.boundaries,
        },
      });
      root.render(
        <main style={{ maxWidth: 1100, margin: 'auto', padding: 16 }}>
          <LabPlayer engine={context.engine} prepared={prepared} route={checked} />
        </main>,
      );
      client.dispose();
    })
    .catch((error) => root.render(<p role="alert">{String(error)}</p>));
});
root.render(<p role="status">Preparing Lab playback fixture…</p>);
client.analyze(input, { allowedColors: ['red'], modelVersion: 'lab-execution-v1' });
