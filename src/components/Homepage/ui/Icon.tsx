import type {ReactNode} from 'react';

/**
 * Hand-drawn icon set for the site: one 24x24 stroke grid, so the glyphs stay
 * consistent at chip sizes. Drawn here rather than pulled from an icon package,
 * which would mean a dependency in the shared node_modules.
 */
const PATHS = {
  arrowRight: (
    <>
      <line x1="4" y1="12" x2="19" y2="12" />
      <polyline points="13,6 19,12 13,18" />
    </>
  ),
  arrowUpRight: (
    <>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="8,7 17,7 17,16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  check: <polyline points="5,13 10,18 19,6" />,
  university: (
    <>
      <polyline points="3,10 12,4 21,10" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="6" y1="10" x2="6" y2="17" />
      <line x1="10" y1="10" x2="10" y2="17" />
      <line x1="14" y1="10" x2="14" y2="17" />
      <line x1="18" y1="10" x2="18" y2="17" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </>
  ),
  cap: (
    <>
      <polygon points="12,5 22,9.5 12,14 2,9.5" />
      <path d="M6 11.3v4.4c0 1.6 2.7 2.8 6 2.8s6-1.2 6-2.8v-4.4" />
      <line x1="21" y1="10" x2="21" y2="15" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
      <line x1="5" y1="19.5" x2="19" y2="19.5" />
      <line x1="9" y1="7" x2="15" y2="7" />
    </>
  ),
  bookOpen: (
    <>
      <path d="M12 7c-1.8-1.6-4-2.3-7-2v13c3-.3 5.2.4 7 2 1.8-1.6 4-2.3 7-2V5c-3-.3-5.2.4-7 2z" />
      <line x1="12" y1="7" x2="12" y2="20" />
    </>
  ),
  star: (
    <polygon points="12,3.5 14.6,9 20.5,9.8 16.2,13.9 17.3,19.8 12,17 6.7,19.8 7.8,13.9 3.5,9.8 9.4,9" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <line x1="3.2" y1="9.5" x2="20.8" y2="9.5" />
      <line x1="3.2" y1="14.5" x2="20.8" y2="14.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
      <line x1="8.5" y1="3" x2="8.5" y2="7" />
      <line x1="15.5" y1="3" x2="15.5" y2="7" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 3l7.5 2.8v5.9c0 4.2-3 7.5-7.5 9.3-4.5-1.8-7.5-5.1-7.5-9.3V5.8z" />
      <polyline points="8.6,12 11,14.4 15.6,9.8" />
    </>
  ),
  layers: (
    <>
      <polygon points="12,3 21,7.5 12,12 3,7.5" />
      <polyline points="3,12.5 12,17 21,12.5" />
      <polyline points="3,16.5 12,21 21,16.5" />
    </>
  ),
  heart: (
    <path d="M12 20.5C6.5 17 3.5 13.9 3.5 10.3A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 8.5 2.3c0 3.6-3 6.7-8.5 10.2z" />
  ),
  unlock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 6.8-1.2" />
      <line x1="12" y1="14.5" x2="12" y2="17" />
    </>
  ),
  code: (
    <>
      <polyline points="8.5,8 4,12 8.5,16" />
      <polyline points="15.5,8 20,12 15.5,16" />
      <line x1="13.4" y1="5.5" x2="10.6" y2="18.5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 4.1v2M12 17.9v2M4.1 12h2M17.9 12h2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M17.6 6.4l-1.4 1.4M6.4 17.6l1.4-1.4" />
    </>
  ),
  medicine: (
    <>
      <rect x="9.5" y="3.5" width="5" height="17" rx="2.5" />
      <rect x="3.5" y="9.5" width="17" height="5" rx="2.5" />
    </>
  ),
  pulse: (
    <>
      <path d="M12 20.5c-5.5-3.5-8.5-6.6-8.5-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 8.5 2.3c0 3.6-3 6.7-8.5 10.2z" />
      <polyline points="5.5,12.4 9,12.4 10.6,9.8 13,15 14.5,12.4 18.5,12.4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7" />
      <line x1="3" y1="13" x2="21" y2="13" />
    </>
  ),
  scales: (
    <>
      <line x1="12" y1="4.5" x2="12" y2="20" />
      <line x1="7" y1="20" x2="17" y2="20" />
      <line x1="4" y1="8" x2="20" y2="8" />
      <polyline points="1.8,14 4,8 6.2,14" />
      <polyline points="17.8,14 20,8 22.2,14" />
      <path d="M1.8 14a2.2 2.2 0 0 0 4.4 0M17.8 14a2.2 2.2 0 0 0 4.4 0" />
    </>
  ),
  compass: (
    <>
      <polyline points="4,20 12,3.5 20,20" />
      <line x1="4" y1="20" x2="20" y2="20" />
      <line x1="8.2" y1="11.5" x2="15.8" y2="11.5" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-.9 2-1.8 0-1.3-1-1.7-1-2.7 0-.8.7-1.5 1.5-1.5h1.8a4.2 4.2 0 0 0 4.2-4.2C20.5 6.4 16.7 3.5 12 3.5z" />
      <circle cx="8" cy="9" r="1.1" />
      <circle cx="12.5" cy="7.3" r="1.1" />
      <circle cx="7.2" cy="14" r="1.1" />
    </>
  ),
  psi: (
    <>
      <path d="M6.5 5.5v4.2a5.5 5.5 0 0 0 11 0V5.5" />
      <line x1="12" y1="5.5" x2="12" y2="20" />
      <line x1="8.5" y1="20" x2="15.5" y2="20" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <polyline points="4.5,7.5 12,13 19.5,7.5" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.5" y="6.5" width="17" height="13" rx="2.5" />
      <path d="M20.5 11h-4a1.5 1.5 0 0 0 0 3h4" />
      <path d="M6 6.5l9.5-3 1 3" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z" />
      <line x1="9" y1="8.5" x2="15" y2="8.5" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </>
  ),
  chevronDown: <polyline points="6,9 12,15 18,9" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.8" r="0.5" fill="currentColor" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 21.5 20h-19z" />
      <line x1="12" y1="10" x2="12" y2="14.5" />
      <circle cx="12" cy="17.3" r="0.5" fill="currentColor" />
    </>
  ),
  rss: (
    <>
      <circle cx="5.5" cy="18.5" r="1" />
      <path d="M5 11.5a7.5 7.5 0 0 1 7.5 7.5" />
      <path d="M5 5a14 14 0 0 1 14 14" />
    </>
  ),
  // GitHub's own mark, unmodified: Primer Octicons mark-github-24 (MIT, GitHub Inc.).
  github: (
    <g transform="translate(3 3) scale(0.75)" fill="currentColor" stroke="none">
      <path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943" />
    </g>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

type Props = {
  name: IconName;
  size?: number;
  className?: string;
};

export default function Icon({name, size = 20, className}: Props): ReactNode {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false">
      {PATHS[name]}
    </svg>
  );
}
