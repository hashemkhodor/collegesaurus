import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {UNIVERSITY_LOGOS} from '@site/src/data/homepage/logos';

export default function SidebarTile({slug, label}: {slug: string; label: string}): ReactNode {
  const logo = UNIVERSITY_LOGOS[slug];
  const src = useBaseUrl(logo ? `/img/universities/${logo.file}` : '/');
  if (!logo) {
    return (
      <span className="menu-tile menu-tile-initials" aria-hidden="true">
        {label.trim().slice(0, 2)}
      </span>
    );
  }
  return (
    <span className={`menu-tile${logo.tone === 'dark' ? ' tone-dark' : ''}`} aria-hidden="true">
      <img src={src} alt="" loading="lazy" />
    </span>
  );
}
