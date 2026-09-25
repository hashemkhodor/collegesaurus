// Builds static/img/brand/ and static/img/favicon.ico from the owner's logo
// set. Needs ImageMagick (`magick`) on PATH; svgo comes with Docusaurus.
//
//   node scripts/build-brand-assets.mjs /path/to/collegesaurus-logos

import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {optimize} from 'svgo';

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/build-brand-assets.mjs <logo-source-dir>');
  process.exit(1);
}

const out = 'static/img/brand';
mkdirSync(out, {recursive: true});
const tmp = mkdtempSync(join(tmpdir(), 'brand-'));

// Illustrator reuses .st0/.st1 with different fills per file, so styles are
// inlined before files are nested into one lockup.
function clean(file, prefix) {
  return optimize(readFileSync(join(src, file), 'utf8'), {
    multipass: true,
    plugins: [
      {name: 'preset-default', params: {overrides: {inlineStyles: {onlyMatchedOnce: false}}}},
      'removeDimensions',
      {name: 'prefixIds', params: {prefix}},
    ],
  }).data;
}

function parts(svg) {
  const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  const body = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return {w, h, body};
}

// Icon beside the wordmark; the wordmark is 45% of the icon's height.
function lockup(iconFile, textFile, prefix) {
  const icon = parts(clean(iconFile, `${prefix}-icon`));
  const text = parts(clean(textFile, `${prefix}-text`));
  const textH = icon.h * 0.45;
  const textW = (text.w / text.h) * textH;
  const gap = icon.h * 0.14;
  const w = +(icon.w + gap + textW).toFixed(2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${icon.h}" role="img" aria-label="Collegesaurus">` +
    `<g>${icon.body}</g>` +
    `<g transform="translate(${+(icon.w + gap).toFixed(2)} ${+((icon.h - textH) / 2).toFixed(2)}) scale(${+(textH / text.h).toFixed(4)})">${text.body}</g>` +
    `</svg>\n`
  );
}

const write = (name, svg) => writeFileSync(join(out, name), svg);

write('logo-lockup.svg', lockup(
  'black-no-circle/collegesaurus-black-icon-no-circle.svg',
  'black/collegesaurus-black-text.svg',
  'l',
));
write('logo-lockup-dark.svg', lockup(
  'white/collegesaurus-white-icon.svg',
  'white/collegesaurus-white-text.svg',
  'd',
));
write('logo-icon.svg', clean('black-no-circle/collegesaurus-black-icon-no-circle.svg', 'i'));
const badge = clean('black/collegesaurus-black-icon.svg', 'b');
write('logo-badge.svg', badge);
write('favicon.svg', badge);

const social = join(tmp, 'social.svg');
writeFileSync(social, clean('additional/Collegesauruse.svg', 's'));

function magick(...args) {
  execFileSync('magick', args, {stdio: 'inherit'});
}

const badgeSvg = join(out, 'logo-badge.svg');
const sizes = [16, 32, 48].map((size) => {
  const png = join(tmp, `fav-${size}.png`);
  magick('-background', 'none', '-density', '600', badgeSvg, '-resize', `${size}x${size}`, '-gravity', 'center', '-extent', `${size}x${size}`, png);
  return png;
});
magick(...sizes, 'static/img/favicon.ico');

magick('-background', 'white', '-density', '600', badgeSvg, '-resize', '144x144', '-gravity', 'center', '-extent', '180x180', join(out, 'apple-touch-icon.png'));

magick('-background', 'white', '-density', '600', social, '-resize', '720x400', '-gravity', 'center', '-extent', '1200x630', join(out, 'social-card.png'));
