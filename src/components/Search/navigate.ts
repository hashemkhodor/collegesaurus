import type {useHistory} from '@docusaurus/router';

/**
 * Opens a result. A jump within the current page needs a hashchange event:
 * history.push sends none, and the Guidebook only reveals a hidden section
 * (another tab on phones, a collapsed group) when it hears one.
 */
export function openResult(history: ReturnType<typeof useHistory>, href: string): void {
  const [path, hash] = href.split('#');
  const samePage = window.location.pathname.replace(/\/$/, '') === path.replace(/\/$/, '');
  history.push(href);
  if (samePage && hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}
