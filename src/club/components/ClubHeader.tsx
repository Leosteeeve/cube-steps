import { ClubLogo } from './ClubLogo';
export function ClubHeader({
  active,
  timerAvailable,
}: {
  active: 'home' | 'moves' | 'learn' | 'timer' | 'guide';
  timerAvailable: boolean;
}) {
  return (
    <header className="club-header">
      <a href="#/" aria-label="Webb Cubing Club home">
        <ClubLogo />
      </a>
      <nav aria-label="Main navigation">
        <a href="#/" aria-current={active === 'home' ? 'page' : undefined}>
          Home
        </a>
        <a href="#/moves" aria-current={active === 'moves' ? 'page' : undefined}>
          Moves
        </a>
        <a href="#/learn/notation" aria-current={active === 'learn' ? 'page' : undefined}>
          Learn
        </a>
        {timerAvailable && (
          <a href="#/timer" aria-current={active === 'timer' ? 'page' : undefined}>
            Timer <span aria-hidden="true">↗</span>
          </a>
        )}
        <a href="#/guide" aria-current={active === 'guide' ? 'page' : undefined}>
          Guide
        </a>
      </nav>
    </header>
  );
}
