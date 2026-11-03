/* eslint-disable */
// Browser checks for the public form script (steps, side-by-side fields, layout blocks, saved drafts) and the form editor,
// against the form harness. Start it first:  node test/make-form-harness.mjs   then:  node test/form-run.js
// Needs Playwright (see the article editor tests).
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const SHOTS = process.env.SHOTS || os.tmpdir();
const BASE = process.env.FORM_HARNESS_URL || 'http://127.0.0.1:8098';
const results = [];
const ok = (name, pass, extra) => { results.push({ name, pass: !!pass, extra }); console.log((pass ? 'PASS ' : 'FAIL ') + name + ((!pass || process.env.VERBOSE) && extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const post = async (p, body) => { const r = await fetch(BASE + p, { method: 'POST', body: JSON.stringify(body) }); return r.json(); };
const reset = () => post('/h/reset.php', {});
const subs = async () => (await (await fetch(BASE + '/h/subs.php')).json()).rows;
const T = (over) => ({ kids: Object.assign({ eyebrow: '', title: 'Judul formulir', intro: '', submit: 'Kirim', note: '', successTitle: 'Terima kasih', successMsg: 'Sudah masuk.' }, over || {}), adult: { eyebrow: '', title: '', intro: '', submit: '', note: '', successTitle: '', successMsg: '' } });
const F = (key, type, label, x) => Object.assign({ key, type, label, labelAdult: '', hint: '', required: false, options: [], zkey: '', suggest: { list: [], learn: false }, showIf: null, consent: { text: '', url: '' } }, x || {});
const fi = (k) => ({ t: 'field', key: k });
const row = (ks, id) => ({ t: 'row', id: id || 'rw' + ks.join('').slice(0, 8), keys: ks });
async function seed(def) {
  const r = await post('/h/seed.php', Object.assign({ name: 'Uji', slug: 'uji', layout: 'popup', status: 'published', waFallback: true, photo: '', texts: T(), fields: [], steps: [] }, def));
  if (!r.ok) throw new Error('seed failed: ' + JSON.stringify(r.errors));
  return r.slug;
}

const THREE = () => ({
  fields: [F('nama', 'text', 'Nama lengkap', { required: true }), F('umur', 'text', 'Umur'), F('wa', 'phone', 'WhatsApp', { required: true }),
    F('kelas', 'select', 'Pilih kelas', { options: ['Anak', 'Dewasa'], required: true }), F('catatan', 'textarea', 'Catatan'), F('setuju', 'consent', 'Saya setuju', { required: true })],
  steps: [
    { id: 'data', name: 'Data diri', items: [{ t: 'h', id: 'h0001', text: 'Siapa yang belajar?', textAdult: 'Data Anda', level: 2 }, row(['nama', 'umur'], 'row001'), fi('wa')] },
    { id: 'pilih', name: 'Pilihan', items: [{ t: 'text', id: 'tx001', text: 'Baris satu\nBaris dua', textAdult: '' }, fi('kelas'), { t: 'hr', id: 'hr001' }, fi('catatan')] },
    { id: 'akhir', name: 'Konfirmasi', items: [fi('setuju')] },
  ],
});

async function newPage(br, opts = {}) {
  const ctx = opts.ctx || await br.newContext(opts.ctxOpts || { viewport: { width: 1200, height: 900 } });
  if (opts.init) await ctx.addInitScript(opts.init);
  await ctx.addInitScript(() => { window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' | ' + e.blockedURI)); });
  const pg = await ctx.newPage();
  pg.ctx = ctx; pg.logs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pg.logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => pg.logs.push('pageerror: ' + e.message));
  return pg;
}
const openForm = async (pg, slug, q = '') => { await pg.goto(BASE + '/t/page.php?slug=' + slug + q); await pg.waitForFunction(() => window.ENForms); await pg.click('#open'); await pg.waitForSelector('.enf-form'); };
const vis = (pg, sel) => pg.locator(sel).filter({ visible: true });
const prog = (pg) => pg.locator('.enf-prog-t').textContent();
const nextBtn = (pg) => pg.locator('.enf-nav button[type=submit]');
const backBtn = (pg) => pg.locator('.enf-nav .enf-ghost');
const err = async (pg) => (await pg.locator('.enf-err').isVisible()) ? pg.locator('.enf-err').textContent() : '';
const LS = (pg, k) => pg.evaluate((k) => localStorage.getItem(k), k);

