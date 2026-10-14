import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GuideScreenshot } from './types';
export function GuideImage({ image }: { image: GuideScreenshot }) {
  const [open, setOpen] = useState(false),
    [failed, setFailed] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null),
    close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const prior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        close.current?.focus();
      }
    };
    document.addEventListener('keydown', keys, true);
    return () => {
      document.removeEventListener('keydown', keys, true);
      document.body.style.overflow = prior;
      trigger.current?.focus();
    };
  }, [open]);
  const src = import.meta.env.BASE_URL + image.src;
  return (
    <figure className="guide-image">
      {failed ? (
        <p className="guide-image-failed">
          Screenshot unavailable. Follow the written steps and caption.
        </p>
      ) : (
        <button
          ref={trigger}
          className="guide-image-button"
          aria-label={`Enlarge: ${image.caption}`}
          onClick={() => setOpen(true)}
        >
          <img
            src={src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading="lazy"
            onError={() => setFailed(true)}
          />
          <span>Enlarge screenshot ↗</span>
        </button>
      )}
      <figcaption>{image.caption}</figcaption>
      {open &&
        createPortal(
          <div
            className="guide-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={image.caption}
          >
            <button ref={close} onClick={() => setOpen(false)}>
              Close image
            </button>
            <img
              src={src}
              alt={image.alt}
              onError={() => {
                setFailed(true);
                setOpen(false);
              }}
            />
            <p>{image.caption}</p>
          </div>,
          document.body,
        )}
    </figure>
  );
}
