export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type FaceMove = `${Face}${'' | "'" | '2'}`;
export type TeachingMove = FaceMove | `${'x' | 'y' | 'z'}${'' | "'" | '2'}`;
export type Color = 'white' | 'yellow' | 'green' | 'blue' | 'red' | 'orange';
export interface CubeState { data: Record<string, {pieces: number[]; orientation: number[]; orientationMod?: number[]}> }
export interface PieceObservation { id: string; slot: string; stickers: Partial<Record<Face, Color>> }
export interface CubeObservation { centers: Record<Face,Color>; edges: PieceObservation[]; corners: PieceObservation[] }
export interface CubeEngine {
  solved(): CubeState;
  apply(state: CubeState, moves: readonly TeachingMove[]): CubeState;
  observe(state: CubeState): CubeObservation;
  isSolved(state: CubeState): boolean;
  equals(a: CubeState, b: CubeState): boolean;
}
