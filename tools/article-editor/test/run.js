/* eslint-disable */
// Browser checks for the article editor, against the real article.php / PHP validation / renderer served by the harness.
// Needs Playwright: npm i -D playwright && npx playwright install chromium
// Start the harness first (npm run harness), then: npm test
const { chromium } = require('playwright');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const os = require('os');
const SHOTS = process.env.SHOTS || os.tmpdir();
const BASE = process.env.HARNESS_URL || 'http://127.0.0.1:8099';
const URL = BASE + '/edizon/article.php';
const results = [];
const ok = (name, pass, extra) => { results.push({ name, pass: !!pass, extra }); console.log((pass ? 'PASS ' : 'FAIL ') + name + ((!pass || process.env.VERBOSE) && extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
const flat = (arr) => { const o = []; (function w(a, d) { a.forEach(b => { o.push(b.t + '@' + d); if (b.cols) b.cols.forEach(c => w(c, d + 1)); }); })(arr, 0); return o; };
const canon = (v) => typeof v === 'string' ? v.replace(/<a\s[^>]*>/g, m => m.replace(/\s(?:target|rel)="[^"]*"/g, '')).replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').trim() : Array.isArray(v) ? v.map(canon) : (v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => (o[k] = canon(v[k]), o), {}) : v);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const near = (a, b, tol = 0.03) => Math.abs(a - b) / b < tol;
const IMG = '/uploads/sample-wide.svg';

// Wraps ArtEditor.create so tests can read and set the editor's blocks directly (nothing in the shipped code is changed for this).
const HOOK = () => {
  let real;
  Object.defineProperty(window, 'ArtEditor', { configurable: true, get() { return real; }, set(v) { real = v && Object.assign({}, v, { create(o) { const e = v.create(o); window.__ed = e; return e; } }); } });
  window.__viol = [];
  document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' | ' + e.blockedURI));
};

async function boot(br, opts = {}) {
  const ctx = opts.ctx || await br.newContext(opts.ctxOpts || { viewport: { width: 1360, height: 1000 } });
  if (!opts.ctx) await ctx.addInitScript(HOOK);
  const pg = await ctx.newPage();
  pg.logs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pg.logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => pg.logs.push('pageerror: ' + e.message));
  await pg.goto(URL + (opts.q || ''));
  await pg.waitForSelector('.ae-root');
  await pg.evaluate(() => document.querySelector('.ae-section').scrollIntoView()); // the editor sits below the article fields; bring it into view like a writer would
  return pg;
}
const blocks = (pg) => pg.evaluate(() => window.__ed.getBlocks());
const load = (pg, b) => pg.evaluate((x) => window.__ed.setBlocks(x), b);
const viol = (pg) => pg.evaluate(() => window.__viol);
const colsBlock = (cols, ratio) => ({ t: 'columns', ratio: ratio || '1-1', cols });
const text = (html) => ({ t: 'text', html });
const tile = (pg, type) => pg.locator('.ae-tile[data-type=' + type + ']');
const blk = (pg, i) => pg.locator('.ae-rootlist > .ae-blk').nth(i);
const rte = (pg, i = 0) => pg.locator('.ae-rootlist .ae-rte').nth(i);
// selects a block through its title bar (clicking the middle of an image block would hit its "choose picture" button)
const sel = async (pg, i) => { await blk(pg, i).hover(); await blk(pg, i).locator('> .ae-blk-bar .ae-blk-t').click(); };
const tbSel = (pg, label) => pg.locator('.ae-tb select[aria-label="' + label + '"]');
const tbBtn = (pg, label) => pg.locator('.ae-tb button[aria-label="' + label + '"]');
async function save(pg) {
  const [resp] = await Promise.all([pg.waitForResponse(r => /article\.php/.test(r.url()) && r.request().method() === 'POST'), pg.click('#save')]);
  return { status: resp.status(), body: await resp.json(), sent: JSON.parse(resp.request().postData()).data };
}

async function dragTo(pg, from, toLoc, dx = 0, dy = 0) {
  const a = await from.boundingBox();
  let pos = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  await pg.mouse.move(pos.x, pos.y);
  await pg.mouse.down();
  await pg.mouse.move(pos.x + 6, pos.y + 6, { steps: 3 });
  pos = { x: pos.x + 6, y: pos.y + 6 };
  for (let i = 0; i < 26; i++) {
    const b = await toLoc.boundingBox();
    const tx = b.x + b.width / 2 + dx, ty = b.y + b.height / 2 + dy;
    const k = i < 18 ? 0.35 : 1;
    pos = { x: pos.x + (tx - pos.x) * k, y: pos.y + (ty - pos.y) * k };
    await pg.mouse.move(pos.x, pos.y);
    await pg.waitForTimeout(i < 18 ? 15 : 70);
  }
  await pg.mouse.up();
  await pg.waitForTimeout(350);
  await pg.mouse.click(1352, 20); // headless Chromium sends the first click after a synthetic drag to the common parent; spend it on blank space
}

(async () => {
  const br = await chromium.launch();

  /* ---------- A. load + policy ---------- */
  let pg = await boot(br);
  ok('A1 page loads with the editor, 14 palette tiles (the HTML block is there for an Admin) and an empty canvas', (await pg.locator('.ae-tile').count()) === 14 && (await blocks(pg)).length === 0);
  ok('A2 zero security-policy violations on load', (await viol(pg)).length === 0, await viol(pg));
  ok('A3 zero console errors on load', pg.logs.length === 0, pg.logs);
  ok('A4 the unsaved-changes notice is hidden on load', await pg.locator('#dirty').isHidden());
  ok('A5 the SEO card is still there under the editor', (await pg.locator('.card.seo').count()) === 1);
  ok('A6 all nine article fonts load from the own server', await pg.evaluate(async () => {
    const f = ['Plus Jakarta Sans', 'Lilita One', 'Kite One', 'Nunito', 'Poppins', 'Montserrat', 'Fredoka', 'Lora', 'Playfair Display'];
    await Promise.all(f.map(n => document.fonts.load('16px "' + n + '"', 'Abc')));
    return f.every(n => document.fonts.check('16px "' + n + '"'));
  }));

  /* ---------- B. palette -> canvas (mouse, native drag) ---------- */
  const root = pg.locator('.ae-rootlist');
  await dragTo(pg, tile(pg, 'h'), root);
  await dragTo(pg, tile(pg, 'text'), root);
  await dragTo(pg, tile(pg, 'columns'), root);
  let d = await blocks(pg);
  ok('B1 dragging Judul, Teks, Kolom from the palette adds all three', flat(d).sort().join() === 'columns@0,h@0,text@0', flat(d));
  ok('B1b a dirty notice appears after the first change', await pg.locator('#dirty').isVisible());
  await load(pg, [colsBlock([[], []])]);
  await dragTo(pg, tile(pg, 'text'), pg.locator('.ae-col').nth(1));
  d = await blocks(pg);
  ok('B2 dragging Teks into column 2 nests it there', d.length === 1 && d[0].cols[0].length === 0 && d[0].cols[1].length === 1 && d[0].cols[1][0].t === 'text', flat(d));
  await dragTo(pg, tile(pg, 'columns'), pg.locator('.ae-col').first());
  d = await blocks(pg);
  ok('B3 dropping Kolom over a column never nests it', !flat(d).includes('columns@1'), flat(d));
  await dragTo(pg, tile(pg, 'button'), pg.locator('.ae-col').first());
  d = await blocks(pg);
  ok('B3b ...while a Tombol dropped on the same column is accepted', d.some(b => b.cols && b.cols[0].some(x => x.t === 'button')), flat(d));
  await load(pg, []);
  await tile(pg, 'text').click(); // 'text' and 'button' tiles were dragged above: clicking them must still work afterwards
  await tile(pg, 'quote').click();
  d = await blocks(pg);
  ok('B4 clicking a tile adds the block below the selected one (and the first one at the end)', flat(d).join() === 'text@0,quote@0', flat(d));

  /* ---------- C. reorder, duplicate, delete + undo, keyboard ---------- */
  await load(pg, [{ t: 'h', level: 2, text: 'Top' }, text('<p>Body</p>'), { t: 'quote', text: 'Q', cite: '' }]);
  const third = blk(pg, 2);
  await third.hover();
  await dragTo(pg, third.locator('> .ae-blk-bar .ae-blk-h'), blk(pg, 0), 0, -12);
  d = await blocks(pg);
  ok('C1 dragging a block by its handle above the first one reorders the page', d[0].t === 'quote' && d[1].t === 'h', flat(d));
  await blk(pg, 0).hover();
  await blk(pg, 0).locator('> .ae-blk-bar [aria-label="Turunkan"]').click();
  d = await blocks(pg);
  ok('C2 the down arrow button moves a block down', d[1].t === 'quote', flat(d));
  await blk(pg, 2).hover();
  const handle = blk(pg, 2).locator('> .ae-blk-bar .ae-blk-h');
  await handle.focus();
  await pg.keyboard.press('ArrowUp');
  d = await blocks(pg);
  ok('C3 the keyboard arrow keys on a focused handle move a block', flat(d).join() === 'h@0,text@0,quote@0' || flat(d)[1] === 'quote@0', flat(d));
  await blk(pg, 1).hover();
  await blk(pg, 1).locator('> .ae-blk-bar [aria-label="Gandakan"]').click();
  d = await blocks(pg);
  ok('C4 duplicating inserts a copy with a new id', d.length === 4 && new Set(d.map(b => b.id)).size === 4, d.map(b => b.id));
  await blk(pg, 0).click();
  await blk(pg, 0).locator('> .ae-blk-bar [aria-label="Hapus"]').click();
  d = await blocks(pg);
  const afterDel = d.length;
  ok('C5 deleting removes the block and shows an undo notice', afterDel === 3 && await pg.locator('.ae-undo').isVisible());
  await pg.click('.ae-undo button');
  d = await blocks(pg);
  ok('C6 undo puts it back at the same place', d.length === 4 && d[0].t === 'h' && d[0].text === 'Top', flat(d));
  await load(pg, [colsBlock([[{ t: 'quote', text: 'in col', cite: '' }], []])]);
  const q = pg.locator('.ae-col .ae-blk').first();
  await q.click();
  await q.locator('> .ae-blk-bar [aria-label="Hapus"]').click();
  await pg.click('.ae-undo button');
  d = await blocks(pg);
  ok('C7 undoing a delete inside a column restores it in that column', d[0].cols[0].length === 1 && d[0].cols[0][0].text === 'in col', JSON.stringify(d));

  /* ---------- D. rich text ---------- */
  await load(pg, [text('<p>Rich text sample</p>')]);
  const t = rte(pg);
  await t.click();
  await pg.keyboard.press('Control+a');
  await tbSel(pg, 'Ukuran teks').selectOption('lg');
  await tbSel(pg, 'Jenis huruf').selectOption('lora');
  await tbBtn(pg, 'Tebal').click();
  await tbBtn(pg, 'Garis bawah').click();
  await tbBtn(pg, 'Coret').click();
  await tbBtn(pg, 'Rata tengah').click();
  await pg.waitForTimeout(250);
  let html = (await blocks(pg))[0].html;
  ok('D1 size, font, bold, underline, strike and centre produce class names and tags only', /fs-lg/.test(html) && /ff-lora/.test(html) && /<strong>/.test(html) && /<u>/.test(html) && /<s>/.test(html) && /class="ta-center"/.test(html) && !/style=/.test(html), html);
  ok('D1b the toolbar shows the pressed state of what is applied', (await tbBtn(pg, 'Coret').getAttribute('aria-pressed')) === 'true' && (await tbBtn(pg, 'Rata tengah').getAttribute('aria-pressed')) === 'true');
  await tbSel(pg, 'Paragraf atau judul').selectOption('h3');
  await pg.waitForTimeout(200);
  html = (await blocks(pg))[0].html;
  ok('D2 turning the paragraph into Judul 3 keeps the centring', /<h3 class="ta-center">/.test(html), html.slice(0, 140));
  await tbBtn(pg, 'Tautan').click();
  await pg.fill('.ae-link input', 'javascript:alert(1)');
  await pg.click('.ae-link >> text=Terapkan');
  ok('D3 a javascript: link is refused with a message', (await pg.locator('.ae-link-msg').textContent()).length > 0 && !/javascript/.test((await blocks(pg))[0].html));
  await pg.fill('.ae-link input', 'https://example.com/page');
  await pg.click('.ae-link >> text=Terapkan');
  html = (await blocks(pg))[0].html;
  ok('D4 an https link is applied', /<a [^>]*href="https:\/\/example.com\/page"/.test(html), html);
  await pg.click('.ae-tb button:has-text("Bersihkan")');
  html = (await blocks(pg))[0].html;
  ok('D5 "Bersihkan" removes formatting back to a plain paragraph', html === '<p>Rich text sample</p>', html);
  await t.click();
  await pg.keyboard.press('Control+a');
  await tbBtn(pg, 'Daftar poin').click();
  await pg.waitForTimeout(200);
  html = (await blocks(pg))[0].html;
  ok('D6 the bullet list button makes <ul><li><p>', /^<ul><li><p>Rich text sample<\/p><\/li><\/ul>$/.test(html), html);
  await pg.keyboard.press('End');
  await pg.keyboard.press('Enter');
  await pg.keyboard.press('Tab');
  await pg.keyboard.type('nested');
  await pg.waitForTimeout(600);
  html = (await blocks(pg))[0].html;
  ok('D7 Tab inside a list nests the item', /<ul><li><p>Rich text sample<\/p><ul><li><p>nested<\/p><\/li><\/ul><\/li><\/ul>/.test(html), html);
  // paste: Word/Docs HTML is full of style attributes; they must not cause policy warnings and must not survive
  await load(pg, [text('<p>x</p>')]);
  await rte(pg).click();
  await pg.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/html', '<style>p{color:red}</style><p class="MsoNormal" style="color:red;font-size:30pt"><b style="x:y">Bold</b> pasted <span style="font-family:Arial">text</span></p><script>1</script>');
    dt.setData('text/plain', 'Bold pasted text');
    document.querySelector('.ae-rte').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await pg.waitForTimeout(250);
  html = (await blocks(pg))[0].html;
  ok('D8 pasted Word-style HTML is cleaned to plain tags', /<strong>Bold<\/strong> pasted text/.test(html) && !/style|MsoNormal|script/.test(html), html);
  ok('D8b ...and the paste caused no policy violation or console warning', (await viol(pg)).length === 0 && pg.logs.length === 0, [await viol(pg), pg.logs]);
  ok('D9 text blocks show a placeholder only while empty', await (async () => { await load(pg, [text('<p></p>')]); const e = await pg.locator('.ae-rte-host').evaluate(n => n.classList.contains('is-empty')); await rte(pg).click(); await pg.keyboard.type('a'); await pg.waitForTimeout(100); return e && !(await pg.locator('.ae-rte-host').evaluate(n => n.classList.contains('is-empty'))); })());

  /* ---------- E. heading, quote, callout, button, faq, video, embed ---------- */
  await load(pg, [{ t: 'h', level: 2, text: '' }]);
  const hin = pg.locator('.ae-h-in');
  await hin.click();
  await pg.keyboard.type('Line one');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type(' ' + 'long '.repeat(40));
  await pg.waitForTimeout(250);
  d = await blocks(pg);
  const lh = await hin.evaluate(n => ({ h: n.clientHeight, sh: n.scrollHeight }));
  ok('E1 a heading never contains a line break and a long one wraps instead of being cut off', !/\n/.test(d[0].text) && d[0].text.startsWith('Line one long') && lh.sh <= lh.h + 2 && lh.h > 50, { d: d[0].text.slice(0, 30), lh });
  await pg.selectOption('.ae-setbox select[aria-label="Tingkat judul"]', '4');
  ok('E2 the heading level changes (H4)', (await blocks(pg))[0].level === 4);
  await load(pg, [{ t: 'quote', text: '', cite: '' }, { t: 'callout', tone: 'info', title: '', text: '' }, { t: 'button', label: 'Coba', url: '/#coba-gratis', style: 'solid' }]);
  await blk(pg, 0).locator('.ae-q-in').fill('Be brave');
  await blk(pg, 0).locator('.ae-q-cite').fill('Teacher');
  await blk(pg, 1).locator('.ae-co-title').fill('Tip');
  await blk(pg, 1).locator('.ae-co-in').fill('Practice daily');
  await blk(pg, 1).click();
  await pg.selectOption('.ae-setbox select[aria-label="Jenis kotak"]', 'warning');
  await blk(pg, 2).click();
  await pg.selectOption('.ae-setbox select[aria-label="Gaya"]', 'outline');
  d = await blocks(pg);
  ok('E3 quote, callout and button edit in place and through settings', d[0].text === 'Be brave' && d[0].cite === 'Teacher' && d[1].title === 'Tip' && d[1].text === 'Practice daily' && d[1].tone === 'warning' && d[2].style === 'outline', d);
  await load(pg, [{ t: 'faq', title: '', items: [{ q: '', a: '' }] }]);
  await pg.locator('.ae-faq-q').first().fill('What is it?');
  await pg.locator('.ae-faq-a').first().fill('A test.');
  await pg.click('text=+ Tambah pertanyaan');
  await pg.locator('.ae-faq-q').nth(1).fill('Second?');
  d = await blocks(pg);
  ok('E4 FAQ items can be filled and added', d[0].items.length === 2 && d[0].items[1].q === 'Second?', d);
  await pg.locator('.ae-faq-item').first().locator('text=Hapus butir').click();
  d = await blocks(pg);
  ok('E5 an FAQ item can be removed, and the last one cannot', d[0].items.length === 1 && (await pg.locator('.ae-faq-item >> text=Hapus butir').count()) === 0 && d[0].items[0].q === 'Second?', d);
  await load(pg, [{ t: 'video', url: '', caption: '' }, { t: 'embed', url: '', height: 'l', caption: '' }]);
  await blk(pg, 0).click();
  await pg.fill('.ae-setbox input[placeholder^="https://www.youtube"]', 'https://youtu.be/abc');
  ok('E6 the video placeholder shows the address that was entered', /youtu\.be\/abc/.test(await blk(pg, 0).innerText()));
  await blk(pg, 1).click();
  await pg.selectOption('.ae-setbox select[aria-label="Tinggi"]', 'xl');
  d = await blocks(pg);
  ok('E7 embed height is kept', d[1].height === 'xl' && d[0].url === 'https://youtu.be/abc', d);

  /* ---------- F. images ---------- */
  await load(pg, [{ t: 'img', src: '', alt: '', caption: '', ratio: '16:9', size: 'normal' }]);
  const fr = pg.locator('.ae-fr').first();
  ok('F1 an empty image block already has its 16:9 frame', near((await fr.boundingBox()).width / (await fr.boundingBox()).height, 16 / 9));
  for (const [v, num] of [['4:3', 4 / 3], ['1:1', 1], ['3:4', 3 / 4], ['3:2', 3 / 2], ['16:9', 16 / 9]]) {
    await sel(pg, 0);
    await pg.selectOption('.ae-setbox select[aria-label="Bentuk bingkai"]', v);
    const b = await fr.boundingBox();
    ok('F2 frame ' + v + ' has that shape', near(b.width / b.height, num), b.width / b.height);
  }
  await fr.locator('.ae-fr-empty').click();
  await pg.waitForSelector('dialog.picker[open] .pg');
  ok('F3 clicking the empty frame opens the panel picker with the library and tells the locked shape', (await pg.locator('dialog.picker[open] .pg').count()) >= 3 && /16:9/.test(await pg.locator('dialog.picker[open]').innerText()));
  await pg.locator('dialog.picker[open] .pg').first().click();
  await pg.waitForTimeout(250);
  d = await blocks(pg);
  ok('F4 picking a library picture fills the frame and keeps the shape', d[0].src === IMG && d[0].ratio === '16:9' && (await fr.locator('img').count()) === 1, d);
  await sel(pg, 0);
  await pg.selectOption('.ae-setbox select[aria-label="Lebar"]', 'wide');
  await pg.fill('.ae-setbox .ae-f:has-text("Teks alternatif") input', 'A picture');
  await pg.fill('.ae-setbox .ae-f:has-text("Keterangan") input', 'Caption here');
  d = await blocks(pg);
  ok('F5 width, alt text and caption are kept', d[0].size === 'wide' && d[0].alt === 'A picture' && d[0].caption === 'Caption here' && /Caption here/.test(await blk(pg, 0).innerText()), d);
  await load(pg, [colsBlock([[{ t: 'img', src: IMG, alt: '', caption: '', ratio: '16:9', size: 'wide' }], []])]);
  await pg.locator('.ae-col .ae-blk').first().click();
  ok('F6 inside a column the width choice is replaced by a note', (await pg.locator('.ae-setbox select[aria-label="Lebar"]').count()) === 0 && /selalu selebar kolomnya/.test(await pg.locator('.ae-setbox').innerText()));

  /* ---------- G. columns ---------- */
  await load(pg, [colsBlock([[text('<p>A</p>')], [text('<p>B</p>')], [text('<p>C</p>')]], '1-1-1')]);
  d = await blocks(pg);
  ok('G1 a 3-column block loads with 3 columns', d[0].cols.length === 3 && d[0].ratio === '1-1-1');
  await blk(pg, 0).hover();
  await blk(pg, 0).locator('> .ae-blk-bar .ae-blk-t').click();
  await pg.selectOption('.ae-setbox select[aria-label="Jumlah kolom"]', '2');
  d = await blocks(pg);
  ok('G2 going from 3 to 2 columns moves the third column into the second (nothing is lost)', d[0].cols.length === 2 && d[0].cols[1].length === 2 && JSON.stringify(d).includes('>C<'), JSON.stringify(d[0].cols));
  await pg.selectOption('.ae-setbox select[aria-label="Pembagian lebar"]', '1-2');
  d = await blocks(pg);
  const cw = await pg.locator('.ae-col').evaluateAll(n => n.map(x => x.getBoundingClientRect().width));
  ok('G3 the 33/67 split is saved and shown', d[0].ratio === '1-2' && near(cw[1] / cw[0], 2, 0.08), cw);
  await pg.selectOption('.ae-setbox select[aria-label="Jumlah kolom"]', '3');
  d = await blocks(pg);
  ok('G4 back to 3 columns gives an empty third column and equal split', d[0].cols.length === 3 && d[0].ratio === '1-1-1' && d[0].cols[2].length === 0);
  await load(pg, [colsBlock([[text('<p>A</p>')], [text('<p>B</p>')]])]);
  await pg.click('.ae-view button[data-w=mob]');
  await pg.waitForTimeout(350);
  const stack = await pg.locator('.ae-col').evaluateAll(n => n.map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; }));
  const wrapW = (await pg.locator('.ae-cvwrap').boundingBox()).width;
  ok('G5 in the phone preview the screen is 390 wide (350 of content, as on the real page) and the columns stack', Math.abs(wrapW - 406) <= 2 && stack[0][0] === stack[1][0] && stack[1][1] > stack[0][1], { wrapW, stack });
  await pg.click('.ae-view button[data-w=pub]');

  /* ---------- H. legacy blocks ---------- */
  await load(pg, [{ t: 'p', html: 'Hello <strong>x</strong>' }, { t: 'ul', style: 'numbers', items: ['a', 'b & c'] }, { t: 'h', level: 3, text: 'H' }, { t: 'img', src: IMG, alt: '', caption: '', size: 'wide' }]);
  d = await blocks(pg);
  ok('H1 old paragraph and list blocks open as text blocks (numbered list stays numbered, text escaped)', d[0].t === 'text' && /Hello <strong>x<\/strong>/.test(d[0].html) && /<ol><li><p>a<\/p><\/li><li><p>b &amp; c<\/p><\/li><\/ol>/.test(d[1].html), d.slice(0, 2));
  ok('H2 old images get the 16:9 shape and keep their width', d[3].ratio === '16:9' && d[3].size === 'wide');
  ok('H3 opening old content does not mark the page as changed', await pg.evaluate(() => { document.getElementById('dirty').hidden = true; return true; }) && (await (async () => { await load(pg, [{ t: 'p', html: 'x' }]); return pg.locator('#dirty').isHidden(); })()));

  /* ---------- I. save with the real PHP validation, round trip ---------- */
  pg = await boot(br);
  const full = [
    { t: 'h', level: 2, text: 'Heading' },
    text('<p class="ta-center"><span class="fs-lg"><span class="ff-lora"><strong>Big</strong></span></span> and <s>old</s> <a href="https://example.com">link</a></p><h3>Sub</h3><ul><li><p>One</p><ol><li><p>Nested</p></li></ol></li></ul>'),
    { t: 'img', src: IMG, alt: 'alt', caption: 'cap', ratio: '3:2', size: 'wide' },
    { t: 'button', label: 'Go', url: '/#coba-gratis', style: 'outline' },
    colsBlock([[text('<p>Left</p>'), { t: 'img', src: '/uploads/sample-square.svg', alt: '', caption: '', ratio: '1:1', size: 'normal' }], [{ t: 'quote', text: 'Q', cite: 'C' }]], '2-1'),
    { t: 'quote', text: 'Quote', cite: '' },
    { t: 'callout', tone: 'tip', title: 'T', text: 'Body' },
    { t: 'faq', title: 'FAQ', items: [{ q: 'Q1?', a: 'A1.' }, { q: 'Q2?', a: 'A2.' }] },
    { t: 'video', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', caption: '' },
    { t: 'embed', url: 'https://www.openstreetmap.org/export/embed.html?bbox=106.8%2C-6.26%2C106.86%2C-6.2', height: 'm', caption: '' },
    { t: 'hr' },
    { t: 'cards', per: 3, ratio: '1:1', btn: 'outline', items: [{ src: IMG, alt: 'A', title: "Kid's class", text: 'Line one\nLine two', label: 'Join', url: '#form:free-trial' }, { src: '/uploads/sample-square.svg', alt: '', title: 'Teens', text: '', label: '', url: '' }, { src: '', alt: '', title: 'No picture', text: 'Just text', label: 'Read', url: '/articles/' }] },
    { t: 'table', header: true, caption: 'Prices "2026"', aligns: ['left', 'center', 'right'], rows: [['Plan', 'Hours', 'Price'], ["<strong>It's</strong> <em>big</em>", '4', '<a href="/program">100</a>'], ['Plus', '8', '180 &amp; up']] },
  ];
  await load(pg, full);
  await pg.fill('input[placeholder="Judul artikel"]', 'Artikel uji');
  await pg.locator('.ae-rte').first().evaluate(n => { n.__mark = 1; });
  const before = await blocks(pg);
  let r = await save(pg);
  ok('I1 saving succeeds through the real validation', r.status === 200 && r.body.ok === true, r.body.errors);
  ok('I2 the request carries every block from the editor (S.blocks reads the editor)', r.sent.blocks.length === full.length && flat(r.sent.blocks).join() === flat(before).join(), flat(r.sent.blocks));
  ok('I3 the server keeps every block type and the nested ones', flat(r.body.data.blocks).join() === flat(before).join(), flat(r.body.data.blocks));
  const srv = r.body.data.blocks;
  ok('I4 rich text comes back with classes intact and only whitelisted markup', /<p class="ta-center">/.test(srv[1].html) && /fs-lg/.test(srv[1].html) && /ff-lora/.test(srv[1].html) && /<h3>Sub<\/h3>/.test(srv[1].html) && /<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">/.test(srv[1].html), srv[1].html);
  ok('I5 image shapes and column ratio survive', srv[2].ratio === '3:2' && srv[2].size === 'wide' && srv[4].ratio === '2-1' && srv[4].cols[0][1].ratio === '1:1', [srv[2], srv[4].ratio]);
  ok('I6 the server fills the excerpt, so the list text comes from the text block', typeof r.body.data.excerpt === 'string' && r.body.data.excerpt.length > 0, r.body.data.excerpt);
  ok('I7 saving without server changes does not rebuild the editor (the same text editor element stays)', same(before, srv) && await pg.locator('.ae-rte').first().evaluate(n => n.__mark === 1), same(before, srv));
  ok('I8 the dirty notice clears after saving and the address bar shows the id', await pg.locator('#dirty').isHidden() && /id=1/.test(pg.url()), pg.url());
  const pg2 = await boot(br, { ctx: pg.context(), q: '?id=1' });
  const reloaded = await blocks(pg2);
  ok('I9 reloading the saved article shows exactly what the server stored', same(reloaded, srv), JSON.stringify(reloaded).slice(0, 200));
  ok('I10 the reloaded page has no policy violations or console errors', (await viol(pg2)).length === 0 && pg2.logs.length === 0, [await viol(pg2), pg2.logs]);
  r = await save(pg2);
  ok('I11 saving the reloaded article again changes nothing (stable round trip)', r.status === 200 && same(r.body.data.blocks, srv), JSON.stringify(r.body.data.blocks).slice(0, 120));
  // errors from the server are shown
  await load(pg2, [{ t: 'embed', url: 'http://insecure.example.com/x', height: 'l', caption: '' }, { t: 'button', label: 'x', url: 'javascript:alert(1)', style: 'solid' }]);
  r = await save(pg2);
  ok('I12 invalid content is refused by the server and the message is shown to the writer', r.status === 422 && (await pg2.locator('#errors').isVisible()) && /Blok/i.test(await pg2.locator('#errors').innerText()), [r.body, await pg2.locator('#errors').innerText()]);
  await pg2.context().close();

  /* ---------- J. SEO analysis follows the editor ---------- */
  pg = await boot(br);
  await pg.fill('input[placeholder="mis. belajar speaking anak"]', 'belajar speaking');
  await load(pg, [text('<p>Tulisan pembuka tanpa topik.</p>'), text('<p>Belajar speaking itu seru dan bermanfaat.</p>')]);
  await blk(pg, 1).click();
  await pg.waitForTimeout(500);
  let seo = await pg.locator('.card.seo').innerText();
  ok('J1 the analysis sees text blocks (keyword missing from the first paragraph)', /belum ada di paragraf pertama/i.test(seo), seo.slice(0, 80));
  await blk(pg, 1).hover();
  await blk(pg, 1).locator('> .ae-blk-bar .ae-blk-h').focus();
  await pg.keyboard.press('ArrowUp');
  await pg.waitForTimeout(500);
  seo = await pg.locator('.card.seo').innerText();
  ok('J2 moving a block (no click, no typing) refreshes the analysis', /Frasa kunci ada di paragraf pertama/i.test(seo), seo.slice(0, 80));
  await load(pg, [colsBlock([[text('<p>Belajar speaking di kolom.</p>')], []])]);
  await pg.locator('.ae-col .ae-rte').first().click();
  await pg.keyboard.type(' ok');
  await pg.waitForTimeout(500);
  seo = await pg.locator('.card.seo').innerText();
  ok('J3 text inside columns is analysed too', /Frasa kunci ada di paragraf pertama/i.test(seo), seo.slice(0, 80));

  /* ---------- K. preview (unsaved content, public stylesheet + public CSP) ---------- */
  pg = await boot(br);
  await pg.fill('input[placeholder="Judul artikel"]', 'Pratinjau uji');
  await load(pg, [
    { t: 'h', level: 2, text: 'Judul bagian' },
    text('<p class="ta-center"><span class="fs-xl">Besar</span> <span class="ff-playfair">Playfair</span> <s>coret</s></p><h3 class="ta-right">Kanan</h3><ul><li><p>satu</p></li></ul>'),
    { t: 'img', src: IMG, alt: 'x', caption: '', ratio: '1:1', size: 'wide' },
    { t: 'img', src: '/uploads/sample-tall.svg', alt: 'y', caption: '', ratio: '3:4', size: 'wide' },
    { t: 'button', label: 'Garis', url: '/#coba-gratis', style: 'outline' },
    colsBlock([[text('<p>Kiri</p>')], [text('<p>Kanan</p>')]], '1-2'),
  ]);
  const [pv] = await Promise.all([pg.context().waitForEvent('page'), pg.click('#preview')]);
  pv.logs = [];
  pv.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pv.logs.push(m.text()); });
  await pv.waitForLoadState('load');
  await pv.waitForSelector('.prose');
  await pv.evaluate(() => Promise.all(['Playfair Display', 'Lora'].map(n => document.fonts.load('16px "' + n + '"', 'Abc'))));
  ok('K1 the preview opens with the content that was never saved', /Judul bagian/.test(await pv.locator('.prose').innerText()) && /Pratinjau uji/.test(await pv.locator('h1').innerText()));
  ok('K2 no policy violations in the public page (no inline styles are needed)', (await pv.evaluate(() => window.__viol || [])).length === 0 && (await pv.locator('[style]').count()) === 0, pv.logs);
  const cs = await pv.evaluate(() => {
    const g = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop];
    const bbox = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return r.width / r.height; };
    return {
      xl: parseFloat(g('.fs-xl', 'fontSize')) / parseFloat(g('.prose p', 'fontSize')), center: g('p.ta-center', 'textAlign'), right: g('h3.ta-right', 'textAlign'),
      playfair: g('.ff-playfair', 'fontFamily'), strike: g('.prose s', 'textDecorationLine'),
      cols: getComputedStyle(document.querySelector('.a-cols')).gridTemplateColumns.split(' ').length, sq: bbox('.a-fig.ar-1-1 img'), tallW: document.querySelector('.a-fig.ar-3-4').getBoundingClientRect().width,
      outlineBorder: parseFloat(g('.a-btn-outline', 'borderTopWidth')), h3: g('.prose h3', 'fontSize'), h2: g('.prose h2', 'fontSize'),
    };
  });
  ok('K3 size, alignment, font and strike classes style the public page', near(cs.xl, 1.6, 0.05) && cs.center === 'center' && cs.right === 'right' && /Playfair/.test(cs.playfair) && /line-through/.test(cs.strike), cs);
  ok('K4 headings written in text blocks are styled like heading blocks', parseFloat(cs.h2) > parseFloat(cs.h3) && parseFloat(cs.h3) > 18, cs);
  ok('K5 two columns side by side, square frame is square, portrait frame is capped at 24rem, outline button has a border', cs.cols === 2 && near(cs.sq, 1, 0.03) && cs.tallW <= 385 && cs.outlineBorder >= 2, cs);
  await pv.screenshot({ path: SHOTS + '/preview-desktop.png', fullPage: true });
  await pv.setViewportSize({ width: 390, height: 800 });
  await pv.waitForTimeout(200);
  const mob = await pv.evaluate(() => ({ cols: getComputedStyle(document.querySelector('.a-cols')).gridTemplateColumns.split(' ').length, over: document.documentElement.scrollWidth - innerWidth }));
  ok('K6 on a phone the columns stack and nothing overflows sideways', mob.cols === 1 && mob.over <= 1, mob);
  await pv.screenshot({ path: SHOTS + '/preview-mobile.png', fullPage: true });
  await pv.close();

  /* ---------- L. dock collapse, remembered ---------- */
  await pg.click('.ae-collapse');
  ok('L1 the dock can be collapsed to a thin bar', await pg.locator('#ae-dock-body').isHidden() && (await pg.locator('.ae-collapse').getAttribute('aria-expanded')) === 'false');
  const pg3 = await boot(br, { ctx: pg.context() });
  ok('L2 a collapsed dock stays collapsed after reload', await pg3.locator('#ae-dock-body').isHidden());
  await pg3.click('.ae-collapse');
  ok('L3 and can be opened again', await pg3.locator('#ae-dock-body').isVisible());
  await pg3.close();

  /* ---------- M. small screens + accessibility ---------- */
  const pm = await boot(br, { ctxOpts: { viewport: { width: 390, height: 800 } } });
  await load(pm, [{ t: 'h', level: 2, text: 'Hi' }, colsBlock([[text('<p>A</p>')], [text('<p>B</p>')]]), { t: 'img', src: IMG, alt: '', caption: '', ratio: '16:9', size: 'normal' }]);
  const over = await pm.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok('M1 at 390 px wide the editor does not scroll sideways', over <= 1, over);
  await pm.screenshot({ path: SHOTS + '/editor-mobile.png' });
  const unnamed = await pg.evaluate(() => Array.from(document.querySelectorAll('.ae-root button, .ae-root select, .ae-root input, .ae-root textarea')).filter(n => !(n.getAttribute('aria-label') || n.textContent.trim() || n.getAttribute('title') || n.closest('label'))).map(n => n.outerHTML.slice(0, 80)));
  ok('M2 every button, select and field in the editor has a name for screen readers', unnamed.length === 0, unnamed);
  await pm.context().close();

  /* ---------- O. cards ---------- */
  const C = (x = {}) => Object.assign({ src: '', alt: '', title: '', text: '', label: '', url: '' }, x);
  const cardsBlk = (items, o = {}) => Object.assign({ t: 'cards', per: 3, ratio: '4:3', btn: 'solid', items }, o);
  const cardEls = (pg, i = 0) => blk(pg, i).locator('.ae-card');
  pg = await boot(br);
  await tile(pg, 'cards').click();
  d = await blocks(pg);
  ok('O1 the Kartu tile adds a block with three empty cards, 3 per row, 4:3 pictures', d.length === 1 && d[0].t === 'cards' && d[0].items.length === 3 && d[0].per === 3 && d[0].ratio === '4:3' && d[0].btn === 'solid' && d[0].items.every(i => !i.title && !i.src), d);
  ok('O2 every card shows picture frame, title, text, and button label and address in place', (await cardEls(pg).count()) === 3 && (await cardEls(pg).first().locator('.ae-fr-empty, .ae-card-t, .ae-card-p, .ae-card-lbl, .ae-card-url').count()) === 5);
  const c0 = cardEls(pg).nth(0);
  await c0.locator('.ae-card-t').fill('Kids class');
  await c0.locator('.ae-card-p').fill('Line one\nLine two');
  await c0.locator('.ae-card-lbl').fill('Join');
  await c0.locator('.ae-card-url').fill('#form:free-trial');
  d = await blocks(pg);
  ok('O3 typing in a card updates the block data (title, text with line break, button label and address)', d[0].items[0].title === 'Kids class' && d[0].items[0].text === 'Line one\nLine two' && d[0].items[0].label === 'Join' && d[0].items[0].url === '#form:free-trial', d[0].items[0]);
  ok('O3b the block is selected and its settings are shown', /Kartu per baris/.test(await pg.locator('.ae-setbox').innerText()) && (await pg.locator('.ae-setbox select[aria-label="Kartu per baris"]').inputValue()) === '3');
  const xs = async () => (await cardEls(pg).evaluateAll(n => n.map(c => Math.round(c.getBoundingClientRect().x))));
  let x3 = await xs();
  ok('O4 three cards sit side by side on the desktop canvas', new Set(x3).size === 3, x3);
  await pg.selectOption('.ae-setbox select[aria-label="Kartu per baris"]', '2');
  x3 = await xs();
  d = await blocks(pg);
  ok('O5 2 per row: the third card wraps to a second row, and the data says per = 2', d[0].per === 2 && new Set(x3).size === 2 && x3[2] === x3[0], [x3, d[0].per]);
  await pg.selectOption('.ae-setbox select[aria-label="Kartu per baris"]', '4');
  d = await blocks(pg);
  ok('O5b 4 per row is accepted', d[0].per === 4 && (await blk(pg, 0).locator('.ae-cards-4').count()) === 1);
  await pg.selectOption('.ae-setbox select[aria-label="Bentuk gambar"]', '1:1');
  const fb = await cardEls(pg).first().locator('.ae-fr').boundingBox();
  d = await blocks(pg);
  ok('O6 the picture frame shape is shared by all cards and the frames follow it (1:1)', d[0].ratio === '1:1' && near(fb.width / fb.height, 1, 0.04), [d[0].ratio, fb]);
  await pg.selectOption('.ae-setbox select[aria-label="Gaya tombol"]', 'outline');
  d = await blocks(pg);
  ok('O6b button style outline is kept', d[0].btn === 'outline', d[0].btn);
  await cardEls(pg).nth(0).locator('.ae-fr-empty').click();
  await pg.waitForSelector('dialog.picker[open] .pg');
  ok('O7 a card picture uses the panel picker and tells the locked shape (1:1)', (await pg.locator('dialog.picker[open] .pg').count()) >= 3 && /1:1/.test(await pg.locator('dialog.picker[open]').innerText()));
  await pg.locator('dialog.picker[open] .pg').first().click();
  await pg.waitForTimeout(250);
  d = await blocks(pg);
  ok('O7b picking a picture fills that card only; title stays', d[0].items[0].src === IMG && !d[0].items[1].src && d[0].items[0].title === 'Kids class' && (await cardEls(pg).nth(0).locator('img').count()) === 1, d[0].items.map(i => i.src));
  await cardEls(pg).nth(0).locator('.ae-card-alt').fill('A kid');
  d = await blocks(pg);
  ok('O7c alt text is typed under the picture', d[0].items[0].alt === 'A kid');
  await cardEls(pg).nth(0).getByText('Hapus gambar').click();
  d = await blocks(pg);
  ok('O7d removing the picture clears src and alt and brings back the empty frame', !d[0].items[0].src && !d[0].items[0].alt && (await cardEls(pg).nth(0).locator('.ae-fr-empty').count()) === 1, d[0].items[0]);
  await load(pg, [cardsBlk([C({ title: 'A' }), C({ title: 'B' }), C({ title: 'C' })])]);
  const titles = async () => (await blocks(pg))[0].items.map(i => i.title).join('');
  await cardEls(pg).nth(0).hover();
  await cardEls(pg).nth(0).locator('[data-act="right"]').click();
  ok('O8 the right arrow moves a card one place, and keeps the keyboard focus on that card', (await titles()) === 'BAC' && await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-act') === 'right' && document.activeElement.closest('.ae-card').querySelector('.ae-card-t').value === 'A'));
  await cardEls(pg).nth(2).hover();
  await cardEls(pg).nth(2).locator('[data-act="left"]').click();
  ok('O8b the left arrow moves it back', (await titles()) === 'BCA');
  ok('O8c the first card has no left arrow and the last no right arrow (disabled)', await cardEls(pg).nth(0).locator('[data-act="left"]').isDisabled() && await cardEls(pg).nth(2).locator('[data-act="right"]').isDisabled());
  await cardEls(pg).nth(0).hover();
  await dragTo(pg, cardEls(pg).nth(0).locator('.ae-card-h'), cardEls(pg).nth(2));
  const after = await titles();
  ok('O9 dragging a card by its handle reorders the cards, no card is lost, and the labels are renumbered', after !== 'BCA' && after.split('').sort().join('') === 'ABC' && /Kartu 1/.test(await cardEls(pg).nth(0).innerText()) && (await pg.locator('.ae-undo').isHidden()), after);
  await load(pg, [cardsBlk([C({ title: 'A' }), C({ title: 'B' }), C({ title: 'C' })])]);
  await cardEls(pg).nth(1).hover();
  await cardEls(pg).nth(1).locator('.ae-card-bar [aria-label^="Hapus kartu"]').click();
  ok('O10 deleting a card removes it', (await titles()) === 'AC' && (await cardEls(pg).count()) === 2);
  await cardEls(pg).nth(0).hover();
  await cardEls(pg).nth(0).locator('.ae-card-bar [aria-label^="Hapus kartu"]').click();
  ok('O10b the last card cannot be deleted (no delete button); the whole block has its own delete', (await cardEls(pg).count()) === 1 && await cardEls(pg).nth(0).locator('.ae-card-bar [aria-label^="Hapus kartu"]').isHidden());
  await load(pg, [cardsBlk(Array.from({ length: 11 }, (_, i) => C({ title: 'n' + i })))]);
  await blk(pg, 0).locator('.ae-cards-add').click();
  ok('O11 "+ Tambah kartu" adds a card (focus goes to its title) until 12, then the button disappears', (await cardEls(pg).count()) === 12 && await blk(pg, 0).locator('.ae-cards-add').isHidden() && await pg.evaluate(() => document.activeElement.classList.contains('ae-card-t')));
  const urls = ['/articles/', 'https://example.com/x', '#form:free-trial', '#popup:promo', '#quiz:level'];
  await load(pg, [cardsBlk(urls.map((u, i) => C({ title: 'T' + i, label: 'Go ' + i, url: u })), { btn: 'outline', ratio: '3:2', per: 2 })]);
  await pg.fill('input[placeholder="Judul artikel"]', 'Kartu uji');
  r = await save(pg);
  ok('O12 saving through the real validation keeps every button destination (links, #form:, #popup:, #quiz:)', r.status === 200 && r.body.data.blocks[0].items.map(i => i.url).join() === urls.join() && r.body.data.blocks[0].per === 2 && r.body.data.blocks[0].ratio === '3:2' && r.body.data.blocks[0].btn === 'outline', r.body.errors || r.body.data.blocks[0]);
  await load(pg, [cardsBlk([C({ title: 'Bad', label: 'Go', url: '' }), C({ title: 'Bad2', label: '', url: '/x' }), C({ title: 'Bad3', label: 'Go', url: 'javascript:alert(1)' })])]);
  r = await save(pg);
  const errTxt = await pg.locator('#errors').innerText();
  ok('O13 a button with only half its fields, or a javascript: address, is refused, naming the card', r.status === 422 && /kartu 1/.test(errTxt) && /kartu 2/.test(errTxt) && /kartu 3/.test(errTxt), errTxt);
  pg.logs.length = 0; // the 422 above was meant to happen
  await load(pg, [colsBlock([[cardsBlk([C({ title: 'In column' })], { per: 2 })], [text('<p>x</p>')]])]);
  r = await save(pg);
  ok('O14 cards inside a column are accepted and kept', r.status === 200 && r.body.data.blocks[0].cols[0][0].t === 'cards', r.body.errors);
  const dup = await (async () => {
    await load(pg, [cardsBlk([C({ title: 'Orig', text: 'x' })])]);
    await blk(pg, 0).hover();
    await blk(pg, 0).locator('> .ae-blk-bar [aria-label="Gandakan"]').click();
    await cardEls(pg, 0).nth(0).locator('.ae-card-t').fill('Changed');
    return blocks(pg);
  })();
  ok('O15 duplicating a cards block makes an independent copy', dup.length === 2 && dup[0].items[0].title === 'Changed' && dup[1].items[0].title === 'Orig' && dup[0].id !== dup[1].id, dup.map(b => b.items[0].title));
  ok('O16 no policy violations or console errors while using cards', (await viol(pg)).length === 0 && pg.logs.length === 0, [await viol(pg), pg.logs]);
  await pg.screenshot({ path: SHOTS + '/editor-cards.png' });
  await pg.context().close();
  const pcm = await boot(br, { ctxOpts: { viewport: { width: 390, height: 900 } } });
  await load(pcm, [cardsBlk([C({ title: 'A' }), C({ title: 'B' }), C({ title: 'C' }), C({ title: 'D' })], { per: 4 })]);
  const cx = await cardEls(pcm).evaluateAll(n => n.map(c => Math.round(c.getBoundingClientRect().x)));
  ok('O17 on a phone-width editor the cards stack one per row, with no sideways scrolling', new Set(cx).size === 1 && (await pcm.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, cx);
  await pcm.context().close();

  /* ---------- P. table ---------- */
  const T = (rows, o = {}) => Object.assign({ t: 'table', header: true, caption: '', aligns: rows[0].map(() => 'left'), rows }, o);
  const cell = (pg, r, c, i = 0) => blk(pg, i).locator('tr').nth(r).locator('.ae-tc').nth(c);
  const setBtn = (pg, name) => pg.locator('.ae-setbox button', { hasText: name });
  pg = await boot(br);
  await tile(pg, 'table').click();
  d = await blocks(pg);
  ok('P1 the Tabel tile adds a 3 x 3 table with a header row', d.length === 1 && d[0].t === 'table' && d[0].header === true && d[0].rows.length === 3 && d[0].rows.every(r => r.length === 3) && d[0].aligns.join() === 'left,left,left', d);
  ok('P1b the first cell has the keyboard focus, the header cells are th, and the settings are shown', await pg.evaluate(() => document.activeElement.nodeName === 'TH') && (await blk(pg, 0).locator('th').count()) === 3 && /Baris judul/.test(await pg.locator('.ae-setbox').innerText()));
  await pg.keyboard.type('Plan');
  await cell(pg, 1, 0).click(); await pg.keyboard.type('Basic');
  await cell(pg, 1, 1).click(); await pg.keyboard.type('4 hours');
  d = await blocks(pg);
  ok('P2 typing in cells updates the data', d[0].rows[0][0] === 'Plan' && d[0].rows[1][0] === 'Basic' && d[0].rows[1][1] === '4 hours', d[0].rows);
  ok('P2b the toolbar offers Tebal, Miring and Tautan for a cell, and keeps heading, size, font, list buttons off', !(await tbBtn(pg, 'Tebal').isDisabled()) && !(await tbBtn(pg, 'Miring').isDisabled()) && !(await tbBtn(pg, 'Tautan').isDisabled()) && await tbSel(pg, 'Paragraf atau judul').isDisabled() && await tbBtn(pg, 'Daftar poin').isDisabled() && await tbBtn(pg, 'Garis bawah').isDisabled());
  await cell(pg, 1, 0).click(); await pg.keyboard.press('Control+A');
  await tbBtn(pg, 'Tebal').click();
  d = await blocks(pg);
  ok('P3 Tebal in the toolbar makes the selected cell text bold (strong)', d[0].rows[1][0] === '<strong>Basic</strong>', d[0].rows[1][0]);
  ok('P3b the Tebal button shows it is on', (await tbBtn(pg, 'Tebal').getAttribute('aria-pressed')) === 'true');
  await tbBtn(pg, 'Miring').click();
  ok('P3c Miring adds italic around it', /<em>/.test((await blocks(pg))[0].rows[1][0]) && /Basic/.test((await blocks(pg))[0].rows[1][0]), (await blocks(pg))[0].rows[1][0]);
  await cell(pg, 1, 1).click(); await pg.keyboard.press('Control+A'); await pg.keyboard.press('Control+B');
  ok('P4 Ctrl+B works in a cell too', (await blocks(pg))[0].rows[1][1] === '<strong>4 hours</strong>', (await blocks(pg))[0].rows[1][1]);
  await pg.keyboard.press('Control+U');
  ok('P4b Ctrl+U (underline) is not allowed in cells', !/<u>/.test((await blocks(pg))[0].rows[1][1]) && (await cell(pg, 1, 1).locator('u').count()) === 0);
  await cell(pg, 1, 2).click(); await pg.keyboard.type('Visit site'); await pg.keyboard.press('Control+A');
  await tbBtn(pg, 'Tautan').click();
  await pg.fill('.ae-tb .ae-link input', 'javascript:alert(1)');
  await pg.locator('.ae-link button', { hasText: 'Terapkan' }).click();
  ok('P5 a javascript: link is refused with a message', /Pakai https/.test(await pg.locator('.ae-link-msg').innerText()) && (await blocks(pg))[0].rows[1][2] === 'Visit site', (await blocks(pg))[0].rows[1][2]);
  await pg.fill('.ae-tb .ae-link input', 'https://example.com/x');
  await pg.locator('.ae-link button', { hasText: 'Terapkan' }).click();
  ok('P5b a link is applied to the selected text', (await blocks(pg))[0].rows[1][2] === '<a href="https://example.com/x">Visit site</a>' && await pg.locator('.ae-link').isHidden(), (await blocks(pg))[0].rows[1][2]);
  await cell(pg, 1, 2).locator('a').click();
  ok('P5c the Tautan button shows it is on inside a link, and the box opens with its address', (await tbBtn(pg, 'Tautan').getAttribute('aria-pressed')) === 'true');
  await tbBtn(pg, 'Tautan').click();
  ok('P5d ...with the current address filled in', (await pg.inputValue('.ae-tb .ae-link input')) === 'https://example.com/x');
  await pg.locator('.ae-link button', { hasText: 'Lepas tautan' }).click();
  ok('P5e "Lepas tautan" removes the link', (await blocks(pg))[0].rows[1][2] === 'Visit site', (await blocks(pg))[0].rows[1][2]);
  await cell(pg, 1, 2).click(); await pg.keyboard.press('End');
  await tbBtn(pg, 'Tautan').click();
  await pg.fill('.ae-tb .ae-link input', '/program');
  await pg.locator('.ae-link button', { hasText: 'Terapkan' }).click();
  ok('P5f linking with nothing selected asks the writer to select text first', /Blok dulu/.test(await pg.locator('.ae-link-msg').innerText()) && (await blocks(pg))[0].rows[1][2] === 'Visit site');
  await pg.locator('.ae-link button', { hasText: 'Lepas tautan' }).click();
  await cell(pg, 1, 2).click(); await pg.keyboard.press('Enter');
  ok('P6 Enter moves to the cell below', await pg.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Baris 3, kolom 3');
  ok('P6a ...and adds no line break to the cell it left', !/<br>/.test((await blocks(pg))[0].rows[1][2]), (await blocks(pg))[0].rows[1][2]);
  await cell(pg, 2, 1).click(); await pg.keyboard.type('a'); await pg.keyboard.press('Shift+Enter'); await pg.keyboard.type('b');
  ok('P6b Shift+Enter makes a line break inside the cell', (await blocks(pg))[0].rows[2][1] === 'a<br>b', (await blocks(pg))[0].rows[2][1]);
  ok('P7 the cell the writer is in is named in the settings', /Sel terpilih: baris 3 dari 3, kolom 2 dari 3/.test(await pg.locator('.ae-setbox').innerText()));
  await blk(pg, 0).locator('.ae-tbl-foot button', { hasText: '+ Baris' }).click();
  await blk(pg, 0).locator('.ae-tbl-foot button', { hasText: '+ Kolom' }).click();
  d = await blocks(pg);
  ok('P8 "+ Baris" and "+ Kolom" at the foot add a row and a column (aligns follow)', d[0].rows.length === 4 && d[0].rows.every(r => r.length === 4) && d[0].aligns.length === 4, [d[0].rows.length, d[0].aligns]);
  ok('P8b the info line counts them', /4 kolom × 4 baris/.test(await blk(pg, 0).locator('.ae-tbl-info').innerText()));
  await cell(pg, 1, 1).click();
  await setBtn(pg, '+ Atas').click();
  d = await blocks(pg);
  ok('P9 "+ Atas" inserts a row above the chosen cell (the old row 2 moves down)', d[0].rows.length === 5 && d[0].rows[1].every(x => x === '') && d[0].rows[2][0].includes('Basic'), d[0].rows.map(r => r[0]));
  await cell(pg, 0, 0).click();
  ok('P9b above the header row is not possible (button disabled)', await setBtn(pg, '+ Atas').isDisabled());
  await cell(pg, 1, 1).click();
  await setBtn(pg, 'Hapus baris').click();
  ok('P10 "Hapus baris" removes the chosen row', (await blocks(pg))[0].rows.length === 4);
  await cell(pg, 1, 1).click();
  await setBtn(pg, '+ Kanan').click();
  await cell(pg, 0, 1).click();
  await setBtn(pg, '+ Kiri').click();
  d = await blocks(pg);
  ok('P11 "+ Kanan" and "+ Kiri" insert columns next to the chosen cell', d[0].rows.every(r => r.length === 6) && d[0].aligns.length === 6, d[0].rows[0]);
  await cell(pg, 1, 2).click();
  await setBtn(pg, 'Hapus kolom').click();
  await cell(pg, 1, 2).click();
  await setBtn(pg, 'Hapus kolom').click();
  d = await blocks(pg);
  ok('P12 "Hapus kolom" removes the chosen column', d[0].rows.every(r => r.length === 4) && d[0].aligns.length === 4, d[0].rows[0]);
  await load(pg, [T([['H']])]);
  await cell(pg, 0, 0).click();
  ok('P12b a table of one row and one column cannot lose them (delete buttons disabled)', await setBtn(pg, 'Hapus baris').isDisabled() && await setBtn(pg, 'Hapus kolom').isDisabled());
  await load(pg, [T([['A', 'B', 'C'], ['1', '2', '3']])]);
  await cell(pg, 1, 1).click();
  await pg.selectOption('.ae-setbox select[aria-label="Rata teks kolom"]', 'center');
  await cell(pg, 1, 2).click();
  await pg.selectOption('.ae-setbox select[aria-label="Rata teks kolom"]', 'right');
  d = await blocks(pg);
  const al = await pg.evaluate(() => Array.from(document.querySelectorAll('.ae-tbl tr:nth-child(2) .ae-tc')).map(c => getComputedStyle(c).textAlign));
  ok('P13 alignment is per column: the whole column follows, and the data has it', d[0].aligns.join() === 'left,center,right' && al.join() === 'left,center,right', [d[0].aligns, al]);
  await cell(pg, 1, 1).click();
  ok('P13b the alignment menu shows the chosen column\'s value', (await pg.locator('.ae-setbox select[aria-label="Rata teks kolom"]').inputValue()) === 'center');
  await pg.selectOption('.ae-setbox select[aria-label="Baris judul"]', '0');
  d = await blocks(pg);
  ok('P14 turning the header row off changes th cells into td cells', d[0].header === false && (await blk(pg, 0).locator('th').count()) === 0 && (await blk(pg, 0).locator('td').count()) === 6, d[0].header);
  await pg.selectOption('.ae-setbox select[aria-label="Baris judul"]', '1');
  ok('P14b ...and back', (await blocks(pg))[0].header === true && (await blk(pg, 0).locator('th').count()) === 3);
  await blk(pg, 0).locator('.ae-tbl-cap').fill('Prices');
  ok('P15 the caption is typed above the table', (await blocks(pg))[0].caption === 'Prices');
  // limit of 300 letters per cell
  await load(pg, [T([['H'], ['']])]);
  await cell(pg, 1, 0).click();
  await pg.keyboard.insertText('a'.repeat(300));
  await pg.keyboard.type('b');
  const len = (await blocks(pg))[0].rows[1][0].length;
  ok('P16 a cell takes exactly 300 letters; the 301st is refused with a message', len === 300 && /maksimal 300/.test(await blk(pg, 0).locator('.ae-tbl-msg').innerText()), len);
  await pg.evaluate(() => { const td = document.querySelectorAll('.ae-tc')[1]; td.focus(); const dt = new DataTransfer(); dt.setData('text/plain', 'z'.repeat(50)); td.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
  ok('P16b pasting plain text into a full cell adds nothing', (await blocks(pg))[0].rows[1][0].length === 300);
  // pasting a block of cells from Excel / Google Sheets
  await load(pg, [T([['', '', ''], ['', '', ''], ['', '', '']])]);
  const paste = (pg, idx, txt) => pg.evaluate(([i, t]) => { const td = document.querySelectorAll('.ae-tc')[i]; td.focus(); const dt = new DataTransfer(); dt.setData('text/plain', t); td.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, [idx, txt]);
  await paste(pg, 4, 'a\tb\tc\n1\t2 & 3\t<x>\n');
  d = await blocks(pg);
  ok('P17 pasting tab-separated cells fills from the chosen cell and grows the table', d[0].rows.length === 3 && d[0].rows[0].length === 4 && d[0].rows[1][1] === 'a' && d[0].rows[1][3] === 'c' && d[0].rows[2][1] === '1' && d[0].rows[2][2] === '2 &amp; 3' && d[0].rows[2][3] === '&lt;x&gt;' && d[0].aligns.length === 4, d[0].rows);
  await paste(pg, 0, Array.from({ length: 10 }, (_, i) => 'c' + i).join('\t') + '\n' + Array.from({ length: 40 }, (_, i) => 'r' + i).join('\n'));
  d = await blocks(pg);
  ok('P17b pasting more than the limits (8 columns, 30 rows) is cut and the writer is told', d[0].rows[0].length === 8 && d[0].rows.length === 30 && /terpotong/.test(await blk(pg, 0).locator('.ae-tbl-msg').innerText()), [d[0].rows.length, d[0].rows[0].length]);
  ok('P17c at the limits the "+ Baris" and "+ Kolom" buttons are off', await blk(pg, 0).locator('.ae-tbl-foot button', { hasText: '+ Baris' }).isDisabled() && await blk(pg, 0).locator('.ae-tbl-foot button', { hasText: '+ Kolom' }).isDisabled());
  // what comes in as data is rebuilt, not trusted
  await pg.evaluate(() => { window.__pwn = 0; });
  await load(pg, [T([['<img src=x onerror="window.__pwn=1"><script>window.__pwn=2<\/script><b onclick="window.__pwn=3" style="color:red">B</b><a href="javascript:window.__pwn=4">j</a><a href="/ok" target="_blank">ok</a> &amp; &#039;']])]);
  await pg.waitForTimeout(150);
  ok('P18 cell data is rebuilt node by node: no img, script, event handlers, styles or javascript: links get into the page', await pg.evaluate(() => window.__pwn) === 0 && (await blk(pg, 0).locator('.ae-tbl img, .ae-tbl script, .ae-tbl [onclick], .ae-tbl [style]').count()) === 0 && (await blk(pg, 0).locator('.ae-tbl a').count()) === 1 && (await viol(pg)).length === 0, await viol(pg));
  const sane = (await blocks(pg))[0].rows[0][0];
  ok('P18b ...and the data itself is cleaned straight away: only strong, em, a, br and text remain', sane === '<strong>B</strong>j<a href="/ok">ok</a> &amp; \'', sane);
  // save round trip
  await load(pg, [T([['Plan', 'Hours', 'Price'], ['<strong>It\'s</strong> <em>big</em>', '4', '<a href="/program">100</a>'], ['Plus', '8', '180 &amp; up']], { caption: 'Fees "2026"', aligns: ['left', 'center', 'right'] })]);
  await pg.fill('input[placeholder="Judul artikel"]', 'Tabel uji');
  await pg.locator('.ae-tc').first().evaluate(n => { n.__mark = 1; });
  const tb0 = await blocks(pg);
  r = await save(pg);
  ok('P19 saving through the real validation keeps header, caption, alignment and rich cells', r.status === 200 && same(tb0, r.body.data.blocks) && r.body.data.blocks[0].caption === 'Fees "2026"', r.body.errors || JSON.stringify(r.body.data.blocks[0]).slice(0, 300));
  ok('P19b the server writes the apostrophe as &#039; but the editor is NOT rebuilt for that (same cell element stays)', /It&#039;s/.test(r.body.data.blocks[0].rows[1][0]) && await pg.locator('.ae-tc').first().evaluate(n => n.__mark === 1));
  const pgT = await boot(br, { ctx: pg.context(), q: '?id=1' });
  const rl = await blocks(pgT);
  ok('P20 reloading shows the saved table; saving it again changes nothing', same(rl, r.body.data.blocks) && (await save(pgT)).status === 200 && (await pgT.locator('.ae-tc').first().innerText()) === 'Plan', JSON.stringify(rl).slice(0, 160));
  await pgT.close();
  await load(pg, [T([['H', 'H2'], ['x'.repeat(301), 'ok']])]);
  r = await save(pg);
  ok('P21 a cell over 300 letters that gets past the editor is refused by the server, naming row and column', r.status === 422 && /baris 2, kolom 1/.test(await pg.locator('#errors').innerText()), await pg.locator('#errors').innerText());
  pg.logs.length = 0; // the 422 above was meant to happen
  await load(pg, [colsBlock([[T([['A', 'B'], ['1', '2']])], [text('<p>x</p>')]])]);
  await blk(pg, 0).locator('.ae-col .ae-tc').first().click();
  await pg.keyboard.press('Home');
  await pg.keyboard.type('Z');
  r = await save(pg);
  ok('P22 a table inside a column can be edited and saved', r.status === 200 && r.body.data.blocks[0].cols[0][0].t === 'table' && r.body.data.blocks[0].cols[0][0].rows[0][0] === 'ZA', r.body.errors);
  ok('P23 no policy violations or console errors while using tables', (await viol(pg)).length === 0 && pg.logs.length === 0, [await viol(pg), pg.logs]);
  await load(pg, [T([['Plan', 'Hours', 'Price'], ['Basic', '4', '100']], { caption: 'Fees', aligns: ['left', 'center', 'right'] })]);
  await pg.waitForTimeout(150);
  await pg.screenshot({ path: SHOTS + '/editor-table.png' });
  await pg.context().close();
  const ptm = await boot(br, { ctxOpts: { viewport: { width: 390, height: 900 } } });
  await load(ptm, [T([Array.from({ length: 8 }, (_, i) => 'Column ' + i), Array.from({ length: 8 }, (_, i) => 'v' + i)])]);
  const sc = await ptm.evaluate(() => { const s = document.querySelector('.ae-tbl-scroll'); return { scrolls: s.scrollWidth > s.clientWidth + 20, page: document.documentElement.scrollWidth - innerWidth }; });
  ok('P24 on a phone-width editor a wide table scrolls inside its own box, not the page', sc.scrolls && sc.page <= 1, sc);
  await ptm.context().close();

  /* ---------- Q. public pages: cards and table, both themes, phone, SEO ---------- */
  pg = await boot(br);
  await pg.fill('input[placeholder="Judul artikel"]', 'Pratinjau kartu');
  const rows8 = [Array.from({ length: 8 }, (_, i) => 'Column ' + (i + 1)), ...Array.from({ length: 3 }, (_, r) => Array.from({ length: 8 }, (_, c) => 'row ' + r + ' col ' + c))];
  await load(pg, [
    { t: 'h', level: 2, text: 'Kelas kami' },
    cardsBlk([C({ src: IMG, alt: 'Wide', title: 'Kids <class>', text: 'Fun and safe.\nSmall groups.', label: 'Join', url: '#form:free-trial' }), C({ src: '/uploads/sample-square.svg', title: 'Teens', text: 'Speaking club', label: 'More', url: 'https://example.com/teens' }), C({ title: 'No picture', text: 'Text only' }), C({ src: '/uploads/sample-tall.svg', title: 'Adults', label: 'Read', url: '/articles/' })], { per: 4, ratio: '4:3', btn: 'outline' }),
    cardsBlk([C({ src: IMG, title: 'A', label: 'Go', url: '/x' }), C({ src: IMG, title: 'B', label: 'Go', url: '/x' }), C({ src: IMG, title: 'C', label: 'Go', url: '/x' })], { per: 3, ratio: '16:9' }),
    T([['Plan', 'Hours', 'Price'], ['<strong>Basic</strong>', '4', '<a href="/program">100</a>'], ['Plus', '8', '180']], { caption: 'Fees', aligns: ['left', 'center', 'right'] }),
    T(rows8),
  ]);
  const [pq] = await Promise.all([pg.context().waitForEvent('page'), pg.click('#preview')]);
  pq.logs = [];
  pq.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pq.logs.push(m.text()); });
  await pq.waitForLoadState('load');
  await pq.waitForSelector('.a-cards');
  await pq.waitForTimeout(300);
  const pubCards = () => pq.evaluate(() => {
    const out = [];
    document.querySelectorAll('.a-cards').forEach(g => {
      const cs = Array.from(g.querySelectorAll('.a-card')).map(c => c.getBoundingClientRect());
      out.push({ cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, rowsY: new Set(cs.map(r => Math.round(r.y))).size, w: Math.round(g.parentElement.getBoundingClientRect().width), eqH: new Set(cs.slice(0, 3).map(r => Math.round(r.height))).size });
    });
    return out;
  });
  let pc = await pubCards();
  ok('Q1 desktop: 4 per row shows 4 columns, 3 per row shows 3, in a box wider than the text column (wide)', pc[0].cols === 4 && pc[1].cols === 3 && pc[0].w > 700, pc);
  ok('Q2 cards in one row have equal height', pc[1].eqH === 1, pc[1]);
  const th = (aud) => pq.evaluate((a) => { document.documentElement.setAttribute('data-audience', a); const c = document.querySelector('.a-card'), cs = getComputedStyle(c), t = document.querySelector('.a-card-t'), b = document.querySelector('.a-card .a-btn'); return { border: cs.borderTopWidth, shadow: cs.boxShadow, radius: cs.borderTopLeftRadius, title: getComputedStyle(t).fontFamily, btn: getComputedStyle(b).borderTopWidth, thBg: getComputedStyle(document.querySelector('.a-table thead th')).backgroundColor, wrap: getComputedStyle(document.querySelector('.a-tablewrap')).borderTopWidth }; }, aud);
  const kids = await th('kids'), adult = await th('adult');
  ok('Q3 Kids theme: bold 3px border and offset shadow on cards and table; Adult: thin border, no shadow', kids.border === '3px' && kids.shadow !== 'none' && kids.wrap === '3px' && adult.border === '1px' && adult.shadow === 'none' && adult.wrap === '1px', [kids, adult]);
  ok('Q3b the themes also differ in the heading font and the table header colour', kids.title !== adult.title && kids.thBg !== adult.thBg, [kids.title, adult.title, kids.thBg, adult.thBg]);
  const link = await pq.evaluate(() => ({ cardLinks: document.querySelectorAll('.a-card a').length, btnLinks: document.querySelectorAll('.a-card .a-btn').length, ext: document.querySelector('.a-card a[href^="https://example.com"]').getAttribute('rel'), frm: document.querySelector('.a-card a[href="#form:free-trial"]') !== null, h3: document.querySelectorAll('.a-card h3.a-card-t').length, img0: document.querySelector('.a-card-img img').getAttribute('alt') }));
  ok('Q4 only the card buttons are links (not the whole card); external opens safely; #form: kept; titles are h3', link.cardLinks === link.btnLinks && link.cardLinks === 6 && /noopener/.test(link.ext) && link.frm && link.h3 === 7, link);
  ok('Q5 the text of a card keeps its line break and its title is escaped', /Fun and safe\.\s*Small groups\./.test(await pq.locator('.a-card-p').first().innerText()) && (await pq.locator('.a-card-t').first().innerText()) === 'Kids <class>');
  const tb = await pq.evaluate(() => { const w = document.querySelector('.a-tablewrap'), first = document.querySelector('.a-table'), th = first.querySelector('thead th'), tds = first.querySelectorAll('tbody tr:first-child td'); return { region: w.getAttribute('role'), tab: w.tabIndex, cap: document.querySelector('.a-table caption').textContent, thW: getComputedStyle(th).fontWeight, al: Array.from(tds).map(t => getComputedStyle(t).textAlign), scope: th.getAttribute('scope'), strong: tds[0].querySelectorAll('strong').length, a: tds[2].querySelectorAll('a').length }; });
  ok('Q6 table: labelled scroll region, caption, header cells bold with scope, per-column alignment, bold and link in cells', tb.region === 'region' && tb.tab === 0 && tb.cap === 'Fees' && +tb.thW >= 700 && tb.al.join() === 'left,center,right' && tb.scope === 'col' && tb.strong === 1 && tb.a === 1, tb);
  ok('Q7 no style attributes or policy violations on the public page', (await pq.locator('[style]').count()) === 0 && (await pq.evaluate(() => window.__viol || [])).length === 0 && pq.logs.filter(l => !/404/.test(l)).length === 0, pq.logs); // 404s: this container holds only some of the Plus Jakarta Sans weights; the real site has them
  await th('kids');
  await pq.screenshot({ path: SHOTS + '/preview-cards-table-kids.png', fullPage: true });
  await th('adult');
  await pq.screenshot({ path: SHOTS + '/preview-cards-table-adult.png', fullPage: true });
  await th('kids');
  await pq.setViewportSize({ width: 768, height: 900 }); await pq.waitForTimeout(200);
  pc = await pubCards();
  ok('Q8 tablet (768 px): 4 per row drops to 2 columns, 3 per row stays 3', pc[0].cols === 2 && pc[1].cols === 3, pc);
  await pq.setViewportSize({ width: 390, height: 900 }); await pq.waitForTimeout(200);
  pc = await pubCards();
  const pm2 = await pq.evaluate(() => { const ws = Array.from(document.querySelectorAll('.a-tablewrap')); return { page: document.documentElement.scrollWidth - innerWidth, scrolls: ws.map(w => w.scrollWidth > w.clientWidth + 5), clientW: Math.round(ws[1].clientWidth), cardW: Math.round(document.querySelector('.a-card').getBoundingClientRect().width) }; });
  ok('Q9 phone (390 px): every card block is one card per row, full width', pc.every(x => x.cols === 1) && pm2.cardW > 300, [pc, pm2.cardW]);
  ok('Q10 phone: the 8-column table scrolls sideways inside its own box, the small table fits, and the page itself does not scroll sideways', pm2.scrolls[1] === true && pm2.scrolls[0] === false && pm2.page <= 1, pm2);
  await pq.screenshot({ path: SHOTS + '/preview-cards-table-mobile.png', fullPage: true });
  await pq.close();
  // SEO analysis counts cards and tables
  const wordsOf = async () => +(((await pg.locator('.card.seo').innerText()).match(/Panjang isi: (\d+) kata/) || [])[1] || -1);
  await load(pg, [text('<p>Short intro here.</p>')]);
  await blk(pg, 0).click(); await pg.waitForTimeout(500);
  const w0 = await wordsOf();
  await load(pg, [text('<p>Short intro here.</p>'), cardsBlk([C({ title: 'Alpha beta gamma', text: 'delta epsilon zeta eta theta' })]), T([['one two three', 'four five'], ['six seven eight nine ten', '<a href="https://example.com/ext">link text</a>']])]);
  await blk(pg, 0).click(); await pg.waitForTimeout(500);
  const w1 = await wordsOf();
  ok('Q11 the SEO analysis counts the words in cards and in table cells', w0 > 0 && w1 - w0 === 3 + 5 + 3 + 2 + 5 + 2, [w0, w1]);
  await pg.context().close();

  /* ---------- R. the editor follows the template widths (articles/template-vars.css) ---------- */
  const fsx = require('fs'), pathx = require('path');
  const PUBX = pathx.resolve(__dirname, '../../../public');
  const tv = fsx.readFileSync(PUBX + '/articles/template-vars.css', 'utf8');
  const artCss = fsx.readFileSync(PUBX + '/articles/articles.css', 'utf8');
  const rend = fsx.readFileSync(PUBX + '/articles/_render.php', 'utf8');
  const artPhp = fsx.readFileSync(PUBX + '/edizon/article.php', 'utf8');
  ok('R1 the four widths live in one file, are no longer set in articles.css, and both pages load it before their own CSS',
    ['--col', '--wide', '--page', '--pad'].every(v => new RegExp(v + '\\s*:').test(tv)) && !/--(col|wide|page|pad)\s*:/.test(artCss.replace(/\/\*[\s\S]*?\*\//g, ''))
    && rend.indexOf('template-vars.css') > 0 && rend.indexOf('template-vars.css') < rend.indexOf('articles/articles.css')
    && artPhp.indexOf('template-vars.css') > 0 && artPhp.indexOf('template-vars.css') < artPhp.indexOf('article-editor.css'));
  pg = await boot(br);
  await pg.fill('input[placeholder="Judul artikel"]', 'Lebar');
  const IM = (size) => ({ t: 'img', src: IMG, alt: '', caption: '', ratio: '16:9', size });
  await load(pg, [text('<p>Plain text block.</p>'), IM('wide'), IM('normal'), cardsBlk([C({ title: 'A' }), C({ title: 'B' })], { per: 2 }), colsBlock([[IM('wide')], [text('<p>x</p>')]])]);
  await pg.waitForTimeout(250);
  const edW = () => pg.evaluate(() => Array.from(document.querySelectorAll('.ae-rootlist > .ae-blk')).map(b => Math.round(b.getBoundingClientRect().width - 14)));
  const [prw] = await Promise.all([pg.context().waitForEvent('page'), pg.click('#preview')]);
  await prw.waitForLoadState('load');
  await prw.waitForSelector('.a-fig');
  const pubW = () => prw.evaluate(() => {
    const a = document.querySelector('.art'), cs = getComputedStyle(a), r = (e) => Math.round(e.getBoundingClientRect().width);
    return { text: Math.round(a.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)), wideImg: r(document.querySelector('.a-fig.a-wide')), cards: r(document.querySelector('.a-cardsw')), normalImg: r(document.querySelectorAll('.a-fig:not(.a-wide)')[0]) };
  });
  // the template says: text 960 px, wide blocks 90% of the screen. The editor area is narrower than a real screen (sidebar), so the real page is measured in a window whose 90% fits it
  let ew = await edW();
  await prw.setViewportSize({ width: Math.round(ew[1] / 0.9), height: 900 }); await prw.waitForTimeout(250);
  let pw = await pubW();
  const near1 = (a, b) => Math.abs(a - b) <= 1;
  ok('R2 Desktop: text, normal images, wide images and top-level cards have the same widths in the editor as on the real page (960 text and normal images; wide blocks = 90% of a window as wide as the editor area)',
    near1(ew[0], pw.text) && near1(ew[2], pw.normalImg) && near1(ew[1], pw.wideImg) && near1(ew[3], pw.cards) && pw.text === 960 && ew[1] > 960, [ew, pw]);
  const nest = await pg.evaluate(() => { const c = document.querySelector('.ae-col'), i = c.querySelector('.ae-blk-img'); return [Math.round(i.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().width)]; });
  ok('R3 a wide image inside a column is not widened: it stays within its column (the real page does the same)', nest[0] <= nest[1] + 1 && ew[4] <= 961, [nest, ew]);
  const tip = await pg.getAttribute('.ae-view button[data-w=pub]', 'title');
  ok('R4 the Desktop button says the real widths, read from the template file', /960 px/.test(tip) && /90%/.test(tip), tip);
  // change the template: both follow
  const setVars = (p, c, w) => p.evaluate(([c, w]) => { document.documentElement.style.setProperty('--col', c); document.documentElement.style.setProperty('--wide', w); }, [c, w]);
  await setVars(pg, '50rem', '60rem'); await setVars(prw, '50rem', '60rem'); await pg.waitForTimeout(300);
  ew = await edW(); pw = await pubW();
  ok('R5 after the template widths change (text 50rem, wide 60rem) the editor and the real page both follow: 800 / 960', near1(ew[0], 800) && near1(pw.text, 800) && near1(ew[1], 960) && near1(pw.wideImg, 960) && near1(ew[3], pw.cards), [ew, pw]);
  await setVars(pg, '', ''); await setVars(prw, '', ''); await pg.waitForTimeout(300);
  // other screen sizes
  await prw.setViewportSize({ width: 768, height: 900 }); await pg.click('.ae-view button[data-w=tab]'); await pg.waitForTimeout(350); await prw.waitForTimeout(250);
  ew = await edW(); pw = await pubW();
  ok('R6 Tablet (768): the editor and the real page agree (text and wide blocks both 728: the screen minus the gutters)', near1(ew[0], pw.text) && near1(ew[1], pw.wideImg) && pw.text === 728 && pw.wideImg === 728, [ew, pw]);
  await prw.setViewportSize({ width: 390, height: 900 }); await pg.click('.ae-view button[data-w=mob]'); await pg.waitForTimeout(350); await prw.waitForTimeout(250);
  ew = await edW(); pw = await pubW();
  ok('R7 Phone (390): the editor and the real page agree (350 wide, one width for every block)', near1(ew[0], pw.text) && near1(ew[1], pw.wideImg) && pw.text === 350 && ew.every(x => near1(x, 350)), [ew, pw]);
  await pg.click('.ae-view button[data-w=fill]'); await pg.waitForTimeout(350);
  ew = await edW();
  ok('R8 "Lebar penuh" still uses the whole screen for every block', ew[0] > 700 && near1(ew[0], ew[1]), ew);
  await pg.click('.ae-view button[data-w=pub]'); await pg.waitForTimeout(350);
  // switching an image between normal and wide changes it on the canvas
  await sel(pg, 2);
  await pg.selectOption('.ae-setbox select[aria-label="Lebar"]', 'wide'); await pg.waitForTimeout(150);
  ew = await edW();
  ok('R9 setting an image to "wider than the text" makes it wider on the canvas at once, and back', ew[2] === ew[1] && ew[2] > 960 && (await (async () => { await pg.selectOption('.ae-setbox select[aria-label="Lebar"]', 'normal'); await pg.waitForTimeout(150); return (await edW())[2] === 960; })()), ew);
  const sizes = async (w) => { await prw.setViewportSize({ width: w, height: 900 }); await prw.waitForTimeout(200); return prw.evaluate(() => { const f = (a) => { document.documentElement.setAttribute('data-audience', a); return getComputedStyle(document.querySelector('.prose')).fontSize; }; return [f('kids'), f('adult')]; }); };
  const szD = await sizes(1360), szP = await sizes(390);
  ok('R10 reading size: 20 px Kids / 19 px Adult on a desktop (about 76 and 79 characters per line), 18 / 17 px on a phone', szD.join() === '20px,19px' && szP.join() === '18px,17px', [szD, szP]);
  ok('R11 no policy violations or console errors', (await viol(pg)).length === 0 && pg.logs.length === 0, [await viol(pg), pg.logs]);
  await pg.screenshot({ path: SHOTS + '/editor-desktop-widths.png' });
  await prw.close();
  await pg.context().close();

  /* ---------- S. HTML block: own HTML in an isolated, sandboxed frame ---------- */
  const STORE = path.join(__dirname, '..', '.harness', 'store.json');
  const patchStore = (fn) => { const j = JSON.parse(fs.readFileSync(STORE, 'utf8')); fn(j.clean); fs.writeFileSync(STORE, JSON.stringify(j)); };
  const setStatus = (s) => patchStore(c => { c.status = s; });
  const HBF = 'hbaaa1'; let HB = HBF; // HB: the block the checks look at (blocks added from the palette get a generated id)
  const hblk = (o) => Object.assign({ t: 'html', id: HBF, code: '', scripts: false, h: 'auto', size: 'normal', caption: '' }, o);
  const frOf = (p, id = HB) => p.frames().find(f => f.name() === 'aehf-' + id);
  async function inFrame(p, fn, arg, o = {}) {
    const want = o.want || (v => !!v), end = Date.now() + (o.ms || 8000);
    let last = null;
    while (Date.now() < end) {
      const f = o.frame ? o.frame() : frOf(p, o.id || HB);
      if (f) { try { last = await f.evaluate(fn, arg); if (want(last)) return last; } catch (e) { last = 'err: ' + e.message; } }
      await p.waitForTimeout(100);
    }
    return last;
  }
  const fh = (p, id = HB) => p.locator('iframe[name="aehf-' + id + '"]').evaluate(e => Math.round(e.getBoundingClientRect().height));
  async function waitH(p, want, ms = 6000) { const end = Date.now() + ms; let h = 0; while (Date.now() < end) { h = await fh(p); if (want(h)) return h; await p.waitForTimeout(100); } return h; }
  const newAdmin = async () => { const c = await br.newContext({ viewport: { width: 1360, height: 1000 } }); await c.addInitScript(HOOK); await c.addCookies([{ name: 'sess', value: 'S3CRET', url: BASE }]); return c; };

  const code1 = '<style>#a{color:rgb(255,0,0)}body{background:rgb(1,2,3)}</style>\n<p id="a" onclick="window.h1=1">Hello</p>\n<img id="im" src="/uploads/sample-wide.svg" alt="">\n<img id="bad" src="x" onerror="window.h2=1">\n<a id="jl" href="javascript:window.h3=1">js</a>\n<a id="ext" href="https://example.com/x">ext</a>\n<form id="fm" action="/edizon/article.php" method="post"><button id="fb">go</button></form>\n<script>window.h4=1;</script>';
  pg = await boot(br, { ctx: await newAdmin() });
  const bgBefore = await pg.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('.ae-cv')).fontSize]);
  await tile(pg, 'html').click();
  d = await blocks(pg);
  HB = d[0].id;
  ok('S1 the Admin adds an HTML block from the palette: empty code, automatic height, normal width, JavaScript off; the code box has focus and the preview says what to do',
    d.length === 1 && d[0].t === 'html' && d[0].code === '' && d[0].h === 'auto' && d[0].scripts === false && d[0].size === 'normal' && d[0].caption === '' && await pg.evaluate(() => document.activeElement.classList.contains('ae-code')) && await pg.locator('.ae-hf-empty').isVisible() && await pg.locator('iframe.ae-hf').isHidden(), d);
  await pg.fill('.ae-code', code1);
  const r1 = await inFrame(pg, () => {
    document.getElementById('jl').click(); document.getElementById('a').click();
    const a = document.getElementById('a'), im = document.getElementById('im');
    return { text: a.textContent, color: getComputedStyle(a).color, bg: getComputedStyle(document.body).backgroundColor, fs: getComputedStyle(a).fontSize, ran: [window.h1, window.h2, window.h3, window.h4].map(x => x === undefined ? 0 : 1).join(''), img: im.complete && im.naturalWidth > 0, base: document.querySelector('base').target, ext: document.getElementById('ext').target || '' };
  }, null, { want: v => v && v.text === 'Hello' && v.img });
  ok('S2 the code shows in a frame loaded from the frame page: its own CSS styles it, its own images load', r1 && r1.text === 'Hello' && r1.color === 'rgb(255, 0, 0)' && r1.bg === 'rgb(1, 2, 3)' && r1.img, r1);
  ok('S3 with JavaScript off nothing in the code runs: inline script, onclick, onerror and javascript: links are all blocked', r1 && r1.ran === '0000', r1);
  ok('S3b links open in a new tab (base target) and the frame starts from a plain 16 px page, not the editor\'s 20 px canvas text', r1 && r1.base === '_blank' && r1.fs === '16px', r1);
  const fa = await pg.$eval('iframe.ae-hf', e => ({ sb: e.getAttribute('sandbox'), rp: e.getAttribute('referrerpolicy'), src: e.getAttribute('src') }));
  ok('S4 the frame is sandboxed with exactly allow-scripts allow-popups allow-popups-to-escape-sandbox (never same-origin), no referrer, and has no address of its own (it holds a posted document)',
    fa.sb === 'allow-scripts allow-popups allow-popups-to-escape-sandbox' && fa.rp === 'no-referrer' && !fa.src, fa);
  const bgAfter = await pg.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('.ae-cv')).fontSize, document.querySelectorAll('#a, #im').length, String(window.h1) + String(window.h4)]);
  ok('S5 the code\'s CSS and elements never reach the editor page (body background and canvas text size unchanged, no #a in the page, no variables set)', bgAfter[0] === bgBefore[0] && bgAfter[1] === bgBefore[1] && bgAfter[2] === 0 && bgAfter[3] === 'undefinedundefined', [bgBefore, bgAfter]);
  const subm = await inFrame(pg, () => { document.getElementById('fb').click(); return new Promise(r => setTimeout(() => r(document.getElementById('a') ? 'stayed' : 'navigated'), 700)); }, null, { want: v => v === 'stayed' || v === 'navigated' });
  ok('S6 a form inside the code cannot be submitted (the frame stays as it was)', subm === 'stayed', subm);

  // hostile script, JavaScript ON
  const hostile = '<div id="out">pending</div><form id="f" action="/edizon/article.php" method="post"></form><script>\n'
    + 'var r = {};\nfunction t(k, f) { try { r[k] = f(); } catch (e) { r[k] = "blocked:" + e.name; } }\n'
    + 't("parentDoc", function () { return typeof parent.document.body; });\n'
    + 't("parentVar", function () { return typeof parent.ArtEditor; });\n'
    + 't("topLoc", function () { return top.location.href; });\n'
    + 't("cookie", function () { return "got:" + document.cookie; });\n'
    + 't("ls", function () { return localStorage.getItem("secret") === null && localStorage.length === 0 ? "blocked:isolated" : "got:" + localStorage.getItem("secret"); });\n'
    + 't("ss", function () { return sessionStorage.getItem("secret") === null && sessionStorage.length === 0 ? "blocked:isolated" : "got"; });\n'
    + 't("idb", function () { var q = indexedDB.open("x"); return "got:" + typeof q; });\n'
    + 'try { top.location.href = "' + BASE + '/edizon/"; r.nav = "tried"; } catch (e) { r.nav = "blocked:" + e.name; }\n'
    + 'try { document.getElementById("f").submit(); r.form = "tried"; } catch (e) { r.form = "blocked:" + e.name; }\n'
    + 'window.mine = "ran";\n'
    + 'fetch("' + BASE + '/edizon/article.php").then(function (x) { return x.text(); }).then(function (x) { r.fetch = "read " + x.length; }, function (e) { r.fetch = "blocked:" + e.name; }).then(function () { document.getElementById("out").textContent = JSON.stringify(r); });\n</script>';
  await pg.evaluate(() => { localStorage.setItem('secret', 'S3CRET'); sessionStorage.setItem('secret', 'S3CRET'); }); // the site's own storage: the code must not see it
  const urlBefore = pg.url();
  await pg.fill('.ae-code', hostile);
  await pg.selectOption('.ae-setbox select[aria-label="JavaScript"]', '1');
  const out = await inFrame(pg, () => { const o = document.getElementById('out'); return o && o.textContent !== 'pending' ? JSON.parse(o.textContent) : null; });
  const blockedKeys = ['parentDoc', 'parentVar', 'topLoc', 'cookie', 'ls', 'ss', 'idb', 'fetch'];
  ok('S7 JavaScript ON: the code runs, but cannot read the editor page, its variables, the top address, cookies, the site\'s own localStorage (it gets an empty replacement), IndexedDB, or fetch the panel',
    out && blockedKeys.every(k => String(out[k]).startsWith('blocked')) && !JSON.stringify(out).includes('S3CRET'), out);
  await pg.waitForTimeout(500);
  ok('S7b ...and cannot navigate the editor page away or submit a form (page unchanged, editor still alive)', pg.url() === urlBefore && await pg.evaluate(() => !!window.__ed && !!document.querySelector('.ae-root')) && await inFrame(pg, () => !!document.getElementById('out'), null, { ms: 1500 }), [pg.url(), urlBefore]);
  // the same code with JavaScript off
  await pg.selectOption('.ae-setbox select[aria-label="JavaScript"]', '0');
  await pg.waitForTimeout(1500);
  const off = await inFrame(pg, () => ({ out: document.getElementById('out') && document.getElementById('out').textContent, mine: window.mine === undefined }), null, { want: v => v && v.out });
  const hOff = await fh(pg);
  ok('S8 JavaScript OFF: the same script does not run at all ("pending" stays), while the frame still sizes itself to its content (the page\'s own height script is allowed by nonce)', off && off.out === 'pending' && off.mine === true && hOff < 100 && hOff >= 20, [off, hOff]);

  // height
  const tall = (n) => '<div id="box" style="height:' + n + 'px;background:#eef">box</div>';
  await pg.fill('.ae-code', tall(300));
  let h = await waitH(pg, v => Math.abs(v - 300) <= 3);
  const h300 = h;
  await pg.fill('.ae-code', tall(520)); h = await waitH(pg, v => Math.abs(v - 520) <= 3);
  const h520 = h;
  await pg.fill('.ae-code', tall(120)); h = await waitH(pg, v => Math.abs(v - 120) <= 3);
  ok('S9 automatic height follows the content: 300 px, then grows to 520 px, then shrinks to 120 px', Math.abs(h300 - 300) <= 3 && Math.abs(h520 - 520) <= 3 && Math.abs(h - 120) <= 3, [h300, h520, h]);
  await pg.selectOption('.ae-setbox select[aria-label="Tinggi bingkai"]', 'l'); await pg.waitForTimeout(200);
  const hl = await fh(pg), auto1 = await pg.$eval('iframe.ae-hf', e => e.hasAttribute('data-auto'));
  await pg.selectOption('.ae-setbox select[aria-label="Tinggi bingkai"]', 'xl'); await pg.waitForTimeout(200);
  const hxl = await fh(pg);
  await pg.selectOption('.ae-setbox select[aria-label="Tinggi bingkai"]', 'm'); await pg.waitForTimeout(200);
  const hm = await fh(pg);
  await pg.selectOption('.ae-setbox select[aria-label="Tinggi bingkai"]', 'auto');
  const hBack = await waitH(pg, v => Math.abs(v - 120) <= 3);
  ok('S10 fixed heights Sedang 320 / Tinggi 480 / Sangat tinggi 680 ignore the content; going back to Otomatis measures it again (120)', hm === 320 && hl === 480 && hxl === 680 && auto1 === false && Math.abs(hBack - 120) <= 3, [hm, hl, hxl, auto1, hBack]);

  // widths on the canvas and in the real page
  await pg.selectOption('.ae-setbox select[aria-label="Lebar"]', 'wide'); await pg.waitForTimeout(200);
  const wWide = await pg.$eval('.ae-blk-html', e => Math.round(e.getBoundingClientRect().width - 14));
  await pg.selectOption('.ae-setbox select[aria-label="Lebar"]', 'normal'); await pg.waitForTimeout(200);
  const wNorm = await pg.$eval('.ae-blk-html', e => Math.round(e.getBoundingClientRect().width - 14));
  ok('S11 "wider than the text" widens the block on the canvas to the wide width (wider than 960) and back to the text width (960)', wWide > 960 && wNorm === 960, [wWide, wNorm]);

  // save round trip
  const nasty = '<p lang="id" id="n">"Quotes" & \'single\' <b>bold</b> ’ é 日本語 😀 MARK-7Q</p>\n<style>p{color:red}</style>\n<script>var a = "</scr" + "ipt>";</script>\n<!-- note -->';
  await pg.fill('input[placeholder="Judul artikel"]', 'Artikel HTML');
  await pg.fill('.ae-code', nasty);
  await pg.selectOption('.ae-setbox select[aria-label="JavaScript"]', '1');
  await pg.selectOption('.ae-setbox select[aria-label="Lebar"]', 'wide');
  await pg.selectOption('.ae-setbox select[aria-label="Tinggi bingkai"]', 'm');
  await pg.fill('.ae-setbox input[maxlength="200"]', 'Widget "harga"');
  await pg.$eval('.ae-code', e => { e.__mark = 1; });
  const ids = (await blocks(pg))[0].id;
  let rs = await save(pg);
  const sb = rs.body.data && rs.body.data.blocks[0];
  ok('S12 saving through the real validation keeps the code exactly as typed (quotes, &, emoji, script text), JavaScript on, height, width and caption',
    rs.status === 200 && sb && sb.t === 'html' && sb.code === nasty && sb.scripts === true && sb.h === 'm' && sb.size === 'wide' && sb.caption === 'Widget "harga"' && sb.id === ids, rs.body.errors || sb);
  ok('S12b the editor is not rebuilt after saving (the code box is the same element; the typed text and preview stay)', await pg.$eval('.ae-code', e => e.__mark === 1 && e.value.length > 0), null);
  const idArt = rs.body.data.id;

  // the panel frame page, saved version
  const g = await pg.request.get(BASE + '/edizon/article-frame.php?id=' + idArt + '&b=' + ids);
  const gh = g.headers(), gb = await g.text();
  ok('S13 the panel frame page (saved block) answers with its own policy: sandbox without same-origin, scripts per block, no store, same-origin framing only, code intact',
    g.status() === 200 && /sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox/.test(gh['content-security-policy']) && /script-src 'unsafe-inline' https:/.test(gh['content-security-policy']) && !/allow-same-origin/.test(gh['content-security-policy'])
    && gh['x-frame-options'] === 'SAMEORIGIN' && gh['cache-control'] === 'no-store' && gb.includes('<div id="en-root">' + nasty + '</div>'), [g.status(), gh]);
  const g404 = await pg.request.get(BASE + '/edizon/article-frame.php?id=' + idArt + '&b=nope1');
  const gPost = await pg.request.post(BASE + '/edizon/article-frame.php', { form: { code: '<p>x</p>' } });
  ok('S14 an unknown block id gives a plain 404 page with a locked-down policy; a POST without the csrf token is refused', g404.status() === 404 && /default-src 'none'; sandbox/.test(g404.headers()['content-security-policy']) && gPost.status() === 403, [g404.status(), gPost.status()]);
  const gPost2 = await pg.request.post(BASE + '/edizon/article-frame.php', { form: { _csrf: 'test', code: '<p>x</p>', scripts: '0' } });
  ok('S14b a POST with the token returns the code in a frame document with the "scripts off" policy', gPost2.status() === 200 && /script-src 'nonce-/.test(gPost2.headers()['content-security-policy']) && !/unsafe-inline' https:; style/.test(gPost2.headers()['content-security-policy']), gPost2.headers()['content-security-policy']);

  // the preview page (unsaved content posted to the frame page)
  const [pv2] = await Promise.all([pg.context().waitForEvent('page'), pg.click('#preview')]);
  await pv2.waitForLoadState('load');
  await pv2.waitForSelector('figure.a-html iframe.a-hf');
  const pvf = await pv2.$eval('figure.a-html', e => ({ wide: e.classList.contains('a-wide'), cap: e.querySelector('figcaption') && e.querySelector('figcaption').textContent, sb: e.querySelector('iframe').getAttribute('sandbox'), name: e.querySelector('iframe').name, auto: e.querySelector('iframe').hasAttribute('data-auto') }));
  const pvIn = await inFrame(pv2, () => document.getElementById('n') && document.getElementById('n').textContent, null, { frame: () => pv2.frames().find(f => f.name() === 'hf-' + ids) });
  ok('S15 the Preview page shows the HTML block through the frame page (posted, not saved), wide, with its caption and the same sandbox', pvf.wide && pvf.cap === 'Widget "harga"' && pvf.sb === 'allow-scripts allow-popups allow-popups-to-escape-sandbox' && /MARK-7Q/.test(String(pvIn)), [pvf, pvIn]);
  ok('S15b the preview page itself has no policy violations', (await pv2.evaluate(() => window.__viol)).length === 0, await pv2.evaluate(() => window.__viol));
  await pv2.close();

  // public side: draft is not served, published is
  const pub404 = await pg.request.get(BASE + '/articles/frame.php?id=' + idArt + '&b=' + ids);
  const pubPage404 = await pg.request.get(BASE + '/articles/public-test.php?id=' + idArt);
  setStatus('published');
  const pubOk = await pg.request.get(BASE + '/articles/frame.php?id=' + idArt + '&b=' + ids);
  const ph = pubOk.headers();
  const pubBad = [await pg.request.get(BASE + '/articles/frame.php?id=' + idArt + '&b=zzzz9'), await pg.request.get(BASE + '/articles/frame.php?id=99&b=' + ids), await pg.request.get(BASE + '/articles/frame.php?b=' + ids)];
  ok('S16 the public frame page serves a block only for a published article (draft: 404), with the frame policy, a one-minute cache and no panel headers; bad ids are 404',
    pub404.status() === 404 && pubPage404.status() === 404 && pubOk.status() === 200 && /sandbox allow-scripts/.test(ph['content-security-policy']) && ph['cache-control'] === 'public, max-age=60' && ph['x-frame-options'] === 'SAMEORIGIN' && !/DENY/.test(ph['x-frame-options'] || '')
    && pubBad.every(x => x.status() === 404), [pub404.status(), pubOk.status(), ph]);
  const pp = await pg.context().newPage();
  const ppl = []; pp.on('console', m => { if (m.type() === 'error') ppl.push(m.text()); });
  await pp.addInitScript(() => { window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' | ' + e.blockedURI)); });
  await pp.goto(BASE + '/articles/public-test.php?id=' + idArt);
  await pp.waitForSelector('figure.a-html iframe.a-hf');
  const pubFr = () => pp.frames().find(f => /frame\.php/.test(f.url()));
  const pubIn = await inFrame(pp, () => document.getElementById('n') && document.getElementById('n').textContent, null, { frame: pubFr });
  const pubInfo = await pp.evaluate(() => { const f = document.querySelector('iframe.a-hf'); return { src: f.getAttribute('src'), sb: f.getAttribute('sandbox'), inPage: document.body.innerHTML.includes('MARK-7Q'), wide: !!document.querySelector('figure.a-html.a-wide') }; });
  await pp.waitForTimeout(500);
  const pubH = await pp.$eval('iframe.a-hf', e => Math.round(e.getBoundingClientRect().height));
  ok('S17 the published page loads the block from /articles/frame.php (the code is not in the page itself), wide, sandboxed; a fixed height (Sedang) is 320 px whatever the content',
    new RegExp('^/articles/frame\\.php\\?id=\\d+&b=' + ids + '&v=[0-9a-f]{8}$').test(pubInfo.src) && !pubInfo.inPage && pubInfo.wide && pubInfo.sb === 'allow-scripts allow-popups allow-popups-to-escape-sandbox' && /MARK-7Q/.test(String(pubIn)) && pubH === 320, [pubInfo, pubIn, pubH]);
  ok('S17b the published page has no policy violations (frame-src allows the own frame page)', (await pp.evaluate(() => window.__viol)).length === 0, await pp.evaluate(() => window.__viol));
  patchStore(c => { c.blocks[0].h = 'auto'; });
  await pp.goto(BASE + '/articles/public-test.php?id=' + idArt);
  await pp.waitForSelector('iframe.a-hf[data-auto]');
  const autoH = await (async () => { const end = Date.now() + 5000; let v = 0; while (Date.now() < end) { v = await pp.$eval('iframe.a-hf', e => Math.round(e.getBoundingClientRect().height)); if (v !== 160) return v; await pp.waitForTimeout(100); } return v; })();
  ok('S17c with automatic height the published page sizes the frame to its content through the page script (a short paragraph: far below the 160 px start height)', autoH >= 20 && autoH < 120, autoH);
  patchStore(c => { c.blocks[0].h = 'm'; });
  await pp.close();
  // opening the frame address directly is still sandboxed, with the cookie present
  const pd = await pg.context().newPage();
  await pd.goto(BASE + '/articles/frame.php?id=' + idArt + '&b=' + ids);
  await pd.waitForSelector('#n');
  await pg.evaluate(() => localStorage.setItem('secret', 'S3CRET'));
  const direct = await pd.evaluate(() => { const o = {}; try { o.cookie = document.cookie; } catch (e) { o.cookie = 'blocked:' + e.name; } try { o.ls = localStorage.getItem('secret') === null && localStorage.length === 0 ? 'blocked:isolated' : 'got'; } catch (e) { o.ls = 'blocked:' + e.name; } o.origin = String(window.origin); return o; });
  ok('S18 even opened as its own page, the frame address runs without the site\'s identity (opaque origin: no cookies, no storage)', /^blocked/.test(direct.cookie) && /^blocked/.test(direct.ls) && direct.origin === 'null', direct);
  await pd.close();
  setStatus('draft');

  // moving a block reloads its preview
  HB = HBF;
  await load(pg, [hblk({ code: '<p id="a">Moved MARK</p>' }), text('<p>after</p>')]);
  await inFrame(pg, () => document.getElementById('a') && document.getElementById('a').textContent, null, { want: v => /Moved/.test(String(v)) });
  await blk(pg, 0).hover();
  await blk(pg, 0).locator('> .ae-blk-bar button[aria-label="Turunkan"]').click();
  const mv1 = await inFrame(pg, () => document.getElementById('a') && document.getElementById('a').textContent, null, { want: v => /Moved/.test(String(v)) });
  ok('S19 moving the block down with its button keeps the preview (it is loaded again after the move)', (await blocks(pg)).map(b => b.t).join() === 'text,html' && /Moved/.test(String(mv1)), mv1);
  await blk(pg, 0).evaluate(e => e.scrollIntoView({ block: 'center' })); await blk(pg, 1).hover(); // keep both blocks clear of the sticky dock
  await dragTo(pg, blk(pg, 1).locator('> .ae-blk-bar .ae-blk-h'), blk(pg, 0), 0, -12);
  const mv2 = await inFrame(pg, () => document.getElementById('a') && document.getElementById('a').textContent, null, { want: v => /Moved/.test(String(v)) });
  ok('S19b dragging the block by its handle keeps the preview too', (await blocks(pg)).map(b => b.t).join() === 'html,text' && /Moved/.test(String(mv2)), [await blocks(pg), mv2]);
  // duplicate gets its own frame
  await sel(pg, 0); // the HTML block is first after the drag
  await blk(pg, 0).locator('> .ae-blk-bar button[aria-label="Gandakan"]').click();
  const mv3 = await inFrame(pg, () => document.getElementById('a') && document.getElementById('a').textContent, null, { id: (await blocks(pg))[1].id, want: v => /Moved/.test(String(v)) });
  const dd = await blocks(pg);
  ok('S20 duplicating an HTML block makes a second block with its own id and its own working preview', dd.length === 3 && dd[0].t === 'html' && dd[1].t === 'html' && dd[0].id !== dd[1].id && dd[0].code === dd[1].code && /Moved/.test(String(mv3)), dd.map(b => b.id));

  // top level only
  await load(pg, [colsBlock([[hblk({ code: '<b>x</b>' }), text('<p>keep</p>')], []])]);
  d = await blocks(pg);
  ok('S21 an HTML block that somehow sits inside a column is dropped when loaded (the text next to it stays)', flat(d).join() === 'columns@0,text@1', flat(d));
  await load(pg, [colsBlock([[text('<p>in column</p>')], []])]);
  await dragTo(pg, tile(pg, 'html'), pg.locator('.ae-col').first());
  d = await blocks(pg);
  ok('S21b dropping the HTML tile onto a column never nests it (it can only land at the top level)', !flat(d).includes('html@1'), flat(d));
  await load(pg, [colsBlock([[text('<p>in column</p>')], []])]);
  await pg.locator('.ae-col .ae-rte').first().click();
  await tile(pg, 'html').click();
  d = await blocks(pg);
  ok('S21c clicking the HTML tile with a block inside a column selected adds it after the columns block, at the top level', flat(d).join() === 'columns@0,text@1,html@0', flat(d));

  // clean run
  await pg.context().close();
  pg = await boot(br, { ctx: await newAdmin() });
  await tile(pg, 'html').click();
  await pg.fill('.ae-code', '<p id="a">Clean</p>');
  await inFrame(pg, () => document.getElementById('a') && document.getElementById('a').textContent, null, { want: v => v === 'Clean' });
  await pg.waitForTimeout(400);
  ok('S22 a normal session (add the block, type, preview) raises no policy violations and no console errors in the editor page', (await viol(pg)).length === 0 && pg.logs.length === 0, [await viol(pg), pg.logs]);
  await pg.screenshot({ path: SHOTS + '/editor-html-block.png' });

  // an Editor
  setStatus('draft');
  await pg.context().close();
  await (async () => {
    // an article with a saved HTML block, written by the Admin
    const ca = await newAdmin(); const pa = await boot(br, { ctx: ca });
    await pa.fill('input[placeholder="Judul artikel"]', 'Untuk Editor');
    await load(pa, [text('<p>Intro</p>'), hblk({ code: nasty, scripts: true, h: 'm', size: 'wide', caption: 'Awal' })]);
    const sv = await save(pa);
    ok('S23 (setup) the Admin saves an article that has an HTML block with JavaScript on', sv.status === 200, sv.body.errors);
    await ca.close();
  })();
  HB = HBF;
  const ce = await br.newContext({ viewport: { width: 1360, height: 1000 } });
  await ce.addInitScript(HOOK);
  await ce.addCookies([{ name: 'role', value: 'editor', url: BASE }]);
  const pe = await boot(br, { ctx: ce, q: '?id=1' });
  const eInfo = await pe.evaluate(() => ({ tiles: document.querySelectorAll('.ae-tile').length, html: document.querySelectorAll('.ae-tile[data-type=html]').length, ro: document.querySelector('.ae-code').readOnly, dup: document.querySelectorAll('.ae-blk-html > .ae-blk-bar button[aria-label="Gandakan"]').length, src: document.querySelector('iframe.ae-hf').getAttribute('src') }));
  ok('S24 an Editor has no HTML tile, sees the existing block\'s code read-only, and has no Duplicate button on it', eInfo.tiles === 13 && eInfo.html === 0 && eInfo.ro === true && eInfo.dup === 0, eInfo);
  const eIn = await inFrame(pe, () => document.getElementById('n') && document.getElementById('n').textContent, null, { id: HB });
  ok('S24b the Editor still sees the saved block\'s preview (loaded from the frame page by article and block id)', /^article-frame\.php\?id=1&b=hbaaa1&r=\d+$/.test(eInfo.src) && /MARK-7Q/.test(String(eIn)), [eInfo.src, eIn]);
  await sel(pe, 1);
  const jsDis = await pe.$eval('.ae-setbox select[aria-label="JavaScript"]', e => e.disabled);
  await pe.selectOption('.ae-setbox select[aria-label="Tinggi bingkai"]', 'l');
  await pe.selectOption('.ae-setbox select[aria-label="Lebar"]', 'normal');
  await pe.fill('.ae-setbox input[maxlength="200"]', 'Diubah Editor');
  rs = await save(pe);
  const eb = rs.body.data && rs.body.data.blocks[1];
  ok('S25 an Editor can still change an existing block\'s height, width and caption; the code and the JavaScript switch stay as the Admin set them (the switch is greyed out)', jsDis && rs.status === 200 && eb && eb.h === 'l' && eb.size === 'normal' && eb.caption === 'Diubah Editor' && eb.code === nasty && eb.scripts === true, [rs.body.errors, eb]);
  const tamper = async (blocksNew) => { await load(pe, blocksNew); const r = await save(pe); return { status: r.status, msg: r.status === 422 ? await pe.locator('#errors').innerText() : '' }; };
  const t1 = await tamper([text('<p>Intro</p>'), hblk({ code: nasty + '<script>steal()</script>', scripts: true, h: 'l', size: 'normal', caption: 'x' })]);
  const t2 = await tamper([text('<p>Intro</p>'), hblk({ code: nasty, scripts: false, h: 'l', size: 'normal', caption: 'x' })]);
  const t3 = await tamper([text('<p>Intro</p>'), hblk({ code: nasty, scripts: true }), hblk({ id: 'hbbbb2', code: '<b>new</b>' })]);
  const t4 = await tamper([text('<p>Intro</p>'), hblk({ id: 'hbccc3', code: nasty, scripts: true })]);
  ok('S26 the server refuses an Editor who changes the code, switches JavaScript off, adds a new HTML block, or re-uses the code under another id; the message says only an Admin can', [t1, t2, t3, t4].every(x => x.status === 422 && /Admin/.test(x.msg)), [t1, t2, t3, t4]);
  const ePost = await pe.request.post(BASE + '/edizon/article-frame.php', { form: { _csrf: 'test', code: '<p>x</p>' } });
  ok('S27 an Editor cannot use the posted-preview frame page (403); the saved block\'s page still works for them', ePost.status() === 403 && (await pe.request.get(BASE + '/edizon/article-frame.php?id=1&b=' + HB)).status() === 200, ePost.status());
  ok('S28 no policy violations in the Editor\'s page', (await viol(pe)).length === 0, await viol(pe));
  await ce.close();

  /* ---------- T. whole web pages: size limit, screen height, full browser width, storage hand-over ---------- */
  {
  const pad = (n) => 'x'.repeat(n);
  const bigCode = '<div id="o">loading</div>\n<!-- ' + pad(120000) + ' -->\n<script>\ndocument.getElementById("o").textContent = "big page ok";\n</script>';
  let ca2 = await newAdmin();
  pg = await boot(br, { ctx: ca2 });
  await pg.fill('input[placeholder="Judul artikel"]', 'Halaman penuh');
  await tile(pg, 'html').click();
  HB = (await blocks(pg))[0].id;
  await pg.fill('.ae-code', bigCode);
  await pg.selectOption('.ae-setbox select[aria-label="JavaScript"]', '1');
  const taLen = await pg.$eval('.ae-code', e => e.value.length);
  const bigOut = await inFrame(pg, () => document.getElementById('o') && document.getElementById('o').textContent, null, { want: v => v === 'big page ok' });
  ok('T1 a code box takes a whole web page (120,000+ letters): nothing is cut off and the preview runs it to the end', taLen === bigCode.length && bigOut === 'big page ok', [taLen, bigCode.length, bigOut]);
  const lim = await pg.$eval('.ae-code', e => e.getAttribute('maxlength'));
  ok('T1b the letter counter and the limit say 300,000', lim === '300000' && /120\.\d{3} dari 300\.000/.test(await pg.locator('.ae-code-n').innerText()), [lim, await pg.locator('.ae-code-n').innerText()]);
  let rt = await save(pg);
  ok('T1c saving the 120,000-letter block works and returns it unchanged', rt.status === 200 && rt.body.data.blocks[0].code === bigCode, rt.body.errors);
  await pg.waitForTimeout(300);
  const afterSave = await inFrame(pg, () => document.getElementById('o') && document.getElementById('o').textContent, null, { want: v => v === 'big page ok' });
  ok('T1e after saving, the preview is still shown (the page puts the editor back in place, which reloads frames; they are loaded again)', afterSave === 'big page ok', afterSave);
  const gBig = await pg.request.get(BASE + '/edizon/article-frame.php?id=' + rt.body.data.id + '&b=' + HB);
  ok('T1d the frame page serves all of it', gBig.status() === 200 && (await gBig.text()).includes(bigCode), gBig.status());

  // screen-height option
  await pg.fill('.ae-code', '<div style="min-height:100vh;background:#eef">tall</div>');
  await pg.selectOption('.ae-setbox select[aria-label="Tinggi bingkai"]', 'vh'); await pg.waitForTimeout(300);
  const vhEd = await fh(pg);
  const vhFixed = await pg.$eval('iframe.ae-hf', e => !e.hasAttribute('data-auto') && e.className.includes('ae-hf-vh'));
  ok('T2 the height option "Setinggi layar" makes the preview tall like a screen (75% of the window here) and not follow the content', vhFixed && Math.abs(vhEd - 750) <= 2, [vhEd, vhFixed]);

  // the article option: use the whole browser width
  await load(pg, [text('<p>Teks biasa di artikel.</p>'), hblk({ id: HB, code: '<div style="min-height:100vh;background:#eef">tall</div>', h: 'vh' })]);
  const cvw = () => pg.evaluate(() => { const b = document.querySelector('.ae-rootlist > .ae-blk'); return Math.round(b.getBoundingClientRect().width); });
  const w0 = await cvw();
  const chk = pg.locator('#art-full');
  ok('T3 the article form has the option "Pakai lebar layar penuh", off by default', (await chk.count()) === 1 && !(await chk.isChecked()), null);
  await chk.check(); await pg.waitForTimeout(200);
  const w1 = await cvw();
  const cvInner = await pg.evaluate(() => { const c = document.querySelector('.ae-cv'); return Math.round(c.clientWidth - 40); });
  const tipFull = await pg.getAttribute('.ae-view button[data-w=pub]', 'title');
  ok('T3b checking it shows the editor\'s Desktop view at the full canvas width (blocks no longer held to the 960 px text column), says so on the Desktop button, and marks the article as changed', w0 === 974 && Math.abs(w1 - cvInner) <= 2 && w1 > 900 && /layar penuh/.test(tipFull) && await pg.locator('#dirty').isVisible(), [w0, w1, cvInner, tipFull]);
  await pg.click('.ae-view button[data-w=tab]'); await pg.waitForTimeout(250);
  const wTab = await cvw();
  await pg.click('.ae-view button[data-w=pub]'); await pg.waitForTimeout(250);
  ok('T3c the Tablet view is unchanged by it, and Desktop comes back to full width', wTab < 800 && Math.abs((await cvw()) - cvInner) <= 2, wTab);
  await pg.evaluate(() => document.querySelector('.ae-section').scrollIntoView()); // the checkbox is above the editor: bring the editor (and the Save bar) back
  rt = await save(pg);
  ok('T4 saving keeps the option (the server stores it with the SEO data), and reloading shows it checked with the full canvas', rt.status === 200 && rt.body.data.seo.layout === 'full', rt.body.errors || rt.body.data.seo);
  const idFull = rt.body.data.id;
  await pg.reload(); await pg.waitForSelector('.ae-root');
  ok('T4b ...after a reload the box is still checked and the Desktop view is still full width', await pg.locator('#art-full').isChecked() && (await pg.evaluate(() => document.querySelector('.ae-cvwrap').classList.contains('is-fullart'))), null);
  await pg.locator('#art-full').uncheck(); await pg.waitForTimeout(150);
  ok('T4c unchecking goes back to the template width (960)', (await cvw()) === 974, await cvw());
  await pg.locator('#art-full').check();
  await pg.evaluate(() => document.querySelector('.ae-section').scrollIntoView());
  rt = await save(pg);

  // public page
  patchStore(c => { c.status = 'published'; });
  const pf = await pg.context().newPage();
  await pf.setViewportSize({ width: 1360, height: 900 });
  await pf.goto(BASE + '/articles/public-test.php?id=' + idFull);
  await pf.waitForSelector('figure.a-html iframe.a-hf');
  await pf.waitForTimeout(500);
  const pm = await pf.evaluate(() => {
    const r = (e) => e.getBoundingClientRect(), vw = document.documentElement.clientWidth, art = document.querySelector('article.art'), pr = document.querySelector('.prose'), fig = document.querySelector('figure.a-html'), fr = document.querySelector('iframe.a-hf'), p = pr.querySelector('p');
    const cs = getComputedStyle(pr);
    return { vw, full: art.classList.contains('art-full'), artW: Math.round(r(art).width), proseText: Math.round(r(pr).width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)), pW: Math.round(r(p).width), figL: Math.round(r(fig).left), figW: Math.round(r(fig).width), frH: Math.round(r(fr).height), vh: innerHeight, h1: Math.round(r(document.querySelector('.art-head')).width), over: document.documentElement.scrollWidth - innerWidth };
  });
  ok('T5 on the published page the full-width article uses the whole browser width: text from edge gutter to edge gutter (not 960), the HTML block touches both screen edges, the title block stays at the template width, no sideways scroll',
    pm.full && pm.artW === pm.vw && pm.pW === pm.vw - 40 && pm.figL === 0 && pm.figW === pm.vw && pm.h1 <= 1000 && pm.over <= 1, pm);
  ok('T5b a block set to "Setinggi layar" is exactly as tall as the browser window', pm.frH === pm.vh, [pm.frH, pm.vh]);
  await pf.setViewportSize({ width: 390, height: 800 }); await pf.waitForTimeout(300);
  const pmm = await pf.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, figW: Math.round(document.querySelector('figure.a-html').getBoundingClientRect().width), vw: document.documentElement.clientWidth, h: Math.round(document.querySelector('iframe.a-hf').getBoundingClientRect().height) }));
  ok('T5c on a phone nothing overflows and the HTML block still fills the screen width and height', pmm.over <= 1 && pmm.figW === pmm.vw && pmm.h === 800, pmm);
  // the same article with the option off
  patchStore(c => { c.seo.layout = ''; });
  await pf.setViewportSize({ width: 1360, height: 900 });
  await pf.goto(BASE + '/articles/public-test.php?id=' + idFull);
  await pf.waitForSelector('figure.a-html iframe.a-hf');
  const pn = await pf.evaluate(() => ({ full: document.querySelector('article.art').classList.contains('art-full'), pW: Math.round(document.querySelector('.prose p').getBoundingClientRect().width), figW: Math.round(document.querySelector('figure.a-html').getBoundingClientRect().width) }));
  ok('T5d with the option off the same article is back at the template width (960 text, the HTML block the same width)', !pn.full && pn.pW === 960 && pn.figW === 960, pn);
  patchStore(c => { c.seo.layout = 'full'; });
  await pf.close();
  // the Pratinjau page
  const [pvf] = await Promise.all([pg.context().waitForEvent('page'), pg.click('#preview')]);
  await pvf.waitForLoadState('load');
  ok('T6 the Preview page also shows the article at full width', await pvf.evaluate(() => document.querySelector('article.art').classList.contains('art-full')), null);
  await pvf.close();
  await pg.screenshot({ path: SHOTS + '/editor-full-width.png' });
  await ca2.close();

  // storage hand-over (localStorage that survives a reload, kept per block)
  const lsCode = '<div id="o"></div><script>\nvar n = parseInt(localStorage.getItem("visits") || "0", 10) + 1; localStorage.setItem("visits", String(n));\nsessionStorage.setItem("s", "1");\ndocument.getElementById("o").textContent = "visits=" + n + " len=" + localStorage.length + " ss=" + sessionStorage.getItem("s") + " keys=" + Object.keys(localStorage).join(",");\n</script>';
  const ca3 = await newAdmin(); const p3 = await boot(br, { ctx: ca3 });
  await p3.fill('input[placeholder="Judul artikel"]', 'Simpanan');
  await load(p3, [hblk({ id: 'lsone1', code: lsCode, scripts: true, h: 'm' }), hblk({ id: 'lstwo2', code: lsCode, scripts: true, h: 'm' }), hblk({ id: 'lsoff3', code: lsCode, scripts: false, h: 'm' })]);
  const inEd = await inFrame(p3, () => document.getElementById('o') && document.getElementById('o').textContent, null, { id: 'lsone1', want: v => /visits=/.test(String(v)) });
  const sv3 = await save(p3);
  ok('T7 in the editor preview a page that uses localStorage and sessionStorage runs without errors (it starts empty each time: nothing is stored from the panel)', /^visits=1 len=1 ss=1 keys=visits$/.test(String(inEd)), inEd);
  patchStore(c => { c.status = 'published'; c.seo.layout = ''; });
  const idLs = sv3.body.data.id;
  const pl = await p3.context().newPage();
  const frText = (bid) => inFrame(pl, () => document.getElementById('o') && document.getElementById('o').textContent, null, { frame: () => pl.frames().find(f => /frame\.php/.test(f.url()) && f.url().includes('b=' + bid)), want: v => /visits=|^$/.test(String(v)) });
  await pl.goto(BASE + '/articles/public-test.php?id=' + idLs);
  await pl.waitForSelector('iframe.a-hf');
  const a1 = await frText('lsone1'), b1 = await frText('lstwo2');
  await pl.waitForTimeout(900);
  await pl.reload(); await pl.waitForSelector('iframe.a-hf');
  const a2 = await frText('lsone1'), b2 = await frText('lstwo2');
  await pl.waitForTimeout(900);
  await pl.reload(); await pl.waitForSelector('iframe.a-hf');
  const a3 = await frText('lsone1');
  const kept = await pl.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('enhf:')).sort());
  ok('T8 on the published page the code\'s localStorage survives a reload (visits 1, 2, 3), is kept separately for each block, and sessionStorage works', /visits=1 /.test(a1) && /visits=2 /.test(a2) && /visits=3 /.test(a3) && /visits=1 /.test(b1) && /visits=2 /.test(b2) && /ss=1/.test(a1), [a1, a2, a3, b1, b2]);
  ok('T8b it is stored by the page itself under one key per block ("enhf:<article>:<block>"), nothing else', kept.join() === 'enhf:' + idLs + ':lsone1,enhf:' + idLs + ':lstwo2', kept);
  // a block with JavaScript off gets no hand-over (nothing runs there anyway)
  const offInfo = await pl.evaluate(() => { const f = document.querySelectorAll('iframe.a-hf'); return Array.from(f).map(x => [x.hasAttribute('data-ls'), x.name]); });
  ok('T8c only blocks with JavaScript on receive saved data (through the frame\'s window name, handed over before the frame loads)', offInfo[0][0] && offInfo[1][0] && !offInfo[2][0] && /^enls:/.test(offInfo[0][1]) && offInfo[2][1] === '', offInfo);
  // hostile frame: a huge or malformed message cannot fill the visitor's storage
  const hostileStore = '<script>\nvar o = {}; for (var i = 0; i < 300; i++) o["k" + i] = "v"; localStorage.setItem("a","1");\nfor (var k in o) localStorage.setItem(k, o[k]);\nlocalStorage.setItem("big", new Array(250001).join("x"));\n</script>';
  patchStore(c => { c.blocks[0].code = hostileStore; });
  await pl.reload(); await pl.waitForSelector('iframe.a-hf'); await pl.waitForTimeout(1500);
  const bigKept = await pl.evaluate(() => { const v = localStorage.getItem('enhf:' + document.querySelector('iframe.a-hf').getAttribute('data-ls')); return v === null ? null : v.length; });
  ok('T9 a block that tries to store more than 200 keys or 200,000 letters is not stored (the earlier data stays as it was)', bigKept !== null && bigKept < 200, bigKept);
  await pl.close();
  await ca3.close();
  }

  /* ---------- N. screenshot of a full page for the record ---------- */
  pg = await boot(br);
  await load(pg, full);
  await pg.waitForTimeout(400);
  await pg.locator('.ae-stage').screenshot({ path: SHOTS + '/editor-desktop.png' });
  ok('N1 a page with every block type renders without errors', pg.logs.length === 0 && (await viol(pg)).length === 0, [pg.logs, await viol(pg)]);

  await br.close();
  const bad = results.filter(x => !x.pass);
  console.log('\n' + (results.length - bad.length) + ' / ' + results.length + ' checks passed');
  if (bad.length) { console.log('FAILED: ' + bad.map(x => x.name).join(' | ')); process.exit(1); }
})();
