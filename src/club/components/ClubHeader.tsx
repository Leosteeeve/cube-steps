import { ClubLogo } from './ClubLogo';
import { SectionMenu } from '../../ui/SectionMenu';
export function ClubHeader({
  active,
  timerAvailable,
}: {
  active: 'home' | 'moves' | 'learn' | 'timer' | 'guide' | 'lab';
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
        <a href="#/learn/notation" aria-current={active === 'learn' ? 'page' : undefined}>
          Learn
        </a>
        <SectionMenu
          label="Practice"
          currentHref={location.hash}
          items={[
            { label: 'Moves', href: '#/moves' },
            ...(timerAvailable ? [{ label: 'Timer', href: '#/timer' }] : []),
            { label: 'Algorithm library', href: '#/algorithms' },
            { label: 'Recognition practice', href: '#/practice' },
            { label: 'CMLL library', href: '#/cmll' },
            { label: 'CMLL practice', href: '#/cmll-practice' },
          ]}
        />
        <SectionMenu
          label="Labs"
          currentHref={location.hash}
          items={[
            { label: 'CFOP Lab', href: '#/lab' },
            { label: 'Roux Test Lab', href: '#/roux-lab' },
          ]}
        />
        <a href="#/guide" aria-current={active === 'guide' ? 'page' : undefined}>
          Guide
        </a>
      </nav>
    </header>
  );
}
