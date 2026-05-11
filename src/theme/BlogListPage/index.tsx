import React, {type ReactNode} from 'react';
import clsx from 'clsx';

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import BlogLayout from '@theme/BlogLayout';
import BlogListPaginator from '@theme/BlogListPaginator';
import SearchMetadata from '@theme/SearchMetadata';
import type {Props} from '@theme/BlogListPage';
import BlogPostItems from '@theme/BlogPostItems';
import BlogListPageStructuredData from '@theme/BlogListPage/StructuredData';
import Heading from '@theme/Heading';

type BlogItem = Props['items'][number];

const BLOG_BASE_MARKER = '/stories/';

function groupKeyFor(permalink: string): string {
  const idx = permalink.lastIndexOf(BLOG_BASE_MARKER);
  if (idx === -1) return 'other';
  const after = permalink.slice(idx + BLOG_BASE_MARKER.length);
  const segments = after.split('/').filter(Boolean);
  if (segments.length === 0) return 'other';
  return segments[0];
}

function groupItemsBySlugPrefix(items: Props['items']): [string, BlogItem[]][] {
  const groups = new Map<string, BlogItem[]>();
  for (const item of items) {
    const key = groupKeyFor(item.content.metadata.permalink);
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

function BlogListPageMetadata(props: Props): ReactNode {
  const {metadata} = props;
  const {
    siteConfig: {title: siteTitle},
  } = useDocusaurusContext();
  const {blogDescription, blogTitle, permalink} = metadata;
  const isBlogOnlyMode = permalink === '/';
  const title = isBlogOnlyMode ? siteTitle : blogTitle;
  return (
    <>
      <PageMetadata title={title} description={blogDescription} />
      <SearchMetadata tag="blog_posts_list" />
    </>
  );
}

function BlogListPageContent(props: Props): ReactNode {
  const {metadata, items, sidebar} = props;
  const groups = groupItemsBySlugPrefix(items);
  return (
    <BlogLayout sidebar={sidebar}>
      {groups.map(([label, groupItems]) => (
        <section key={label}>
          <Heading as="h2">{label}</Heading>
          <BlogPostItems items={groupItems} />
        </section>
      ))}
      <BlogListPaginator metadata={metadata} />
    </BlogLayout>
  );
}

export default function BlogListPage(props: Props): ReactNode {
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogListPage,
      )}>
      <BlogListPageMetadata {...props} />
      <BlogListPageStructuredData {...props} />
      <BlogListPageContent {...props} />
    </HtmlClassNameProvider>
  );
}
