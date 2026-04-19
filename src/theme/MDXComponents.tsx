/**
 * Re-export the default theme MDX components and register our site-wide
 * custom components so MDX files can use them without an explicit import.
 * Docs: https://docusaurus.io/docs/markdown-features/react#mdx-component-scope
 */
import MDXComponents from '@theme-original/MDXComponents';
import ApplyButton from '@site/src/components/ApplyButton';

export default {
  ...MDXComponents,
  ApplyButton,
};
