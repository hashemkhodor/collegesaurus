// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {RecordType, type RankedResult} from '../../theme/SearchPage/ranking.ts';
import {fromKeywordResults, pageType} from './keyword.ts';

const AUB = {i: 1, t: 'AUB - American University of Beirut', u: '/ar/universities/aub', b: ['Universities']};

function ranked(result: Partial<RankedResult> & Pick<RankedResult, 'document' | 'type' | 'rank' | 'sectionTitle' | 'url'>): RankedResult {
  return {page: undefined, score: result.rank, breadcrumb: [], ...result};
}

test('reads the kind of page from its path, in any locale', () => {
  assert.equal(pageType('/universities/aub'), 'university');
  assert.equal(pageType('/ar/scholarships/fulbright'), 'scholarship');
  assert.equal(pageType('/fr/stories/intro'), 'story');
  assert.equal(pageType('/contribute'), 'page');
});

test('groups keyword matches by page, in the order they ranked', () => {
  const results = fromKeywordResults([
    ranked({
      document: {i: 7, t: 'Tuition is $1,000 per credit.', u: AUB.u, h: '#tuition', s: 'Tuition'},
      type: RecordType.content,
      page: AUB,
      rank: 9,
      sectionTitle: 'Tuition',
      url: `${AUB.u}#tuition`,
    }),
    ranked({
      document: {i: 20, t: 'Fulbright Program', u: '/ar/scholarships/fulbright'},
      type: RecordType.title,
      rank: 5,
      sectionTitle: 'Fulbright Program',
      url: '/ar/scholarships/fulbright',
    }),
    ranked({
      document: {i: 8, t: 'Contacts', u: AUB.u, h: '#contacts'},
      type: RecordType.heading,
      page: AUB,
      rank: 2,
      sectionTitle: 'Contacts',
      url: `${AUB.u}#contacts`,
    }),
  ]);

  assert.deepEqual(results, [
    {
      path: '/ar/universities/aub',
      title: 'AUB - American University of Beirut',
      type: 'university',
      score: 9,
      sections: [
        {title: 'Tuition', href: '/ar/universities/aub#tuition', snippet: 'Tuition is $1,000 per credit.', score: 9},
        {title: 'Contacts', href: '/ar/universities/aub#contacts', snippet: '', score: 2},
      ],
    },
    {path: '/ar/scholarships/fulbright', title: 'Fulbright Program', type: 'scholarship', score: 5, sections: []},
  ]);
});
