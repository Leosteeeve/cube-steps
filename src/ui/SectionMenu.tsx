import { useEffect, useId, useRef, useState } from 'react';

export function SectionMenu({
  label,
  items,
  currentHref,
}: {
  label: string;
  items: readonly { label: string; href: string }[];
  currentHref: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const isCurrent = (href: string) => currentHref === href || currentHref.startsWith(href + '/');
  useEffect(() => setOpen(false), [currentHref]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  return (
    <div
      className="section-menu"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={trigger}
        aria-expanded={open}
        aria-controls={id}
        data-current={items.some(({ href }) => isCurrent(href)) || undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <span aria-hidden="true" className="section-menu-chevron">
          ⌄
        </span>
      </button>
      <div className="section-menu-panel" id={id} hidden={!open}>
        {items.map(({ label: itemLabel, href }) => (
          <a
            key={href}
            href={href}
            aria-current={isCurrent(href) ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            {itemLabel}
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}
