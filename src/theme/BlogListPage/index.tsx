import React, {type ReactNode} from 'react';
import clsx from 'clsx';

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate, {translate} from '@docusaurus/Translate';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import SearchMetadata from '@theme/SearchMetadata';
import type {Props} from '@theme/BlogListPage';
import BlogListPageStructuredData from '@theme/BlogListPage/StructuredData';
import StoriesPage, {
  StoryGrid,
  TopicChips,
} from '@site/src/components/Stories/StoriesPage';

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

export default function BlogListPage(props: Props): ReactNode {
  const {metadata, items} = props;
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogListPage,
      )}>
      <BlogListPageMetadata {...props} />
      <BlogListPageStructuredData {...props} />
      <StoriesPage
        eyebrow={<Translate id="stories.hero.eyebrow">Stories</Translate>}
        title={metadata.blogTitle}
        lead={
          <Translate id="stories.hero.lead">
            Real experiences from students who went through admissions,
            scholarships and grad school in Lebanon and abroad.
          </Translate>
        }
        hero={
          <TopicChips
            tags={uniqueTags(items)}
            label={translate({
              id: 'stories.topics.label',
              message: 'Browse stories by topic',
            })}
          />
        }>
        <StoryGrid items={items} listMetadata={metadata} />
      </StoriesPage>
    </HtmlClassNameProvider>
  );
}