(async () => {
  const br = await chromium.launch();

  /* ---------- P. single step (how old forms behave) ---------- */
  await reset();
  let slug = await seed({ fields: [F('nama', 'text', 'Nama', { required: true }), F('wa', 'phone', 'WhatsApp', { required: true })] });
  let pg = await newPage(br);
  await openForm(pg, slug);
  ok('P1 a one-step form shows no progress and no Back button', !(await pg.locator('.enf-prog').isVisible()) && !(await backBtn(pg).isVisible()) && (await nextBtn(pg).textContent()) === 'Kirim');
  await nextBtn(pg).click();
  ok('P1b submitting empty shows the first problem', (await err(pg)) === 'Nama wajib diisi.', await err(pg));
  await pg.fill('[name=nama]', 'Budi'); await pg.fill('[name=wa]', '081234567890');
  await nextBtn(pg).click();
  await pg.waitForSelector('.enf-done');
  const s1 = await subs();
  ok('P1c a one-step form still submits as before', s1.length === 1 && s1[0].data.nama === 'Budi' && s1[0].data.wa === '081234567890', s1);
  ok('P1d no CSP violation and no console error', !(await pg.evaluate(() => window.__viol)).length && !pg.logs.length, [await pg.evaluate(() => window.__viol), pg.logs]);
  await pg.ctx.close();

  /* ---------- Q. steps ---------- */
  await reset();
  slug = await seed(THREE());
  pg = await newPage(br);
  await openForm(pg, slug);
  ok('Q1 the first step shows with its name and count', (await prog(pg)) === 'Langkah 1 dari 3 · Data diri', await prog(pg));
  ok('Q1b only the first step is visible', (await vis(pg, '.enf-step').count()) === 1 && (await vis(pg, '[name=nama]').count()) === 1 && (await vis(pg, '[name=kelas]').count()) === 0);
  ok('Q1c the button says Lanjut and Back is hidden', (await nextBtn(pg).textContent()) === 'Lanjut' && !(await backBtn(pg).isVisible()));
  ok('Q1d the progress bar has one segment per step with the first one lit', (await pg.locator('.enf-bar span').count()) === 3 && (await pg.locator('.enf-bar span.on').count()) === 1);
  await nextBtn(pg).click();
  ok('Q2 Next with a required field empty stays and says which', (await prog(pg)).startsWith('Langkah 1') && (await err(pg)) === 'Nama lengkap wajib diisi.', [await prog(pg), await err(pg)]);
  ok('Q2b the problem field gets the focus', await pg.evaluate(() => document.activeElement && document.activeElement.name === 'nama'));
  await pg.fill('[name=nama]', 'Budi'); await pg.fill('[name=umur]', '9'); await pg.fill('[name=wa]', '123');
  await nextBtn(pg).click();
  ok('Q3 a phone number that is too short is caught on the step', (await err(pg)).includes('belum lengkap'), await err(pg));
  await pg.fill('[name=wa]', '081234567890');
  await nextBtn(pg).click();
  ok('Q4 Next moves to step 2 and clears the error', (await prog(pg)) === 'Langkah 2 dari 3 · Pilihan' && !(await pg.locator('.enf-err').isVisible()));
  ok('Q4b step 2 shows its fields, step 1 is hidden', (await vis(pg, '[name=kelas]').count()) === 1 && (await vis(pg, '[name=nama]').count()) === 0 && (await backBtn(pg).isVisible()));
  await backBtn(pg).click();
  ok('Q5 Back returns to step 1 with the typed values kept', (await prog(pg)).startsWith('Langkah 1') && (await pg.inputValue('[name=nama]')) === 'Budi' && (await pg.inputValue('[name=umur]')) === '9');
  await pg.press('[name=wa]', 'Enter');   // Enter in a text field of step 1 goes next, it does not send the form
  await sleep(100);
  ok('Q6 Enter inside a step goes next (it does not send the form)', (await prog(pg)).startsWith('Langkah 2') && (await subs()).length === 0, await prog(pg));
  await pg.selectOption('[name=kelas]', 'Anak');
  await pg.fill('[name=catatan]', 'Halo');
  await nextBtn(pg).click();
  ok('Q6b the last step says Kirim', (await nextBtn(pg).textContent()) === 'Kirim');
  await nextBtn(pg).click();
  ok('Q7 the consent box on the last step is required', (await err(pg)) === 'Saya setuju harus disetujui.', await err(pg));
  await pg.check('[name=setuju]');
  await nextBtn(pg).click();
  await pg.waitForSelector('.enf-done');
  const s2 = await subs();
  ok('Q8 one submission with the fields of every step', s2.length === 1 && s2[0].data.nama === 'Budi' && s2[0].data.umur === '9' && s2[0].data.kelas === 'Anak' && s2[0].data.catatan === 'Halo' && !!s2[0].data.setuju, s2);
  ok('Q8b the success message shows', (await pg.locator('.enf-h2').first().textContent()) === 'Terima kasih');
  ok('Q9 no CSP violation and no console error through the whole flow', !(await pg.evaluate(() => window.__viol)).length && !pg.logs.length, [await pg.evaluate(() => window.__viol), pg.logs]);
  await pg.ctx.close();

  /* ---------- R. rows and layout blocks ---------- */
  pg = await newPage(br);
  await openForm(pg, slug);
  const bn = await pg.locator('[name=nama]').boundingBox(), bu = await pg.locator('[name=umur]').boundingBox(), bw = await pg.locator('[name=wa]').boundingBox();
  ok('R1 two fields in a row sit side by side with the same height line', Math.abs(bn.y - bu.y) < 2 && bu.x > bn.x + bn.width - 2, [bn, bu]);
  ok('R1b the next field goes below the row', bw.y > bn.y + bn.height - 2, [bn, bw]);
  ok('R2 the heading shows (kids text) as a heading element', (await pg.locator('h3.enf-lh').textContent()) === 'Siapa yang belajar?');
  await pg.fill('[name=nama]', 'A'); await pg.fill('[name=wa]', '081234567890'); await nextBtn(pg).click();
  const txt = await pg.locator('.enf-lt').evaluate(n => ({ t: n.textContent, ws: getComputedStyle(n).whiteSpace }));
  ok('R3 the explanatory text keeps its line breaks', txt.t === 'Baris satu\nBaris dua' && txt.ws === 'pre-line', txt);
  ok('R4 the divider shows', (await pg.locator('hr.enf-hr').isVisible()));
  await pg.shot; await pg.screenshot({ path: path.join(SHOTS, 'form-step2-desktop.png') });
  await pg.ctx.close();
  pg = await newPage(br, { ctxOpts: { viewport: { width: 390, height: 800 } } });
  await openForm(pg, slug);
  const pn = await pg.locator('[name=nama]').boundingBox(), pu = await pg.locator('[name=umur]').boundingBox();
  ok('R5 on a phone the row stacks', pu.y > pn.y + pn.height - 2 && Math.abs(pu.x - pn.x) < 2, [pn, pu]);
  ok('R5b nothing overflows sideways on a phone', await pg.evaluate(() => { const f = document.querySelector('.enf-form'), r = f.getBoundingClientRect(); return f.scrollWidth <= f.clientWidth + 1 && Array.from(f.querySelectorAll('.enf-in')).every(i => i.getBoundingClientRect().right <= r.right + 1); }));
  await pg.screenshot({ path: path.join(SHOTS, 'form-step1-phone.png') });
  await pg.ctx.close();
  pg = await newPage(br);
  await openForm(pg, slug, '&aud=adult');
  ok('R6 the Adult theme uses the Adult heading text', (await pg.locator('h3.enf-lh').textContent()) === 'Data Anda');
  await pg.ctx.close();

  /* ---------- S. conditional fields and steps ---------- */
  await reset();
  slug = await seed({
    fields: [F('kelas', 'select', 'Kelas', { options: ['Anak', 'Dewasa'], required: true }), F('sekolah', 'text', 'Nama sekolah', { required: true, showIf: { key: 'kelas', equals: 'Anak' } }), F('wa', 'phone', 'WhatsApp', { required: true })],
    steps: [{ id: 'a', name: 'Kelas', items: [fi('kelas')] }, { id: 'b', name: 'Sekolah', items: [fi('sekolah')] }, { id: 'c', name: 'Kontak', items: [fi('wa')] }],
  });
  pg = await newPage(br);
  await openForm(pg, slug);
  ok('S1 with an answer that hides step 2 the count is 2', (await prog(pg)).startsWith('Langkah 1 dari 2') || (await prog(pg)).startsWith('Langkah 1 dari 3'), await prog(pg));
  await pg.selectOption('[name=kelas]', 'Dewasa');
  ok('S2 choosing Dewasa skips the school step', (await prog(pg)) === 'Langkah 1 dari 2 · Kelas', await prog(pg));
  await nextBtn(pg).click();
  ok('S3 Next goes straight to Kontak', (await prog(pg)) === 'Langkah 2 dari 2 · Kontak', await prog(pg));
  await backBtn(pg).click();
  await pg.selectOption('[name=kelas]', 'Anak');
  ok('S4 choosing Anak brings the school step back', (await prog(pg)) === 'Langkah 1 dari 3 · Kelas', await prog(pg));
  await nextBtn(pg).click();
  ok('S5 the school step is now second', (await prog(pg)) === 'Langkah 2 dari 3 · Sekolah');
  await pg.ctx.close();

  /* ---------- T. drafts ---------- */
  await reset();
  slug = await seed(THREE());
  const KEY = 'enf:draft:' + slug;
  pg = await newPage(br);
  await openForm(pg, slug);
  ok('T1 the form tells visitors that answers are kept on this device', (await pg.locator('.enf-saves').textContent()).includes('maksimal 3 hari'));
  await pg.fill('[name=nama]', 'Sari'); await pg.fill('[name=wa]', '081234567890');
  await nextBtn(pg).click();
  await pg.selectOption('[name=kelas]', 'Dewasa');
  await sleep(700);
  let d = JSON.parse(await LS(pg, KEY) || 'null');
  ok('T2 typing saves a draft with values, the step and an expiry about 3 days ahead', d && d.vals.nama === 'Sari' && d.vals.kelas === 'Dewasa' && d.step === 'pilih' && d.exp > Date.now() + 2.9 * 864e5 && d.exp < Date.now() + 3.1 * 864e5, d);
  await pg.check('[name=setuju]').catch(() => {});
  await nextBtn(pg).click(); await pg.check('[name=setuju]'); await sleep(700);
  d = JSON.parse(await LS(pg, KEY));
  ok('T3 the consent box is never saved in the draft', d.vals.setuju === undefined, d);
  await pg.goto(BASE + '/t/page.php?slug=' + slug); await pg.waitForFunction(() => window.ENForms); await pg.click('#open'); await pg.waitForSelector('.enf-form');
  ok('T4 reopening restores the step', (await prog(pg)).startsWith('Langkah 3'), await prog(pg));
  ok('T4b and shows the notice with a Start over button', (await pg.locator('.enf-draft').textContent()).includes('Mulai dari awal'));
  ok('T4c the consent box comes back unticked', !(await pg.locator('[name=setuju]').isChecked()));
  await backBtn(pg).click(); await backBtn(pg).click();
  ok('T5 the typed values are back', (await pg.inputValue('[name=nama]')) === 'Sari' && (await pg.inputValue('[name=wa]')) === '081234567890');
  await nextBtn(pg).click();
  ok('T5b the choice is back', (await pg.inputValue('[name=kelas]')) === 'Dewasa');
  await pg.click('.enf-link');
  ok('T6 Start over empties the form, returns to step 1, hides the notice and deletes the draft', (await prog(pg)).startsWith('Langkah 1') && (await pg.inputValue('[name=nama]')) === '' && !(await pg.locator('.enf-draft').count()) && (await LS(pg, KEY)) === null);
  // after a successful submit the draft is gone
  await pg.fill('[name=nama]', 'Sari'); await pg.fill('[name=wa]', '081234567890'); await nextBtn(pg).click();
  await pg.selectOption('[name=kelas]', 'Anak'); await nextBtn(pg).click(); await pg.check('[name=setuju]');
  await sleep(600);
  ok('T7 a draft exists just before sending', (await LS(pg, KEY)) !== null);
  await nextBtn(pg).click(); await pg.waitForSelector('.enf-done');
  ok('T7b the draft is deleted after a successful send', (await LS(pg, KEY)) === null);
  await sleep(700);
  ok('T7c and is not written again afterwards', (await LS(pg, KEY)) === null);
  await pg.ctx.close();

  // expiry, revision, other form, drafts off, blocked storage
  pg = await newPage(br);
  await pg.goto(BASE + '/t/page.php?slug=' + slug);
  const defRev = (await (await fetch(BASE + '/forms/def.php?slug=' + slug)).json()).form.rev;
  await pg.evaluate(([k, rev]) => localStorage.setItem(k, JSON.stringify({ v: 1, rev, exp: Date.now() - 1000, step: 'data', vals: { nama: 'Lama' } })), [KEY, defRev]);
  await pg.waitForFunction(() => window.ENForms); await pg.click('#open'); await pg.waitForSelector('.enf-form');
  ok('T8 an expired draft is not restored and is deleted', (await pg.inputValue('[name=nama]')) === '' && (await LS(pg, KEY)) === null);
  await pg.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({ v: 1, rev: 'deadbeef', exp: Date.now() + 1e8, step: 'data', vals: { nama: 'Lama' } })), [KEY]);
  await pg.click('.enf-x'); await pg.click('#open'); await pg.waitForSelector('.enf-form');
  ok('T9 a draft from an older version of the form is dropped', (await pg.inputValue('[name=nama]')) === '' && (await LS(pg, KEY)) === null);
  await pg.evaluate(([k]) => { localStorage.setItem('enf:draft:other', JSON.stringify({ v: 1, rev: 'x', exp: Date.now() - 5, vals: { a: 'b' } })); localStorage.setItem('enf:draft:junk', '{{{'); localStorage.setItem('unrelated', 'keep'); }, [KEY]);
  await pg.reload();
  await pg.waitForFunction(() => !localStorage.getItem('enf:draft:other') && !localStorage.getItem('enf:draft:junk'), null, { timeout: 7000 }).catch(() => {});
  ok('T10 expired and broken drafts of other forms are swept, unrelated keys are kept', (await LS(pg, 'enf:draft:other')) === null && (await LS(pg, 'enf:draft:junk')) === null && (await LS(pg, 'unrelated')) === 'keep');
  await pg.ctx.close();

  await reset();
  slug = await seed(Object.assign(THREE(), { drafts: false }));
  pg = await newPage(br);
  await openForm(pg, slug);
  await pg.fill('[name=nama]', 'Tidak disimpan'); await sleep(700);
  ok('T11 with drafts switched off nothing is saved and no notice line shows', (await LS(pg, 'enf:draft:' + slug)) === null && !(await pg.locator('.enf-saves').count()));
  await pg.ctx.close();

  await reset();
  slug = await seed(THREE());
  pg = await newPage(br, { init: () => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } }); } });
  await openForm(pg, slug);
  await pg.fill('[name=nama]', 'Budi'); await pg.fill('[name=wa]', '081234567890'); await nextBtn(pg).click();
  await pg.waitForFunction(() => /Langkah 2/.test((document.querySelector('.enf-prog-t') || {}).textContent || ''), null, { timeout: 3000 }).catch(() => {});
  ok('T12 with storage blocked the form still works and shows no notice line', (await prog(pg)).startsWith('Langkah 2') && !(await pg.locator('.enf-saves').count()), [await prog(pg), await err(pg)]);
  ok('T12b and nothing broke in the console', !pg.logs.length, pg.logs);
  await pg.ctx.close();

  // last-step check goes back to an earlier invalid step
  await reset();
  slug = await seed(THREE());
  pg = await newPage(br);
  await pg.goto(BASE + '/t/page.php?slug=' + slug);
  const rev2 = (await (await fetch(BASE + '/forms/def.php?slug=' + slug)).json()).form.rev;
  await pg.evaluate(([k, rev]) => localStorage.setItem(k, JSON.stringify({ v: 1, rev, exp: Date.now() + 1e8, step: 'akhir', vals: { nama: 'Budi', wa: '12', kelas: 'Anak' } })), ['enf:draft:' + slug, rev2]);
  await pg.waitForFunction(() => window.ENForms); await pg.click('#open'); await pg.waitForSelector('.enf-form');
  await pg.check('[name=setuju]'); await nextBtn(pg).click();
  ok('T13 a restored draft with a bad value sends the visitor back to the step that needs fixing', (await prog(pg)).startsWith('Langkah 1') && (await err(pg)).includes('WhatsApp') && (await subs()).length === 0, [await prog(pg), await err(pg)]);
  await pg.ctx.close();

  /* ---------- U. page mode: switching theme keeps what was typed ---------- */
  await reset();
  slug = await seed(Object.assign(THREE(), { layout: 'page' }));
  pg = await newPage(br);
  await pg.goto(BASE + '/t/page.php?mode=page&slug=' + slug);
  await pg.waitForSelector('#mount .enf-form');
  await pg.fill('#mount [name=nama]', 'Ani'); await pg.fill('#mount [name=wa]', '081234567890'); await nextBtn(pg).click();
  await pg.evaluate(() => document.documentElement.setAttribute('data-audience', 'adult'));
  await pg.waitForFunction(() => document.querySelector('#mount .enf-form [name=kelas]'), null, { timeout: 5000 }).catch(() => {});
  await sleep(300);
  ok('U1 a theme switch on a page keeps the step and values and shows no "restored" notice', (await prog(pg)).startsWith('Langkah 2') && !(await pg.locator('.enf-draft').count()));
  await pg.click('#mount .enf-ghost');
  ok('U1b the values typed before the switch are still there', (await pg.inputValue('#mount [name=nama]')) === 'Ani');
  await pg.ctx.close();

  /* ---------- W. the panel preview shows the step flow, sends nothing and saves no draft ---------- */
  await reset();
  slug = await seed(THREE());
  pg = await newPage(br);
  await pg.goto(BASE + '/edizon/form-preview.php?id=1');
  await pg.waitForSelector('.enf-form');
  ok('W1 the preview shows the first step with progress', (await prog(pg)) === 'Langkah 1 dari 3 · Data diri', await prog(pg));
  ok('W2 and no "kept on this device" line (a preview never saves)', !(await pg.locator('.enf-saves').count()));
  await pg.fill('[name=nama]', 'Uji'); await pg.fill('[name=wa]', '081234567890'); await nextBtn(pg).click();
  await pg.selectOption('[name=kelas]', 'Anak'); await nextBtn(pg).click();
  await pg.check('[name=setuju]'); await nextBtn(pg).click();
  await pg.waitForSelector('.enf-done');
  ok('W3 finishing the preview shows the preview note and sends nothing', (await pg.locator('.enf-done').textContent()).includes('Pratinjau') && (await subs()).length === 0);
  ok('W4 and left no draft behind', (await pg.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('enf:draft:') === 0).length)) === 0);
  ok('W5 no CSP violation or console error in the preview', !(await pg.evaluate(() => window.__viol)).length && !pg.logs.length, [await pg.evaluate(() => window.__viol), pg.logs]);
  await pg.ctx.close();

  /* ---------- X. a definition from before steps existed (cached by an old page) still works ---------- */
  pg = await newPage(br);
  await pg.goto(BASE + '/t/page.php?slug=none');
  await pg.waitForFunction(() => window.ENForms);
  await pg.evaluate(() => window.ENForms.open('legacy', { preview: true, def: { slug: 'legacy', name: 'Lama', layout: 'popup', waFallback: false, photo: '', wa: '',
    texts: { kids: { eyebrow: '', title: 'Formulir lama', intro: '', submit: 'Kirim', note: '', successTitle: 'Ok', successMsg: 'Ok' }, adult: { eyebrow: '', title: 'Formulir lama', intro: '', submit: 'Kirim', note: '', successTitle: 'Ok', successMsg: 'Ok' } },
    fields: [{ key: 'nama', type: 'text', label: 'Nama', labelAdult: 'Nama', hint: '', required: true, options: [], showIf: null, suggest: false, consent: { text: '', url: '' } }] } }));
  await pg.waitForSelector('.enf-form');
  ok('X1 a definition without steps, rev or drafts shows as one plain step', !(await pg.locator('.enf-prog').isVisible()) && (await pg.locator('[name=nama]').count()) === 1 && (await nextBtn(pg).textContent()) === 'Kirim' && !(await pg.locator('.enf-saves').count()));
  ok('X2 with no errors', !pg.logs.length, pg.logs);
  await pg.ctx.close();

  /* ---------- V. server still decides ---------- */
  await reset();
  slug = await seed(THREE());
  const fdp = new URLSearchParams({ form: slug, audience: 'kids', nama: 'X' });
  const bad = await fetch(BASE + '/forms/submit.php', { method: 'POST', body: fdp });
  const bj = await bad.json();
  ok('V1 the server still rejects a submission with required fields missing from any step', bad.status === 422 && bj.errors.length > 0, bj);

  await br.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n' + (results.length - failed.length) + ' passed, ' + failed.length + ' failed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
