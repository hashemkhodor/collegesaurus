import {useEffect, useRef} from 'react';

/**
 * Drifts the universities strip sideways, slowly and without stopping.
 *
 * The list is rendered twice, so when the first copy has passed, the scroll
 * position jumps back by exactly one copy's width onto identical content and
 * nothing appears to happen. Scrolling natively rather than transforming keeps
 * the strip swipeable, and keeps the bleed, fade and keyboard focus behaviour
 * that the card already has.
 *
 * It yields to the reader: no drift at all under prefers-reduced-motion, none
 * while a mouse is over it, while focus is inside it, or while the tab is
 * hidden, and a touch, drag or wheel quiets it for a few seconds so it never
 * fights the hand that is scrolling.
 */

/** Pixels per second. Slow enough to read a card as it passes. */
const SPEED = 22;

/** How long a touch, drag or wheel keeps the strip still afterwards. */
const RESUME_AFTER_MS = 6000;

export function useMarquee(count: number) {
  const trackRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || count === 0) {
      return undefined;
    }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let hovering = false;
    let focused = false;
    let quietUntil = 0;
    let frame = 0;
    let last = 0;
    // Carries the sub-pixel remainder, without which 22px/s at 60fps floors to
    // zero every frame and the strip never moves.
    let offset = 0;

    const onEnter = (event: PointerEvent) => {
      hovering = event.pointerType === 'mouse';
    };
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        hovering = false;
      }
    };
    const onFocusIn = () => {
      focused = true;
    };
    const onFocusOut = () => {
      focused = false;
    };
    const defer = () => {
      quietUntil = Date.now() + RESUME_AFTER_MS;
      offset = track.scrollLeft;
    };

    /** Width of one copy of the list, including the gap that follows it. */
    const copyWidth = () => {
      const first = track.children[0] as HTMLElement | undefined;
      const duplicate = track.children[count] as HTMLElement | undefined;
      return first && duplicate ? duplicate.offsetLeft - first.offsetLeft : 0;
    };

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const elapsed = last ? now - last : 0;
      last = now;

      if (
        hovering ||
        focused ||
        document.hidden ||
        motion.matches ||
        Date.now() < quietUntil
      ) {
        offset = track.scrollLeft;
        return;
      }

      const span = copyWidth();
      if (span <= 0) {
        return;
      }
      const rtl = getComputedStyle(track).direction === 'rtl';
      const distance = (SPEED * Math.min(elapsed, 100)) / 1000;
      offset += rtl ? -distance : distance;
      // Past one whole copy, hop back onto the identical card behind it.
      if (offset >= span) {
        offset -= span;
      } else if (offset <= -span) {
        offset += span;
      }
      track.scrollLeft = offset;
    };

    frame = requestAnimationFrame(step);
    track.addEventListener('pointerenter', onEnter);
    track.addEventListener('pointerleave', onLeave);
    track.addEventListener('focusin', onFocusIn);
    track.addEventListener('focusout', onFocusOut);
    track.addEventListener('pointerdown', defer);
    track.addEventListener('touchmove', defer, {passive: true});
    track.addEventListener('wheel', defer, {passive: true});

    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener('pointerenter', onEnter);
      track.removeEventListener('pointerleave', onLeave);
      track.removeEventListener('focusin', onFocusIn);
      track.removeEventListener('focusout', onFocusOut);
      track.removeEventListener('pointerdown', defer);
      track.removeEventListener('touchmove', defer);
      track.removeEventListener('wheel', defer);
    };
  }, [count]);

  return trackRef;
}
