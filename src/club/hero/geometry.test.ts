import { describe, expect, it } from 'vitest';
import { buildHeroMesh, projectHeroFaces, sampleHeroPose } from './geometry';

describe('decorative cube geometry', () => {
  it('uses equal cubies and square stickers with a consistent inset', () => {
    const mesh = buildHeroMesh();
    const stickers = mesh.filter((face) => face.id.endsWith('-sticker'));
    expect(stickers).toHaveLength(54);
    expect(new Set(mesh.map((face) => face.id)).size).toBe(mesh.length);
    for (const face of mesh) {
      const lengths = face.vertices.map((p, i) =>
        Math.hypot(...p.map((v, axis) => v - face.vertices[(i + 1) % 4][axis])),
      );
      for (const length of lengths) expect(length).toBeCloseTo(lengths[0]);
      expect(lengths[0]).toBeCloseTo(face.id.endsWith('-sticker') ? 0.82 : 0.96);
    }
  });
  it('returns exactly to the assembled pose after the reversible loop', () => {
    expect(sampleHeroPose(0).upperAngle).toBe(0);
    expect(Math.abs(sampleHeroPose(4500).upperAngle)).toBeCloseTo(Math.PI / 2);
    expect(sampleHeroPose(8000).upperAngle).toBe(0);
    expect(sampleHeroPose(12000)).toEqual(sampleHeroPose(0));
  });
  it('keeps stationary layers fixed while turning only the upper layer', () => {
    const mesh = buildHeroMesh().filter((face) => face.cubie[1] !== 1);
    const pose = sampleHeroPose(0);
    expect(projectHeroFaces(mesh, { ...pose, upperAngle: Math.PI / 4 })).toEqual(
      projectHeroFaces(mesh, pose),
    );
    const upper = buildHeroMesh().filter((face) => face.cubie[1] === 1);
    expect(projectHeroFaces(upper, { ...pose, upperAngle: Math.PI / 4 })).not.toEqual(
      projectHeroFaces(upper, pose),
    );
  });
  it('preserves faces and fits a common view throughout both turns', () => {
    const mesh = buildHeroMesh();
    for (let elapsed = 0; elapsed < 12000; elapsed += 125) {
      const faces = projectHeroFaces(mesh, sampleHeroPose(elapsed));
      expect(faces.length).toBeGreaterThan(27);
      expect(faces.map((face) => face.depth)).toEqual(
        faces.map((face) => face.depth).sort((a, b) => a - b),
      );
      for (const face of faces)
        for (const point of face.points)
          for (const value of point) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThan(0);
            expect(value).toBeLessThan(1);
          }
    }
  });
});
