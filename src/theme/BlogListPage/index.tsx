import React, {type ReactNode} from 'react';
import clsx from 'clsx';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate, {translate} from '@docusaurus/Translate';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import BlogListPaginator from '@theme/BlogListPaginator';
import SearchMetadata from '@theme/SearchMetadata';
import type {Props} from '@theme/BlogListPage';
import BlogListPageStructuredData from '@theme/BlogListPage/StructuredData';
import Heading from '@theme/Heading';
import StoryCard from '@site/src/components/Stories/StoryCard';
import ui from '@site/src/components/Homepage/ui/ui.module.css';

import styles from './styles.module.css';

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

function uniqueTags(items: Props['items']) {
  const seen = new Map<string, {label: string; permalink: string}>();
  for (const {content} of items) {
    for (const tag of content.metadata.tags) seen.set(tag.permalink, tag);
  }
  return [...seen.values()];
}

function BlogListPageContent(props: Props): ReactNode {
  const {metadata, items} = props;
  const tags = uniqueTags(items);
  return (
    <Layout>
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.container}>
            <p className={clsx(ui.eyebrow, styles.eyebrow)}>
              <Translate id="stories.hero.eyebrow">Stories</Translate>
            </p>
            <Heading as="h1" className={styles.title}>
              {metadata.blogTitle}
            </Heading>
            <p className={styles.lead}>
              <Translate id="stories.hero.lead">
                Real experiences from students who went through admissions,
                scholarships and grad school in Lebanon and abroad.
              </Translate>
            </p>
            {tags.length > 0 && (
              <nav
                className={styles.tags}
                aria-label={translate({
                  id: 'stories.topics.label',
                  message: 'Browse stories by topic',
                })}>
                {tags.map((tag) => (
                  <Link key={tag.permalink} className={styles.tag} to={tag.permalink}>
                    {tag.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </header>
        <div className={styles.container}>
          <ul className={styles.grid}>
            {items.map(({content}) => (
              <StoryCard
                key={content.metadata.permalink}
                metadata={content.metadata}
                image={content.frontMatter.image}
              />
            ))}
          </ul>
          <BlogListPaginator metadata={metadata} />
        </div>
      </main>
    </Layout>
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
