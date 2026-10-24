import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const base = new URL('../../src/methods/roux-advanced/data/', import.meta.url),
  verify = process.argv.includes('--verify');
const hash = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createCubeEngine } = await server.ssrLoadModule('/src/core/cube.ts');
  const { blockTargets } = await server.ssrLoadModule('/src/methods/roux/predicates.ts');
  const { EDGE_SLOTS, CORNER_SLOTS } = await server.ssrLoadModule('/src/core/observations.ts');
  const engine = await createCubeEngine();
  const targetPieces = blockTargets(engine, 'left');
  const alphabet = [
    'U',
    'D',
    'L',
    'R',
    'F',
    'B',
    'M',
    'E',
    'S',
    'Uw',
    'Dw',
    'Lw',
    'Rw',
    'Fw',
    'Bw',
  ].flatMap((b) => ['', "'", '2'].map((s) => b + s));
  const effects = {
    version: 1,
    edgeTargets: targetPieces
      .filter((p: { id: string }) => p.id.length === 2)
      .map((p: { id: string }) => EDGE_SLOTS.indexOf(p.id)),
    cornerTargets: targetPieces
      .filter((p: { id: string }) => p.id.length === 3)
      .map((p: { id: string }) => CORNER_SLOTS.indexOf(p.id)),
    moves: alphabet.map((move) => {
      const state = engine.apply(engine.solved(), [move]);
      return { move, EDGES: state.data.EDGES, CORNERS: state.data.CORNERS };
    }),
  };
  const effectText = JSON.stringify(effects, null, 2) + '\n';
  await mkdir(base, { recursive: true });
  if (verify) {
    if ((await readFile(new URL('move-effects.json', base), 'utf8')) !== effectText)
      throw Error('Stale Roux move effects.');
  } else await writeFile(new URL('move-effects.json', base), effectText);
  const { buildBlockTransitions, readFirstBlockCoordinate, BLOCK_COORDINATES, CORNER_COORDINATES } =
    await server.ssrLoadModule('/src/methods/roux-advanced/blocks/coordinates.ts');
  const { ROUX_FRAMES } = await server.ssrLoadModule('/src/methods/roux-advanced/frames.ts');
  const frame = ROUX_FRAMES.find((f: { id: string }) => f.id === 'white-blue');
  const goal = readFirstBlockCoordinate(
    engine,
    engine.apply(engine.solved(), frame.positioningMoves),
    frame,
  );
  const { edges, corners } = buildBlockTransitions(),
    distances = new Uint8Array(BLOCK_COORDINATES).fill(255),
    queue = new Uint32Array(BLOCK_COORDINATES);
  let tail = 1,
    maximum = 0;
  queue[0] = goal;
  distances[goal] = 0;
  for (let head = 0; head < tail; head++) {
    const index = queue[head],
      ed = Math.floor(index / CORNER_COORDINATES) * 45,
      co = (index % CORNER_COORDINATES) * 45,
      d = distances[index] + 1;
    for (let m = 0; m < 45; m++) {
      const next = edges[ed + m] * CORNER_COORDINATES + corners[co + m];
      if (distances[next] !== 255) continue;
      distances[next] = d;
      queue[tail++] = next;
      maximum = Math.max(maximum, d);
    }
  }
  if (tail !== BLOCK_COORDINATES) throw Error(`Incomplete block projection: ${tail}`);
  const manifest = {
    schema: 1,
    coordinateVersion: 1,
    moveSetVersion: 'roux-stm-v1',
    file: 'block-distance.bin',
    bytes: distances.length,
    sha256: hash(distances),
    moveEffectsSha256: hash(effectText),
    goalIndex: goal,
    reachable: tail,
    maximum,
  };
  const text = JSON.stringify(manifest, null, 2) + '\n';
  if (verify) {
    if (
      !Buffer.from(distances).equals(await readFile(new URL('block-distance.bin', base))) ||
      (await readFile(new URL('manifest.json', base), 'utf8')) !== text
    )
      throw Error('Stale Roux block distance artifact.');
  } else {
    await writeFile(new URL('block-distance.bin', base), distances);
    await writeFile(new URL('manifest.json', base), text);
  }
  console.log(JSON.stringify(manifest));
} finally {
  await server.close();
}
