

/**
 * Shrinks big photos/screenshots so they load fast,
 * and fixes references to them.
 *
 * Usage:
 *   npm run images:optimize
 *   npm run images:optimize -- --dry-run
 *
 * Options:
 *   --width=1600
 *   --quality=80
 *   --min-kb=300
 *   --originals=DIR
 *   --keep
 *   --no-rewrite
 */

import sharp from 'sharp';

import {
  readdirSync,
  statSync,
  mkdirSync,
  renameSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  chmodSync,
  unlinkSync,
} from 'node:fs';

import {
  join,
  extname,
  basename,
  dirname,
  relative,
  resolve,
  sep,
} from 'node:path';

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const argv = process.argv.slice(2);

const opt = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};

const flag = (name) => argv.includes(`--${name}`);

const MAX_W = Number(opt('width', 1600));
const QUALITY = Number(opt('quality', 80));
const MIN_BYTES = Number(opt('min-kb', 300)) * 1024;

const ORIGINALS = opt('originals', 'assets-originals');

const DRY = flag('dry-run');
const KEEP = flag('keep');
const REWRITE = !flag('no-rewrite');

const targets = argv.filter((a) => !a.startsWith('--'));

if (!targets.length) {
  targets.push('public/assets/images');
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const RASTER = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.tif',
  '.tiff',
  '.webp',
]);

const PUBLIC = resolve('public');

const walk = (p) =>
  statSync(p).isDirectory()
    ? readdirSync(p).flatMap((n) => walk(join(p, n)))
    : [p];

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image';

const kb = (n) =>
  n / 1024 >= 1024
    ? (n / 1048576).toFixed(1) + ' MB'
    : Math.round(n / 1024) + ' KB';

const urlOf = (file) =>
  '/' + relative(PUBLIC, resolve(file)).split(sep).join('/');

// --------------------------------------------------
// Collect images
// --------------------------------------------------

const files = targets
  .flatMap((t) =>
    existsSync(t)
      ? walk(t)
      : (console.error(`Not found: ${t}`), [])
  )
  .filter((f) => RASTER.has(extname(f).toLowerCase()));

const used = new Set(files.map((f) => resolve(f)));

const renames = [];

let before = 0;
let after = 0;
let done = 0;
let skipped = 0;
let failed = 0;

const rows = [];

// --------------------------------------------------
// Process images
// --------------------------------------------------

