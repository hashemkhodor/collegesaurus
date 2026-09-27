import type {ReactNode} from 'react';
import {IconChip} from '@site/src/components/Homepage/ui';
import SidebarTile from '@site/src/theme/DocSidebarItem/Link/Tile';
import type {Result} from './engine';

/** The mark a student already knows from the sidebar: a university's logo, a scholarship's initials. */
export default function ResultTile({result}: {result: Result}): ReactNode {
  if (result.type === 'university' || result.type === 'scholarship') {
    const slug = result.path.split('/').filter(Boolean).pop() ?? '';
    return <SidebarTile slug={slug} label={result.title} />;
  }
  return (
    <span aria-hidden="true">
      <IconChip icon={result.type === 'story' ? 'bookOpen' : 'book'} tint="orange" size={32} shape="square" />
    </span>
  );
}
