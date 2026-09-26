import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
  translateTagsPageTitle,
} from '@docusaurus/theme-common';
import SearchMetadata from '@theme/SearchMetadata';
import type {Props} from '@theme/BlogTagsListPage';
import StoriesPage, {TopicChips} from '@site/src/components/Stories/StoriesPage';

export default function BlogTagsListPage({tags}: Props): ReactNode {
  const title = translateTagsPageTitle();
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogTagsListPage,
      )}>
      <PageMetadata title={title} />
      <SearchMetadata tag="blog_tags_list" />
      <StoriesPage
        eyebrow={<Translate id="stories.hero.eyebrow">Stories</Translate>}
        title={title}>
        <TopicChips
          tags={[...tags].sort((a, b) => a.label.localeCompare(b.label))}
          label={translate({
            id: 'stories.topics.label',
            message: 'Browse stories by topic',
          })}
        />
      </StoriesPage>
    </HtmlClassNameProvider>
  );
}
