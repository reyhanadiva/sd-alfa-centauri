/* eslint-disable */
// Browser checks for the version history card (articles, pop-ups, quizzes): list, preview of an old version, two-step restore.
// Needs both harnesses, freshly generated (the history is kept in a file there):
//   node test/make-harness.mjs  (8099, article.php)    and    node test/make-pop-harness.mjs  (8097, popup-page.php / quiz-page.php)
// then: node test/revisions-run.js
const { chromium } = require('playwright');
const ART = process.env.HARNESS_URL || 'http://127.0.0.1:8099';
const POP = process.env.HARNESS_POP_URL || 'http://127.0.0.1:8097';
const results = [];
const ok = (name, pass, extra) => { results.push({ name, pass: !!pass, extra }); console.log((pass ? 'PASS ' : 'FAIL ') + name + ((!pass || process.env.VERBOSE) && extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
const HOOK = () => {
  let real;
  Object.defineProperty(window, 'ArtEditor', { configurable: true, get() { return real; }, set(v) { real = v && Object.assign({}, v, { create(o) { const e = v.create(o); window.__ed = e; return e; } }); } });
  window.__viol = [];
  document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' | ' + e.blockedURI));
};
const H = (t) => ({ t: 'h', level: 2, text: t });
const texts = (d) => d.map(b => b.t === 'h' ? b.text : b.t);

async function open(br, url, ready) {
  const ctx = await br.newContext({ viewport: { width: 1360, height: 1000 } });
  await ctx.addInitScript(HOOK);
  const pg = await ctx.newPage();
  pg.logs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pg.logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => pg.logs.push('pageerror: ' + e.message));
  await pg.goto(url);
  await pg.waitForSelector(ready || '.ae-root');
  return pg;
}
const blocks = (pg) => pg.evaluate(() => window.__ed.getBlocks());
const setBlocks = (pg, b) => pg.evaluate((x) => window.__ed.setBlocks(x), b);
const items = (pg) => pg.locator('.rev-item');
const openCard = async (pg) => { const d = pg.locator('.rev-card details'); if (!(await d.evaluate(n => n.open))) await d.locator('summary').click(); await pg.waitForTimeout(300); };
const itemInfo = (pg) => pg.locator('.rev-item').evaluateAll(a => a.map(x => ({ id: x.getAttribute('data-rev'), text: x.querySelector('.rev-meta').innerText.replace(/\s+/g, ' ').trim(), href: x.querySelector('[data-act=preview]').getAttribute('href') })));
async function saveVia(pg, urlRe) {
  const [resp] = await Promise.all([pg.waitForResponse(r => urlRe.test(r.url()) && r.request().method() === 'POST'), pg.click('#save')]);
  const j = await resp.json();
  await pg.waitForTimeout(500); // the card reloads its list after the save
  return j;
}
async function restoreRow(pg, i) {
  await items(pg).nth(i).locator('[data-act=restore]').click();
  await items(pg).nth(i).locator('[data-act=yes]').click();
  await pg.waitForTimeout(400);
}

