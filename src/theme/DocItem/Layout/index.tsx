/**
 * Wraps Docusaurus' default DocItem Layout so we can mount the floating
 * Apply button on any doc whose frontmatter carries `apply_url`.
 *
 * University pages get the Guidebook instead: no TOC column (the Guidebook
 * draws its own rail), no floating button (Apply sits in the header, the chips
 * and the rail), and no version badge (the header shows the year).
 *
 * Swizzle pattern: https://docusaurus.io/docs/swizzling#wrapper-your-site-with-root
 */
import type {ReactNode} from 'react';
import Layout from '@theme-original/DocItem/Layout';
import {useActivePlugin, useDoc} from '@docusaurus/plugin-content-docs/client';
import ContentVisibility from '@theme/ContentVisibility';
import DocVersionBanner from '@theme/DocVersionBanner';
import DocItemContent from '@theme/DocItem/Content';
import DocItemFooter from '@theme/DocItem/Footer';
import DocItemPaginator from '@theme/DocItem/Paginator';
import FloatingApplyButton from '@site/src/components/FloatingApplyButton';

type FrontMatterWithApplyUrl = {
  apply_url?: string;
  apply_label?: string;
};

type LayoutProps = {children: ReactNode};

function GuidebookLayout({children}: LayoutProps): ReactNode {
  const {metadata} = useDoc();
  return (
    <div className="row">
      <div className="col">
        <ContentVisibility metadata={metadata} />
        <DocVersionBanner />
        <div className="guidebook-doc">
          <article>
            <DocItemContent>{children}</DocItemContent>
            <DocItemFooter />
          </article>
          <DocItemPaginator />
        </div>
      </div>
    </div>
  );
}

export default function LayoutWrapper(props: LayoutProps): ReactNode {
  const {frontMatter} = useDoc();
  const plugin = useActivePlugin({failfast: false});
  if (plugin?.pluginId === 'universities') {
    return <GuidebookLayout>{props.children}</GuidebookLayout>;
  }
  const {apply_url: applyUrl, apply_label: applyLabel} =
    (frontMatter as FrontMatterWithApplyUrl) ?? {};
  return (
    <>
      <Layout>{props.children}</Layout>
      {applyUrl ? (
        <FloatingApplyButton href={applyUrl} label={applyLabel} />
      ) : null}
    </>
  );
}
