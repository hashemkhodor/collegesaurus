/**
 * Docusaurus's Logo with the text title swapped for the two-tone Wordmark.
 */
import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useThemeConfig} from '@docusaurus/theme-common';
import ThemedImage from '@theme/ThemedImage';
import type {Props} from '@theme/Logo';
import Wordmark from '@site/src/components/Wordmark';

export default function Logo(props: Props): ReactNode {
  const {
    navbar: {logo},
  } = useThemeConfig();
  const {imageClassName, titleClassName, ...rest} = props;
  const sources = {
    light: useBaseUrl(logo?.src ?? ''),
    dark: useBaseUrl(logo?.srcDark ?? logo?.src ?? ''),
  };
  return (
    <Link to={useBaseUrl(logo?.href ?? '/')} {...rest}>
      {logo && (
        <div className={imageClassName}>
          <ThemedImage sources={sources} alt="" width={logo.width} height={logo.height} />
        </div>
      )}
      <Wordmark className={titleClassName} />
    </Link>
  );
}
