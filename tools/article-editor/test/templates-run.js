/* eslint-disable */
// Browser checks for Phase 5 block templates ("Templat"): save the chosen block or the whole page, insert, rename, delete, across article / pop-up / result editors.
// Real panel.css, article-editor.css, bundle, CSP and the real templates.php endpoint (SQLite instead of MySQL).
// Start the pop harness first (npm run harness:pop), then: node test/templates-run.js
const { chromium } = require('playwright');
const BASE = process.env.POP_URL || 'http://127.0.0.1:8097';
const results = [];
const ok = (name, pass, extra) => { results.push({ name, pass: !!pass, extra }); console.log((pass ? 'PASS ' : 'FAIL ') + name + ((!pass || process.env.VERBOSE) && extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
const IMG = '/uploads/sample.svg';
const HOOK = () => {
  window.__viol = [];
  document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' | ' + e.blockedURI));
};
const H = (t) => ({ t: 'h', level: 2, text: t });
const T = (t) => ({ t: 'text', html: '<p>' + t + '</p>' });
const IM = (src) => ({ t: 'img', src, alt: 'a', caption: '', ratio: '16:9', size: 'normal' });
const BTN = (l, u) => ({ t: 'button', label: l, url: u || '/x', style: 'solid' });
const COLS = (a, b) => ({ t: 'columns', ratio: '1-1', cols: [a, b] });
const flat = (arr) => { const o = []; (function w(a) { a.forEach(b => { o.push(b); if (b.cols) b.cols.forEach(w); }); })(arr); return o; };
const types = (arr) => arr.map(b => b.t);

async function ctxFor(br, cookies, vp) {
  const ctx = await br.newContext({ viewport: vp || { width: 1360, height: 1000 } });
  await ctx.addInitScript(HOOK);
  if (cookies) await ctx.addCookies(cookies.map(c => Object.assign({ url: BASE }, c)));
  return ctx;
}
async function open(ctx) {
  const pg = await ctx.newPage();
  pg.logs = []; pg.posts = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pg.logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => pg.logs.push('pageerror: ' + e.message));
  pg.on('request', r => { if (r.method() === 'POST' && /templates\.php/.test(r.url())) { try { pg.posts.push(JSON.parse(r.postData())); } catch (e) { pg.posts.push(null); } } });
  await pg.goto(BASE + '/edizon/pop-editor.php');
  await pg.waitForFunction(() => window.ArtEditor && window.ED);
  return pg;
}
async function make(pg, mode, o) {
  o = Object.assign({ templatesUrl: 'templates.php', isAdmin: true }, o || {});
  await pg.evaluate(([mode, o]) => {
    if (window.__ed) { window.__ed.destroy(); document.getElementById('editor').textContent = ''; }
    window.__ed = ArtEditor.create(Object.assign({ mode, csrf: 't', forms: [{ slug: 'daftar', name: 'Daftar' }], onChange() { window.__n = (window.__n || 0) + 1; } }, o));
    document.getElementById('editor').appendChild(window.__ed.root);
  }, [mode, o]);
  await pg.waitForSelector('.ae-root');
}
const blocks = (pg) => pg.evaluate(() => window.__ed.getBlocks());
const setBlocks = (pg, l) => pg.evaluate(l => window.__ed.setBlocks(l), l);
const top = (pg, i) => pg.locator('.ae-rootlist > .ae-blk').nth(i);
const pick = async (pg, loc) => { await loc.hover(); await loc.locator('> .ae-blk-bar .ae-blk-t').click(); }; // the bar shows on hover
const tplBtn = (pg) => pg.locator('.ae-dock-bar button:text-is("Templat")');
const outBtn = (pg) => pg.locator('.ae-dock-bar button:text-is("Struktur")');
const openTpl = async (pg) => { if (!(await pg.locator('.ae-tpl').isVisible())) await tplBtn(pg).click(); await pg.waitForFunction(() => !document.querySelector('.ae-tp-msg').textContent.startsWith('Memuat')); };
const msg = (pg) => pg.locator('.ae-tp-msg').textContent();
const rows = (pg) => pg.$$eval('.ae-tp-i', r => r.map(x => ({ name: x.querySelector('.ae-tp-n').textContent, meta: x.querySelector('.ae-tp-s').textContent, acts: Array.from(x.querySelectorAll('.ae-tp-a button')).map(b => b.getAttribute('data-act')) })));
const row = (pg, name) => pg.locator('.ae-tp-i', { has: pg.locator('.ae-tp-n', { hasText: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }) });
const saveAs = async (pg, name, scope) => {
  await openTpl(pg);
  await pg.fill('.ae-tp-save input', name);
  if (scope) await pg.selectOption('.ae-tp-save select', scope);
  const n = pg.posts.length;
  await pg.click('.ae-tp-save [data-act=tpl-save]');
  await pg.waitForFunction(() => !/^(Menyimpan|Memuat)/.test(document.querySelector('.ae-tp-msg').textContent));
  return pg.posts.length > n ? pg.posts[pg.posts.length - 1] : null;
};
const insertOf = async (pg, name) => {
  await openTpl(pg);
  await row(pg, name).locator('[data-act=insert]').click();
  await pg.waitForFunction(() => !/^Memuat templat/.test(document.querySelector('.ae-tp-msg').textContent));
  await pg.waitForTimeout(80);
};
async function api(ctx, method, qs, body) {
  const r = await ctx.request.fetch(BASE + '/edizon/templates.php' + (qs || ''), method === 'POST' ? { method, data: body, headers: { 'X-CSRF-Token': 't', 'Content-Type': 'application/json' } } : { method });
  return r.json();
}
async function wipe(ctx) {
  const j = await api(ctx, 'GET');
  for (const it of j.items || []) await api(ctx, 'POST', '', { action: 'delete', id: it.id });
}

