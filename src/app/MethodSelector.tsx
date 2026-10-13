import type { MethodId } from '../core/types';
import { getMethod } from '../methods/registry';
import { methodRoute } from './routes';
export function MethodSelector({ method, kind }: { method: MethodId; kind: 'learn' | 'solve' }) {
  return (
    <nav className="method-selector" aria-label="Teaching method">
      <span>Method</span>
      {(['lbl', 'cfop-beginner', 'cfop-advanced'] as const).map((id) => (
        <a key={id} href={methodRoute(id, kind)} aria-current={method === id ? 'page' : undefined}>
          {getMethod(id).label}
        </a>
      ))}
    </nav>
  );
}
