import { MotionPreference } from '../../ui/motion';
export function ClubFooter() {
  return (
    <footer className="club-footer">
      <div className="club-footer-about">
        <strong>Webb Cubing Club</strong>
        <p>Learn a move. Share what clicks.</p>
        <p className="club-toolkit-context">
          Our learning tools run on CubeSteps, the open-source cubing toolkit.
        </p>
        <a href={import.meta.env.BASE_URL}>Explore CubeSteps ↗</a>
      </div>
      <div className="club-footer-links">
        <a href="#/guide">Website guide</a>
        <a href="https://github.com/Leosteeeve/cube-steps">Open source</a>
        <a href={import.meta.env.BASE_URL + 'THIRD_PARTY_NOTICES.md'}>Third-party notices</a>
      </div>
      <MotionPreference />
    </footer>
  );
}
