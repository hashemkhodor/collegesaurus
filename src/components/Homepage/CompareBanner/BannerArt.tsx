import type {ReactNode} from 'react';
import styles from './styles.module.css';

/** Decorative: a checklist and a chart on a platform, in the banner palette. */
export default function BannerArt(): ReactNode {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 420 260"
      aria-hidden="true"
      focusable="false">
      <ellipse cx="210" cy="222" rx="170" ry="30" fill="#6D5AE6" opacity="0.4" />

      <g>
        <rect
          x="72"
          y="46"
          width="168"
          height="150"
          rx="18"
          fill="#EEEBFF"
          opacity="0.95"
        />
        {[0, 1, 2].map((row) => (
          <g key={row}>
            <rect
              x="94"
              y={78 + row * 38}
              width="88"
              height="12"
              rx="6"
              fill="#B9B1E8"
            />
            <circle cx="208" cy={84 + row * 38} r="13" fill="#4ADE80" />
            <path
              d={`M202 ${84 + row * 38} l4 4 8 -8`}
              fill="none"
              stroke="#173826"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </g>

      <g>
        <rect x="256" y="150" width="34" height="52" rx="8" fill="#8B7CF6" />
        <rect x="298" y="112" width="34" height="90" rx="8" fill="#F5A524" />
        <rect x="340" y="72" width="34" height="130" rx="8" fill="#4ADE80" />
      </g>

      <g fill="#C9C3F0" opacity="0.7">
        <circle cx="48" cy="86" r="6" />
        <circle cx="386" cy="42" r="5" />
        <circle cx="64" cy="176" r="4" />
      </g>
    </svg>
  );
}
