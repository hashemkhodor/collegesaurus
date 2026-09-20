/**
 * Show the year a page's content is actually from, not the version it was
 * published into.
 *
 * A slug with no folder for the newest year is carried forward, so its page
 * lives in the new version while its figures are older. Docusaurus labels the
 * badge from version metadata, which would then claim the new year over old
 * tuition — contradicting the staleness banner right below it.
 *
 * The pipeline writes the true year into `content_year` frontmatter, and this
 * prefers it. Pages that are genuinely up to date have content_year equal to
 * their version, so nothing changes for them.
 *
 * It also renders whenever a page has a content_year, where Docusaurus would
 * hide the badge for a section that only has one version. Here the badge means
 * "which academic year is this from", which is worth saying even when there is
 * nothing to switch to — scholarships have one year while universities have
 * two, and the reader still wants the year on both.
 */
import type {ReactNode} from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc, useDocsVersion} from '@docusaurus/plugin-content-docs/client';

type Props = {className?: string};

export default function DocVersionBadge({className}: Props): ReactNode {
  const versionMetadata = useDocsVersion();
  const {frontMatter} = useDoc() as {frontMatter: {content_year?: string}};
  const contentYear = frontMatter.content_year;

  if (!versionMetadata.badge && !contentYear) {
    return null;
  }

  const versionLabel = contentYear ?? versionMetadata.label;
  const isStale = contentYear != null && contentYear !== versionMetadata.label;

  return (
    <span
      className={clsx(
        className,
        ThemeClassNames.docs.docVersionBadge,
        'badge',
        isStale ? 'docVersionBadge--stale' : 'badge--secondary',
      )}
      title={
        isStale
          ? `Content from ${contentYear}; not yet updated for ${versionMetadata.label}`
          : undefined
      }>
      <Translate
        id="theme.docs.versionBadge.label"
        values={{versionLabel}}>
        {'Version: {versionLabel}'}
      </Translate>
    </span>
  );
}
