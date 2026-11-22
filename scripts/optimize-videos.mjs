#!/usr/bin/env node
/**
 * Compresses videos for the web (H.264 MP4 with fast start) and keeps your originals.
 *
 *   npm run videos:optimize                                   # every video under public/assets
 *   npm run videos:optimize -- public/assets/images --strip-audio
 *   npm run videos:optimize -- --dry-run
 *
 * Options
 *   --crf=28          quality, 18 (best/big) to 32 (small). 26-28 is right for background loops   default 28
 *   --height=1080     maximum height in px (never enlarges). Use 720 for hero/background loops   default 1080
 *   --fps=30          maximum frame rate                                                         default 30
 *   --strip-audio     remove the sound track (do this for muted/autoplay background videos)
 *   --min-mb=3        skip videos smaller than this                                              default 3
 *   --originals=DIR   where originals are copied to (git-ignored)                                default assets-originals
 *   --ffmpeg=PATH     use your own ffmpeg instead of the bundled one
 *   --dry-run         only list what would happen
 *
 * A video is only replaced if the new file is at least 10% smaller. MOV/AVI/MKV/M4V/WebM inputs become .mp4
 * and references in src/ are updated. Safe to re-run.
 */
import { spawn } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, renameSync, copyFileSync, readFileSync, writeFileSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { join, extname, basename, dirname, relative, resolve, sep } from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const h = argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.split('=').slice(1).join('=') : d; };
const flag = (n) => argv.includes(`--${n}`);
const CRF = Number(opt('crf', 28));
const HEIGHT = Number(opt('height', 1080));
const FPS = Number(opt('fps', 30));
const MIN_BYTES = Number(opt('min-mb', 3)) * 1048576;
const ORIGINALS = opt('originals', 'assets-originals');
const STRIP_AUDIO = flag('strip-audio');
const DRY = flag('dry-run');
const targets = argv.filter((a) => !a.startsWith('--'));
if (!targets.length) targets.push('public/assets');

let ffmpeg = opt('ffmpeg', '');
if (!ffmpeg) {
  try { ffmpeg = (await import('ffmpeg-static')).default; }
  catch { console.error('The bundled ffmpeg is missing. Run "npm install", or pass --ffmpeg=PATH_TO_ffmpeg'); process.exit(1); }
}

const VIDEO = new Set(['.mp4', '.m4v', '.mov', '.avi', '.mkv', '.webm']);
const PUBLIC = resolve('public');
const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((n) => walk(join(p, n))) : [p]);
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
const urlOf = (f) => '/' + relative(PUBLIC, resolve(f)).split(sep).join('/');
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'video';

// Windows refuses to delete/rename files that are open elsewhere (dev server, preview pane, OneDrive...): retry, don't crash.
const LOCKED = new Set(['EPERM', 'EBUSY', 'EACCES']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function retry(fn, file) {
  for (let i = 0; i < 6; i++) {
    try { fn(); return true; } catch (e) {
      if (e.code === 'ENOENT') return true;
      if (!LOCKED.has(e.code)) throw e;
      try { chmodSync(file, 0o666); } catch { /* ignore */ }
      await sleep(250 * (i + 1));
    }
  }
  return false;
}
const run = (args) => new Promise((res) => {
  const p = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  p.on('error', (e) => res({ ok: false, err: e.message }));
  p.on('close', (code) => res({ ok: code === 0, err: err.split('\n').filter(Boolean).slice(-3).join(' | ') }));
});

const files = targets.flatMap((t) => (existsSync(t) ? walk(t) : (console.error(`Not found: ${t}`), []))).filter((f) => VIDEO.has(extname(f).toLowerCase()));
for (const f of files) if (f.endsWith('.tmp.mp4')) rmSync(f, { force: true }); // leftovers of an interrupted run

const renames = [];
const locked = [];
let before = 0, after = 0, done = 0, skipped = 0, failed = 0;

for (const file of files.filter((f) => !f.endsWith('.tmp.mp4'))) {
  const abs = resolve(file);
  const size = statSync(abs).size;
  const ext = extname(abs).toLowerCase();
  if (size < MIN_BYTES) { skipped++; continue; }
  const out = ext === '.mp4' ? abs : join(dirname(abs), slugify(basename(abs, ext)) + '.mp4');
  if (DRY) { console.log(`  ${relative('.', abs)}  ${mb(size)}  -> ${basename(out)}`); continue; }

  const tmp = join(dirname(abs), `${basename(out, '.mp4')}.tmp.mp4`);
  process.stdout.write(`  ${relative('.', abs)}  ${mb(size)}  encoding... `);
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', abs,
    '-vf', `scale=-2:'min(ih,${HEIGHT})'`, '-fpsmax', String(FPS),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-tag:v', 'avc1',
    ...(STRIP_AUDIO ? ['-an'] : ['-c:a', 'aac', '-b:a', '96k']),
    '-map_metadata', '-1', '-movflags', '+faststart', tmp,
  ];
  const r = await run(args);
  if (!r.ok) { console.log('FAILED'); console.warn(`    ${r.err}`); failed++; rmSync(tmp, { force: true }); continue; }
  const newSize = statSync(tmp).size;
  if (newSize > size * 0.9 && out === abs) { console.log(`already efficient (${mb(newSize)}), kept as is`); rmSync(tmp, { force: true }); skipped++; continue; }

  const dest = join(ORIGINALS, relative(PUBLIC, abs));
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(abs, dest);
  const removed = await retry(() => rmSync(abs), abs);
  if (!removed && out === abs) { rmSync(tmp, { force: true }); locked.push(relative('.', abs)); failed++; console.log('LOCKED'); continue; }
  if (!removed) locked.push(relative('.', abs));
  if (!(await retry(() => renameSync(tmp, out), tmp))) { locked.push(relative('.', out)); failed++; console.log('LOCKED'); continue; }
  if (out !== abs) renames.push({ from: urlOf(abs), to: urlOf(out) });
  before += size; after += newSize; done++;
  console.log(`${mb(newSize)}  (${Math.round((1 - newSize / size) * 100)}% smaller)`);
}

if (DRY) { console.log(`\nDry run: ${files.length} video(s) found.`); process.exit(0); }

let refs = 0;
if (renames.length && existsSync('src')) {
  for (const f of walk('src').filter((x) => /\.(md|astro|ts|js|mjs|json|scss)$/.test(x))) {
    const text = readFileSync(f, 'utf8'); let changed = text;
    for (const { from, to } of renames) for (const [a, b] of [[from, to], [encodeURI(from), encodeURI(to)]]) {
      if (a !== b) changed = changed.replace(new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])', 'g'), () => { refs++; return b; });
    }
    if (changed !== text) writeFileSync(f, changed);
  }
}
console.log(`\nOptimized ${done} video(s), skipped ${skipped}${failed ? `, ${failed} failed` : ''}.`);
if (done) console.log(`Size: ${mb(before)} -> ${mb(after)}  (saved ${mb(before - after)}, ${Math.round((1 - after / before) * 100)}%). Originals copied to ${ORIGINALS}/.`);
if (refs) console.log(`Updated ${refs} reference(s) in src/.`);
if (locked.length) {
  console.log(`\n!! ${locked.length} file(s) are locked by another program: ${[...new Set(locked)].join(', ')}`);
  console.log('   Stop "npm run dev", close preview panes/players, pause OneDrive, and run the same command again.');
  process.exitCode = 1;
}