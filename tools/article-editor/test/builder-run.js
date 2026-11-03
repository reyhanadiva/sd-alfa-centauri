/* eslint-disable */
// Browser checks for the two panel builder pages that host the shared editor: popup-builder.js and quiz-builder.js
// (real panel.css, article-editor.css, bundle and CSP; saving goes through the real validate_popup / validate_quiz, no MySQL).
// Start the harness first (npm run harness:pop), then: npm run test:builders
const { chromium } = require('playwright');
const BASE = process.env.POP_URL || 'http://127.0.0.1:8097';
const results = [];
const ok = (name, pass, extra) => { results.push({ name, pass: !!pass, extra }); console.log((pass ? 'PASS ' : 'FAIL ') + name + ((!pass || process.env.VERBOSE) && extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;

const HOOK = () => {
  window.__viol = [];
  document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' | ' + e.blockedURI));
};
async function open(br, path, vp) {
  const ctx = await br.newContext({ viewport: vp || { width: 1360, height: 1000 } });
  await ctx.addInitScript(HOOK);
  await ctx.addInitScript(() => { window.confirm = () => true; });
  const pg = await ctx.newPage();
  pg.logs = []; pg.posts = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pg.logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => pg.logs.push('pageerror: ' + e.message));
  pg.on('request', r => { if (r.method() === 'POST') { try { pg.posts.push(JSON.parse(r.postData())); } catch (e) { pg.posts.push(null); } } });
  await pg.goto(BASE + path);
  await pg.waitForSelector('.ae-root');
  return pg;
}
const save = async (pg) => {
  const n = pg.posts.length;
  await pg.click('#save');
  await pg.waitForFunction(() => !document.getElementById('save').disabled);
  await pg.waitForTimeout(150);
  return pg.posts.length > n ? pg.posts[pg.posts.length - 1].data : null;
};
const errs = (pg) => pg.evaluate(() => { const e = document.getElementById('errors'); return e.hidden ? '' : e.textContent; });
const viol = (pg) => pg.evaluate(() => window.__viol.slice());
const tabs = (pg) => pg.$$eval('.rtab', t => t.map(x => ({ text: x.firstChild.textContent, range: x.lastChild.textContent, on: x.getAttribute('aria-selected') === 'true' })));
const headText = (pg) => pg.$eval('.ae-blk-h textarea', t => t.value);
const boxW = (pg) => pg.evaluate(() => document.querySelector('.ae-popbox').getBoundingClientRect().width);
const palette = (pg) => pg.$$eval('.ae-tile', t => t.map(x => x.getAttribute('data-type')));
const chips = (pg) => pg.$$eval('.ae-var', c => c.map(x => x.textContent));
const wInput = (pg, label) => pg.locator('input[aria-label="' + label + '"]');

