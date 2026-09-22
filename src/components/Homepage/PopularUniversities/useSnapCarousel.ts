import {useCallback, useEffect, useRef, useState} from 'react';

/**
 * Dot pagination for a scroll-snap strip.
 *
 * Page count is measured after mount, so the server and the first client render
 * agree on markup and the row keeps its height either way. Position comes from
 * an IntersectionObserver and scrolling is relative, which keeps the maths the
 * same whichever sign a browser gives scrollLeft in a right-to-left page.
 *
 * The strip also advances on its own; see the effect at the bottom for when it
 * does not.
 */

/** Long enough to read a card before the next one arrives. */
const ADVANCE_MS = 5000;

export function useSnapCarousel(count: number) {
  const trackRef = useRef<HTMLUListElement>(null);
  const perPageRef = useRef(1);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(0);
  const [stopped, setStopped] = useState(false);
  // The timer reads these without re-arming itself on every page change.
  const pageRef = useRef(0);
  const pagesRef = useRef(0);
  pageRef.current = page;
  pagesRef.current = pages;

  const measure = useCallback(() => {
    const track = trackRef.current;
    const first = track?.firstElementChild;
    if (!track || !first) {
      return;
    }
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap) || 0;
    const step = first.getBoundingClientRect().width + gap;
    // clientWidth includes the track's own padding, which is the bleed zone a
    // card only peeks into, so a page counts whole cards between the edges.
    const visible =
      track.clientWidth -
      (parseFloat(style.paddingLeft) || 0) -
      (parseFloat(style.paddingRight) || 0);
    const perPage = Math.max(1, Math.floor((visible + gap) / step));
    perPageRef.current = perPage;
    setPages(Math.ceil(count / perPage));
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return undefined;
    }
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(track);

    const visible = new Set<number>();
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (entry.isIntersecting) {
            visible.add(index);
          } else {
            visible.delete(index);
          }
        }
        if (visible.size > 0) {
          setPage(Math.floor(Math.min(...visible) / perPageRef.current));
        }
      },
      {root: track, threshold: 0.6},
    );
    for (const item of track.children) {
      intersectionObserver.observe(item);
    }

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [count, measure]);

  const scrollToPage = useCallback((target: number) => {
    const track = trackRef.current;
    const item = track?.children[target * perPageRef.current];
    if (!track || !item) {
      return;
    }
    const trackBox = track.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    const style = getComputedStyle(track);
    const rtl = style.direction === 'rtl';
    // Land the card against the content edge, inside the bleed padding.
    const inset = parseFloat(style.paddingLeft) || 0;
    // Marked straight away so the dot responds to the click even before the
    // observer catches up with the scroll.
    setPage(target);
    track.scrollBy({
      left: rtl
        ? itemBox.right - (trackBox.right - inset)
        : itemBox.left - (trackBox.left + inset),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, []);

  /**
   * The strip advances on its own so the row does not look frozen, but it is
   * a courtesy, not a carousel that demands attention: it never starts when
   * the visitor asked for reduced motion, it holds while a pointer is over it
   * or focus is inside it, and the first deliberate interaction ends it for
   * good rather than fighting the person scrolling.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track || pages <= 1 || stopped) {
      return undefined;
    }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) {
      return undefined;
    }

    let held = false;
    const hold = () => {
      held = true;
    };
    const release = () => {
      held = false;
    };
    const stop = () => setStopped(true);

    const timer = window.setInterval(() => {
      if (held || document.hidden) {
        return;
      }
      scrollToPage((pageRef.current + 1) % pagesRef.current);
    }, ADVANCE_MS);

    track.addEventListener('pointerenter', hold);
    track.addEventListener('pointerleave', release);
    track.addEventListener('focusin', hold);
    track.addEventListener('focusout', release);
    track.addEventListener('pointerdown', stop);
    track.addEventListener('keydown', stop);
    track.addEventListener('wheel', stop, {passive: true});
    motion.addEventListener('change', stop);

    return () => {
      window.clearInterval(timer);
      track.removeEventListener('pointerenter', hold);
      track.removeEventListener('pointerleave', release);
      track.removeEventListener('focusin', hold);
      track.removeEventListener('focusout', release);
      track.removeEventListener('pointerdown', stop);
      track.removeEventListener('keydown', stop);
      track.removeEventListener('wheel', stop);
      motion.removeEventListener('change', stop);
    };
  }, [pages, stopped, scrollToPage]);

  /** Clicking a dot is a deliberate choice, so the strip stops advancing. */
  const goToPage = useCallback(
    (target: number) => {
      setStopped(true);
      scrollToPage(target);
    },
    [scrollToPage],
  );

  return {trackRef, pages, page, goToPage};
}
