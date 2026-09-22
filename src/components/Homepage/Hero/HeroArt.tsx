import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

/**
 * Interim hero illustration: a calm campus scene drawn from the design tokens,
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
          <linearGradient id="csSky" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor="var(--cs-blue-soft)" />
            <stop offset="100%" stopColor="var(--cs-bg)" />
          </linearGradient>
          <linearGradient id="csStone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cs-surface)" />
            <stop offset="100%" stopColor="var(--cs-bg-soft)" />
          </linearGradient>
          <radialGradient id="csGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="var(--cs-green-soft)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--cs-green-soft)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="csGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cs-green-soft)" />
            <stop offset="100%" stopColor="var(--cs-bg)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="16" y="12" width="448" height="308" rx="48" fill="url(#csSky)" />
        <circle cx="250" cy="170" r="150" fill="url(#csGlow)" />

        {/* Ground */}
        <ellipse cx="240" cy="266" rx="196" ry="46" fill="url(#csGround)" />

        <g fill="var(--cs-surface)" opacity="0.9">
          <ellipse cx="112" cy="78" rx="30" ry="15" />
          <ellipse cx="138" cy="71" rx="21" ry="12" />
          <ellipse cx="372" cy="104" rx="24" ry="12" />
          <ellipse cx="392" cy="98" rx="16" ry="9" />
        </g>

        {/* Building: pediment, cornice, columns on a stepped base */}
        <g>
          <ellipse cx="248" cy="258" rx="118" ry="16" fill="var(--cs-brand)" opacity="0.12" />
          <polygon points="248,92 352,142 144,142" fill="url(#csStone)" />
          <polygon points="248,104 330,143 166,143" fill="var(--cs-bg-soft)" opacity="0.7" />
          <rect x="140" y="142" width="216" height="12" rx="4" fill="var(--cs-surface)" />
          <rect x="152" y="154" width="192" height="82" fill="url(#csStone)" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} fill="var(--cs-surface)">
              <rect x={166 + i * 38} y="162" width="20" height="66" rx="3" />
              <rect x={162 + i * 38} y="158" width="28" height="6" rx="2" />
              <rect x={162 + i * 38} y="226" width="28" height="6" rx="2" />
            </g>
          ))}
          <g fill="var(--cs-bg-soft)">
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x={171 + i * 38} y="166" width="4" height="58" rx="2" opacity="0.8" />
            ))}
          </g>
          <rect x="140" y="236" width="216" height="10" rx="3" fill="var(--cs-surface)" />
          <rect x="128" y="246" width="240" height="10" rx="3" fill="var(--cs-bg-soft)" />
        </g>

        {/* Trees, kept clear of where the mascot stands */}
        <g>
          <ellipse cx="52" cy="252" rx="26" ry="8" fill="var(--cs-brand)" opacity="0.12" />
          <ellipse cx="52" cy="218" rx="26" ry="32" fill="var(--cs-brand)" opacity="0.9" />
          <ellipse cx="45" cy="209" rx="12" ry="16" fill="var(--cs-surface)" opacity="0.18" />
          <line
            x1="52"
            y1="242"
            x2="52"
            y2="254"
            stroke="var(--cs-brand-strong)"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>
        <g>
          <ellipse cx="398" cy="248" rx="24" ry="8" fill="var(--cs-brand)" opacity="0.12" />
          <ellipse cx="398" cy="218" rx="22" ry="27" fill="var(--cs-brand)" opacity="0.75" />
          <line
            x1="398"
            y1="238"
            x2="398"
            y2="250"
            stroke="var(--cs-brand-strong)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>

        {/* The mascot stands on the ground rather than floating in a badge;
            this shadow sits under where the image is placed. */}
        <ellipse cx="125" cy="268" rx="50" ry="12" fill="var(--cs-brand)" opacity="0.16" />
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
