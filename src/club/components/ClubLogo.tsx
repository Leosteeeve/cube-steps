import mark from '../assets/mark.svg';
import mono from '../assets/mark-mono.svg';
export function ClubLogo({
  compact = false,
  monochrome = false,
}: {
  compact?: boolean;
  monochrome?: boolean;
}) {
  return (
    <span className="club-logo">
      <img src={monochrome ? mono : mark} alt="" width="36" height="42" />
      {!compact && (
        <span>
          <strong>Webb</strong>
          <small>CUBING CLUB</small>
        </span>
      )}
    </span>
  );
}
