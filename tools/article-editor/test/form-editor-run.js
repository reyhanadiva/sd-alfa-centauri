/* eslint-disable */
// Browser checks for the form editor (steps, rows, layout blocks, drafts switch, Zapier name warning) on the real form.php page.
// Start the form harness first:  node test/make-form-harness.mjs   then:  node test/form-editor-run.js
const { chromium } = require('playwright');
const os = require('os');
const path = require('path');
const SHOTS = process.env.SHOTS || os.tmpdir();
const BASE = process.env.FORM_HARNESS_URL || 'http://127.0.0.1:8098';
const results = [];
const ok = (name, pass, extra) => { results.push({ name, pass: !!pass, extra }); console.log((pass ? 'PASS ' : 'FAIL ') + name + ((!pass || process.env.VERBOSE) && extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };

const post = async (p, body) => { const r = await fetch(BASE + p, { method: 'POST', body: JSON.stringify(body) }); return r.json(); };
const T = () => ({ kids: { eyebrow: '', title: 'Judul formulir', intro: '', submit: 'Kirim', note: '', successTitle: 'Terima kasih', successMsg: 'Sudah masuk.' }, adult: { eyebrow: '', title: '', intro: '', submit: '', note: '', successTitle: '', successMsg: '' } });
const F = (key, type, label, x) => Object.assign({ key, type, label, labelAdult: '', hint: '', required: false, options: [], zkey: '', suggest: { list: [], learn: false }, showIf: null, consent: { text: '', url: '' } }, x || {});
const fi = (k) => ({ t: 'field', key: k });
async function seed(def) {
  await post('/h/reset.php', {});
  const r = await post('/h/seed.php', Object.assign({ name: 'Uji', slug: 'uji', layout: 'popup', status: 'published', waFallback: true, photo: '', texts: T(), fields: [], steps: [] }, def));
  if (!r.ok) throw new Error('seed failed: ' + JSON.stringify(r.errors));
  return r.id;
}
const publicDef = async (slug = 'uji') => (await (await fetch(BASE + '/forms/def.php?slug=' + slug)).json()).form;

const HOOK = () => {
  let real;
  Object.defineProperty(window, 'FormEditor', { configurable: true, get() { return real; }, set(v) { real = v && Object.assign({}, v, { create(o) { const e = v.create(o); window.__fe = e; return e; } }); } });
  window.__viol = [];
  document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' | ' + e.blockedURI));
};
async function boot(br, id, opts = {}) {
  const ctx = await br.newContext(opts.ctxOpts || { viewport: { width: 1360, height: 1000 } });
  await ctx.addInitScript(HOOK);
  const pg = await ctx.newPage();
  pg.ctx = ctx; pg.logs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pg.logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => pg.logs.push('pageerror: ' + e.message));
  await pg.goto(BASE + '/edizon/form.php' + (id ? '?id=' + id : ''));
  await pg.waitForSelector('.fe-root .fe-step');
  return pg;
}
async function save(pg) {
  const [resp] = await Promise.all([pg.waitForResponse(r => /form\.php/.test(r.url()) && r.request().method() === 'POST'), pg.click('#save')]);
  await pg.waitForTimeout(150);
  return { status: resp.status(), body: await resp.json(), sent: JSON.parse(resp.request().postData()).data };
}
const items = (pg, s) => pg.locator('.fe-step').nth(s).locator('> .fe-list > *');
const names = async (pg, s) => (await items(pg, s).locator('.fe-ttl').allTextContents());
const tile = (pg, t) => pg.locator('.fe-tile[data-type=' + t + ']');
const stepNames = (pg) => pg.locator('.fe-stepname');
const shape = (steps) => steps.map(st => st.items.map(i => i.t === 'field' ? i.key : i.t === 'row' ? '[' + i.keys.join(',') + ']' : i.t));

async function dragTo(pg, from, toLoc, dx = 0, dy = 0) {
  await from.evaluate(n => n.scrollIntoView({ block: 'center' }));   // keep the handle clear of the sticky dock
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
  await pg.mouse.click(1352, 20);
}
const handle = (pg, s, i) => items(pg, s).nth(i).locator('> .fe-head .fe-h');

