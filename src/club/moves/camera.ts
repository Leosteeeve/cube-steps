import type { Face } from '../../core/types';
import type { NotationEntry } from './catalog';
export type NotationCameraMode = 'holding' | 'direction';
export interface NotationCameraPreset {
  latitude: number;
  longitude: number;
  referenceFace: Face;
}
export function notationCamera(
  entry: NotationEntry,
  mode: NotationCameraMode,
): NotationCameraPreset {
  const referenceFace = entry.referenceFace;
  if (mode === 'holding') return { latitude: 28, longitude: 32, referenceFace };
  const straight: Record<Face, [number, number]> = {
    U: [90, 0],
    D: [-90, 0],
    L: [0, -90],
    R: [0, 90],
    F: [0, 0],
    B: [0, 180],
  };
  const oblique: Record<Face, [number, number]> = {
    U: [38, 32],
    D: [-28, 35],
    L: [25, -55],
    R: [25, 55],
    F: [25, 35],
    B: [25, 145],
  };
  const [latitude, longitude] = (entry.family === 'face' ? straight : oblique)[referenceFace];
  return { latitude, longitude, referenceFace };
}