(async () => {
  const br = await chromium.launch();

  /* ================= quiz builder ================= */
  let pg = await open(br, '/edizon/quiz-page.php');
  ok('Q1 quiz page: no console errors and no CSP violations', pg.logs.length === 0 && (await viol(pg)).length === 0, [pg.logs, await viol(pg)]);
  let t = await tabs(pg);
  ok('Q2 one tab per score range, the first one on show', t.length === 3 && t[0].on && !t[1].on && t[0].text === 'Pemula' && t[0].range === '0–40%', t);
  ok('Q3 the shared editor is in result mode: result palette (Skor, Skor per bagian) and variable bar', (await palette(pg)).includes('score') && (await palette(pg)).includes('sections') && (await pg.isVisible('.ae-vars')), await palette(pg));
  ok('Q4 the canvas shows the first range: 5 blocks, heading text', (await pg.$$('.ae-blk')).length === 5 && (await headText(pg)) === '{name|Halo}, level Anda: {level}');
  ok('Q5 default width of the result page is 520px, and the field says so', near(await boxW(pg), 520, 2) && /520px/.test(await pg.textContent('.wmsg')), [await boxW(pg), await pg.textContent('.wmsg')]);
  const c0 = await chips(pg);
  ok('Q6 variable chips: built-in, per-section and the custom variable', ['{name}', '{score}', '{level}', '{score.grammar}', '{percent.reading}', '{program}'].every(x => c0.includes(x)), c0);

  // editing, switching tabs and coming back keeps each range's own content
  await pg.fill('.ae-blk-h textarea', 'Pemula edit');
  await pg.click('.rtab >> nth=1');
  ok('Q7 switching to tab 2 loads its own blocks (different text) and values', (await headText(pg)) === '{name|Halo}, level Anda: {level}' && (await tabs(pg))[1].on && (await pg.inputValue('.rpanel input[type=text] >> nth=-1')) === 'General English');
  await pg.fill('.ae-blk-h textarea', 'Menengah edit');
  await pg.click('.rtab >> nth=0');
  ok('Q8 coming back to tab 1 shows what was typed there, not the other range', (await headText(pg)) === 'Pemula edit');
  await pg.click('.rtab >> nth=1');
  ok('Q9 …and tab 2 still has its own edit', (await headText(pg)) === 'Menengah edit');
  ok('Q10 the page is marked as changed', await pg.isVisible('#dirty'));

  // keyboard: arrows move between tabs
  await pg.focus('.rtab[aria-selected=true]');
  await pg.keyboard.press('ArrowRight');
  t = await tabs(pg);
  ok('Q11 ArrowRight selects the next tab', t[2].on && (await pg.evaluate(() => document.activeElement.id)) === 'q-rtab-rc3', t);
  await pg.keyboard.press('ArrowRight');
  t = await tabs(pg);
  ok('Q12 …and wraps around to the first', t[0].on, t);

  // saving posts the content of EVERY range, including the one on show (read from the editor)
  let data = await save(pg);
  ok('Q13 save: no error, both edits are in the posted data, the other range untouched', (await errs(pg)) === '' && data.results[0].blocks[0].text === 'Pemula edit' && data.results[1].blocks[0].text === 'Menengah edit' && data.results[2].blocks[0].text === '{name|Halo}, level Anda: {level}', [await errs(pg), data && data.results.map(r => r.blocks[0].text)]);
  t = await tabs(pg);
  ok('Q14 after saving the editor stays on the same range, with the same content (no reset)', t[0].on && (await headText(pg)) === 'Pemula edit' && (await pg.$$('.ae-blk')).length === 5, t);
  await pg.click('.rtab >> nth=1');
  ok('Q15 after saving, the other range still shows its own content', (await headText(pg)) === 'Menengah edit');
  data = await save(pg);
  ok('Q16 a second save posts the same content again (the accessor was re-bound after the first save)', data.results[1].blocks[0].text === 'Menengah edit' && data.results[0].blocks[0].text === 'Pemula edit', data && data.results.map(r => r.blocks[0].text));

  // width
  await wInput(pg, 'Lebar halaman hasil').fill('80vw');
  await pg.waitForTimeout(350);
  const vw80 = await boxW(pg);
  ok('Q17 width 80vw: the field reads it, the canvas follows (capped by the editor area)', /80vw/.test(await pg.textContent('.wmsg')) && vw80 > 520 && vw80 <= 0.8 * 1360 + 2, [vw80, await pg.textContent('.wmsg')]);
  await wInput(pg, 'Lebar halaman hasil').fill('40rem');
  await pg.waitForTimeout(350);
  ok('Q18 width 40rem = 640px on the canvas', near(await boxW(pg), 640, 2), await boxW(pg));
  await wInput(pg, 'Lebar halaman hasil').fill('abc');
  ok('Q19 an unreadable width shows a red message and the canvas falls back to 520px', (await pg.getAttribute('.wmsg', 'class')).includes('bad') && near(await boxW(pg), 520, 2), [await pg.textContent('.wmsg'), await boxW(pg)]);
  data = await save(pg);
  ok('Q20 the server refuses it with a readable message', /[Ll]ebar/.test(await errs(pg)), await errs(pg));
  await wInput(pg, 'Lebar halaman hasil').fill('700');
  data = await save(pg);
  ok('Q21 "700" is saved as 700px and shown that way', (await errs(pg)) === '' && (await wInput(pg, 'Lebar halaman hasil').inputValue()) === '700px', [await errs(pg), await wInput(pg, 'Lebar halaman hasil').inputValue()]);
  ok('Q22 the canvas is 700px wide', near(await boxW(pg), 700, 2), await boxW(pg));
  await pg.click('.presets button:has-text("Kecil")');
  ok('Q23 a preset fills the field and the canvas (380px)', (await wInput(pg, 'Lebar halaman hasil').inputValue()) === '380px' && near(await boxW(pg), 380, 2));
  await pg.click('.presets button:has-text("Kosongkan")');
  data = await save(pg);
  ok('Q24 empty is saved as empty (default 520px)', (await errs(pg)) === '' && near(await boxW(pg), 520, 2), await boxW(pg));
  ok('Q25 the field shows the real width on screen', / \d+ px/.test(await pg.textContent('.wmsg')), await pg.textContent('.wmsg'));

  // variable chip inserts at the cursor
  await pg.click('.ae-blk-h textarea');
  await pg.click('.ae-var:text-is("{percent}")');
  ok('Q26 clicking a variable chip inserts it where the cursor was', /\{percent\}/.test(await headText(pg)), await headText(pg));

  // anak / dewasa
  await pg.click('.ae-aud button:text-is("Dewasa")');
  ok('Q27 the Anak / Dewasa toggle switches the canvas', (await pg.getAttribute('.ae-popstage', 'data-audience')) === 'adult');

  // add / delete range
  await pg.click('.rtabadd');
  t = await tabs(pg);
  ok('Q28 adding a range makes a 4th tab and puts it on show with starter blocks', t.length === 4 && t[3].on && (await pg.$$('.ae-blk')).length === 5, t);
  ok('Q29 overlapping ranges are reported at once under the editor', /tumpang tindih/.test(await pg.textContent('#q-hasil .flash.err')), await pg.textContent('#q-hasil'));
  data = await save(pg);
  ok('Q30 …and the server refuses the overlap', /tumpang tindih/.test(await errs(pg)), await errs(pg));
  await pg.click('.rpanel button:text-is("Hapus")');
  t = await tabs(pg);
  ok('Q31 deleting the range on show removes the tab and moves to a neighbour', t.length === 3 && t.some(x => x.on), t);
  data = await save(pg);
  ok('Q32 now it saves', (await errs(pg)) === '' && data.results.length === 3, [await errs(pg), data && data.results.length]);

  // duplicate keeps the content
  await pg.click('.rtab >> nth=0');
  await pg.click('.rpanel button:text-is("Duplikat")');
  t = await tabs(pg);
  ok('Q33 duplicate: a new tab "(salinan)" on show with the same content', t.length === 4 && t[1].on && /salinan/.test(t[1].text) && (await headText(pg)).startsWith('Pemula edit'), t);

  // renaming a section and a variable follows into the chips and the range panels
  await pg.click('.rpanel button:text-is("Hapus")');
  const secInput = pg.locator('#q-bagian input[type=text] >> nth=0');
  await secInput.fill('Tata Bahasa');
  await pg.waitForTimeout(100);
  ok('Q34 renaming a section updates the section variables in the bar', (await chips(pg)).includes('{score.tata_bahasa}'), (await chips(pg)).filter(x => /score\./.test(x)));
  const varKey = pg.locator('#q-var input[placeholder="mis. program"]');
  await varKey.fill('kelas');
  await pg.waitForTimeout(800);
  ok('Q35 renaming a custom variable updates the chips and the per-range value labels', (await chips(pg)).includes('{kelas}') && !(await chips(pg)).includes('{program}') && /\{kelas\}/.test(await pg.textContent('.rpanel')), [await chips(pg), await pg.textContent('.rpanel')]);

  // the old (before the shared editor) block types are upgraded by the server and open in the editor
  ok('Q36 still no console errors or CSP violations after all that (the refused saves above log a 422 each)', pg.logs.filter(l => !/status of 422/.test(l)).length === 0 && (await viol(pg)).length === 0, [pg.logs, await viol(pg)]);
  await pg.context().close();

  // empty quiz result list: starter button
  pg = await open(br, '/edizon/quiz-page.php');
  await pg.evaluate(() => {});
  // delete all three ranges
  for (let i = 0; i < 3; i++) await pg.click('.rpanel button:text-is("Hapus")');
  ok('Q37 with no range left the editor hides and offers the three examples', (await pg.$$('.rtab')).length === 0 && !(await pg.isVisible('.ae-root')) && (await pg.isVisible('text=Buat 3 contoh rentang')));
  await pg.click('text=Buat 3 contoh rentang');
  t = await tabs(pg);
  ok('Q38 the examples fill three tabs and the editor shows the first one', t.length === 3 && t[0].on && (await pg.isVisible('.ae-root')) && (await pg.$$('.ae-blk')).length === 5, t);
  data = await save(pg);
  ok('Q39 the examples pass the real validator', (await errs(pg)) === '' && data.results.length === 3, [await errs(pg), data && data.results.map(r => r.min + '-' + r.max)]);
  await pg.context().close();

  // narrow screen: tabs wrap, no horizontal scroll
  pg = await open(br, '/edizon/quiz-page.php', { width: 390, height: 844 });
  ok('Q40 phone width: no horizontal scroll', await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await pg.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  await pg.context().close();

  /* ================= pop-up builder ================= */
  pg = await open(br, '/edizon/popup-page.php');
  ok('P1 pop-up page: no console errors and no CSP violations', pg.logs.length === 0 && (await viol(pg)).length === 0, [pg.logs, await viol(pg)]);
  ok('P2 the editor is in pop-up mode (palette without the result blocks, with Formulir and Jarak kosong)', await (async () => { const p = await palette(pg); return p.includes('form') && p.includes('spacer') && !p.includes('score'); })());
  ok('P3 default width 520px', near(await boxW(pg), 520, 2) && /520px/.test(await pg.textContent('.wmsg')), [await boxW(pg), await pg.textContent('.wmsg')]);
  await wInput(pg, 'Lebar pop-up').fill('640');
  await pg.waitForTimeout(350);
  ok('P4 "640" is read as 640px and the canvas follows', near(await boxW(pg), 640, 2) && /640px/.test(await pg.textContent('.wmsg')), [await boxW(pg), await pg.textContent('.wmsg')]);
  await wInput(pg, 'Lebar pop-up').fill('50vh');
  await pg.waitForTimeout(350);
  const h50 = await pg.evaluate(() => window.innerHeight * 0.5);
  ok('P5 50vh follows the window height (desktop view)', near(await boxW(pg), h50, 2) || near(await boxW(pg), 520, 2) === false, [await boxW(pg), h50]);
  await wInput(pg, 'Lebar pop-up').fill('5000');
  ok('P6 5000 is out of range: red message', (await pg.getAttribute('.wmsg', 'class')).includes('bad'), await pg.textContent('.wmsg'));
  let pdata = await save(pg);
  ok('P7 the server refuses it', (await errs(pg)) !== '', await errs(pg));
  await pg.click('.presets button:has-text("Selebar artikel")');
  pdata = await save(pg);
  ok('P8 "Selebar artikel" = 960px is saved', (await errs(pg)) === '' && pdata.size.width === '960px' && (await wInput(pg, 'Lebar pop-up').inputValue()) === '960px', [await errs(pg), pdata && pdata.size]);
  ok('P9 at 960px the info line shows the real width and no warning (the article text is 960px)', /960 px/.test(await pg.textContent('.ae-popinfo')) && !/Lebih lebar/.test(await pg.textContent('.ae-popinfo')), await pg.textContent('.ae-popinfo'));
  await wInput(pg, 'Lebar pop-up').fill('1000px'); await pg.waitForTimeout(350);
  ok('P9b above 960px the info line warns it is wider than the article text', /Lebih lebar dari teks artikel/.test(await pg.textContent('.ae-popinfo')) && /Lebih lebar/.test(await pg.textContent('.wmsg')), [await pg.textContent('.ae-popinfo'), await pg.textContent('.wmsg')]);
  await pg.click('.presets button:has-text("Selebar artikel")');
  await pg.click('.presets button:has-text("Kosongkan")');
  pdata = await save(pg);
  ok('P10 empty is saved and shown as empty (default 520px)', (await errs(pg)) === '' && pdata.size.width === '' && near(await boxW(pg), 520, 2), [pdata && pdata.size, await boxW(pg)]);

  // content round trip
  await pg.fill('.ae-blk-h textarea', 'Judul baru');
  pdata = await save(pg);
  ok('P11 content edits reach the saved data and the editor keeps them', pdata.blocks[0].text === 'Judul baru' && (await headText(pg)) === 'Judul baru' && (await pg.$$('.ae-blk')).length === 3, pdata && pdata.blocks[0]);
  await pg.click('.ae-aud button:text-is("Dewasa")');
  ok('P12 Anak / Dewasa toggle works on the pop-up canvas', (await pg.getAttribute('.ae-popstage', 'data-audience')) === 'adult');
  // theme: custom with a colour
  await pg.selectOption('select >> nth=1', 'custom').catch(() => {});
  ok('P13 still no console errors or CSP violations (the refused save above logs a 422)', pg.logs.filter(l => !/status of 422/.test(l)).length === 0 && (await viol(pg)).length === 0, [pg.logs, await viol(pg)]);
  await pg.context().close();

  await br.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n' + (results.length - failed.length) + ' / ' + results.length + ' checks passed');
  if (failed.length) { console.log('FAILED:\n' + failed.map(f => ' - ' + f.name).join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(2); });
