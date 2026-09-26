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

function clean(file, prefix) {
  return optimize(readFileSync(join(src, file), 'utf8'), {
    multipass: true,
    plugins: [
      'preset-default',
      'removeDimensions',
      {name: 'prefixIds', params: {prefix}},
    ],
  }).data;
}

const write = (name, svg) => writeFileSync(join(out, name), svg);

write('logo-icon.svg', clean('black-no-circle/collegesaurus-black-icon-no-circle.svg', 'i'));
write('logo-icon-dark.svg', clean('white/collegesaurus-white-icon.svg', 'id'));
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
