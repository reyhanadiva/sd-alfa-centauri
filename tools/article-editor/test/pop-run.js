/* eslint-disable */
// Browser checks for the article editor in pop-up and quiz-result mode (real panel.css, real article-editor.css and bundle, the panel's real CSP),
// and for how closely its canvas matches the real pop-up (forms/popups.js + popups.css).
// Start the harness first (npm run harness:pop), then: npm run test:pop
const { chromium } = require('playwright');
const BASE = process.env.POP_URL || 'http://127.0.0.1:8097';
const results = [];
const ok = (name, pass, extra) => { results.push({ name, pass: !!pass, extra }); console.log((pass ? 'PASS ' : 'FAIL ') + name + ((!pass || process.env.VERBOSE) && extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;
const IMG = '/uploads/sample.svg';

const HOOK = () => {
  window.__viol = [];
  document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' | ' + e.blockedURI));
};
const FORMS = [{ slug: 'daftar', name: 'Formulir daftar' }, { slug: 'kontak', name: 'Kontak' }];
const VARS = [{ v: '{name}', label: 'Nama peserta' }, { v: '{score}', label: 'Skor' }, { v: '{max}', label: 'Skor penuh' }, { v: '{percent}', label: 'Persen' }, { v: '{level}', label: 'Level' }];
const SECS = [{ key: 'reading', name: 'Reading' }, { key: 'listening', name: 'Listening' }];

async function boot(br, mode, extra, vp) {
  const ctx = await br.newContext({ viewport: vp || { width: 1360, height: 1000 } });
  await ctx.addInitScript(HOOK);
  const pg = await ctx.newPage();
  pg.logs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pg.logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => pg.logs.push('pageerror: ' + e.message));
  await pg.goto(BASE + '/edizon/pop-editor.php');
  await pg.waitForFunction(() => window.ArtEditor && window.ED);
  await make(pg, mode, extra);
  return pg;
}
async function make(pg, mode, extra) {
  await pg.evaluate(([mode, extra]) => {
    if (window.__ed) { window.__ed.destroy(); document.getElementById('editor').textContent = ''; }
    const o = Object.assign({ mode, isAdmin: true, csrf: 't', forms: extra && extra.forms, onChange() { window.__n = (window.__n || 0) + 1; } }, extra || {});
    window.__ed = ArtEditor.create(o);
    document.getElementById('editor').appendChild(window.__ed.root);
  }, [mode, extra || null]);
  await pg.waitForSelector('.ae-root');
}
const blocks = (pg) => pg.evaluate(() => window.__ed.getBlocks());
const setBlocks = (pg, list) => pg.evaluate(l => window.__ed.setBlocks(l), list);
const look = (pg, l) => pg.evaluate(l => window.__ed.setLook(l), l);
const boxW = (pg) => pg.evaluate(() => document.querySelector('.ae-popbox').getBoundingClientRect().width);
const css = (pg, sel, prop) => pg.evaluate(([s, p]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; }, [sel, prop]);
const tiles = (pg) => pg.$$eval('.ae-tile', t => t.map(x => x.getAttribute('data-type')));
const setLabels = (pg) => pg.$$eval('.ae-setbox .ae-f > span', e => e.map(x => x.textContent));
const selectBlk = async (pg, sel) => { await pg.click(sel + ' .ae-blk-bar, ' + sel, { position: { x: 4, y: 4 }, force: true }); };
const clickView = async (pg, label) => { await pg.click('.ae-view:not(.ae-aud) button:text-is("' + label + '")'); await pg.waitForTimeout(320); }; // the stage animates its width
const clickAud = (pg, label) => pg.click('.ae-aud button:text-is("' + label + '")');
const cols = (pg, sel) => pg.evaluate(s => getComputedStyle(document.querySelector(s)).gridTemplateColumns.split(' ').length, sel);

