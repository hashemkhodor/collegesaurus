import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import {useBlogTagsPostsPageTitle} from '@docusaurus/theme-common/internal';
import SearchMetadata from '@theme/SearchMetadata';
import Unlisted from '@theme/ContentVisibility/Unlisted';
import type {Props} from '@theme/BlogTagsPostsPage';
import {ArrowLink} from '@site/src/components/Homepage/ui';
import StoriesPage, {StoryGrid} from '@site/src/components/Stories/StoriesPage';

export default function BlogTagsPostsPage(props: Props): ReactNode {
  const {tag, items, listMetadata} = props;
  const title = useBlogTagsPostsPageTitle(tag);
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogTagPostListPage,
      )}>
      <PageMetadata title={title} description={tag.description} />
      <SearchMetadata tag="blog_tags_posts" />
      <StoriesPage
        eyebrow={<Translate id="stories.tag.eyebrow">Topic</Translate>}
        title={title}
        lead={tag.description}
        hero={
          <>
            {tag.unlisted && <Unlisted />}
            <ArrowLink to={tag.allTagsPath}>
              <Translate id="stories.tag.all">All topics</Translate>
            </ArrowLink>
          </>
        }>
        <StoryGrid items={items} listMetadata={listMetadata} />
      </StoriesPage>
    </HtmlClassNameProvider>
  );
}
