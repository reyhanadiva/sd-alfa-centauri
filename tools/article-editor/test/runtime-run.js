/* eslint-disable */
// Browser checks for the PUBLIC side of pop-ups and quiz results: the real forms/popups.js + popups.css, and quiz/quiz-run.js + quiz.css
// fed with the payload the real PHP builds (quiz_result_payload). Start the harness first (npm run harness:pop), then: npm run test:runtime
const { chromium } = require('playwright');
const BASE = process.env.POP_URL || 'http://127.0.0.1:8097';
const results = [];
const ok = (name, pass, extra) => { results.push({ name, pass: !!pass, extra }); console.log((pass ? 'PASS ' : 'FAIL ') + name + ((!pass || process.env.VERBOSE) && extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;
const IMG = '/uploads/sample.svg';

async function page(br, url, vp) {
  const ctx = await br.newContext({ viewport: vp || { width: 1360, height: 1000 } });
  const pg = await ctx.newPage();
  pg.logs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pg.logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => pg.logs.push('pageerror: ' + e.message));
  await pg.goto(BASE + url);
  return pg;
}
const POP = (blocks, extra) => ({ slug: 't', name: 'T', cfg: Object.assign({ position: 'center', overlay: true, showClose: true, size: { width: '' }, style: { theme: 'site' }, blocks }, extra || {}) });
async function openPop(pg, p) {
  await pg.evaluate(() => { if (window.ENPopups) ENPopups.close(true); });
  await pg.evaluate(p => ENPopups.open('t', { def: p }), p);
  await pg.waitForSelector('.enp-box');
  await pg.waitForTimeout(350);
}
const boxW = (pg) => pg.evaluate(() => document.querySelector('.enp-box').getBoundingClientRect().width);
const css = (pg, sel, prop) => pg.evaluate(([s, p]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; }, [sel, prop]);
const count = (pg, sel) => pg.evaluate(s => document.querySelectorAll(s).length, sel);

const ALL = [
  { id: 'a1', t: 'h', level: 2, text: 'Judul pop-up', align: 'center' },
  { id: 'a2', t: 'text', html: '<p>Teks <strong>tebal</strong></p>' },
  { id: 'a3', t: 'img', src: IMG, alt: 'x', size: 'wide', align: 'center' },
  { id: 'a4', t: 'button', label: 'Daftar', url: '#close', style: 'solid', align: 'center', full: false },
  { id: 'a5', t: 'ul', style: 'bullets', items: ['Satu', 'Dua'] },
  { id: 'a6', t: 'quote', text: 'Kutipan', cite: 'Siti' },
  { id: 'a7', t: 'callout', tone: 'info', title: 'Info', text: 'Isi callout' },
  { id: 'a8', t: 'faq', title: 'FAQ', items: [{ q: 'Apa?', a: 'Itu.' }, { q: 'Siapa?', a: 'Kita.' }] },
  { id: 'a9', t: 'cards', per: 2, items: [{ title: 'K1', text: 'T1', src: IMG, alt: '', label: 'Buka', url: '#close' }, { title: 'K2', text: 'T2' }] },
  { id: 'b1', t: 'table', header: true, rows: [['H1', 'H2'], ['1', '2']], caption: 'Tabel' },
  { id: 'b2', t: 'columns', ratio: '1-2', cols: [[{ id: 'c1', t: 'h', level: 3, text: 'Kiri', align: 'left' }, { id: 'c2', t: 'img', src: IMG, alt: '', size: 'wide' }], [{ id: 'c3', t: 'text', html: '<p>Kanan</p>' }, { id: 'c4', t: 'button', label: 'Dalam kolom', url: '#close', style: 'outline', align: 'left', full: false }]] },
  { id: 'b3', t: 'hr' },
  { id: 'b4', t: 'spacer', h: 30 },
  { id: 'b5', t: 'form', slug: 'daftar' },
];

(async () => {
  const br = await chromium.launch();

  /* ================= pop-up runtime ================= */
  let pg = await page(br, '/runtime.php');
  await pg.waitForFunction(() => window.ENPopups);
  await openPop(pg, POP(ALL));
  const sel = { title: '.enp-title', rich: '.enp-rich', fig: 'figure.enp-img', btn: 'a.enp-btn', list: '.enp-list', quote: 'blockquote.enp-quote', callout: '.enp-callout', faq: '.enp-faq details', card: '.enp-cards .enp-card', table: '.enp-tablewrap table', col: '.enp-cols .enp-col', hr: 'hr.enp-hr', spacer: '.enp-spacer', form: '.enp-form' };
  const want = { title: 1, rich: 2, fig: 2, btn: 3, list: 1, quote: 1, callout: 1, faq: 2, card: 2, table: 1, col: 2, hr: 1, spacer: 1, form: 1 };
  const got = {};
  for (const k of Object.keys(sel)) got[k] = await count(pg, k === 'rich' ? '.enp-box ' + sel[k] : '.enp-box ' + sel[k]);
  ok('R1 every block type of the article set renders in a pop-up (heading, text, image, button, list, quote, callout, FAQ, cards, table, columns, rule, spacer, form)', Object.keys(want).every(k => got[k] >= want[k]), got);
  ok('R2 columns: both columns render their blocks; a wide image inside a column is a normal image', (await pg.evaluate(() => { const c = document.querySelectorAll('.enp-cols .enp-col'); return c[0].textContent.includes('Kiri') && c[1].textContent.includes('Kanan') && c[1].querySelector('a.enp-btn') && c[0].querySelector('figure.enp-img-normal') && !c[0].querySelector('.enp-wide'); })));
  ok('R3 spacer is 30px tall, aligned heading is centred', (await pg.evaluate(() => document.querySelector('.enp-spacer').getBoundingClientRect().height)) === 30 && (await css(pg, '.enp-title', 'textAlign')) === 'center');
  ok('R4 the button inside a column closes the pop-up (#close)', await (async () => { await pg.click('.enp-cols a.enp-btn'); await pg.waitForTimeout(400); return (await count(pg, '.enp-box')) === 0; })());
  ok('R5 no console errors (the form block asks for a form that the test site does not have: one 404)', pg.logs.filter(l => !/404/.test(l)).length === 0, pg.logs);

  // widths
  const W = async (w) => { await openPop(pg, POP([{ id: 'w1', t: 'h', level: 2, text: 'W', align: 'left' }], { size: { width: w } })); return boxW(pg); };
  ok('R6 default width is 520px', near(await W(''), 520));
  ok('R7 640px', near(await W('640px'), 640));
  ok('R8 a bare old number is px', near(await W(700), 700));
  ok('R9 vh: 60vh at a 1000px high window = 600px', near(await W('60vh'), 600));
  ok('R10 rem: 30rem = 480px', near(await W('30rem'), 480));
  ok('R11 vmin: 50vmin = 500px', near(await W('50vmin'), 500));
  ok('R12 vw: 70vw = 952px', near(await W('70vw'), 952));
  ok('R13 an unreadable width falls back to 520px', near(await W('abc'), 520));
  ok('R14 a width wider than the screen is cut to the screen', (await W('2400px')) <= 1360);
  await pg.setViewportSize({ width: 390, height: 844 });
  ok('R15 phone: the default 520px box is no wider than the screen', (await W('')) <= 390 + 1, await boxW(pg));
  await pg.setViewportSize({ width: 1360, height: 1000 });

  // both audiences
  const aud = {};
  for (const a of ['kids', 'adult']) {
    await pg.evaluate(a => document.documentElement.setAttribute('data-audience', a), a);
    await openPop(pg, POP([{ id: 'u1', t: 'h', level: 2, text: 'U', align: 'left' }, { id: 'u2', t: 'button', label: 'Solid', url: '#close', style: 'solid', align: 'left', full: false }]));
    aud[a] = { box: await css(pg, '.enp-box', 'backgroundColor'), btn: await css(pg, 'a.enp-btn-solid', 'backgroundColor'), head: await css(pg, '.enp-title', 'color') };
  }
  ok('R16 Anak and Dewasa look different (box and button colours) and neither is transparent', aud.kids.box !== aud.adult.box && aud.kids.btn !== aud.adult.btn && !/rgba\(0, 0, 0, 0\)/.test(aud.kids.box + aud.adult.box + aud.kids.btn + aud.adult.btn), aud);
  await pg.evaluate(() => document.documentElement.setAttribute('data-audience', 'kids'));
  await openPop(pg, POP([{ id: 'x1', t: 'h', level: 2, text: 'Custom', align: 'left' }, { id: 'x2', t: 'button', label: 'B', url: '#close', style: 'solid', align: 'left', full: false }], { style: { theme: 'custom', bgType: 'solid', bg: '#102030', color: '#FFFFFF', accent: '#FF8800', radius: 10, padding: 30 } }));
  ok('R17 custom theme: background, text colour, accent button, radius', (await css(pg, '.enp-box', 'backgroundColor')) === 'rgb(16, 32, 48)' && (await css(pg, '.enp-title', 'color')) === 'rgb(255, 255, 255)' && (await css(pg, 'a.enp-btn-solid', 'backgroundColor')) === 'rgb(255, 136, 0)' && (await css(pg, '.enp-box', 'borderRadius')) === '10px', [await css(pg, '.enp-box', 'backgroundColor'), await css(pg, 'a.enp-btn-solid', 'backgroundColor')]);
  const tall = [];
  for (let i = 0; i < 12; i++) tall.push({ id: 'tl' + i, t: 'spacer', h: 120 });
  await openPop(pg, POP(tall));
  ok('R18 content taller than the screen stays inside the screen and scrolls', (await pg.evaluate(() => { const b = document.querySelector('.enp-box').getBoundingClientRect(); return b.height <= window.innerHeight + 1; })), await pg.evaluate(() => document.querySelector('.enp-box').getBoundingClientRect().height));
  await pg.context().close();

  /* ================= quiz result runtime ================= */
  const mountResult = async (pg, idx) => {
    await pg.waitForFunction(() => window.ENQuiz && window.__def);
    await pg.evaluate(async (idx) => {
      const m = document.getElementById('m'); m.textContent = '';
      const r = Object.values(window.__res)[idx];
      await ENQuiz.mount(m, 'placement', { def: window.__def, preview: true, submit() { return Promise.resolve({ ok: false }); }, result: r });
    }, idx);
    await pg.waitForSelector('.enq-result .enp-title');
    await pg.waitForTimeout(250);
  };
  const hostW = (pg) => pg.evaluate(() => { const e = Array.from(document.querySelectorAll('#m, #m *')).find(x => x.style.maxWidth); return e ? Math.round(e.getBoundingClientRect().width) : -1; });

  pg = await page(br, '/quiz-public.php');
  await mountResult(pg, 0);
  const txt = (s) => pg.evaluate(s => Array.from(document.querySelectorAll(s)).map(e => e.textContent.trim()), s);
  ok('Z1 the heading has the visitor name and level filled in by the server', (await txt('.enq-result .enp-title'))[0] === 'Budi, level Anda: Beginner', await txt('.enq-result .enp-title'));
  ok('Z2 top-level Skor card and Skor per bagian (2 sections) render', (await count(pg, '.enq-result > .enq-score')) === 1 && (await count(pg, '.enq-result > .enq-secs .enq-sec')) === 2, [await count(pg, '.enq-result > .enq-score'), await count(pg, '.enq-result > .enq-secs .enq-sec')]);
  ok('Z3 Skor and Skor per bagian also render INSIDE columns', (await count(pg, '.enp-cols .enq-score')) === 1 && (await count(pg, '.enp-cols .enq-secs .enq-sec')) === 2 && (await txt('.enp-cols .enq-secs-t'))[0] === 'Rincian', [await count(pg, '.enp-cols .enq-score'), await count(pg, '.enp-cols .enq-secs .enq-sec')]);
  ok('Z4 FAQ, callout, table and spacer of the article set work in a result, with variables filled in', (await txt('.enp-faq-t'))[0] === 'Tanya Budi' && (await txt('.enp-faq summary'))[0] === 'Level Beginner?' && (await txt('.enp-callout'))[0].includes('Program Starter') && (await txt('.enp-tablewrap tbody td')).join('|').length > 2 && (await pg.evaluate(() => document.querySelector('.enq-result .enp-spacer').getBoundingClientRect().height)) === 40, [await txt('.enp-faq-t'), await txt('.enp-callout'), await txt('.enp-tablewrap tbody td')]);
  ok('Z5 "Ulangi tes" is still offered below the result', (await txt('.enq-again button'))[0] === 'Ulangi tes');
  ok('Z6 no console errors on the result page', pg.logs.length === 0, pg.logs);
  ok('Z7 default result width is 520px', near(await hostW(pg), 520, 2), await hostW(pg));
  const kids = { btn: await css(pg, '.enq-result a.enp-btn-solid', 'backgroundColor'), score: await css(pg, '.enq-result .enq-score', 'backgroundColor') };
  await pg.context().close();

  pg = await page(br, '/quiz-public.php?a=adult');
  await mountResult(pg, 0);
  const adult = { btn: await css(pg, '.enq-result a.enp-btn-solid', 'backgroundColor'), score: await css(pg, '.enq-result .enq-score', 'backgroundColor') };
  ok('Z8 the result page follows Anak / Dewasa (button colour differs)', kids.btn !== adult.btn, [kids, adult]);
  await pg.context().close();

  for (const [w, px] of [['40rem', 640], ['700', 700], ['80vw', 1088], ['60vh', 600], ['50vmin', 500]]) {
    pg = await page(br, '/quiz-public.php?w=' + encodeURIComponent(w));
    await mountResult(pg, 0);
    ok('Z9 result width "' + w + '" = ' + px + 'px on the page', near(await hostW(pg), px, 2), await hostW(pg));
    await pg.context().close();
  }
  pg = await page(br, '/quiz-public.php?w=700px', { width: 390, height: 844 });
  await mountResult(pg, 1);
  ok('Z10 phone: a 700px result page is cut to the screen, columns stack, no sideways scroll', (await hostW(pg)) <= 390 && (await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)), [await hostW(pg), await pg.evaluate(() => document.documentElement.scrollWidth)]);
  await pg.context().close();

  pg = await page(br, '/quiz-public.php?w=640px', { width: 390, height: 844 });
  await mountResult(pg, 0);
  ok('Z11 phone: columns with a score card stack into one column', (await pg.evaluate(() => getComputedStyle(document.querySelector('.enp-cols')).gridTemplateColumns.split(' ').length)) === 1);
  await pg.context().close();

  await br.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n' + (results.length - failed.length) + ' / ' + results.length + ' checks passed');
  if (failed.length) { console.log('FAILED:\n' + failed.map(f => ' - ' + f.name).join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(2); });