for (const file of files) {
  const abs = resolve(file);

  const size = statSync(abs).size;
  const ext = extname(abs).toLowerCase();

  let meta;

  try {
    meta = await sharp(abs).metadata();
  } catch (e) {
    console.warn(`  ! cannot read ${file}: ${e.message}`);
    failed++;
    continue;
  }

  const tooWide = (meta.width || 0) > MAX_W;
  const tooBig = size > MIN_BYTES;

  const wantName =
    slugify(basename(abs, extname(abs))) + '.webp';

  const sameDir = dirname(abs);

  const renamedNeeded =
    ext !== '.webp' || basename(abs) !== wantName;

  if (
    ext === '.webp' &&
    !tooWide &&
    !tooBig &&
    !renamedNeeded
  ) {
    skipped++;
    continue;
  }

  // ------------------------------------------------
  // Generate a unique output filename
  // ------------------------------------------------

  let out = join(sameDir, wantName);
  let n = 1;

  while (
    (used.has(out) && out !== abs) ||
    (existsSync(out) && out !== abs && !used.has(out))
  ) {
    out = join(
      sameDir,
      `${wantName.replace(/\.webp$/, '')}-${n++}.webp`
    );
  }

  // Never overwrite the source file itself.
  // Important for Windows and already-named WebP files.

  if (resolve(out) === abs) {
    out = join(
      sameDir,
      `${wantName.replace(/\.webp$/, '')}-optimized.webp`
    );

    let suffix = 1;

    while (used.has(out) || existsSync(out)) {
      out = join(
        sameDir,
        `${wantName.replace(/\.webp$/, '')}-optimized-${suffix++}.webp`
      );
    }
  }

  used.add(out);

  // ------------------------------------------------
  // Dry run
  // ------------------------------------------------

  if (DRY) {
    rows.push([
      relative('.', abs),
      kb(size),
      `-> ${basename(out)} (${meta.width}x${meta.height})`,
    ]);

    continue;
  }

  // ------------------------------------------------
  // Optimize image
  // ------------------------------------------------

  const tmp = out + '.tmp';

  try {
    await sharp(abs)
      .rotate()
      .resize({
        width: MAX_W,
        withoutEnlargement: true,
      })
      .webp({
        quality: QUALITY,
        effort: 5,
      })
      .toFile(tmp);
  } catch (e) {
    console.warn(`  ! failed on ${file}: ${e.message}`);
    failed++;
    rmSync(tmp, { force: true });
    continue;
  }

  const outSize = statSync(tmp).size;

  // ------------------------------------------------
  // Backup and remove original
  // ------------------------------------------------

  if (!KEEP) {
    const dest = join(
      ORIGINALS,
      relative(PUBLIC, abs)
    );

    mkdirSync(dirname(dest), { recursive: true });

    try {
      // Always back up before attempting deletion.
      copyFileSync(abs, dest);

      try {
        // Windows may refuse to delete read-only files.
        chmodSync(abs, 0o666);

        unlinkSync(abs);

      } catch (e) {
        console.warn(
          `  ! could not remove original ${file} ` +
          `(${e.code || e.message}); keeping it in place. ` +
          `Backup: ${dest}`
        );
      }

    } catch (e) {
      console.warn(
        `  ! could not back up original ${file}: ` +
        `${e.message}; keeping it in place.`
      );
    }
  }

  // ------------------------------------------------
  // Publish optimized image
  // ------------------------------------------------

  try {
    renameSync(tmp, out);
  } catch (e) {
    console.warn(`  ! could not publish ${out}: ${e.message}`);
    rmSync(tmp, { force: true });
    failed++;
    continue;
  }

  if (resolve(out) !== abs) {
    renames.push({
      from: urlOf(abs),
      to: urlOf(out),
    });
  }

  before += size;
  after += outSize;
  done++;

  rows.push([
    relative('.', abs),
    kb(size),
    `-> ${basename(out)} ${kb(outSize)} ` +
      `(${Math.round((1 - outSize / size) * 100)}% smaller)`,
  ]);
}

// --------------------------------------------------
// Results
// --------------------------------------------------

rows.forEach((r) => {
  console.log(`  ${r[0]}\n      ${r[1]} ${r[2]}`);
});

if (DRY) {
  console.log(
    `\nDry run: ${rows.length} file(s) would be converted, ` +
    `${skipped} already fine.`
  );

  process.exit(0);
}

// --------------------------------------------------
// Rewrite image references
// --------------------------------------------------

let refs = 0;

if (REWRITE && renames.length && existsSync('src')) {
  const textFiles = walk('src').filter((f) =>
    /\.(md|mdx|astro|ts|tsx|js|mjs|json|scss|css)$/.test(f)
  );

  for (const f of textFiles) {
    const text = readFileSync(f, 'utf8');

    let changed = text;

    for (const { from, to } of renames) {
      for (const [a, b] of [
        [from, to],
        [encodeURI(from), encodeURI(to)],
      ]) {
        if (a === b) continue;

        const regex = new RegExp(
          a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
            '(?![\\w-])',
          'g'
        );

        changed = changed.replace(regex, () => {
          refs++;
          return b;
        });
      }
    }

    if (changed !== text) {
      writeFileSync(f, changed);
    }
  }
}

// --------------------------------------------------
// Final summary
// --------------------------------------------------

console.log(
  `\nConverted ${done} image(s), skipped ${skipped} already fine` +
  (failed ? `, ${failed} failed` : '') +
  '.'
);

if (done) {
  console.log(
    `Size: ${kb(before)} -> ${kb(after)} ` +
    `(saved ${kb(before - after)}, ` +
    `${Math.round((1 - after / before) * 100)}%)`
  );
}

if (REWRITE) {
  console.log(`Updated ${refs} reference(s) in src/.`);
}

if (done && !KEEP) {
  console.log(
    `Originals backed up to ${ORIGINALS}/.`
  );
}
