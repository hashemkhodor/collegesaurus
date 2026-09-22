import {translate} from '@docusaurus/Translate';
import type {MajorTile} from './types';

/**
 * Tiles open a search rather than a per-major page, which the site does not
 * have. The queries stay in English to match how program names are written in
 * the tables, whatever the page's language.
 */
export function majorTiles(): MajorTile[] {
  return [
    {
      icon: 'code',
      tint: 'green',
      label: translate({
        id: 'homepage.majors.computerScience',
        message: 'Computer Science',
      }),
      query: 'Computer Science',
    },
    {
      icon: 'gear',
      tint: 'blue',
      label: translate({
        id: 'homepage.majors.engineering',
        message: 'Engineering',
      }),
      query: 'Engineering',
    },
    {
      icon: 'medicine',
      tint: 'orange',
      label: translate({id: 'homepage.majors.medicine', message: 'Medicine'}),
      query: 'Medicine',
    },
    {
      icon: 'pulse',
      tint: 'purple',
      label: translate({id: 'homepage.majors.nursing', message: 'Nursing'}),
      query: 'Nursing',
    },
    {
      icon: 'briefcase',
      tint: 'green',
      label: translate({id: 'homepage.majors.business', message: 'Business'}),
      query: 'Business',
    },
    {
      icon: 'scales',
      tint: 'blue',
      label: translate({id: 'homepage.majors.law', message: 'Law'}),
      query: 'Law',
    },
    {
      icon: 'compass',
      tint: 'orange',
      label: translate({
        id: 'homepage.majors.architecture',
        message: 'Architecture',
      }),
      query: 'Architecture',
    },
    {
      icon: 'palette',
      tint: 'purple',
      label: translate({id: 'homepage.majors.arts', message: 'Arts and Design'}),
      query: 'Design',
    },
    {
      icon: 'psi',
      tint: 'green',
      label: translate({
        id: 'homepage.majors.psychology',
        message: 'Psychology',
      }),
      query: 'Psychology',
    },
    {
      icon: 'bookOpen',
      tint: 'blue',
      label: translate({id: 'homepage.majors.education', message: 'Education'}),
      query: 'Education',
    },
  ];
}
