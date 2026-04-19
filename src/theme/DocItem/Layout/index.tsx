/**
 * Wraps Docusaurus' default DocItem Layout so we can mount the floating
 * Apply button on any doc whose frontmatter carries `apply_url`. All other
 * pages render unchanged.
 *
 * Swizzle pattern: https://docusaurus.io/docs/swizzling#wrapper-your-site-with-root
 */
import type {ReactNode} from 'react';
import Layout from '@theme-original/DocItem/Layout';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import FloatingApplyButton from '@site/src/components/FloatingApplyButton';

type FrontMatterWithApplyUrl = {
  apply_url?: string;
  apply_label?: string;
};

type LayoutProps = {children: ReactNode};

export default function LayoutWrapper(props: LayoutProps): ReactNode {
  const {frontMatter} = useDoc();
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
