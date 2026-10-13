import type { CrossTable } from './cross/table';
import { loadCrossTable } from './cross/load';
export interface AdvancedAssets {
  crossTable: CrossTable;
}
export async function loadAdvancedAssets(
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<AdvancedAssets> {
  return { crossTable: await loadCrossTable(fetcher, signal) };
}
