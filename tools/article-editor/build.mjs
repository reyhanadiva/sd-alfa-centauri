/* eslint-disable */
// Builds the article editor into the site:
//   public/edizon/assets/article-editor.js   (minified IIFE bundle, Tiptap + SortableJS)
//   public/edizon/assets/article-editor.css  (ProseMirror base rules + shared rich-text rules + editor styles)
//   public/edizon/assets/form-editor.js/.css (form editor: steps, rows, layout blocks)
//   public/fonts/*.woff2                      (the article fonts, plus their licences as LICENSE-<name>.txt)
//   public/articles/articles.css, public/forms/popups.css  (only the block between the "article-rich" marker comments is replaced)
// Usage (from this folder):  npm install   then   npm run build
import { build } from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(here, process.argv[2] || '../../public');
const ASSETS = PUBLIC + '/edizon/assets';
const FONTS = PUBLIC + '/fonts';
mkdirSync(ASSETS, { recursive: true });
mkdirSync(FONTS, { recursive: true });

await build({
  entryPoints: [here + '/src/main.js'],
  bundle: true, minify: true, format: 'iife', target: ['es2020'],
  banner: { js: '/* eslint-disable */' }, // the panel project lints public/ too; a minified bundle must be skipped
  outfile: ASSETS + '/article-editor.js', legalComments: 'external', logLevel: 'info',
});

// the form editor (steps, rows, layout blocks): small bundle of its own (SortableJS only)
await build({
  entryPoints: [here + '/src/form-main.js'],
  bundle: true, minify: true, format: 'iife', target: ['es2020'],
  banner: { js: '/* eslint-disable */' },
  outfile: ASSETS + '/form-editor.js', legalComments: 'external', logLevel: 'info',
});
copyFileSync(here + '/src/form-editor.css', ASSETS + '/form-editor.css');

// ProseMirror base rules, taken verbatim from the installed Tiptap core. Tiptap would otherwise inject them as a <style> tag,
// which the panel's security policy (style-src 'self') blocks, so they ship as part of a CSS file instead.
const core = readFileSync(here + '/node_modules/@tiptap/core/src/style.ts', 'utf8');
const base = core.slice(core.indexOf('`') + 1, core.lastIndexOf('`'));
const shared = readFileSync(here + '/src/shared.css', 'utf8');
writeFileSync(ASSETS + '/article-editor.css',
  '/* ProseMirror base rules (from @tiptap/core, MIT) */\n' + base + '\n\n' + shared + '\n' + readFileSync(here + '/src/editor.css', 'utf8'));

// the same rich-text rules for public pages (articles and pop-ups/quiz results)
for (const rel of ['/articles/articles.css', '/forms/popups.css']) {
  const pub = PUBLIC + rel;
  if (!existsSync(pub)) continue;
  const css = readFileSync(pub, 'utf8');
  const A = '/* article-rich:start */', B = '/* article-rich:end */';
  const i = css.indexOf(A), j = css.indexOf(B);
  if (i < 0 || j < i) console.warn(rel + ': markers "article-rich:start/end" not found, shared rules were not copied');
  else {
    const next = css.slice(0, i + A.length) + '\n' + shared.trim() + '\n' + css.slice(j);
    if (next !== css) writeFileSync(pub, next);
  }
}

// fonts: the six that are new. Plus Jakarta Sans, Lilita One and Kite One are already in public/fonts (they come with the site).
const NEW = ['nunito', 'poppins', 'montserrat', 'fredoka', 'lora', 'playfair-display'];
for (const f of NEW) {
  for (const w of ['400', '700']) copyFileSync(`${here}/node_modules/@fontsource/${f}/files/${f}-latin-${w}-normal.woff2`, `${FONTS}/${f}-latin-${w}-normal.woff2`);
  copyFileSync(`${here}/node_modules/@fontsource/${f}/LICENSE`, `${FONTS}/LICENSE-${f}.txt`);
}
const js = readFileSync(ASSETS + '/article-editor.js');
{ const fj = readFileSync(ASSETS + '/form-editor.js'); console.log('form-editor.js: ' + fj.length + ' bytes, ' + gzipSync(fj).length + ' bytes gzipped'); }
console.log('article-editor.js: ' + js.length + ' bytes, ' + gzipSync(js).length + ' bytes gzipped');
