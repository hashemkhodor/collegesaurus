/**
 * The search plugin ships plain JavaScript and no types, but every file under
 * its theme folder keeps a @theme alias, so the page can reuse its worker and
 * hooks rather than deep-importing out of node_modules.
 */

declare module '@theme/searchByWorker' {
  import type {Candidate} from '@site/src/theme/SearchPage/ranking';

  export function fetchIndexesByWorker(
    baseUrl: string,
    searchContext: string,
  ): Promise<void>;

  export function searchByWorker(
    baseUrl: string,
    searchContext: string,
    input: string,
    limit: number,
  ): Promise<Candidate[]>;
}

declare module '@theme/hooks/useSearchQuery' {
  export default function useSearchQuery(): {
    searchValue: string;
    searchContext: string;
    searchVersion: string;
    updateSearchPath: (value: string) => void;
    updateSearchContext: (value: string) => void;
    generateSearchPageLink: (value: string) => string;
  };
}

declare module '@theme/LoadingRing/LoadingRing' {
  import type {ReactNode} from 'react';

  export default function LoadingRing(props: {className?: string}): ReactNode;
}
