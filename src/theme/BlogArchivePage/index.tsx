import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {PageMetadata} from '@docusaurus/theme-common';
import {useDateTimeFormat} from '@docusaurus/theme-common/internal';
import Heading from '@theme/Heading';
import type {ArchiveBlogPost, Props} from '@theme/BlogArchivePage';
import ui from '@site/src/components/Homepage/ui/ui.module.css';
import StoriesPage, {pageStyles} from '@site/src/components/Stories/StoriesPage';

function listPostsByYear(posts: readonly ArchiveBlogPost[]) {
  const sorted = [...posts].sort((a, b) =>
    b.metadata.date.localeCompare(a.metadata.date),
  );
  const byYear = new Map<string, ArchiveBlogPost[]>();
  for (const post of sorted) {
    const year = post.metadata.date.split('-')[0]!;
    byYear.set(year, [...(byYear.get(year) ?? []), post]);
  }
  return [...byYear];
}

export default function BlogArchive({archive}: Props): ReactNode {
  const title = translate({
    id: 'theme.blog.archive.title',
    message: 'Archive',
    description: 'The page & hero title of the blog archive page',
  });
  const dateFormat = useDateTimeFormat({
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  return (
    <>
      <PageMetadata title={title} />
      <StoriesPage
        eyebrow={<Translate id="stories.hero.eyebrow">Stories</Translate>}
        title={title}>
        <div className={pageStyles.years}>
          {listPostsByYear(archive.blogPosts).map(([year, posts]) => (
            <section key={year} className={ui.card}>
              <Heading as="h2" id={year} className={pageStyles.yearTitle}>
                {year}
              </Heading>
              <ul className={pageStyles.rows}>
                {posts.map((post) => (
                  <li key={post.metadata.permalink} className={pageStyles.row}>
                    <time
                      dateTime={post.metadata.date}
                      className={pageStyles.rowDate}>
                      {dateFormat.format(new Date(post.metadata.date))}
                    </time>
                    <Link
                      to={post.metadata.permalink}
                      className={clsx(pageStyles.rowLink)}>
                      {post.metadata.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </StoriesPage>
    </>
  );
}
