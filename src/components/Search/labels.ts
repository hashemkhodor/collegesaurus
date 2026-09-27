import {translate} from '@docusaurus/Translate';

export function typeLabel(type: string): string {
  switch (type) {
    case 'university':
      return translate({id: 'search.type.university', message: 'University'});
    case 'scholarship':
      return translate({id: 'search.type.scholarship', message: 'Scholarship'});
    case 'story':
      return translate({id: 'search.type.story', message: 'Story'});
    default:
      return translate({id: 'search.type.page', message: 'Page'});
  }
}

/** A match in the text before a page's first heading. */
export function sectionLabel(): string {
  return translate({id: 'search.section.overview', message: 'Overview'});
}

export function keywordNote(): string {
  return translate({
    id: 'search.keywordNote',
    message: 'Showing pages that contain these exact words.',
    description: 'Shown above results when search by meaning could not answer and keyword search did',
  });
}

export function failedNote(): string {
  return translate({
    id: 'search.failed',
    message: "Search didn't load. Check your connection and try again.",
  });
}

export function searchingNote(): string {
  return translate({id: 'search.searching', message: 'Searching…'});
}

export function noMatchNote(query: string): string {
  return translate({id: 'search.noMatch', message: 'No pages match “{query}”. Try other words.'}, {query});
}