(async () => {
  const br = await chromium.launch();

  /* ---------- A. articles (the real article.php, real revisions.php) ---------- */
  let pg = await open(br, ART + '/edizon/article.php');
  await pg.evaluate(() => document.querySelector('.rev-card').scrollIntoView());
  ok('A1 the history card is at the bottom of the page and collapsed', await pg.locator('.rev-card details').count() === 1 && !(await pg.locator('.rev-card details').evaluate(n => n.open)) && /Riwayat versi/.test(await pg.locator('.rev-card summary').innerText()));
  await openCard(pg);
  ok('A2 a new article has no versions yet and says so', /Belum ada versi/.test(await pg.locator('.rev-card').innerText()) && await items(pg).count() === 0);

  await pg.fill('input[placeholder="Judul artikel"]', 'Versi satu');
  await setBlocks(pg, [H('Isi satu')]);
  let j = await saveVia(pg, /article\.php/);
  ok('A3 (setup) the first save works', j.ok === true, j.errors);
  let info = await itemInfo(pg);
  ok('A4 after the first save the card (still open) lists one version: time, who, title, summary, "terakhir disimpan"', info.length === 1 && /Test user/.test(info[0].text) && /terakhir disimpan/.test(info[0].text) && /Versi satu/.test(await items(pg).first().innerText()) && /1 blok · draf/.test(await items(pg).first().innerText()), info);
  const slugAfter = await pg.locator('input[placeholder="otomatis dari judul"][maxlength="80"]').inputValue();

  await pg.fill('input[placeholder="Judul artikel"]', 'Versi dua');
  await setBlocks(pg, [H('Isi satu'), H('Isi dua'), { t: 'text', html: '<p>Paragraf dua</p>' }]);
  j = await saveVia(pg, /article\.php/);
  await pg.fill('input[placeholder="Judul artikel"]', 'Versi tiga');
  await setBlocks(pg, [H('Hanya satu')]);
  j = await saveVia(pg, /article\.php/);
  info = await itemInfo(pg);
  ok('A5 each save adds a version, newest first (three so far)', info.length === 3 && /Versi tiga/.test(await items(pg).nth(0).innerText()) && /Versi dua/.test(await items(pg).nth(1).innerText()) && /Versi satu/.test(await items(pg).nth(2).innerText()), info);
  ok('A5b only the newest carries the "terakhir disimpan" badge', (await pg.locator('.rev-badge').count()) === 1 && /terakhir disimpan/.test(info[0].text) && !/terakhir disimpan/.test(info[1].text));
  ok('A5c the summary counts blocks', /3 blok · draf/.test(await items(pg).nth(1).innerText()) && /1 blok · draf/.test(await items(pg).nth(0).innerText()));
  await pg.click('#save');
  await pg.waitForTimeout(600);
  ok('A6 saving again without changes adds no version', await items(pg).count() === 3);

  // preview of an old version
  ok('A7 "Pratinjau" is a link that opens in a new tab, to the version', /^article-preview\.php\?id=1&rev=\d+$/.test(info[1].href) && (await items(pg).nth(1).locator('[data-act=preview]').getAttribute('target')) === '_blank', info[1].href);
  const pv = await pg.context().newPage();
  await pv.goto(ART + '/edizon/' + info[1].href);
  const pvText = await pv.locator('body').innerText();
  ok('A8 the preview shows that older version (title and all three blocks), not the current one', /Versi dua/.test(pvText) && /Isi dua/.test(pvText) && /Paragraf dua/.test(pvText) && !/Hanya satu/.test(pvText), pvText.slice(0, 200));
  const pvBad = await pg.context().newPage();
  const rbad = await pvBad.goto(ART + '/edizon/article-preview.php?id=1&rev=999999');
  ok('A8b a version that does not exist shows an error, not a page', rbad.status() === 400 || rbad.status() === 404, rbad.status());
  await pv.close(); await pvBad.close();

  // restore: two steps
  await pg.fill('input[placeholder="Judul artikel"]', 'Ketikan yang belum disimpan');
  await items(pg).nth(1).locator('[data-act=restore]').click();
  const conf = items(pg).nth(1).locator('.rev-confirm');
  ok('A9 "Kembalikan" asks first, and warns that unsaved changes will be replaced', await conf.isVisible() && /belum disimpan akan diganti/.test(await conf.innerText()), await conf.innerText());
  ok('A9b nothing has changed yet', (await pg.locator('input[placeholder="Judul artikel"]').inputValue()) === 'Ketikan yang belum disimpan' && texts(await blocks(pg)).join() === 'Hanya satu');
  await conf.locator('[data-act=no]').click();
  ok('A10 "Batal" closes the question and changes nothing', await conf.isHidden() && (await pg.locator('input[placeholder="Judul artikel"]').inputValue()) === 'Ketikan yang belum disimpan');
  await restoreRow(pg, 1);
  ok('A11 "Ya, kembalikan" puts that version into the form: title and blocks', (await pg.locator('input[placeholder="Judul artikel"]').inputValue()) === 'Versi dua' && texts(await blocks(pg)).join() === 'Isi satu,Isi dua,text', texts(await blocks(pg)));
  ok('A12 the address (slug) is kept as it is now', (await pg.locator('input[placeholder="otomatis dari judul"][maxlength="80"]').inputValue()) === slugAfter, slugAfter);
  ok('A13 the page is marked as changed (not saved yet) and a message says what to do', await pg.locator('#dirty').isVisible() && /klik Simpan/.test(await pg.locator('.rev-msg').innerText()), await pg.locator('.rev-msg').innerText());
  ok('A14 restoring starts a fresh undo history (Ctrl+Z cannot half-undo a restore)', !(await pg.evaluate(() => window.__ed.canUndo())));
  ok('A15 the history still has three versions (restoring itself writes nothing)', await items(pg).count() === 3);
  j = await saveVia(pg, /article\.php/);
  info = await itemInfo(pg);
  ok('A16 saving after a restore makes a new version with the restored content', j.ok === true && info.length === 4 && /Versi dua/.test(await items(pg).first().innerText()) && /3 blok/.test(await items(pg).first().innerText()), info.length);
  ok('A17 the restored blocks are what the server stored', texts(await blocks(pg)).join() === 'Isi satu,Isi dua,text');

  // the endpoint
  const api = (q) => pg.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); return [r.status, await r.json()]; }, ART + '/edizon/revisions.php?' + q);
  const [s1, b1] = await api('kind=article&id=1');
  ok('A18 the endpoint lists versions without their content', s1 === 200 && b1.ok && b1.revs.length === 4 && !('data' in b1.revs[0]) && b1.keep === 30, [s1, Object.keys(b1)]);
  const [s2, b2] = await api('kind=article&id=1&rev=' + b1.revs[0].id);
  ok('A19 one version comes with its content', s2 === 200 && b2.ok && b2.data.title === 'Versi dua' && b2.data.blocks.length === 3, [s2, b2.data && b2.data.title]);
  const [s3] = await api('kind=bogus&id=1'); const [s4] = await api('kind=article&id=0'); const [s5] = await api('kind=article&id=1&rev=99999');
  ok('A20 bad kind or id is refused (400), an unknown version is 404', s3 === 400 && s4 === 400 && s5 === 404, [s3, s4, s5]);
  const post = await pg.evaluate(async (u) => (await fetch(u, { method: 'POST', credentials: 'same-origin' })).status, ART + '/edizon/revisions.php?kind=article&id=1');
  ok('A21 the endpoint is read-only (POST refused)', post === 400, post);
  ok('A22 no console errors (apart from the refused requests made on purpose above) or policy violations on the article page', pg.logs.filter(l => !/status of (400|404)/.test(l)).length === 0 && (await pg.evaluate(() => window.__viol)).length === 0, [pg.logs, await pg.evaluate(() => window.__viol)]);
  await pg.context().close();

  /* ---------- B. pop-ups ---------- */
  pg = await open(br, POP + '/edizon/popup-page.php');
  await openCard(pg);
  ok('B1 the card is on the pop-up page and starts empty', await items(pg).count() === 0 && /Belum ada versi/.test(await pg.locator('.rev-card').innerText()));
  const nameIn = pg.locator('input[placeholder="mis. Promo Semester Baru"]');
  await nameIn.fill('Promo satu');
  j = await saveVia(pg, /popup-page\.php/);
  const seedBlocks = await blocks(pg);
  await nameIn.fill('Promo dua');
  await setBlocks(pg, [H('Judul dua'), { t: 'text', html: '<p>Isi dua</p>' }]);
  j = await saveVia(pg, /popup-page\.php/);
  info = await itemInfo(pg);
  ok('B2 two saves make two versions', info.length === 2 && /Promo dua/.test(await items(pg).nth(0).innerText()) && /Promo satu/.test(await items(pg).nth(1).innerText()), info);
  ok('B3 "Pratinjau" points to popup-preview.php with the version', /^popup-preview\.php\?id=1&rev=\d+$/.test(info[1].href), info[1].href);
  const pp = await pg.context().newPage();
  const old = await pp.goto(POP + '/edizon/popup-preview.php?id=1&bare=1&rev=' + info[1].id);
  await pp.waitForTimeout(1200);
  const oldText = await pp.locator('body').innerText();
  ok('B4 the pop-up preview of the old version shows the old content, not the current', old.status() === 200 && /Promo semester baru/.test(oldText) && !/Judul dua/.test(oldText), oldText.slice(0, 200));
  await pp.goto(POP + '/edizon/popup-preview.php?id=1&bare=1&rev=' + info[0].id);
  await pp.waitForTimeout(1200);
  ok('B4b the newest version shows the newest content', /Judul dua/.test(await pp.locator('body').innerText()));
  const shell = await pp.goto(POP + '/edizon/popup-preview.php?id=1&rev=' + info[1].id);
  ok('B5 the preview page labels itself as an old version and its frame carries the version', /VERSI LAMA/.test(await pp.locator('.enf-previewbar').innerText()) && (await pp.locator('#enp-frame').getAttribute('src')).includes('&rev=' + info[1].id), await pp.locator('.enf-previewbar').innerText());
  const nf = await pp.goto(POP + '/edizon/popup-preview.php?id=1&bare=1&rev=99999');
  ok('B5b an unknown version is a 404 with a message', nf.status() === 404 && /tidak bisa ditampilkan/.test(await pp.locator('body').innerText()), nf.status());
  await pp.close();
  await nameIn.fill('Ketik baru');
  await restoreRow(pg, 1);
  ok('B6 restoring the older pop-up puts its name and blocks back', (await nameIn.inputValue()) === 'Promo satu' && texts(await blocks(pg)).join() === texts(seedBlocks).join(), [await nameIn.inputValue(), texts(await blocks(pg))]);
  ok('B7 the page is marked changed, the restored blocks sit in the editor', await pg.locator('#dirty').isVisible() && await pg.locator('.ae-rootlist > .ae-blk').count() === seedBlocks.length);
  j = await saveVia(pg, /popup-page\.php/);
  ok('B8 saving writes the restored content as the newest version', j.ok === true && await items(pg).count() === 3 && /Promo satu/.test(await items(pg).first().innerText()), await items(pg).count());
  ok('B9 no console errors or policy violations on the pop-up page', pg.logs.length === 0 && (await pg.evaluate(() => window.__viol)).length === 0, [pg.logs, await pg.evaluate(() => window.__viol)]);
  await pg.context().close();

  /* ---------- C. quizzes ---------- */
  pg = await open(br, POP + '/edizon/quiz-page.php');
  await pg.waitForSelector('.rev-card');
  await openCard(pg);
  ok('C1 the card is on the quiz page', await items(pg).count() === 0);
  const qName = pg.locator('input[placeholder="mis. Placement Test Dewasa"]');
  const firstHeading = (await blocks(pg))[0].text;
  await qName.fill('Tes satu');
  j = await saveVia(pg, /quiz-page\.php/);
  ok('C2 (setup) the first quiz save works', j.ok === true, j.errors);
  await qName.fill('Tes dua');
  const b = await blocks(pg); b[0] = Object.assign({}, b[0], { text: 'Judul hasil dua' });
  await setBlocks(pg, b);
  j = await saveVia(pg, /quiz-page\.php/);
  info = await itemInfo(pg);
  ok('C3 two saves, two versions with the quiz summary (questions and result pages)', info.length === 2 && /3 soal · 3 halaman hasil/.test(await items(pg).nth(0).innerText()), await items(pg).nth(0).innerText());
  ok('C4 "Pratinjau" points to quiz-preview.php with the version', /^quiz-preview\.php\?id=1&rev=\d+$/.test(info[1].href), info[1].href);
  const qp = await pg.context().newPage();
  const qresp = await qp.goto(POP + '/edizon/quiz-preview.php?id=1&bare=1&range=ra1&rev=' + info[1].id);
  await qp.waitForTimeout(1500);
  const qOld = await qp.locator('body').innerText();
  ok('C5 the quiz preview of the old version shows the old result page', qresp.status() === 200 && /level Anda/.test(qOld) && !/Judul hasil dua/.test(qOld), qOld.slice(0, 200));
  await qp.goto(POP + '/edizon/quiz-preview.php?id=1&bare=1&range=ra1&rev=' + info[0].id);
  await qp.waitForTimeout(1500);
  ok('C5b the newest version shows its own result page', /Judul hasil dua/.test(await qp.locator('body').innerText()));
  await qp.goto(POP + '/edizon/quiz-preview.php?id=1&rev=' + info[1].id);
  ok('C6 the shell labels the old version and passes the version on (frame, so the answers are graded by that version)', /VERSI LAMA/.test(await qp.locator('.enf-previewbar').innerText()) && (await qp.locator('#enq-frame').getAttribute('src')).includes('rev=' + info[1].id));
  const qnf = await qp.goto(POP + '/edizon/quiz-preview.php?id=1&bare=1&rev=99999');
  ok('C6b an unknown version is a 404 with a message', qnf.status() === 404, qnf.status());
  await qp.close();
  await qName.fill('Ketik baru');
  await restoreRow(pg, 1);
  const rb = await blocks(pg);
  ok('C7 restoring the older quiz puts its name back and the result editor shows that version\'s blocks', (await qName.inputValue()) === 'Tes satu' && rb[0].text === firstHeading, [await qName.inputValue(), rb[0].text]);
  ok('C8 the page is marked changed and the editor history starts fresh', await pg.locator('#dirty').isVisible() && !(await pg.evaluate(() => window.__ed.canUndo())));
  j = await saveVia(pg, /quiz-page\.php/);
  ok('C9 saving writes the restored quiz as the newest version', j.ok === true && await items(pg).count() === 3 && /Tes satu/.test(await items(pg).first().innerText()), await items(pg).count());
  ok('C10 no console errors or policy violations on the quiz page', pg.logs.filter(l => !/422/.test(l)).length === 0 && (await pg.evaluate(() => window.__viol)).length === 0, [pg.logs, await pg.evaluate(() => window.__viol)]);
  // phone width
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.evaluate(() => document.querySelector('.rev-card').scrollIntoView());
  const ov = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok('C11 at phone width the history card does not widen the page', ov.sw <= ov.cw + 1, ov);
  await pg.context().close();

  await br.close();
  const bad = results.filter(x => !x.pass);
  console.log('\n' + (results.length - bad.length) + ' / ' + results.length + ' checks passed');
  if (bad.length) { console.log('FAILED: ' + bad.map(x => x.name).join(' | ')); process.exit(1); }
})();
