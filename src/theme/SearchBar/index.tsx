/**
 * The navbar search box, replacing the search plugin's. As you type it lists
 * the pages closest in meaning (src/components/Search), or exact-word matches
 * when meaning can't answer; Enter without a highlighted result, or "See all
 * results", opens the search page. A WAI-ARIA combobox.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useHistory, useLocation} from '@docusaurus/router';
import Translate, {translate} from '@docusaurus/Translate';
import {usePluralForm} from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type {Result} from '@site/src/components/Search/engine';
import Highlighted from '@site/src/components/Search/Highlighted';
import ResultTile from '@site/src/components/Search/ResultTile';
import {failedNote, keywordNote, noMatchNote, searchingNote, typeLabel} from '@site/src/components/Search/labels';
import {openResult} from '@site/src/components/Search/navigate';
import {MIN_QUERY, useSearch, useSearchWarmUp} from '@site/src/components/Search/useSearch';
import styles from './styles.module.css';

const LIMIT = 6;

const hrefOf = (result: Result) => result.sections[0]?.href ?? result.path;

export default function SearchBar(): ReactNode {
  const history = useHistory();
  const {pathname} = useLocation();
  const searchPage = useBaseUrl('/search');
  const warmUp = useSearchWarmUp();
  const {selectMessage} = usePluralForm();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [shortcut, setShortcut] = useState('');
  const state = useSearch(query, {limit: LIMIT, enabled: open});
  const {results, terms, status} = state;
  const expanded = open && query.trim().length >= MIN_QUERY;
  const optionCount = results.length + 1;
  const optionId = (i: number) => `${id}-option-${i}`;
  const label = translate({
    id: 'theme.SearchBar.label',
    message: 'Search',
    description: 'The ARIA label and placeholder for search button',
  });

  useEffect(() => {
    setOpen(false);
    setActive(-1);
  }, [pathname]);

  useEffect(() => setActive(-1), [query]);

  // The input is uncontrolled so that hydration keeps whatever was typed
  // before it; this picks that up.
  useEffect(() => {
    const typed = input.current?.value ?? '';
    if (typed) {
      setValue(typed);
      setQuery(typed);
    }
    if (input.current && document.activeElement === input.current) {
      warmUp();
      setOpen(true);
    }
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setShortcut(/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘ K' : 'Ctrl K');
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    input.current?.blur();
    openResult(history, href);
  };
  const seeAllHref = `${searchPage}?q=${encodeURIComponent(value.trim())}`;
  const seeAll = () => go(seeAllHref);
  // A plain click opens here; with a modifier or the middle button the
  // browser opens the link wherever it was asked to.
  const onLinkClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      go(href);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i < 0 && step < 0 ? optionCount - 1 : (i + step + optionCount) % optionCount));
    } else if (event.key === 'Enter' && value.trim()) {
      event.preventDefault();
      if (active >= 0 && active < results.length) {
        go(hrefOf(results[active]));
      } else {
        seeAll();
      }
    } else if (event.key === 'Escape') {
      if (open) {
        // A search field's own Escape would clear it too.
        event.preventDefault();
        setOpen(false);
      } else {
        event.currentTarget.value = '';
        setValue('');
        setQuery('');
      }
    }
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!box.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  let announcement = '';
  if (expanded && status === 'done') {
    announcement = results.length
      ? selectMessage(
          results.length,
          translate({id: 'search.pageCount', message: '1 page|{count} pages'}, {count: results.length}),
        )
      : noMatchNote(state.query);
  }

  return (
    <div ref={box} className={clsx('navbar__search', styles.box)} onBlur={onBlur}>
      <input
        ref={input}
        type="search"
        className={clsx('navbar__search-input', styles.input)}
        placeholder={label}
        aria-label={label}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-list` : undefined}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        dir="auto"
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
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
        onFocus={() => {
          warmUp();
          setOpen(true);
        }}
        onMouseEnter={warmUp}
        onKeyDown={onKeyDown}
      />
      {shortcut && !value && (
        <kbd className={styles.shortcut} aria-hidden="true">
          {shortcut}
        </kbd>
      )}
      {expanded && (
        // Keeps focus in the box while a result is clicked.
        <div className={styles.panel} onMouseDown={(event) => event.preventDefault()}>
          {state.source === 'keyword' && results.length > 0 && <p className={styles.note}>{keywordNote()}</p>}
          {status === 'loading' && results.length === 0 && <p className={styles.status}>{searchingNote()}</p>}
          {status === 'done' && results.length === 0 && <p className={styles.status}>{noMatchNote(state.query)}</p>}
          {status === 'error' && <p className={styles.status}>{failedNote()}</p>}
          <ul id={`${id}-list`} role="listbox" aria-label={label} className={styles.list}>
            {results.map((result, i) => {
              const section = result.sections[0];
              return (
                <li
                  key={result.path}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  className={clsx(styles.option, i === active && styles.active)}
                  onMouseEnter={() => setActive(i)}>
                  <Link to={hrefOf(result)} tabIndex={-1} className={styles.link} onClick={onLinkClick(hrefOf(result))}>
                    <ResultTile result={result} />
                    <span className={styles.text}>
                      <span className={styles.title} dir="auto">
                        {result.title}
                      </span>
                      <span className={styles.meta} dir="auto">
                        {section?.title || typeLabel(result.type)}
                      </span>
                      {section?.snippet && (
                        <span className={styles.snippet} dir="auto">
                          <Highlighted text={section.snippet} terms={terms} className={styles.mark} />
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li
              id={optionId(results.length)}
              role="option"
              aria-selected={active === results.length}
              className={clsx(styles.option, styles.seeAll, active === results.length && styles.active)}
              onMouseEnter={() => setActive(results.length)}>
              <Link to={seeAllHref} tabIndex={-1} className={styles.link} onClick={onLinkClick(seeAllHref)}>
                <Translate id="theme.SearchBar.seeAll">See all results</Translate>
              </Link>
            </li>
          </ul>
        </div>
      )}
      <span className={styles.live} role="status">
        {announcement}
      </span>
    </div>
  );
}
