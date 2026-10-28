import { useEffect, useRef, type HTMLAttributes } from 'react';
import { useMotion } from '../../ui/motion';

export function SectionReveal({
  as: Element = 'div',
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' }) {
  const ref = useRef<HTMLElement>(null),
    seen = useRef(false);
  const { enabled } = useMotion();
  useEffect(() => {
    const element = ref.current;
    if (
      !enabled ||
      !element ||
      seen.current ||
      typeof IntersectionObserver !== 'function' ||
      typeof element.animate !== 'function'
    )
      return;
    // Never hide content while waiting for JS, fonts, or an observer callback.
    // Content already reached on arrival / history restoration stays still.
    if (element.getBoundingClientRect().top < window.innerHeight) {
      seen.current = true;
      return;
    }
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.target === element && e.isIntersecting)) return;
        seen.current = true;
        observer.disconnect();
        animation = element.animate(
          [
            { opacity: 0.6, transform: 'translateY(14px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      },
      { threshold: 0, rootMargin: '0px 0px -24px 0px' },
    );
    const focus = () => {
      seen.current = true;
      observer.disconnect();
      animation?.cancel();
    };
    observer.observe(element);
    element.addEventListener('focusin', focus);
    return () => {
      observer.disconnect();
      element.removeEventListener('focusin', focus);
      animation?.cancel();
    };
  }, [enabled]);
  return (
    <Element
      ref={ref as React.Ref<HTMLDivElement>}
      className={`club-reveal ${className}`}
      {...props}
    />
  );
}
