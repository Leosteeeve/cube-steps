export interface CubeViewPreferences {
  version: 1;
  background: 'dark' | 'light';
  showNet: boolean;
  showBackFaces: boolean;
}
const key = 'cubesteps.cube-view.v1';
const defaults = (): CubeViewPreferences => ({
  version: 1,
  background: 'dark',
  showNet: false,
  showBackFaces: false,
});
function valid(value: unknown): value is CubeViewPreferences {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<CubeViewPreferences>;
  return (
    p.version === 1 &&
    (p.background === 'dark' || p.background === 'light') &&
    typeof p.showNet === 'boolean' &&
    typeof p.showBackFaces === 'boolean'
  );
}
export function createCubeViewStore(storage: () => Storage) {
  return {
    load(): CubeViewPreferences {
      try {
        const raw: unknown = JSON.parse(storage().getItem(key) ?? 'null');
        if (valid(raw))
          return {
            version: 1,
            background: raw.background,
            showNet: raw.showNet,
            showBackFaces: raw.showBackFaces,
          };
      } catch {
        /* A blocked store does not prevent cube playback. */
      }
      return defaults();
    },
    save(value: CubeViewPreferences): boolean {
      if (!valid(value)) return false;
      try {
        storage().setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}
