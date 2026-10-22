import type { MethodId } from '../core/types';
import { getMethodInfo as getMethod } from '../methods/info';
import { availableMethods } from '../methods/availability';
import { useEdition } from './edition';
import { methodRoute } from './routes';
export function MethodSelector({ method, kind }: { method: MethodId; kind: 'learn' | 'solve' }) {
  const edition = useEdition();
  return (
    <nav className="method-selector" aria-label="Teaching method">
      <span>Method</span>
      {availableMethods(edition).map((id) => (
        <a key={id} href={methodRoute(id, kind)} aria-current={method === id ? 'page' : undefined}>
          {getMethod(id).label}
        </a>
      ))}
    </nav>
  );
}
