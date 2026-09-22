/**
 * Replaces the search plugin's results page.
 *
 * The plugin's own page consumes its five indexes in order and then re-sorts by
 * page grouping, so body-text hits fill the list and nothing prefers a title,
 * or the words appearing together. Its worker, index fetching and query
 * building are kept as they are; only the ranking and presentation change.
 * See ./ranking.ts for why.
 */
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluralForm} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import useSearchQuery from '@theme/hooks/useSearchQuery';
import {fetchIndexesByWorker, searchByWorker} from '@theme/searchByWorker';
import {
  buildSnippet,
  queryTerms,
  rankResults,
  RecordType,
  type Candidate,
  type RankedResult,
} from './ranking';
import styles from './styles.module.css';

/** Ask for a pool worth ranking rather than the handful shown. */
const CANDIDATE_LIMIT = 100;

function Snippet({text, terms}: {text: string; terms: string[]}) {
  return (
    <p className={styles.summary}>
      {buildSnippet(text, terms).map((segment, index) =>
        segment.match ? (
          <mark key={index} className={styles.mark}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

function Result({result, terms}: {result: RankedResult; terms: string[]}) {
  const showSummary = result.type === RecordType.content;
  return (
    <article className={styles.result}>
      <h2 className={styles.resultTitle}>
        <Link to={result.url}>{result.sectionTitle}</Link>
      </h2>
      {result.breadcrumb.length > 0 && (
        <p className={styles.breadcrumb}>{result.breadcrumb.join(' › ')}</p>
      )}
      {showSummary && <Snippet text={result.document.t} terms={terms} />}
    </article>
  );
}

function SearchPageContent(): ReactNode {
  const {
    siteConfig: {baseUrl},
  } = useDocusaurusContext();
  const {selectMessage} = usePluralForm();
  const {searchValue, searchContext, searchVersion, updateSearchPath} =
    useSearchQuery();
  const [query, setQuery] = useState(searchValue);
  const [candidates, setCandidates] = useState<Candidate[] | undefined>();
  const [ready, setReady] = useState(false);
  const versionUrl = `${baseUrl}${searchVersion}`;

  useEffect(() => {
    if (searchValue !== query) {
      setQuery(searchValue);
    }
    // Only when the URL changes under us, e.g. arriving from a major tile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchIndexesByWorker(versionUrl, searchContext);
      if (!cancelled) {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [versionUrl, searchContext]);

  useEffect(() => {
    updateSearchPath(query);
    if (!query) {
      setCandidates(undefined);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      // Punctuation is dropped before searching: the index pipeline has no
      // trimmer, so "computer science?" would otherwise find nothing.
      const cleaned = queryTerms(query).join(' ');
      const found = cleaned
        ? await searchByWorker(
            versionUrl,
            searchContext,
            cleaned,
            CANDIDATE_LIMIT,
          )
        : [];
      if (!cancelled) {
        setCandidates(found);
      }
    })();
    return () => {
      cancelled = true;
    };
    // updateSearchPath would loop if it were a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, versionUrl, searchContext]);

  const terms = useMemo(() => queryTerms(query), [query]);
  const results = useMemo(
    () => (candidates ? rankResults(candidates, query) : undefined),
    [candidates, query],
  );

  const title = query
    ? translate(
        {
          id: 'theme.SearchPage.existingResultsTitle',
          message: 'Search results for "{query}"',
        },
        {query},
      )
    : translate({
        id: 'theme.SearchPage.emptyResultsTitle',
        message: 'Search the documentation',
      });

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta property="robots" content="noindex, nofollow" />
      </Head>

      <div className={styles.page}>
        <h1 className={styles.heading}>{title}</h1>

        <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
          <input
            type="search"
            className={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            autoFocus
            aria-label={translate({
              id: 'theme.SearchPage.inputLabel',
              message: 'Search',
            })}
            placeholder={translate({
              id: 'theme.SearchPage.inputPlaceholder',
              message: 'Type your search here',
            })}
          />
        </form>

        {!ready && query && <p className={styles.note}>…</p>}

        {results !== undefined && (
          <p className={styles.count}>
            {selectMessage(
              results.length,
              translate(
                {
                  id: 'theme.SearchPage.documentsFound.plurals',
                  message: '1 document found|{count} documents found',
                },
                {count: results.length},
              ),
            )}
          </p>
        )}

        {results?.map((result) => (
          <Result
            key={`${result.document.i}-${result.type}`}
            result={result}
            terms={terms}
          />
        ))}

        {results?.length === 0 && query && ready && (
          <p className={styles.note}>
            <Translate id="theme.SearchPage.noResultsText">
              No documents were found
            </Translate>
          </p>
        )}
      </div>
    </>
  );
}

export default function SearchPage(): ReactNode {
  return (
    <Layout>
      <SearchPageContent />
    </Layout>
  );
}
