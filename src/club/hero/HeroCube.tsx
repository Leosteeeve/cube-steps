import { useEffect, useRef, useState } from 'react';
import { useMotion } from '../../ui/motion';
import { useSystemReducedMotion } from '../../ui/use-system-reduced-motion';
import { buildHeroMesh, projectHeroFaces, sampleHeroPose } from './geometry';
import fallback from './hero-static.svg';
import './hero.css';
const mesh = buildHeroMesh();

export function HeroCube() {
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const [paused, setPaused] = useState(false),
    [inView, setInView] = useState(() => typeof IntersectionObserver !== 'function'),
    [failed, setFailed] = useState(false);
  const motion = useMotion(),
    reduced = useSystemReducedMotion();
  const allowed = motion.preference !== 'off' && !reduced;
  useEffect(() => {
    const element = container.current;
    if (!element || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver((entries) =>
      setInView(entries.some((entry) => entry.isIntersecting)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = canvas.current;
    if (!element || failed) return;
    let frame = 0,
      last: number | undefined,
      disposed = false;
    if (!allowed) elapsed.current = 0;
    const draw = () => {
      try {
        const context = element.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        const size = element.getBoundingClientRect().width || 400;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        element.width = Math.round(size * ratio);
        element.height = element.width;
        context.setTransform(element.width, 0, 0, element.height, 0, 0);
        context.clearRect(0, 0, 1, 1);
        for (const face of projectHeroFaces(mesh, sampleHeroPose(elapsed.current))) {
          context.beginPath();
          context.moveTo(...face.points[0]);
          face.points.slice(1).forEach((point) => context.lineTo(...point));
          context.closePath();
          context.fillStyle = face.fill;
          context.fill();
        }
        return true;
      } catch {
        if (!disposed) setFailed(true);
        return false;
      }
    };
    const tick = (now: number) => {
      if (disposed) return;
      if (last !== undefined) elapsed.current += Math.max(0, now - last);
      last = now;
      if (draw()) frame = requestAnimationFrame(tick);
    };
    const ready = draw();
    const observer =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            if (!disposed) draw();
          })
        : null;
    observer?.observe(element);
    if (ready && allowed && motion.enabled && !paused && inView)
      frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [allowed, motion.enabled, paused, inView, failed]);
  return (
    <div className="club-hero-art hero-motion" ref={container}>
      <div className="hero-illustration" aria-hidden="true">
        <div className="club-orbit" />
        {failed ? (
          <img className="hero-canvas" src={fallback} alt="" />
        ) : (
          <canvas className="hero-canvas" ref={canvas} />
        )}
        <span className="club-art-note club-note-top">
          <small>A LITTLE CURIOSITY</small>
          <strong>A whole new skill.</strong>
        </span>
        <span className="club-art-note club-note-bottom">
          <small>YOUR FIRST MILESTONE</small>
          <strong>✦ Build a white daisy</strong>
        </span>
      </div>
      <div className="hero-motion-control">
        {!allowed ? (
          <span>
            {reduced ? 'Following your reduced-motion setting.' : 'Decorative motion is off.'}
          </span>
        ) : failed ? (
          <span>Static illustration</span>
        ) : (
          <button type="button" onClick={() => setPaused((value) => !value)}>
            {paused ? 'Play motion' : 'Pause motion'}
          </button>
        )}
      </div>
    </div>
  );
}
