import { MotionPreference } from '../../ui/motion';
export function ClubFooter() {
  return (
    <footer className="club-footer">
      <MotionPreference />
      <span>Webb Cubing Club</span>
      <a href="#/guide">Website guide</a>
      <span>
        Built for curious minds. Powered by <a href={import.meta.env.BASE_URL}>CubeSteps</a>.
      </span>
      <span>
        <a href="https://github.com/Leosteeeve/cube-steps">Open source</a> ·{' '}
        <a href={import.meta.env.BASE_URL + 'THIRD_PARTY_NOTICES.md'}>Third-party notices</a>
      </span>
    </footer>
  );
}
