/**
 * University marks shown on the landing page.
 *
 * Each mark belongs to its university, not to this project. They are shown to
 * identify the school, unchanged apart from being resized, and are not covered
 * by the repository's MIT licence. Remove any on request.
 *
 * Every entry records the exact file it was taken from and the date that was
 * checked, the same way deadlines.ts does. Files live in
 * `static/img/universities/`.
 *
 * `tone: 'dark'` is for schools that publish only a white mark, built for their
 * own dark header; those sit on a dark tile so they stay visible. A slug with
 * no entry here falls back to its initials, so nothing breaks when a university
 * is added.
 *
 * LAU is the one mark not taken from the school itself: its asset host answers
 * 403 to anything but a live browser session, so this is the same lockup as
 * published on its Wikipedia article, which carries the green background with
 * it and needs no tile of its own.
 */

export type UniversityLogo = {
  /** File name inside static/img/universities/ */
  file: string;
  /** Exact file the mark was taken from */
  source: string;
  /** YYYY-MM-DD */
  verifiedOn: string;
  /** Tile behind the mark; light unless the mark itself is white */
  tone?: 'light' | 'dark';
};

const CHECKED = '2026-09-22';

export const UNIVERSITY_LOGOS: Record<string, UniversityLogo> = {
  antonine: {
    file: 'antonine.png',
    source: 'https://ua.edu.lb/images/logo.png',
    verifiedOn: CHECKED,
  },
  aub: {
    file: 'aub.png',
    source: 'https://www.aub.edu.lb/Style%20Library/AUB/images/logo.png',
    verifiedOn: CHECKED,
    tone: 'dark',
  },
  aust: {
    file: 'aust.webp',
    source: 'https://www.aust.edu.lb/assets/images/home/banner-logo.webp',
    verifiedOn: CHECKED,
  },
  bau: {
    file: 'bau.png',
    source: 'https://www.bau.edu.lb/Content/BI/img/logo.png',
    verifiedOn: CHECKED,
    tone: 'dark',
  },
  elte: {
    file: 'elte.png',
    source: 'https://www.elte.hu/themes/custom/spred/apple-touch-icon.png',
    verifiedOn: CHECKED,
  },
  haigazian: {
    file: 'haigazian.png',
    source:
      'https://www.haigazian.edu.lb/wp-content/uploads/2021/01/HU-LOGO.png',
    verifiedOn: CHECKED,
  },
  liu: {
    file: 'liu.png',
    source: 'https://liu.edu.lb/cms26/assets/images/apple-touch-icon.png',
    verifiedOn: CHECKED,
  },
  lau: {
    file: 'lau.jpg',
    source:
      'https://upload.wikimedia.org/wikipedia/en/b/b6/Lebanese_American_University_(logo).jpg',
    verifiedOn: CHECKED,
  },
  lu: {
    file: 'lu.png',
    source: 'https://ul.edu.lb/themes/lebaneseuni/img/logo.png',
    verifiedOn: CHECKED,
  },
  ndu: {
    file: 'ndu.png',
    source:
      'https://www.ndu.edu.lb/Assets/ContentPhotos/Photos/ndu_120235998.png',
    verifiedOn: CHECKED,
    tone: 'dark',
  },
  rhu: {
    file: 'rhu.png',
    source: 'https://www.rhu.edu.lb/images/logorhu.png',
    verifiedOn: CHECKED,
  },
  uob: {
    file: 'uob.png',
    source:
      'https://www.balamand.edu.lb/Style%20Library/responsive/images/BalamandLogo.png',
    verifiedOn: CHECKED,
  },
  usek: {
    file: 'usek.jpg',
    source: 'https://www.usek.edu.lb/ContentFiles/1Logo.jpg',
    verifiedOn: CHECKED,
  },
  usj: {
    file: 'usj.png',
    source: 'https://usj.edu.lb/images/logo.png',
    verifiedOn: CHECKED,
  },
};
