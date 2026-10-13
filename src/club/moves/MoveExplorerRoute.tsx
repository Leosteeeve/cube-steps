import { Component, lazy, Suspense, type ReactNode } from 'react';
import type { CubeEngine } from '../../core/types';
const Page = lazy(() =>
  import('./MoveExplorerPage').then((module) => ({ default: module.MoveExplorerPage })),
);
class MoveExplorerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="loading-panel" role="alert">
          <h1>The move explorer could not load.</h1>
          <p>
            Your lessons and practice records are safe. Check your connection, then reload this page
            to fetch a fresh copy.
          </p>
          <button type="button" onClick={() => location.reload()}>
            Reload move explorer
          </button>
          <p>
            <a href="#/">Back home</a> · <a href="#/learn/notation">Read the notation lesson</a>
          </p>
        </section>
      );
    return this.props.children;
  }
}
export function MoveExplorerRoute({ engine }: { engine: CubeEngine }) {
  return (
    <MoveExplorerBoundary>
      <Suspense
        fallback={
          <p role="status" className="loading-panel">
            Loading the move explorer…
          </p>
        }
      >
        <Page engine={engine} />
      </Suspense>
    </MoveExplorerBoundary>
  );
}