(async () => {
  const br = await chromium.launch();
  const admin = await ctxFor(br, [{ name: 'role', value: 'admin' }, { name: 'uid', value: '1' }]);
  await wipe(admin);
  const pg = await open(admin);

  /* ---------- A. the pane ---------- */
  await make(pg, 'article', { templatesUrl: null });
  ok('A1 without a templates address there is no Templat button (editors that do not offer it stay as they were)', await tplBtn(pg).count() === 0 && await pg.locator('.ae-tpl').count() === 0);
  await make(pg, 'article');
  await setBlocks(pg, [H('Judul'), T('Isi'), IM(IMG), BTN('Daftar')]);
  ok('A2 the pane is hidden at first and the block palette is showing', !(await pg.locator('.ae-tpl').isVisible()) && await pg.locator('.ae-pal').isVisible());
  await tplBtn(pg).click();
  ok('A3 Templat opens the pane in place of the palette and the button shows it is on', await pg.locator('.ae-tpl').isVisible() && !(await pg.locator('.ae-pal').isVisible()) && await tplBtn(pg).getAttribute('aria-pressed') === 'true');
  await outBtn(pg).click();
  ok('A4 Struktur and Templat take turns (one pane at a time)', await pg.locator('.ae-out').isVisible() && !(await pg.locator('.ae-tpl').isVisible()) && await tplBtn(pg).getAttribute('aria-pressed') === 'false' && await outBtn(pg).getAttribute('aria-pressed') === 'true');
  await tplBtn(pg).click(); await tplBtn(pg).click();
  ok('A5 clicking Templat again returns to the palette', await pg.locator('.ae-pal').isVisible() && !(await pg.locator('.ae-tpl').isVisible()));
  await openTpl(pg);
  ok('A6 an empty list says so', (await pg.locator('.ae-tp-empty').textContent()).startsWith('Belum ada templat'));

  /* ---------- B. the scope (selected block / whole page) ---------- */
  const sel = pg.locator('.ae-tp-save select');
  ok('B1 with no block chosen only "Seluruh halaman" can be picked', await sel.evaluate(s => s.options[0].disabled && s.value === 'page'));
  await pick(pg, top(pg, 0));
  ok('B2 choosing a block enables "Blok yang dipilih", names its kind and makes it the pre-set scope', await sel.evaluate(s => !s.options[0].disabled && s.value === 'sel' && /Judul/.test(s.options[0].textContent)));
  await sel.selectOption('page');
  await pick(pg, top(pg, 1));
  ok('B3 a scope the writer picked is kept when another block is chosen', await sel.evaluate(s => s.value === 'page' && /Teks/.test(s.options[0].textContent)));

  /* ---------- C. saving ---------- */
  await pg.fill('.ae-tp-save input', '   ');
  let n = pg.posts.length;
  await pg.click('.ae-tp-save [data-act=tpl-save]');
  ok('C1 a blank name is refused on the page, nothing is sent', (await msg(pg)) === 'Beri nama templat.' && pg.posts.length === n);
  await pick(pg, top(pg, 0));
  await sel.selectOption('sel');
  let post = await saveAs(pg, 'Hero', 'sel');
  ok('C2 saving a chosen block sends only that block, without ids, with the editor kind', post && post.action === 'save' && post.scope === 'sel' && post.mode === 'article' && post.blocks.length === 1 && post.blocks[0].t === 'h' && !('id' in post.blocks[0]), post);
  ok('C3 the result is announced, the list shows it and the name box is empty again', /^Templat "Hero" disimpan \(1 blok\)\.$/.test(await msg(pg)) && (await rows(pg)).length === 1 && await pg.inputValue('.ae-tp-save input') === '', await msg(pg));
  ok('C4 the row says how many blocks, which editor, who made it', (await rows(pg))[0].meta.startsWith('1 blok · Artikel · Test user'), (await rows(pg))[0]);
  post = await saveAs(pg, 'Seluruh artikel', 'page');
  ok('C5 saving the whole page sends every block (ids stripped)', post.blocks.length === 4 && post.scope === 'page' && flat(post.blocks).every(b => !('id' in b)), post && post.blocks.length);
  ok('C6 the list is sorted by name', (await rows(pg)).map(r => r.name).join() === 'Hero,Seluruh artikel', await rows(pg));
  await setBlocks(pg, [H('Ada gambar kosong'), IM(''), T('')]);
  await openTpl(pg);
  post = await saveAs(pg, 'Dengan yang kosong', 'page');
  const m = await msg(pg);
  ok('C7 blocks that are empty or unfinished are left out, and the message says how many and why', /disimpan \(1 blok\)\./.test(m) && /2 blok tidak ikut/.test(m) && /gambar belum dipilih/.test(m), m);
  await setBlocks(pg, [IM(''), T('')]);
  await saveAs(pg, 'Semua kosong', 'page');
  ok('C8 a page with nothing valid is not saved and the reason is shown in red', /Tidak ada blok yang bisa disimpan/.test(await msg(pg)) && await pg.locator('.ae-tp-msg.is-bad').count() === 1 && (await rows(pg)).length === 3);
  await setBlocks(pg, [H('x')]);
  await saveAs(pg, 'hero', 'page');
  ok('C9 a name that is taken (any letter case) is refused by the server and the text kept for editing', /Sudah ada templat bernama "hero"/.test(await msg(pg)) && await pg.inputValue('.ae-tp-save input') === 'hero');
  await pg.fill('.ae-tp-save input', 'Lewat Enter');
  n = pg.posts.length;
  await pg.press('.ae-tp-save input', 'Enter');
  await pg.waitForFunction(() => /^Templat "Lewat Enter"/.test(document.querySelector('.ae-tp-msg').textContent));
  ok('C10 Enter in the name box saves', pg.posts.length === n + 1 && (await rows(pg)).length === 4);
  await setBlocks(pg, [COLS([H('Kiri'), IM('')], [T('Kanan')]), H('Luar')]);
  await pick(pg, top(pg, 0));
  post = await saveAs(pg, 'Dua kolom', 'sel');
  const stored = await api(admin, 'GET', '?id=' + (await api(admin, 'GET')).items.find(i => i.name === 'Dua kolom').id);
  ok('C11 a columns block is saved with what is inside it; the unfinished child is left out', stored.template.blocks.length === 1 && stored.template.blocks[0].cols[0].length === 1 && stored.template.blocks[0].cols[1].length === 1 && /1 blok tidak ikut/.test(await msg(pg)), await msg(pg));

  /* ---------- D. inserting ---------- */
  await setBlocks(pg, [H('A'), H('B'), H('C')]);
  await pick(pg, top(pg, 0));
  await insertOf(pg, 'Seluruh artikel');
  let d = await blocks(pg);
  ok('D1 a template goes in below the chosen block, in its own order', types(d).join() === 'h,h,text,img,button,h,h' && d[0].text === 'A' && d[1].text === 'Judul' && d[5].text === 'B', types(d));
  ok('D2 the inserted blocks get new ids (none repeats an id already on the page)', new Set(flat(d).map(b => b.id)).size === d.length && d.every(b => !!b.id));
  ok('D3 the first inserted block is chosen, and the message tells how many went in and how to undo', (await pg.locator('.ae-rootlist > .ae-blk.is-sel').getAttribute('data-id')) === d[1].id && /^Templat "Seluruh artikel" disisipkan \(4 blok\)\. Ctrl\+Z mengurungkan\.$/.test(await msg(pg)), await msg(pg));
  ok('D4 the page is marked changed', await pg.evaluate(() => window.__n > 0));
  await pg.keyboard.press('Control+z');
  d = await blocks(pg);
  ok('D5 one Ctrl+Z takes the whole insertion back', types(d).join() === 'h,h,h', types(d));
  await pg.keyboard.press('Control+y');
  ok('D6 Ctrl+Y puts it back', types(await blocks(pg)).join() === 'h,h,text,img,button,h,h');
  await setBlocks(pg, [H('A'), H('B')]);
  await pick(pg, top(pg, 0));
  await pg.locator('.ae-cvwrap').click({ position: { x: 2, y: 2 } }); // empty canvas margin: nothing chosen any more
  await openTpl(pg);
  const selected = await pg.locator('.ae-rootlist > .ae-blk.is-sel').count();
  await insertOf(pg, 'Hero');
  d = await blocks(pg);
  ok('D7 with no block chosen the template goes to the end of the page', selected === 0 && types(d).join() === 'h,h,h' && d[2].text === 'Judul', { selected, d: types(d) });
  await setBlocks(pg, [COLS([H('Dalam')], [T('x')]), H('Luar')]);
  await pick(pg, pg.locator('.ae-col .ae-blk').first());
  await insertOf(pg, 'Hero');
  d = await blocks(pg);
  ok('D8 with a block inside a column chosen, the template goes below the whole column block (never inside it)', types(d).join() === 'columns,h,h' && d[1].text === 'Judul' && d[0].cols[0].length === 1, types(d));
  await setBlocks(pg, [H('A')]);
  await insertOf(pg, 'Dua kolom');
  d = await blocks(pg);
  const ids = flat(d).map(b => b.id);
  ok('D9 a columns template comes in whole with fresh ids all the way down', types(d).join() === 'h,columns' && d[1].cols[0][0].text === 'Kiri' && new Set(ids).size === ids.length && ids.every(Boolean), ids);
  await insertOf(pg, 'Dua kolom');
  const ids2 = flat(await blocks(pg)).map(b => b.id);
  ok('D10 inserting the same template twice never repeats an id', new Set(ids2).size === ids2.length, ids2);
  await outBtn(pg).click();
  ok('D11 the outline (Struktur) shows what was inserted', (await pg.locator('.ae-ol-i').count()) >= 4);
  await outBtn(pg).click();
  await tplBtn(pg).click();

  /* ---------- E. other editors: what does not fit is skipped, and is said ---------- */
  await make(pg, 'result', { sections: [{ key: 'reading', name: 'Reading' }], vars: [{ v: '{name}', label: 'Nama' }] });
  await setBlocks(pg, [H('Halo {name}'), { t: 'score', style: 'card', align: 'center' }, { t: 'sections', title: 'Rincian' }, { t: 'spacer', h: 40 }, { t: 'form', slug: 'free-trial' }, BTN('Daftar', '#close')]);
  post = await saveAs(pg, 'Hasil lengkap', 'page');
  ok('E1 a result page can be saved with score, sections, spacer and form blocks', post && post.mode === 'result' && /disimpan \(6 blok\)/.test(await msg(pg)), await msg(pg));
  const hasil = (await api(admin, 'GET')).items.find(i => i.name === 'Hasil lengkap');
  ok('E2 the list says which editor made it', hasil && hasil.mode === 'result' && (await rows(pg)).find(r => r.name === 'Hasil lengkap').meta.includes('Halaman hasil'), hasil);
  await make(pg, 'popup');
  await setBlocks(pg, [H('Promo')]);
  await insertOf(pg, 'Hasil lengkap');
  d = await blocks(pg);
  ok('E3 in a pop-up the Score and Sections blocks are skipped; the rest comes in', types(d).join() === 'h,h,spacer,form,button', types(d));
  ok('E4 the message names what was skipped and why', /2 blok dilewati karena jenisnya tidak ada di pop-up ini \(Skor, Skor per bagian\)\./.test(await msg(pg)), await msg(pg));
  await make(pg, 'article');
  await setBlocks(pg, []);
  await insertOf(pg, 'Hasil lengkap');
  d = await blocks(pg);
  ok('E5 in an article the pop-up only blocks (score, sections, spacer, form) are skipped too', types(d).join() === 'h,button' && /4 blok dilewati karena jenisnya tidak ada di artikel ini/.test(await msg(pg)), { d: types(d), m: await msg(pg) });
  await make(pg, 'result', { sections: [], vars: [] });
  await setBlocks(pg, [{ t: 'score', style: 'card', align: 'center' }]);
  await insertOf(pg, 'Hero');
  ok('E6 an article template goes into a result page as it is', types(await blocks(pg)).join() === 'score,h', types(await blocks(pg)));

  /* ---------- F. HTML blocks are Admin only ---------- */
  await make(pg, 'article');
  await setBlocks(pg, [H('Dengan HTML'), { t: 'html', code: '<div class="kotak">Halo</div>', h: 'auto', scripts: false, size: 'normal', caption: '' }]);
  post = await saveAs(pg, 'Templat HTML', 'page');
  ok('F1 an Admin can save an HTML block into a template, and the row says so', /disimpan \(2 blok\)/.test(await msg(pg)) && (await rows(pg)).find(r => r.name === 'Templat HTML').meta.includes('memuat HTML'), await msg(pg));
  await setBlocks(pg, []);
  await insertOf(pg, 'Templat HTML');
  ok('F2 an Admin receives the HTML block', types(await blocks(pg)).join() === 'h,html');
  const editor = await ctxFor(br, [{ name: 'role', value: 'editor' }, { name: 'uid', value: '2' }]);
  const pe = await open(editor);
  await make(pe, 'article', { isAdmin: false });
  await setBlocks(pe, [H('Editor')]);
  await openTpl(pe);
  const er = await rows(pe);
  ok('F3 an editor sees the template, marked as skipping its HTML', er.find(r => r.name === 'Templat HTML').meta.includes('memuat HTML (dilewati)'), er);
  await insertOf(pe, 'Templat HTML');
  d = await blocks(pe);
  ok('F4 an editor receives it without the HTML block, and is told why', types(d).join() === 'h,h' && /1 blok HTML dilewati: hanya Admin yang bisa memasangnya\./.test(await msg(pe)), { d: types(d), m: await msg(pe) });
  ok('F5 an editor who did not make a template can only insert it (no rename, no delete)', er.every(r => r.acts.join() === 'insert'), er.map(r => r.acts));
  await setBlocks(pe, [H('Punya editor')]);
  await saveAs(pe, 'Punya Eko', 'page');
  ok('F6 an editor can save, and then sees rename and delete on their own template only', JSON.stringify((await rows(pe)).filter(r => r.acts.length > 1).map(r => r.name)) === '["Punya Eko"]', await rows(pe));
  await editor.close();

  /* ---------- G. rename and delete ---------- */
  await openTpl(pg);
  await row(pg, 'Hero').locator('[data-act=rename]').click();
  const rin = row(pg, 'Hero').locator('.ae-tp-x input');
  ok('G1 Ganti nama opens a box with the current name selected', await rin.isVisible() && await rin.inputValue() === 'Hero' && await rin.evaluate(i => document.activeElement === i));
  await rin.fill('Dua kolom');
  await row(pg, 'Hero').locator('[data-act=rename-ok]').click();
  await pg.waitForFunction(() => /Sudah ada/.test(document.querySelector('.ae-tp-msg').textContent));
  ok('G2 renaming to a name that is taken shows the server\'s refusal; the list and the box stay', /Sudah ada templat bernama "Dua kolom"/.test(await msg(pg)) && (await rows(pg)).some(r => r.name === 'Hero') && await rin.isVisible());
  await row(pg, 'Hero').locator('.ae-tp-x input').fill('Bagian atas');
  await row(pg, 'Hero').locator('.ae-tp-x input').press('Enter');
  await pg.waitForFunction(() => /^Nama templat diganti/.test(document.querySelector('.ae-tp-msg').textContent));
  ok('G4 a new name is saved and the list is sorted again', (await rows(pg)).some(r => r.name === 'Bagian atas') && !(await rows(pg)).some(r => r.name === 'Hero'));
  await row(pg, 'Bagian atas').locator('[data-act=rename]').click();
  await row(pg, 'Bagian atas').locator('.ae-tp-x input').press('Escape');
  ok('G5 Escape closes the rename box without changing anything', !(await row(pg, 'Bagian atas').locator('.ae-tp-x').isVisible()) && (await rows(pg)).some(r => r.name === 'Bagian atas'));
  const before = (await rows(pg)).length;
  await row(pg, 'Bagian atas').locator('[data-act=del]').click();
  ok('G6 Hapus asks first and names the template', /Hapus templat "Bagian atas"\?/.test(await row(pg, 'Bagian atas').locator('.ae-tp-x').textContent()) && (await rows(pg)).length === before);
  await row(pg, 'Bagian atas').locator('.ae-tp-x button:text-is("Batal")').click();
  ok('G7 Batal keeps it', (await rows(pg)).length === before && !(await row(pg, 'Bagian atas').locator('.ae-tp-x').isVisible()));
  await row(pg, 'Bagian atas').locator('[data-act=del]').click();
  await row(pg, 'Bagian atas').locator('[data-act=del-ok]').click();
  await pg.waitForFunction(() => /^Templat dihapus/.test(document.querySelector('.ae-tp-msg').textContent));
  ok('G8 "Ya, hapus" removes it, and a page that used it is untouched', (await rows(pg)).length === before - 1 && !(await rows(pg)).some(r => r.name === 'Bagian atas') && (await blocks(pg)).length > 0);

  /* ---------- H. failures, security, layout ---------- */
  await pg.route('**/templates.php*', r => r.abort());
  await tplBtn(pg).click(); await tplBtn(pg).click(); // closes (palette), opens (list load fails)
  await pg.waitForTimeout(300);
  ok('H1 when the server cannot be reached the pane says so and the editor keeps working', /Koneksi terputus/.test(await msg(pg)) && await pg.locator('.ae-root').isVisible());
  await pg.fill('.ae-tp-save input', 'Tak terkirim');
  await pg.click('.ae-tp-save [data-act=tpl-save]');
  await pg.waitForFunction(() => /Koneksi terputus/.test(document.querySelector('.ae-tp-msg').textContent));
  ok('H2 a save that cannot reach the server says the template is not saved, and keeps the name', /belum tersimpan/.test(await msg(pg)) && await pg.inputValue('.ae-tp-save input') === 'Tak terkirim');
  await pg.unroute('**/templates.php*');
  const bad = await admin.request.fetch(BASE + '/edizon/templates.php', { method: 'POST', data: { action: 'save', name: 'x', mode: 'article', blocks: [{ t: 'hr' }] }, headers: { 'X-CSRF-Token': 'wrong', 'Content-Type': 'application/json' } });
  ok('H3 a write with a wrong CSRF token is refused (403) and nothing is stored', bad.status() === 403 && !(await api(admin, 'GET')).items.some(i => i.name === 'x'));
  const rj = await api(admin, 'POST', '', { action: 'nope' });
  ok('H4 an unknown action is a 400 with a message', rj.ok === false && rj.errors.length === 1);
  const viol = await pg.evaluate(() => window.__viol.slice());
  ok('H5 the panel\'s content security policy is not violated', viol.length === 0, viol);
  const logs = pg.logs.filter(l => !/Failed to load resource|net::ERR_FAILED|400|403|404|422/.test(l));
  ok('H6 no script errors or console warnings', logs.length === 0, logs);
  const nar = await open(await ctxFor(br, [{ name: 'role', value: 'admin' }], { width: 700, height: 900 }));
  await make(nar, 'article');
  await setBlocks(nar, [H('Sempit')]);
  await openTpl(nar);
  const ov = await nar.evaluate(() => { const d = document.querySelector('.ae-dock'); const r = document.querySelector('.ae-tpl').getBoundingClientRect(); return { sw: d.scrollWidth, cw: d.clientWidth, right: r.right, vw: window.innerWidth }; });
  ok('H7 on a narrow screen the pane fits the dock without sideways scrolling', ov.sw <= ov.cw + 1 && ov.right <= ov.vw + 1, ov);
  await wipe(admin);

  await br.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n' + (results.length - failed.length) + ' passed, ' + failed.length + ' failed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