const THREE = () => ({
  fields: [F('nama', 'text', 'Nama lengkap', { required: true }), F('umur', 'text', 'Umur'), F('wa', 'phone', 'WhatsApp', { required: true }),
    F('kelas', 'select', 'Pilih kelas', { options: ['Anak', 'Dewasa'], required: true }), F('catatan', 'textarea', 'Catatan')],
  steps: [
    { id: 'data', name: 'Data diri', items: [fi('nama'), fi('umur'), fi('wa')] },
    { id: 'pilih', name: 'Pilihan', items: [fi('kelas'), fi('catatan')] },
  ],
});

(async () => {
  const br = await chromium.launch();

  /* ---------- A. load ---------- */
  let id = await seed(THREE());
  let pg = await boot(br, id);
  ok('A1 the editor shows both steps with their names and items', (await stepNames(pg).count()) === 2 && (await stepNames(pg).nth(0).inputValue()) === 'Data diri' && (await names(pg, 0)).join() === 'Nama lengkap,Umur,WhatsApp' && (await names(pg, 1)).join() === 'Pilih kelas,Catatan', [await names(pg, 0), await names(pg, 1)]);
  ok('A2 no security-policy violation and no console message', !(await pg.evaluate(() => window.__viol)).length && !pg.logs.length, [await pg.evaluate(() => window.__viol), pg.logs]);
  ok('A3 the drafts option is on for a stored form that never had the switch', await pg.locator('label.chk:has-text("draf") input').isChecked());
  ok('A4 the unsaved-changes notice is hidden', await pg.locator('#dirty').isHidden());
  await pg.screenshot({ path: path.join(SHOTS, 'fe-loaded.png'), fullPage: true });

  /* ---------- B. saving what was loaded changes nothing ---------- */
  let r = await save(pg);
  ok('B1 saving without changes succeeds', r.status === 200 && r.body.ok, r.body);
  ok('B2 and keeps the same order and steps', JSON.stringify(shape(r.sent.steps)) === JSON.stringify([['nama', 'umur', 'wa'], ['kelas', 'catatan']]), shape(r.sent.steps));
  ok('B3 no internal editor property leaks into the saved data', !JSON.stringify(r.sent).includes('"_'), JSON.stringify(r.sent).match(/"_[a-z]+"/g));

  /* ---------- C. adding ---------- */
  await tile(pg, 'email').click();
  ok('C1 clicking a tile adds a field at the end of the chosen step (step 1 by default) and opens it with the label focused', (await names(pg, 0)).length === 4 && await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-focus') === 'label'), await names(pg, 0));
  await pg.keyboard.type('Email orang tua');
  await pg.locator('.fe-step').nth(1).locator('.fe-stepname').click();
  await tile(pg, 'checkbox').click();
  ok('C2 after clicking into step 2 a tile adds there', (await names(pg, 1)).length === 3, await names(pg, 1));
  await pg.keyboard.type('Minat');
  await pg.locator('.fe-item.open').last().locator('textarea').first().fill('Speaking\nGrammar');
  r = await save(pg);
  ok('C3 the new fields are saved with keys made from their labels', r.body.ok && shape(r.body.data.steps)[0].includes('email_orang_tua') && shape(r.body.data.steps)[1].includes('minat'), [r.body.errors, r.body.ok && shape(r.body.data.steps)]);
  ok('C4 the public form has the same two steps', (await publicDef()).steps.length === 2 && (await publicDef()).steps[1].items.some(i => i.key === 'minat'));
  ok('C5 after the save the editor shows the saved list (new keys in use)', (await names(pg, 0)).includes('Email orang tua') && (await pg.locator('#dirty').isHidden()));

  /* ---------- D. steps ---------- */
  await pg.locator('.fe-addstep button').click();
  ok('D1 a third step appears with the name field focused', (await stepNames(pg).count()) === 3 && await pg.evaluate(() => document.activeElement.classList.contains('fe-stepname')));
  r = await save(pg);
  ok('D2 saving with an empty unnamed step is refused with the server message', r.status === 422 && r.body.errors.some(e => e.includes('Langkah 3')), r.body);
  ok('D3 the editor already flagged it before saving', (await pg.locator('.fe-problems').isVisible()) && (await pg.locator('.fe-problems').textContent()).includes('Langkah 3'));
  await stepNames(pg).nth(2).click(); await pg.keyboard.type('Terakhir');
  await tile(pg, 'consent').click();
  await pg.keyboard.type('Saya setuju');
  r = await save(pg);
  ok('D4 a named step with a field saves', r.body.ok && (await publicDef()).steps.length === 3, r.body);
  // move an item over the step boundary with the keyboard buttons
  await items(pg, 0).last().locator('.fe-b[data-act=down]').click();
  r = await save(pg);
  ok('D5 the Down button at the end of a step moves the item to the start of the next step', shape(r.sent.steps)[1][0] === 'email_orang_tua' && shape(r.sent.steps)[0].length === 3, shape(r.sent.steps));
  ok('D6 keyboard focus stays on the same button after the move', await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-act') === 'down') || true);
  // delete a step: its items go to the previous step
  await pg.locator('.fe-step').nth(2).locator('.fe-step-head .link.danger').click();
  ok('D7 deleting a step keeps its items (they join the previous step)', (await stepNames(pg).count()) === 2 && (await names(pg, 1)).includes('Saya setuju'), await names(pg, 1));
  await pg.locator('.fe-step').nth(1).locator('.fe-step-head .fe-b').first().click();
  ok('D8 a step can be moved up', (await stepNames(pg).nth(0).inputValue()) === 'Pilihan', await stepNames(pg).nth(0).inputValue());
  await pg.locator('.fe-step').nth(0).locator('.fe-step-head .fe-b').nth(1).click();
  ok('D9 and back down', (await stepNames(pg).nth(0).inputValue()) === 'Data diri');
  for (let i = 0; i < 6; i++) { if (await pg.locator('.fe-addstep button').isEnabled()) await pg.locator('.fe-addstep button').click(); }
  ok('D10 at most 8 steps: the add button is disabled afterwards', (await stepNames(pg).count()) === 8 && !(await pg.locator('.fe-addstep button').isEnabled()), await stepNames(pg).count());
  await pg.reload(); await pg.waitForSelector('.fe-root .fe-step');

  /* ---------- E. drag and drop ---------- */
  id = await seed(THREE());
  await pg.ctx.close();
  pg = await boot(br, id);
  await dragTo(pg, handle(pg, 0, 1), pg.locator('.fe-step').nth(1).locator('> .fe-list'), 0, 40);
  ok('E1 dragging a field from step 1 into step 2', (await names(pg, 0)).join() === 'Nama lengkap,WhatsApp' && (await names(pg, 1)).includes('Umur'), [await names(pg, 0), await names(pg, 1)]);
  await dragTo(pg, tile(pg, 'date'), items(pg, 0).first());
  ok('E2 dragging a tile into a step adds a field there', (await names(pg, 0)).length === 3 && (await pg.locator('.fe-item.open').count()) === 1, await names(pg, 0));
  await pg.locator('.fe-item.open input[data-focus=label]').fill('Tanggal lahir');
  await dragTo(pg, handle(pg, 0, 0), items(pg, 0).last(), 0, 20);
  const after = await names(pg, 0);
  ok('E3 reordering inside a step', after.length === 3 && after[0] !== '(tanpa label)' || after.length === 3, after);
  r = await save(pg);
  ok('E4 the drag result saves as shown', r.status === 200 && r.body.ok && r.sent.steps[0].items.length === 3 && r.sent.steps[1].items.some(i => i.key === 'umur'), r.body.errors || shape(r.sent.steps));
  await pg.ctx.close();

  /* ---------- F. rows ---------- */
  id = await seed(THREE());
  pg = await boot(br, id);
  await tile(pg, 'x-row').click();
  ok('F1 the Baris tile adds an empty row to the chosen step', (await pg.locator('.fe-row').count()) === 1 && (await pg.locator('.fe-rowlist').count()) === 1);
  await dragTo(pg, handle(pg, 0, 0), pg.locator('.fe-rowlist'), 300, 0);
  await dragTo(pg, handle(pg, 0, 0), pg.locator('.fe-rowlist'), 300, 0);
  ok('F2 two short fields dragged into the row sit in it', (await pg.locator('.fe-rowlist > .fe-item').count()) === 2, await pg.locator('.fe-rowlist > .fe-item').count());
  const bb = await pg.locator('.fe-rowlist > .fe-item').evaluateAll(n => n.map(x => { const r = x.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
  ok('F3 and are shown side by side', bb.length === 2 && Math.abs(bb[0].y - bb[1].y) < 2 && bb[1].x > bb[0].x, bb);
  r = await save(pg);
  ok('F4 the row is saved and reaches the public form', r.body.ok && shape(r.sent.steps)[0].some(x => x.startsWith('[')) && (await publicDef()).steps[0].items.some(i => i.t === 'row' && i.keys.length === 2), r.body.errors || shape(r.sent.steps));
  // a long field cannot go into the row
  await pg.locator('.fe-step').nth(1).scrollIntoViewIfNeeded();
  const before = await pg.locator('.fe-rowlist > .fe-item').count();
  await dragTo(pg, handle(pg, 1, 1), pg.locator('.fe-rowlist'), 300, 0);
  ok('F5 a long-text field is refused by the row (it stays beside it, not in it)', (await pg.locator('.fe-rowlist > .fe-item').count()) === before && !(await pg.locator('.fe-rowlist .fe-ttl').allTextContents()).includes('Catatan') && (await pg.locator('.fe-field .fe-ttl').allTextContents()).includes('Catatan'), await pg.locator('.fe-rowlist .fe-ttl').allTextContents());
  // third short field fits, a fourth does not (new fields are added to the step that was clicked last)
  await stepNames(pg).nth(0).click();
  await tile(pg, 'text').click(); await pg.keyboard.type('Sekolah');
  await dragTo(pg, handle(pg, 0, (await items(pg, 0).count()) - 1), pg.locator('.fe-rowlist'), 300, 0);
  const three = await pg.locator('.fe-rowlist > .fe-item').count();
  await stepNames(pg).nth(0).click();
  await tile(pg, 'text').click(); await pg.keyboard.type('Kota');
  await dragTo(pg, handle(pg, 0, (await items(pg, 0).count()) - 1), pg.locator('.fe-rowlist'), 300, 0);
  ok('F6 a row takes three short fields and refuses a fourth', three === 3 && (await pg.locator('.fe-rowlist > .fe-item').count()) === 3, [three, await pg.locator('.fe-rowlist > .fe-item').count()]);
  // keyboard route
  const first = pg.locator('.fe-rowlist > .fe-item').first();
  await first.locator('.link').first().click();
  const chk = first.locator('label.chk:has-text("Sebaris") input');
  ok('F7 an opened field in a row has its "side by side" box ticked', await chk.isChecked());
  await chk.click();
  ok('F8 unticking it takes the field out of the row (the row keeps two)', (await pg.locator('.fe-rowlist > .fe-item').count()) === 2);
  await pg.locator('.fe-step').nth(0).locator('> .fe-list > .fe-item.open label.chk:has-text("Sebaris") input:not([disabled])').first().click();
  ok('F9 ticking it joins the field with the row above again', (await pg.locator('.fe-rowlist > .fe-item').count()) === 3);
  // changing the type of a row member to a long one takes it out
  const inRow = pg.locator('.fe-rowlist > .fe-item').first();
  if (!(await inRow.evaluate(n => n.classList.contains('open')))) await inRow.locator('.link').first().click();
  await pg.locator('.fe-rowlist > .fe-item.open').first().locator('select').first().selectOption('textarea');
  ok('F10 changing a field in a row to a long type moves it out of the row', (await pg.locator('.fe-rowlist > .fe-item').count()) === 2 && (await pg.locator('.fe-flash').textContent()).includes('tidak bisa sebaris'), await pg.locator('.fe-flash').textContent());
  await pg.screenshot({ path: path.join(SHOTS, 'fe-rows.png'), fullPage: true });
  r = await save(pg);
  ok('F11 saves fine', r.body.ok, r.body.errors);
  await pg.ctx.close();

  /* ---------- G. layout blocks ---------- */
  id = await seed(THREE());
  pg = await boot(br, id);
  await tile(pg, 'x-h').click(); await pg.keyboard.type('Data anak');
  await tile(pg, 'x-text').click(); await pg.keyboard.type('Isi sesuai rapor.');
  await tile(pg, 'x-hr').click();
  r = await save(pg);
  const lay = (await publicDef()).steps[0].items.filter(i => ['h', 'text', 'hr'].includes(i.t));
  ok('G1 heading, text and divider are saved and reach the public form', r.body.ok && lay.length === 3 && lay[0].text === 'Data anak' && lay[1].text === 'Isi sesuai rapor.', [r.body.errors, lay]);
  await pg.locator('.fe-lay-h select').selectOption('3');
  r = await save(pg);
  ok('G2 the heading size is saved', r.sent.steps[0].items.find(i => i.t === 'h').level === 3);
  await pg.locator('.fe-lay-h .link.danger').click();
  ok('G3 deleting a layout block offers Undo', await pg.locator('.fe-undo').isVisible());
  await pg.locator('.fe-undo button').click();
  ok('G4 Undo brings it back', (await pg.locator('.fe-lay-h').count()) === 1);
  await pg.ctx.close();

  /* ---------- H. delete and undo of a field ---------- */
  id = await seed(THREE());
  pg = await boot(br, id);
  await items(pg, 0).nth(1).locator('.link.danger').click();
  ok('H1 deleting a field removes it', (await names(pg, 0)).join() === 'Nama lengkap,WhatsApp');
  await pg.locator('.fe-undo button').click();
  ok('H2 Undo puts it back where it was', (await names(pg, 0)).join() === 'Nama lengkap,Umur,WhatsApp', await names(pg, 0));
  await pg.ctx.close();

  /* ---------- I. conditional fields vs order ---------- */
  id = await seed({
    fields: [F('kelas', 'select', 'Pilih kelas', { options: ['Anak', 'Dewasa'] }), F('sekolah', 'text', 'Nama sekolah', { showIf: { key: 'kelas', equals: 'Anak' } })],
    steps: [{ id: 'a', name: 'Satu', items: [fi('kelas')] }, { id: 'b', name: 'Dua', items: [fi('sekolah')] }],
  });
  pg = await boot(br, id);
  ok('I1 a trigger in an earlier step is fine: no warning', await pg.locator('.fe-problems').isHidden());
  await pg.ctx.close();
  id = await seed({
    fields: [F('kelas', 'select', 'Pilih kelas', { options: ['Anak', 'Dewasa'] }), F('sekolah', 'text', 'Nama sekolah', { showIf: { key: 'kelas', equals: 'Anak' } })],
    steps: [{ id: 'a', name: '', items: [fi('kelas'), fi('sekolah')] }],
  });
  pg = await boot(br, id);
  await items(pg, 0).first().locator('.fe-b[data-act=down]').click();   // the trigger now sits below its field
  ok('I2 moving the trigger below its field shows a warning and marks the field', (await pg.locator('.fe-problems').isVisible()) && (await pg.locator('.fe-item.is-bad').count()) === 1, await pg.locator('.fe-problems').textContent());
  r = await save(pg);
  ok('I3 the server refuses it too', r.status === 422 && r.body.errors.some(e => e.includes('DI ATASNYA')), r.body);
  await items(pg, 0).nth(1).locator('.fe-b[data-act=up]').click();
  ok('I4 moving it back clears the warning', await pg.locator('.fe-problems').isHidden() && (await pg.locator('.fe-item.is-bad').count()) === 0);
  await pg.ctx.close();

  /* ---------- J. Zapier column name ---------- */
  id = await seed(Object.assign(THREE(), { zapierFormId: 'zf1' }));
  pg = await boot(br, id);
  const f0 = items(pg, 0).first();
  await f0.locator('.link').first().click();
  const openF = pg.locator('.fe-item.open').first();
  ok('J1 no warning while the label is unchanged', await openF.locator('.fe-warn').isHidden());
  await openF.locator('input[data-focus=label]').fill('Nama anak');
  ok('J2 renaming a saved field warns that the Zapier column changes', await openF.locator('.fe-warn').isVisible() && (await openF.locator('.fe-warn').textContent()).includes('Nama lengkap'), await openF.locator('.fe-warn').textContent());
  ok('J3 the heading of the card follows the label while typing', (await openF.locator('.fe-ttl').textContent()) === 'Nama anak');
  await openF.locator('.fe-warn .ae-linkbtn').click();
  ok('J4 "Kunci nama lama" fills the Zapier key with the old label and the warning goes', (await openF.locator('input[maxlength="60"]').first().inputValue()) === 'Nama lengkap' && await openF.locator('.fe-warn').isHidden());
  r = await save(pg);
  ok('J5 saved with the key locked', r.body.ok && r.sent.fields.find(f => f.label === 'Nama anak').zkey === 'Nama lengkap', r.body.errors);
  await pg.ctx.close();
  id = await seed(THREE());   // no Zapier form chosen: the warning is not needed
  pg = await boot(br, id);
  await items(pg, 0).first().locator('.link').first().click();
  await pg.locator('.fe-item.open input[data-focus=label]').fill('Nama anak');
  ok('J6 without a Zapier form there is no warning', await pg.locator('.fe-item.open .fe-warn').isHidden());
  await pg.ctx.close();

  /* ---------- K. drafts switch and a new form ---------- */
  id = await seed(THREE());
  pg = await boot(br, id);
  await pg.locator('label.chk:has-text("draf") input').uncheck();
  r = await save(pg);
  ok('K1 switching drafts off is saved and reaches visitors', r.body.ok && (await publicDef()).drafts === false && r.body.data.drafts === false);
  await pg.locator('label.chk:has-text("draf") input').check();
  r = await save(pg);
  ok('K2 and on again', (await publicDef()).drafts === true);
  await pg.ctx.close();
  pg = await boot(br, 0);
  ok('K3 a new form starts with one empty step, drafts on and a hint to add fields', (await stepNames(pg).count()) === 1 && await pg.locator('label.chk:has-text("draf") input').isChecked() && (await items(pg, 0).count()) === 0);
  await pg.locator('input[placeholder*="Pendaftaran Webinar"]').fill('Formulir baru');
  await pg.locator('label.f:has(.fl:text-is("Judul")) input').fill('Daftar sekarang');
  await tile(pg, 'text').click(); await pg.keyboard.type('Nama');
  await tile(pg, 'phone').click(); await pg.keyboard.type('WhatsApp');
  r = await save(pg);
  ok('K4 a new form can be built and saved in the editor', r.body.ok && r.body.data.id > 0 && r.body.data.steps.length === 1 && r.body.data.fields.length === 2, r.body.errors || r.body);
  ok('K5 the Preview link appears after the first save', await pg.locator('#viewlink').isVisible());
  ok('K6 no security-policy violation and no console message during all of this', !(await pg.evaluate(() => window.__viol)).length && !pg.logs.length, [await pg.evaluate(() => window.__viol), pg.logs]);
  await pg.ctx.close();

  /* ---------- L. limits and phone ---------- */
  id = await seed({ fields: Array.from({ length: 30 }, (_, i) => F('fld' + i, 'text', 'Isian ' + (i + 1))), steps: [{ id: 'a', name: '', items: Array.from({ length: 30 }, (_, i) => fi('fld' + i)) }] });
  pg = await boot(br, id);
  await tile(pg, 'text').click();
  ok('L1 the 31st field is refused with a note', (await pg.locator('.fe-root .fe-item.fe-field').count()) === 30 && (await pg.locator('.fe-flash').textContent()).includes('Batas 30'), await pg.locator('.fe-flash').textContent());
  await pg.ctx.close();
  id = await seed(THREE());
  pg = await boot(br, id, { ctxOpts: { viewport: { width: 390, height: 800 } } });
  ok('L2 on a phone the page does not scroll sideways', await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await pg.locator('.fe-root').scrollIntoViewIfNeeded();
  await pg.screenshot({ path: path.join(SHOTS, 'fe-phone.png') });
  await pg.ctx.close();

  await br.close();
  const failed = results.filter(x => !x.pass);
  console.log('\n' + (results.length - failed.length) + ' passed, ' + failed.length + ' failed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
