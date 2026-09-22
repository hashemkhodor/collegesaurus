import {useCallback, useEffect, useRef, useState} from 'react';

/**
 * Dot pagination for a scroll-snap strip.
 *
 * Page count is measured after mount, so the server and the first client render
 * agree on markup and the row keeps its height either way. Position comes from
 * an IntersectionObserver and scrolling is relative, which keeps the maths the
 * same whichever sign a browser gives scrollLeft in a right-to-left page.
 */
export function useSnapCarousel(count: number) {
  const trackRef = useRef<HTMLUListElement>(null);
  const perPageRef = useRef(1);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(0);

  const measure = useCallback(() => {
    const track = trackRef.current;
    const first = track?.firstElementChild;
    if (!track || !first) {
      return;
    }
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = first.getBoundingClientRect().width + gap;
    const perPage = Math.max(1, Math.round(track.clientWidth / step));
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

  const goToPage = useCallback((target: number) => {
    const track = trackRef.current;
    const item = track?.children[target * perPageRef.current];
    if (!track || !item) {
      return;
    }
    const trackBox = track.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === 'rtl';
    // Marked straight away so the dot responds to the click even before the
    // observer catches up with the scroll.
    setPage(target);
    track.scrollBy({
      left: rtl ? itemBox.right - trackBox.right : itemBox.left - trackBox.left,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, []);

  return {trackRef, pages, page, goToPage};
}
