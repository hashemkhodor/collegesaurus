import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

/**
 * Interim hero illustration: a flat campus scene built from the brand colours,
 * with the existing dino logo as the mascot. Decorative, so it is hidden from
 * assistive tech and the headline carries the meaning.
 *
 * A commissioned mascot replaces this file's contents with a <picture>; nothing
 * else on the page depends on what is inside the frame.
 */
export default function HeroArt(): ReactNode {
  return (
    <div className={styles.art} aria-hidden="true">
      <svg
        className={styles.scene}
        viewBox="0 0 480 340"
        role="presentation"
        focusable="false">
        <defs>
          <linearGradient id="csSky" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="var(--cs-blue-soft)" />
            <stop offset="100%" stopColor="var(--cs-green-soft)" />
          </linearGradient>
          <linearGradient id="csMedallion" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="var(--cs-green-soft)" />
            <stop offset="100%" stopColor="var(--cs-surface)" />
          </linearGradient>
        </defs>

        <rect x="24" y="16" width="432" height="300" rx="44" fill="url(#csSky)" />

        <g fill="var(--cs-surface)" opacity="0.85">
          <ellipse cx="118" cy="74" rx="34" ry="17" />
          <ellipse cx="146" cy="66" rx="24" ry="14" />
          <ellipse cx="364" cy="108" rx="28" ry="14" />
          <ellipse cx="388" cy="100" rx="20" ry="11" />
        </g>

        {/* Campus building */}
        <g
          fill="var(--cs-surface)"
          stroke="var(--cs-divider)"
          strokeWidth="2">
          <polygon points="236,96 340,140 132,140" />
          <rect x="146" y="140" width="180" height="104" />
          <rect x="128" y="244" width="216" height="14" rx="4" />
        </g>
        <g fill="var(--cs-bg-soft)">
          <rect x="166" y="156" width="18" height="76" rx="9" />
          <rect x="204" y="156" width="18" height="76" rx="9" />
          <rect x="242" y="156" width="18" height="76" rx="9" />
          <rect x="280" y="156" width="18" height="76" rx="9" />
        </g>

        {/* Flagpole with a simplified Lebanese flag */}
        <line
          x1="236"
          y1="52"
          x2="236"
          y2="96"
          stroke="var(--cs-ink-subtle)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g>
          <rect x="238" y="52" width="46" height="10" fill="#d7263d" />
          <rect x="238" y="62" width="46" height="12" fill="var(--cs-surface)" />
          <rect x="238" y="74" width="46" height="10" fill="#d7263d" />
          <polygon points="261,63 268,73 254,73" fill="var(--cs-brand)" />
        </g>

        {/* Trees */}
        <g fill="var(--cs-brand)" opacity="0.85">
          <ellipse cx="96" cy="222" rx="26" ry="32" />
          <ellipse cx="392" cy="216" rx="22" ry="28" />
        </g>
        <g stroke="var(--cs-brand-strong)" strokeWidth="5" strokeLinecap="round">
          <line x1="96" y1="244" x2="96" y2="258" />
          <line x1="392" y1="240" x2="392" y2="254" />
        </g>

        <circle
          cx="140"
          cy="212"
          r="62"
          fill="url(#csMedallion)"
          stroke="var(--cs-divider)"
          strokeWidth="2"
        />
      </svg>

      <img
        className={styles.mascot}
        src={useBaseUrl('/img/logo.svg')}
        alt=""
        width={128}
        height={128}
      />
    </div>
  );
}
