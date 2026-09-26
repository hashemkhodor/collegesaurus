import {useEffect, useRef, type RefObject} from 'react';

/** How far a finger has to travel sideways, in CSS pixels, to turn the month. */
const MIN_DISTANCE = 48;

/**
 * Turns a sideways swipe on `ref` into `onSwipe(1)` for the next month and
 * `onSwipe(-1)` for the previous one. The next month lies to the left in a
 * left-to-right page and to the right in Arabic. Touch and pen only: a mouse
 * has the buttons. The element sets `touch-action: pan-y`, so vertical
 * scrolling stays with the browser, which cancels the gesture.
 */
export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  onSwipe: (direction: 1 | -1) => void,
): void {
  const latest = useRef(onSwipe);
  useEffect(() => {
    latest.current = onSwipe;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }
    let start: {x: number; y: number; id: number} | null = null;

    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        start = {x: event.clientX, y: event.clientY, id: event.pointerId};
      }
    };
    const up = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) {
        return;
      }
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < 1.5 * Math.abs(dy)) {
        return;
      }
      const rtl = getComputedStyle(element).direction === 'rtl';
      latest.current(dx < 0 !== rtl ? 1 : -1);
    };
    const cancel = () => {
      start = null;
    };

    element.addEventListener('pointerdown', down);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', cancel);
    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', cancel);
    };
  }, [ref]);
}
