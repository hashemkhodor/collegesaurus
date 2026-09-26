/**
 * Replaces the search plugin's results page. Results are the pages closest in
 * meaning to the query (src/components/Search), best first, each with its
 * best-matching sections linked; when meaning can't answer, the plugin's
 * keyword search does, re-ranked by ./ranking.ts.
 */
import {useEffect, useRef, useState, type ReactNode} from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {usePluralForm} from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import useSearchQuery from '@theme/hooks/useSearchQuery';
import type {Result} from '@site/src/components/Search/engine';
import Highlighted from '@site/src/components/Search/Highlighted';
import ResultTile from '@site/src/components/Search/ResultTile';
import {
  failedNote,
  keywordNote,
  noMatchNote,
  searchingNote,
  sectionLabel,
  typeLabel,
} from '@site/src/components/Search/labels';
import {useSearch} from '@site/src/components/Search/useSearch';
import styles from './styles.module.css';

const LIMIT = 20;

function PageResult({result, terms}: {result: Result; terms: string[]}) {
  return (
    <li className={styles.result}>
      <ResultTile result={result} />
      <div className={styles.body}>
        <h2 className={styles.resultTitle}>
          <Link to={result.path} dir="auto">
            {result.title}
          </Link>
        </h2>
        <p className={styles.kind}>{typeLabel(result.type)}</p>
        {result.sections.length > 0 && (
          <ul className={styles.sections}>
            {result.sections.map((section) => (
              <li key={section.href} className={styles.section}>
                <Link to={section.href} className={styles.sectionLink} dir="auto">
                  {section.title || sectionLabel()}
                </Link>
                {section.snippet && (
                  <p className={styles.snippet} dir="auto">
                    <Highlighted text={section.snippet} terms={terms} className={styles.mark} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function Examples(): ReactNode {
  const searchPage = useBaseUrl('/search');
  const examples = [
    translate({id: 'search.example.coding', message: 'coding degree'}),
    translate({id: 'search.example.europe', message: 'free tuition in Europe'}),
    translate({id: 'search.example.publicSchools', message: 'scholarships for public school students'}),
  ];
  return (
    <p className={styles.hint}>
      <Translate
        id="search.hint"
        description="Shown on the search page before anything is typed; {examples} are links to example searches"
        values={{
          // One element: Translate interpolates an element, but prints an array as text.
          examples: (
            <>
              {examples.map((example, i) => (
                <span key={example}>
                  {i > 0 && ', '}
                  <Link to={`${searchPage}?q=${encodeURIComponent(example)}`}>{example}</Link>
                </span>
              ))}
            </>
          ),
        }}>
        {'Search by what you mean, not only the exact words: try {examples}.'}
      </Translate>
    </p>
  );
}

function SearchPageContent(): ReactNode {
  const {searchValue, updateSearchPath} = useSearchQuery();
  const {selectMessage} = usePluralForm();
  const composing = useRef(false);
  const [value, setValue] = useState(searchValue);
  const [query, setQuery] = useState(searchValue);
  const state = useSearch(query, {limit: LIMIT});
  const {status, results, terms, source} = state;

  useEffect(() => {
    if (searchValue !== query) {
      setValue(searchValue);
      setQuery(searchValue);
    }
    // Only when the URL changes under us, e.g. arriving from a major tile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  useEffect(() => {
    updateSearchPath(query);
    // updateSearchPath would loop if it were a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const title = query.trim()
    ? translate({id: 'theme.SearchPage.existingResultsTitle', message: 'Search results for "{query}"'}, {query})
    : translate({id: 'search.page.title', message: 'Search'});

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta property="robots" content="noindex, nofollow" />
      </Head>

      <div className={styles.page}>
        <h1 className={styles.heading}>{title}</h1>

        <form className={styles.form} role="search" onSubmit={(event) => event.preventDefault()}>
          <input
            type="search"
            className={styles.input}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (!composing.current) {
                setQuery(event.target.value);
              }
            }}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              setQuery(event.currentTarget.value);
            }}
            dir="auto"
            autoComplete="off"
            autoFocus
            enterKeyHint="search"
            aria-label={translate({id: 'theme.SearchPage.inputLabel', message: 'Search'})}
            placeholder={translate({
              id: 'homepage.hero.searchPlaceholder',
              message: 'Search universities, scholarships, majors…',
            })}
          />
        </form>

        <div aria-live="polite">
          {status === 'loading' && results.length === 0 && <p className={styles.note}>{searchingNote()}</p>}
          {results.length > 0 && (
            <p className={styles.count}>
              {selectMessage(
                results.length,
                translate({id: 'search.pageCount', message: '1 page|{count} pages'}, {count: results.length}),
              )}
            </p>
          )}
          {source === 'keyword' && results.length > 0 && <p className={styles.note}>{keywordNote()}</p>}
          {status === 'done' && results.length === 0 && <p className={styles.note}>{noMatchNote(state.query)}</p>}
          {status === 'error' && <p className={styles.note}>{failedNote()}</p>}
        </div>

        {status === 'idle' && !value.trim() && <Examples />}

        <ol className={styles.results} aria-busy={status === 'loading'}>
          {results.map((result) => (
            <PageResult key={result.path} result={result} terms={terms} />
          ))}
        </ol>
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
