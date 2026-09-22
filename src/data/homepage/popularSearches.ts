import {translate} from '@docusaurus/Translate';
import type {PopularSearch} from './types';

/**
 * Chips under the hero search. Queries stay in English because program names
 * are written in English or French on every locale's pages.
 */
export function popularSearches(): PopularSearch[] {
  return [
    {
      label: translate({
        id: 'homepage.search.computerScience',
        message: 'Computer Science',
      }),
      query: 'Computer Science',
    },
    {label: 'AUB', query: 'AUB', doc: {plugin: 'universities', id: 'aub'}},
    {
      label: translate({id: 'homepage.search.medicine', message: 'Medicine'}),
      query: 'Medicine',
    },
    {
      label: translate({
        id: 'homepage.search.engineering',
        message: 'Engineering',
      }),
      query: 'Engineering',
    },
    {label: 'LAU', query: 'LAU', doc: {plugin: 'universities', id: 'lau'}},
  ];
}
