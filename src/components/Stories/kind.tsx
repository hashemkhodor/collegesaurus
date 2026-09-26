import type {ReactNode} from 'react';
import Translate from '@docusaurus/Translate';

/** The folder a story lives in under stories/, read from its permalink. */
export function storyKind(permalink: string): ReactNode {
  const segments = permalink.split('/stories/').pop()?.split('/').filter(Boolean) ?? [];
  if (segments.length < 2) return null;
  switch (segments[0]) {
    case 'contributors':
      return <Translate id="stories.kind.contributor">Contributor</Translate>;
    case 'scholarship-awardees':
      return (
        <Translate id="stories.kind.awardee">Scholarship awardee</Translate>
      );
    default:
      return null;
  }
}
