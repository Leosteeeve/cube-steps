export type Vec3 = readonly [number, number, number];
export interface HeroFace {
  id: string;
  cubie: Vec3;
  vertices: readonly Vec3[];
  fill: string;
}
export interface HeroPose {
  upperAngle: number;
  latitude: number;
  longitude: number;
}
export interface ProjectedHeroFace {
  id: string;
  points: readonly (readonly [number, number])[];
  fill: string;
  depth: number;
}
const dot = (a: Vec3, b: Vec3) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function buildHeroMesh(): readonly HeroFace[] {
  const faces: HeroFace[] = [];
  for (const x of [-1, 0, 1])
    for (const y of [-1, 0, 1])
      for (const z of [-1, 0, 1]) {
        const cubie: Vec3 = [x, y, z];
        for (const axis of [0, 1, 2])
          for (const sign of [-1, 1]) {
            const normal = [0, 0, 0];
            normal[axis] = sign;
            const u: Vec3 = axis === 0 ? [0, 0, -sign] : axis === 1 ? [1, 0, 0] : [sign, 0, 0];
            const v: Vec3 = axis === 1 ? [0, 0, -sign] : [0, 1, 0];
            const add = (sticker: boolean) => {
              const half = sticker ? 0.41 : 0.48,
                offset = sticker ? 0.485 : 0.48;
              const vertices = [
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1],
              ].map(
                ([a, b]) =>
                  cubie.map(
                    (n, i) => n + normal[i] * offset + u[i] * a * half + v[i] * b * half,
                  ) as unknown as Vec3,
              );
              const fill = !sticker
                ? '#0b2c51'
                : axis === 1 && sign === 1
                  ? '#f8fbff'
                  : axis === 0
                    ? '#1c5093'
                    : '#2c6aca';
              faces.push({
                id: `${x},${y},${z}-${axis},${sign}-${sticker ? 'sticker' : 'body'}`,
                cubie,
                vertices,
                fill,
              });
            };
            add(false);
            if (cubie[axis] === sign) add(true);
          }
      }
  return faces;
}

export function sampleHeroPose(elapsedMs: number): HeroPose {
  const t = ((elapsedMs % 12000) + 12000) % 12000;
  const ease = (value: number) => (1 - Math.cos(Math.PI * value)) / 2;
  const turn =
    t < 2000
      ? 0
      : t < 4000
        ? ease((t - 2000) / 2000)
        : t < 5000
          ? 1
          : t < 7000
            ? 1 - ease((t - 5000) / 2000)
            : 0;
  const rock = Math.sin((t / 12000) * Math.PI * 2);
  return {
    upperAngle: turn === 0 ? 0 : (-turn * Math.PI) / 2,
    latitude: 0.5 + rock * 0.025,
    longitude: 0.66 + rock * 0.045,
  };
}

export function projectHeroFaces(
  mesh: readonly HeroFace[],
  pose: HeroPose,
): readonly ProjectedHeroFace[] {
  const { latitude: lat, longitude: lon, upperAngle } = pose;
  const right: Vec3 = [Math.cos(lon), 0, -Math.sin(lon)];
  const up: Vec3 = [-Math.sin(lat) * Math.sin(lon), Math.cos(lat), -Math.sin(lat) * Math.cos(lon)];
  const eye: Vec3 = [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
  return mesh
    .flatMap((face) => {
      const vertices = face.vertices.map((p): Vec3 =>
        face.cubie[1] === 1
          ? [
              p[0] * Math.cos(upperAngle) + p[2] * Math.sin(upperAngle),
              p[1],
              -p[0] * Math.sin(upperAngle) + p[2] * Math.cos(upperAngle),
            ]
          : p,
      );
      if (dot(cross(sub(vertices[1], vertices[0]), sub(vertices[2], vertices[1])), eye) <= 0)
        return [];
      return [
        {
          id: face.id,
          fill: face.fill,
          points: vertices.map((p): readonly [number, number] => [
            0.5 + dot(p, right) * 0.18,
            0.5 - dot(p, up) * 0.18,
          ]),
          depth: vertices.reduce((sum, p) => sum + dot(p, eye), 0) / 4,
        },
      ];
    })
    .sort((a, b) => a.depth - b.depth);
}