(async () => {
  const br = await chromium.launch();

  /* ---------- palette and structure ---------- */
  let pg = await boot(br, 'popup');
  const tp = await tiles(pg);
  ok('P1 pop-up palette: the 14 article blocks plus Formulir and Jarak kosong, and not the result blocks', tp.length === 16 && tp.includes('form') && tp.includes('spacer') && tp.includes('html') && !tp.includes('score') && !tp.includes('sections'), tp.join(','));
  const dev = await pg.$$eval('.ae-view:not(.ae-aud) button', b => b.map(x => x.textContent));
  const aud = await pg.$$eval('.ae-aud button', b => b.map(x => x.textContent));
  ok('P1b the screen switch has Desktop, Tablet, HP (no "Lebar penuh") and there is an Anak / Dewasa switch', JSON.stringify(dev) === '["Desktop","Tablet","HP"]' && JSON.stringify(aud) === '["Anak","Dewasa"]', [dev, aud]);
  ok('P1c the stage is labelled as a pop-up and the canvas is the box', await pg.evaluate(() => document.querySelector('.ae-stage').getAttribute('aria-label') === 'Pop-up' && !!document.querySelector('.ae-popstage > .ae-popbox > .ae-cv.ae-cv-pop > .ae-rootlist')));

  const pr = await boot(br, 'result', { vars: VARS, sections: SECS, forms: FORMS });
  const tr = await tiles(pr);
  ok('P2 result palette adds Skor and Skor per bagian', tr.length === 18 && tr.includes('score') && tr.includes('sections') && tr.includes('form'), tr.join(','));
  const pe = await boot(br, 'popup', { isAdmin: false });
  ok('P2b an Editor (not Admin) has no HTML block in the palette', !(await tiles(pe)).includes('html'));
  await pe.context().close();
  const pa = await boot(br, 'article');
  const ta = await tiles(pa);
  ok('P3 article mode is unchanged: 14 blocks, no pop-up blocks, no Anak / Dewasa switch, no stage', ta.length === 14 && !ta.includes('form') && !ta.includes('spacer') && (await pa.$$('.ae-aud')).length === 0 && (await pa.$$('.ae-popstage')).length === 0, ta.join(','));
  await pa.evaluate(() => window.__ed.setBlocks([{ t: 'img', src: '', alt: '', caption: '', ratio: '16:9', size: 'small', align: 'center', link: 'https://x.y' }, { t: 'h', level: 2, text: 'A', align: 'center' }]));
  const ab = await blocks(pa);
  ok('P3b article mode drops the pop-up only fields (size small becomes normal, no align, no link)', ab[0].size === 'normal' && !('align' in ab[0]) && !('link' in ab[0]) && !('align' in ab[1]), ab);
  await pa.context().close();

  /* ---------- width: default, units, devices ---------- */
  ok('W1 no width given: the default 520 px', near(await boxW(pg), 520));
  const cases = [['520px', 520], ['', 520], ['480', 480], ['30rem', 480], ['60vw', 816], ['80vh', 800], ['50vmin', 500], ['70vmax', 952], ['abc', 520], ['12 px', 520], ['25.5em', 408]];
  const bad = [];
  for (const [w, want] of cases) { await look(pg, { size: { width: w } }); const got = await boxW(pg); if (!near(got, want)) bad.push(w + ' -> ' + got + ' (want ' + want + ')'); }
  ok('W2 the width reads px, bare numbers, rem, em, vw, vh, vmin, vmax; empty or wrong falls back to 520', bad.length === 0, bad);
  await look(pg, { size: { width: '100%' } });
  const stageW = await pg.evaluate(() => { const s = document.querySelector('.ae-popstage'); const cs = getComputedStyle(s); return s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); });
  ok('W3 100% and a width bigger than the area stop at the area (the same as the pop-up on a small screen)', near(await boxW(pg), stageW) && (await look(pg, { size: { width: '5000px' } }), near(await boxW(pg), stageW)), stageW);
  await look(pg, { size: { width: '60vw' } });
  await clickView(pg, 'Tablet');
  ok('W4 Tablet pretends a 768 px screen: 60vw is 461 px and the stage is 768 px wide', near(await boxW(pg), 460.8) && near(await pg.evaluate(() => document.querySelector('.ae-popstage').getBoundingClientRect().width), 768), await boxW(pg));
  await clickView(pg, 'HP');
  await look(pg, { size: { width: '90vw' } });
  const hpw = await boxW(pg);
  await look(pg, { size: { width: '100vw' } });
  ok('W5 HP pretends 390 px: 90vw is 351 px, 100vw is held to the screen minus the 10 px edges (370)', near(hpw, 351) && near(await boxW(pg), 370), [hpw, await boxW(pg)]);
  await clickView(pg, 'Desktop');
  await look(pg, { size: { width: '1200px' } });
  const info1 = await pg.textContent('.ae-popinfo');
  ok('W6 the info line shows the width and warns when it is wider than the 960 px article text', /1200 px/.test(info1) && /960/.test(info1), info1);
  await look(pg, { size: { width: '640px' } });
  const info2 = await pg.textContent('.ae-popinfo');
  ok('W6b ...and says nothing about the article when it is not wider', /640 px/.test(info2) && !/960/.test(info2), info2);
  await look(pg, { size: { width: '5000px' } });
  ok('W6c ...and says when the area cut the width', /dipotong/.test(await pg.textContent('.ae-popinfo')), await pg.textContent('.ae-popinfo'));
  await look(pg, { size: { width: '520px' } });

  /* ---------- the look: audience, themes ---------- */
  const sample = [{ id: 'a1', t: 'h', level: 2, text: 'Judul', align: 'left' }, { id: 'a2', t: 'text', html: '<p>Isi teks.</p>' }, { id: 'a3', t: 'button', label: 'Coba', url: '#close', style: 'solid', align: 'left', full: false }, { id: 'a4', t: 'button', label: 'Tutup', url: '#close', style: 'outline', align: 'left', full: false }];
  await setBlocks(pg, sample);
  ok('A1 starts on the Anak look and the button says so', await pg.evaluate(() => document.querySelector('.ae-popstage').getAttribute('data-audience') === 'kids' && document.querySelector('.ae-aud button[data-a=kids]').getAttribute('aria-pressed') === 'true'));
  const kid = { bg: await css(pg, '.ae-popbox', 'backgroundColor'), r: await css(pg, '.ae-popbox', 'borderRadius'), btn: await css(pg, '.ae-btn-solid', 'backgroundColor'), btnOn: await css(pg, '.ae-btn-solid', 'color'), h: await css(pg, '.ae-h-in', 'color') };
  await clickAud(pg, 'Dewasa');
  const adu = { bg: await css(pg, '.ae-popbox', 'backgroundColor'), r: await css(pg, '.ae-popbox', 'borderRadius'), btn: await css(pg, '.ae-btn-solid', 'backgroundColor'), btnOn: await css(pg, '.ae-btn-solid', 'color'), h: await css(pg, '.ae-h-in', 'color') };
  ok('A2 Anak: green-white box, 32 px corners, yellow button with navy text, navy heading', kid.bg === 'rgb(242, 249, 234)' && kid.r === '32px' && kid.btn === 'rgb(255, 216, 74)' && kid.btnOn === 'rgb(30, 47, 120)' && kid.h === 'rgb(30, 47, 120)', kid);
  ok('A3 Dewasa: cream box, 24 px corners, black button with white text', adu.bg === 'rgb(251, 246, 238)' && adu.r === '24px' && adu.btn === 'rgb(26, 26, 26)' && adu.btnOn === 'rgb(255, 255, 255)', adu);
  ok('A3b the choice is told to the page (callback) and kept for the next visit', await pg.evaluate(() => window.__ed.getAudience() === 'adult' && window.localStorage.getItem('artEditor.popup.audience') === 'adult'));
  await pg.reload(); await pg.waitForFunction(() => window.ArtEditor && window.ED); await make(pg, 'popup');
  ok('A3c after a reload the editor opens on Dewasa', await pg.evaluate(() => window.__ed.getAudience() === 'adult' && document.querySelector('.ae-popstage').getAttribute('data-audience') === 'adult'));
  await clickAud(pg, 'Anak');

  await look(pg, { style: { theme: 'custom', bgType: 'solid', bg: '#112233', color: '#ffeeaa', radius: 10, padding: 30, accent: '#ff0000' } });
  await setBlocks(pg, sample);
  const cu = { bg: await css(pg, '.ae-popbox', 'backgroundColor'), r: await css(pg, '.ae-popbox', 'borderRadius'), pad: await css(pg, '.ae-cv-pop', 'padding'), col: await css(pg, '.ae-popbox', 'color'), btn: await css(pg, '.ae-btn-solid', 'backgroundColor'), btnOn: await css(pg, '.ae-btn-solid', 'color'), blob: await css(pg, '.ae-popblob', 'display'), h: await css(pg, '.ae-h-in', 'color') };
  ok('C1 custom theme: its background, text colour, 10 px corners, 30 px padding, accent button with white text, no yellow blob', cu.bg === 'rgb(17, 34, 51)' && cu.r === '10px' && cu.pad === '30px' && cu.col === 'rgb(255, 238, 170)' && cu.btn === 'rgb(255, 0, 0)' && cu.btnOn === 'rgb(255, 255, 255)' && cu.blob === 'none' && cu.h === 'rgb(255, 238, 170)', cu);
  await look(pg, { style: { theme: 'custom', bgType: 'gradient', grad: { kind: 'linear', angle: 90, c1: '#ff0000', c2: '#0000ff' }, color: '#000000', radius: 0, padding: 20 } });
  ok('C2 gradient and image backgrounds', /linear-gradient/.test(await css(pg, '.ae-popbox', 'backgroundImage')) && (await look(pg, { style: { theme: 'custom', bgType: 'image', image: { src: IMG, pos: 'top', overlay: 30 }, color: '#fff', radius: 0, padding: 20 } }), /url\(.*sample\.svg.*\)/.test(await css(pg, '.ae-popbox', 'backgroundImage')) && /rgba\(0, 0, 0, 0\.3\)/.test(await css(pg, '.ae-popbox', 'backgroundImage'))));
  await look(pg, { style: { theme: 'site' } });
  ok('C3 going back to the website theme leaves nothing of the custom one behind', (await css(pg, '.ae-popbox', 'backgroundColor')) === 'rgb(242, 249, 234)' && (await css(pg, '.ae-popblob', 'display')) === 'block' && (await css(pg, '.ae-cv-pop', 'paddingLeft')) === '24px');
  await look(pg, { showClose: false });
  ok('C4 the close button follows "showClose"', (await css(pg, '.ae-popx', 'display')) === 'none' && (await look(pg, { showClose: true }), (await css(pg, '.ae-popx', 'display')) !== 'none'));
  await look(pg, { overlay: false });
  ok('C5 without a dark backdrop the stage is light', (await css(pg, '.ae-popstage', 'backgroundColor')) === 'rgb(243, 244, 248)');
  await look(pg, { overlay: true, position: 'bottom-right', size: { width: '400px' } });
  const bx = await pg.evaluate(() => { const s = document.querySelector('.ae-popstage').getBoundingClientRect(), b = document.querySelector('.ae-popbox').getBoundingClientRect(); return [s.right - b.right, b.left - s.left]; });
  ok('C6 position bottom-right puts the box at the right edge of the stage', near(bx[0], 16, 2) && bx[1] > 100, bx);
  await look(pg, { position: 'center', size: { width: '520px' } });

  /* ---------- block settings in pop-up mode ---------- */
  await setBlocks(pg, [{ id: 'h', t: 'h', level: 2, text: 'Halo', align: 'left' }, { id: 'i', t: 'img', src: '', alt: '', caption: '', ratio: '16:9', size: 'normal', align: 'center', link: '' }, { id: 'b', t: 'button', label: 'Coba', url: '#close', style: 'solid', align: 'center', full: false }]);
  await selectBlk(pg, '.ae-blk-h');
  ok('B1 heading: has "Rata teks"', (await setLabels(pg)).includes('Rata teks'));
  await pg.selectOption('.ae-setbox select[aria-label="Rata teks"]', 'center');
  ok('B1b ...centering it is shown on the canvas and saved', (await css(pg, '.ae-h-in', 'textAlign')) === 'center' && (await blocks(pg))[0].align === 'center');
  await pg.selectOption('.ae-setbox select[aria-label="Rata teks"]', 'right');
  ok('B1c ...right too', (await css(pg, '.ae-h-in', 'textAlign')) === 'right' && (await blocks(pg))[0].align === 'right');

  await selectBlk(pg, '.ae-blk-img');
  const il = await setLabels(pg);
  ok('B2 picture: Lebar, Rata gambar and Tautan gambar settings', il.includes('Lebar') && il.includes('Rata gambar') && il.includes('Tautan gambar (opsional)'), il);
  const opts = await pg.$$eval('.ae-setbox select[aria-label="Lebar"] option', o => o.map(x => x.value + ':' + x.textContent));
  ok('B2b ...sizes: as wide as the pop-up, small, edge to edge', JSON.stringify(opts) === JSON.stringify(['normal:Selebar isi pop-up', 'small:Kecil (55%)', 'wide:Tepi ke tepi']), opts);
  await pg.selectOption('.ae-setbox select[aria-label="Lebar"]', 'small');
  const fw = await pg.evaluate(() => { const b = document.querySelector('.ae-blk-img'), f = b.querySelector('.ae-fig'); const cs = getComputedStyle(b); const inner = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); const r = f.getBoundingClientRect(), br = b.getBoundingClientRect(); return { ratio: r.width / inner, centre: (r.left + r.right) / 2 - (br.left + br.right) / 2 }; });
  ok('B2c small: 55% wide and centred', near(fw.ratio, 0.55, 0.01) && near(fw.centre, 0, 2) && (await blocks(pg))[1].size === 'small', fw);
  await pg.selectOption('.ae-setbox select[aria-label="Rata gambar"]', 'right');
  const fr = await pg.evaluate(() => { const b = document.querySelector('.ae-blk-img'), f = b.querySelector('.ae-fig'); const cs = getComputedStyle(b); return b.getBoundingClientRect().right - parseFloat(cs.paddingRight) - f.getBoundingClientRect().right; });
  ok('B2d ...and to the right when asked', near(fr, 0, 2) && (await blocks(pg))[1].align === 'right', fr);
  await pg.fill('.ae-setbox input[placeholder^="https"]', 'https://example.com/x');
  ok('B2e the picture link is kept', (await blocks(pg))[1].link === 'https://example.com/x');
  await look(pg, { style: { theme: 'custom', bgType: 'solid', bg: '#ffffff', color: '#111111', radius: 20, padding: 30 } });
  await pg.selectOption('.ae-setbox select[aria-label="Lebar"]', 'wide');
  const ed = await pg.evaluate(() => { const bx = document.querySelector('.ae-popbox').getBoundingClientRect(), f = document.querySelector('.ae-blk-img .ae-fr').getBoundingClientRect(); return { l: f.left - bx.left, r: bx.right - f.right, r1: getComputedStyle(document.querySelector('.ae-blk-img .ae-fr')).borderRadius }; });
  ok('B2f edge to edge: the picture reaches both sides of the box (past the 30 px padding), square corners', near(ed.l, 0, 1.5) && near(ed.r, 0, 1.5) && ed.r1 === '0px', ed);
  await look(pg, { style: { theme: 'site' } });

  await selectBlk(pg, '.ae-blk-button');
  const bl = await setLabels(pg);
  ok('B3 button: Rata tombol and Lebar tombol settings, with the #close hint', bl.includes('Rata tombol') && bl.includes('Lebar tombol') && /#close menutup pop-up/.test(await pg.textContent('.ae-setbox')), bl);
  await pg.selectOption('.ae-setbox select[aria-label="Lebar tombol"]', '1');
  const bw = await pg.evaluate(() => [document.querySelector('.ae-btn').getBoundingClientRect().width, document.querySelector('.ae-btn-wrap').getBoundingClientRect().width]);
  const b3 = (await blocks(pg))[2];
  ok('B3b a full width button fills the box and is saved', near(bw[0], bw[1], 1) && b3.full === true, [bw, b3]);
  await pg.selectOption('.ae-setbox select[aria-label="Lebar tombol"]', '0');
  await pg.selectOption('.ae-setbox select[aria-label="Rata tombol"]', 'right');
  const br2 = await pg.evaluate(() => { const w = document.querySelector('.ae-btn-wrap').getBoundingClientRect(), b = document.querySelector('.ae-btn').getBoundingClientRect(); return w.right - b.right; });
  ok('B3c aligned right', near(br2, 0, 1.5) && (await blocks(pg))[2].align === 'right', br2);

  /* ---------- form and spacer ---------- */
  await make(pg, 'popup', { forms: FORMS });
  await setBlocks(pg, [{ id: 'f', t: 'form', slug: '' }, { id: 's', t: 'spacer', h: 24 }]);
  ok('F1 an empty Formulir block says to choose one', /belum dipilih/.test(await pg.textContent('.ae-blk-form')));
  await selectBlk(pg, '.ae-blk-form');
  const fo = await pg.$$eval('.ae-setbox select[aria-label="Formulir"] option', o => o.map(x => x.value + ':' + x.textContent));
  ok('F1b the list has the forms of the page', JSON.stringify(fo) === JSON.stringify([':— Pilih formulir —', 'daftar:Formulir daftar', 'kontak:Kontak']), fo);
  await pg.selectOption('.ae-setbox select[aria-label="Formulir"]', 'kontak');
  ok('F1c choosing one names it on the canvas and saves the slug', /Formulir: Kontak/.test(await pg.textContent('.ae-blk-form')) && (await blocks(pg))[0].slug === 'kontak');
  await setBlocks(pg, [{ id: 'f', t: 'form', slug: 'hilang' }]);
  await selectBlk(pg, '.ae-blk-form');
  ok('F1d a form that no longer exists is listed as missing, not dropped', (await pg.$$eval('.ae-setbox select[aria-label="Formulir"] option', o => o.map(x => x.textContent))).includes('hilang (tidak ditemukan)') && (await blocks(pg))[0].slug === 'hilang');
  await setBlocks(pg, [{ id: 's', t: 'spacer', h: 24 }]);
  await selectBlk(pg, '.ae-blk-spacer');
  const sh = () => pg.evaluate(() => document.querySelector('.ae-spacer').getBoundingClientRect().height);
  ok('F2 spacer is as tall as its setting', near(await sh(), 24, 1));
  await pg.fill('.ae-setbox input[type=number]', '60');
  ok('F2b typing a height changes it at once and saves it', near(await sh(), 60, 1) && (await blocks(pg))[0].h === 60);
  await pg.fill('.ae-setbox input[type=number]', '500'); await pg.press('.ae-setbox input[type=number]', 'Tab');
  ok('F2c too tall is held to 120', near(await sh(), 120, 1) && (await blocks(pg))[0].h === 120 && (await pg.inputValue('.ae-setbox input[type=number]')) === '120');

  /* ---------- columns and cards follow the real thresholds of the box ---------- */
  const colB = [{ id: 'c2', t: 'columns', ratio: '1-1', cols: [[{ id: 'x1', t: 'text', html: '<p>a</p>' }], [{ id: 'x2', t: 'text', html: '<p>b</p>' }]] }, { id: 'c3', t: 'columns', ratio: '1-1-1', cols: [[], [], []] },
    { id: 'k', t: 'cards', per: 3, ratio: '4:3', btn: 'solid', items: [{ src: '', alt: '', title: 'A', text: '', label: '', url: '' }, { src: '', alt: '', title: 'B', text: '', label: '', url: '' }, { src: '', alt: '', title: 'C', text: '', label: '', url: '' }] }];
  await setBlocks(pg, colB);
  const th = async (w) => { await look(pg, { size: { width: w } }); return [await cols(pg, '.ae-blk-columns:nth-child(1) .ae-cols'), await cols(pg, '.ae-blk-columns:nth-child(2) .ae-cols'), await cols(pg, '.ae-cards')]; };
  const t400 = await th('400px'), t520 = await th('520px'), t700 = await th('700px');
  ok('R1 columns and cards use the same breakpoints as the public pop-up: 400 px box = 1/1/1 columns, 520 px = 2/1/2, 700 px = 2/3/3', JSON.stringify(t400) === '[1,1,1]' && JSON.stringify(t520) === '[2,1,2]' && JSON.stringify(t700) === '[2,3,3]', [t400, t520, t700]);
  await look(pg, { size: { width: '520px' } });

  /* ---------- result: variables, score, sections ---------- */
  await make(pr, 'result', { vars: VARS, sections: SECS, forms: FORMS });
  ok('V1 the variable bar lists the variables it was given', (await pr.$$eval('.ae-var', v => v.map(x => x.textContent))).join(' ') === '{name} {score} {max} {percent} {level}' && await pr.isVisible('.ae-vars'));
  await pr.click('.ae-var:text-is("{name}")');
  ok('V1b with nothing chosen yet it says where to click', /Klik dulu/.test(await pr.textContent('.ae-vars-m')));
  await setBlocks(pr, [{ id: 'h', t: 'h', level: 2, text: '', align: 'center' }, { id: 't', t: 'text', html: '<p>Skor</p>' }, { id: 'tb', t: 'table', header: true, caption: '', aligns: ['left', 'left'], rows: [['A', 'B'], ['', '']] }, { id: 'b', t: 'button', label: 'Kirim', url: 'https://wa.me/?text=', style: 'solid', align: 'center', full: false }]);
  await pr.click('.ae-h-in'); await pr.keyboard.type('Halo ');
  await pr.click('.ae-var:text-is("{name}")');
  ok('V2 a variable goes into the heading at the cursor and is saved', (await blocks(pr))[0].text === 'Halo {name}' && (await pr.inputValue('.ae-h-in')) === 'Halo {name}', (await blocks(pr))[0]);
  await pr.click('.ae-blk-text .ae-rte p'); await pr.keyboard.press('End'); await pr.keyboard.type(' kamu: ');
  await pr.click('.ae-var:text-is("{score}")');
  ok('V3 ...into a text block (and the text stays focused)', /Skor kamu: \{score\}/.test((await blocks(pr))[1].html), (await blocks(pr))[1].html);
  await pr.click('.ae-blk-table td.ae-tc >> nth=0'); await pr.click('.ae-var:text-is("{percent}")');
  ok('V4 ...into a table cell', (await blocks(pr))[2].rows[1][0] === '{percent}', (await blocks(pr))[2].rows);
  await selectBlk(pr, '.ae-blk-button');
  await pr.click('.ae-setbox input[type=text] >> nth=1'); await pr.press('.ae-setbox input[type=text] >> nth=1', 'End');
  await pr.click('.ae-var:text-is("{name}")');
  ok('V5 ...into a setting of the block (the button address)', (await blocks(pr))[3].url === 'https://wa.me/?text={name}', (await blocks(pr))[3].url);
  await pr.click('.ae-h-in'); await pr.press('.ae-h-in', 'Control+a'); await pr.keyboard.type('x'.repeat(145));
  await pr.click('.ae-var:text-is("{percent}")');
  ok('V6 a field that is nearly full does not take a variable that would not fit', (await blocks(pr))[0].text.length === 145 && /penuh/.test(await pr.textContent('.ae-vars-m')), (await blocks(pr))[0].text.length);
  await pr.evaluate(() => window.__ed.setResultInfo({ vars: [{ v: '{name}', label: 'Nama' }, '{q1}'] }));
  ok('V7 the variable list can be replaced while editing (custom variables of the quiz)', (await pr.$$eval('.ae-var', v => v.map(x => x.textContent))).join(' ') === '{name} {q1}');
  await pr.evaluate(() => window.__ed.setResultInfo({ vars: [] }));
  ok('V7b ...and an empty list hides the bar', !(await pr.isVisible('.ae-vars')));
  await pr.evaluate(() => window.__ed.setResultInfo({ vars: ['{name}'] }));

  await setBlocks(pr, [{ id: 'sc', t: 'score', style: 'card', align: 'center' }, { id: 'se', t: 'sections', title: 'Rincian' }]);
  ok('S1 Skor shows example numbers, labelled as an example', /42 \/ 60/.test(await pr.textContent('.ae-score')) && /70%/.test(await pr.textContent('.ae-score')) && /Contoh/.test(await pr.textContent('.ae-score')));
  await pr.evaluate(() => window.__ed.setResultInfo({ sample: { pts: 7, max: 10, pct: 70, correct: 7, count: 10 } }));
  ok('S1b the example can be set from the quiz', /7 \/ 10/.test(await pr.textContent('.ae-score')));
  const rows = await pr.$$eval('.ae-sec .ae-sec-h span', s => s.map(x => x.textContent));
  ok('S2 Skor per bagian lists the quiz sections', JSON.stringify(rows) === '["Reading","Listening"]', rows);
  await pr.evaluate(() => window.__ed.setResultInfo({ sections: [{ key: 'g', name: 'Grammar' }] }));
  ok('S2b ...and follows changes to them', JSON.stringify(await pr.$$eval('.ae-sec .ae-sec-h span', s => s.map(x => x.textContent))) === '["Grammar"]');
  await selectBlk(pr, '.ae-blk-score');
  await pr.selectOption('.ae-setbox select[aria-label="Gaya"]', 'plain');
  ok('S3 Skor: plain style loses its card, and the style and alignment are saved', (await css(pr, '.ae-score', 'borderTopWidth')) === '0px' && (await blocks(pr))[0].style === 'plain' && (await blocks(pr))[0].align === 'center');
  const sb = await blocks(pr);
  ok('S3b Skor per bagian saves its title', sb[1].t === 'sections' && sb[1].title === 'Rincian', sb[1]);
  // score and sections only live at the top level: not draggable into a column (nothing to render there)
  await setBlocks(pr, [{ id: 'c', t: 'columns', ratio: '1-1', cols: [[], []] }, { id: 'sc', t: 'score', style: 'card', align: 'center' }]);
  const canPut = await pr.evaluate(() => { const t = document.querySelector('.ae-blk-score'); const col = document.querySelector('.ae-col'); const s = window.Sortable; return !!t && !!col; });
  await pr.click('.ae-blk-score .ae-blk-bar button[aria-label="Hapus"], .ae-blk-score', { position: { x: 4, y: 4 }, force: true });
  await pr.click('.ae-blk-columns .ae-col >> nth=0', { position: { x: 4, y: 4 } });
  await pr.click('.ae-tile[data-type=score]');
  const top = await blocks(pr);
  ok('S4 the Skor tile never lands inside a column (it goes below the columns)', top.length === 3 && top[0].t === 'columns' && top[0].cols[0].length === 0 && top[1].t === 'score', top.map(b => b.t));

  /* ---------- round trip of every block ---------- */
  await make(pg, 'popup', { forms: FORMS });
  const all = await pg.evaluate(() => {
    const T = ArtEditor.types, out = [];
    Object.keys(T).forEach((k, i) => { if (T[k].modes && T[k].modes.indexOf('popup') < 0) return; const d = T[k].def('popup'); d.id = 'r' + i; if (k === 'form') d.slug = 'daftar'; if (k === 'text') d.html = '<p>Isi</p>'; out.push(d); });
    out.find(b => b.t === 'columns').cols = [[{ id: 'n1', t: 'img', src: '', alt: 'x', caption: '', ratio: '1:1', size: 'normal', align: 'center', link: 'https://a.b' }], [{ id: 'n2', t: 'button', label: 'Hi', url: '#close', style: 'outline', align: 'right', full: true }]];
    return out;
  });
  await setBlocks(pg, all);
  const back = await blocks(pg);
  const canon = (x) => JSON.stringify(x, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((o, key) => (o[key] = v[key], o), {}) : v);
  ok('X1 every pop-up block type loads and comes back unchanged', canon(back) === canon(all), back.map((b, i) => canon(b) === canon(all[i]) ? '' : b.t).filter(Boolean));
  ok('X2 no console errors and no security-policy violations in any mode (CSSOM only)', pg.logs.length === 0 && pr.logs.length === 0 && (await pg.evaluate(() => window.__viol)).length === 0 && (await pr.evaluate(() => window.__viol)).length === 0, [pg.logs, pr.logs]);
  await pr.context().close();

  /* ---------- the same pop-up in the real runtime ---------- */
  const rctx = await br.newContext({ viewport: { width: 1360, height: 1000 } });
  const rp = await rctx.newPage();
  await rp.goto(BASE + '/real.php');
  const real = async (a) => {
    await rp.evaluate(a => { document.documentElement.setAttribute('data-audience', a); window.ENPopups.close && window.ENPopups.close(true); window.ENPopups.open('t1'); }, a);
    await rp.waitForSelector('.enp-overlay.enp-in .enp-box');
    await rp.waitForTimeout(450);
    return rp.evaluate(() => {
      const g = (s, props) => { const e = document.querySelector(s); const c = getComputedStyle(e); const o = {}; props.forEach(p => o[p] = c[p]); return o; };
      return {
        box: g('.enp-box', ['width', 'backgroundColor', 'borderRadius', 'boxShadow', 'color', 'fontFamily']),
        scroll: g('.enp-scroll', ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']),
        h2: g('.enp-h2', ['fontSize', 'fontWeight', 'fontFamily', 'color', 'letterSpacing', 'lineHeight']),
        p: g('.enp-rich p', ['fontSize', 'color']),
        solid: g('.enp-btn-solid', ['backgroundColor', 'color', 'fontSize', 'fontFamily', 'fontWeight', 'paddingTop', 'paddingLeft', 'borderRadius', 'boxShadow']),
        outline: g('.enp-btn-outline', ['color', 'borderTopColor', 'borderTopWidth', 'fontFamily', 'fontSize']),
      };
    });
  };
  const mine = async (a) => {
    await clickAud(pg, a === 'adult' ? 'Dewasa' : 'Anak');
    return pg.evaluate(() => {
      const g = (s, props) => { const e = document.querySelector(s); const c = getComputedStyle(e); const o = {}; props.forEach(p => o[p] = c[p]); return o; };
      return {
        box: g('.ae-popbox', ['width', 'backgroundColor', 'borderRadius', 'boxShadow', 'color', 'fontFamily']),
        scroll: g('.ae-cv-pop', ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']),
        h2: g('.ae-h-in', ['fontSize', 'fontWeight', 'fontFamily', 'color', 'letterSpacing', 'lineHeight']),
        p: g('.ae-rte p', ['fontSize', 'color']),
        solid: g('.ae-btn-solid', ['backgroundColor', 'color', 'fontSize', 'fontFamily', 'fontWeight', 'paddingTop', 'paddingLeft', 'borderRadius', 'boxShadow']),
        outline: g('.ae-btn-outline', ['color', 'borderTopColor', 'borderTopWidth', 'fontFamily', 'fontSize']),
      };
    });
  };
  await look(pg, { style: { theme: 'site' }, size: { width: '520px' } });
  await setBlocks(pg, [{ id: 'h1', t: 'h', level: 2, text: 'Judul pop-up', align: 'left' }, { id: 't1', t: 'text', html: '<p>Isi teks pop-up.</p>' }, { id: 'b1', t: 'button', label: 'Coba kelas gratis', url: '#close', style: 'solid', align: 'left', full: false }, { id: 'b2', t: 'button', label: 'Tutup', url: '#close', style: 'outline', align: 'left', full: false }]);
  for (const a of ['kids', 'adult']) {
    const R = await real(a), M = await mine(a), diff = [];
    Object.keys(R).forEach(k => Object.keys(R[k]).forEach(p => {
      const kk = k === 'scroll' ? p : p; let rv = R[k][p], mv = M[k][p];
      if (k === 'box' && p === 'fontFamily') return; // the real box inherits from the page; the editor sets it on the box itself (checked through the heading and text)
      if (rv !== mv) diff.push(k + '.' + p + ': real ' + rv + ' | editor ' + mv);
    }));
    ok('L-' + a + ' the editor canvas matches the real pop-up (website theme, ' + (a === 'kids' ? 'Anak' : 'Dewasa') + '): box, padding, heading, text, both buttons', diff.length === 0, diff);
  }
  await rctx.close();

  await br.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n' + (results.length - failed.length) + ' / ' + results.length + ' checks passed');
  if (failed.length) { console.log('FAILED:\n' + failed.map(f => ' - ' + f.name).join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(2); });
