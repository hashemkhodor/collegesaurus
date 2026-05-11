import React, {memo, type ReactNode} from 'react';
import Heading from '@theme/Heading';
import type {Props} from '@theme/BlogSidebar/Content';

type SidebarItem = Props['items'][number];

const BLOG_BASE_MARKER = '/stories/';

function groupKeyFor(permalink: string): string {
  const idx = permalink.lastIndexOf(BLOG_BASE_MARKER);
  if (idx === -1) return 'other';
  const after = permalink.slice(idx + BLOG_BASE_MARKER.length);
  const segments = after.split('/').filter(Boolean);
  if (segments.length === 0) return 'other';
  return segments[0];
}

function groupItemsBySlugPrefix(
  items: Props['items'],
): [string, SidebarItem[]][] {
  const groups = new Map<string, SidebarItem[]>();
  for (const item of items) {
    const key = groupKeyFor(item.permalink);
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return [...groups.entries()].sort(([, a], [, b]) => {
    if (a.length === 1 && b.length !== 1) return -1;
    if (b.length === 1 && a.length !== 1) return 1;
    return 0;
  });
}

function BlogSidebarGroup({
  label,
  headingClassName,
  children,
}: {
  label: string;
  headingClassName?: string;
  children: ReactNode;
}) {
  return (
    <div role="group">
      <Heading as="h3" className={headingClassName}>
        {label}
      </Heading>
      {children}
    </div>
  );
}

function BlogSidebarContent({
  items,
  yearGroupHeadingClassName,
  ListComponent,
}: Props): ReactNode {
  const groups = groupItemsBySlugPrefix(items);
  return (
    <>
      {groups.map(([label, groupItems]) => (
        <BlogSidebarGroup
          key={label}
          label={label}
          headingClassName={yearGroupHeadingClassName}>
          <ListComponent items={groupItems} />
        </BlogSidebarGroup>
      ))}
    </>
  );
}

export default memo(BlogSidebarContent);
