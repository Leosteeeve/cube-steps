import type { MouseEvent } from 'react';

type Visit = {
  item: string;
  isList: (url: string) => boolean;
  opened: boolean;
  offset: number;
  clear: () => void;
};

// Only a direct list → detail → list trip can restore a link. Opening another tab leaves this one alone.
let visit: Visit | undefined;

function remember(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  visit?.clear();
  const link = event.currentTarget;
  const item = link.href,
    list = location.href;
  const canonical = new URL(item);
  canonical.hash = link.hash.split('/').slice(0, 2).join('/');
  const isList = (url: string) => url === list || url === canonical.href;
  function changed({ oldURL, newURL }: HashChangeEvent) {
    if (!visit) return;
    if (isList(oldURL) && newURL === item) visit.opened = true;
    else if (oldURL !== item || !isList(newURL)) visit.clear();
  }
  visit = {
    item,
    isList,
    offset: link.getBoundingClientRect().top,
    opened: false,
    clear() {
      window.removeEventListener('hashchange', changed);
      visit = undefined;
    },
  };
  window.addEventListener('hashchange', changed);
}

function restore(link: HTMLAnchorElement | null) {
  if (!link || !visit?.opened || !visit.isList(location.href) || visit.item !== link.href) return;
  const offset = Math.min(Math.max(visit.offset, 0), innerHeight - link.offsetHeight);
  visit.clear();
  link.focus({ preventScroll: true });
  window.scrollBy({ top: link.getBoundingClientRect().top - offset, behavior: 'instant' });
}

export function CatalogCaseLink({
  href,
  name,
  label,
}: {
  href: string;
  name: string;
  label: string;
}) {
  return (
    <a href={href} aria-label={name} onClick={remember} ref={restore}>
      {label} <span aria-hidden="true">→</span>
    </a>
  );
}
