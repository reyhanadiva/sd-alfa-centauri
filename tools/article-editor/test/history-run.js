/* eslint-disable */
// Browser checks for Phase 5 of the editor: undo / redo of the whole page, the outline ("Struktur"), keyboard moves between columns.
// Start the article harness first (npm run harness), then: node test/history-run.js
const { chromium } = require('playwright');
const BASE = process.env.HARNESS_URL || 'http://127.0.0.1:8099';
const URL = BASE + '/edizon/article.php';
const results = [];
const ok = (name, pass, extra) => { results.push({ name, pass: !!pass, extra }); console.log((pass ? 'PASS ' : 'FAIL ') + name + ((!pass || process.env.VERBOSE) && extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
const flat = (arr) => { const o = []; (function w(a, d) { a.forEach(b => { o.push(b.t + '@' + d); if (b.cols) b.cols.forEach(c => w(c, d + 1)); }); })(arr, 0); return o; };

const HOOK = () => {
  let real;
  Object.defineProperty(window, 'ArtEditor', { configurable: true, get() { return real; }, set(v) { real = v && Object.assign({}, v, { create(o) { const e = v.create(o); window.__ed = e; return e; } }); } });
  window.__viol = [];
  document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' | ' + e.blockedURI));
};
async function boot(br) {
  const ctx = await br.newContext({ viewport: { width: 1360, height: 1000 } });
  await ctx.addInitScript(HOOK);
  const pg = await ctx.newPage();
  pg.logs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') pg.logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => pg.logs.push('pageerror: ' + e.message));
  await pg.goto(URL);
  await pg.waitForSelector('.ae-root');
  await pg.evaluate(() => document.querySelector('.ae-section').scrollIntoView());
  return pg;
}
const blocks = (pg) => pg.evaluate(() => window.__ed.getBlocks());
const load = (pg, b, o) => pg.evaluate(([x, o]) => window.__ed.setBlocks(x, o), [b, o]);
const text = (html) => ({ t: 'text', html });
const H = (t) => ({ t: 'h', level: 2, text: t });
const colsBlock = (cols) => ({ t: 'columns', ratio: '1-1', cols });
const blk = (pg, i) => pg.locator('.ae-rootlist > .ae-blk').nth(i);
const settle = (pg) => pg.waitForTimeout(700); // longer than the 500 ms typing pause
const undoBtn = (pg) => pg.locator('.ae-hist button[aria-label="Urungkan perubahan terakhir"]');
const redoBtn = (pg) => pg.locator('.ae-hist button[aria-label="Ulangi perubahan yang diurungkan"]');
const texts = (d) => d.map(b => b.t === 'h' ? b.text : b.t);

(async () => {
  const br = await chromium.launch();
  let pg = await boot(br);

  /* ---------- U. undo / redo ---------- */
  await load(pg, [H('One'), H('Two'), H('Three')]);
  ok('U1 the undo and redo buttons start disabled on a freshly loaded page', await undoBtn(pg).isDisabled() && await redoBtn(pg).isDisabled());

  // delete a block, then undo / redo with the keyboard while no field has the focus
  await blk(pg, 1).hover();
  await blk(pg, 1).locator('> .ae-blk-bar [aria-label="Hapus"]').click();
  ok('U2 after a change the undo button is enabled and the redo button still disabled', !(await undoBtn(pg).isDisabled()) && await redoBtn(pg).isDisabled());
  await pg.keyboard.press('Control+z');
  let d = await blocks(pg);
  ok('U3 Ctrl+Z puts a deleted block back (focus on the page, not in a field)', texts(d).join() === 'One,Two,Three', texts(d));
  ok('U3b after undo the redo button is enabled and the undo button disabled again', !(await redoBtn(pg).isDisabled()) && await undoBtn(pg).isDisabled());
  await pg.keyboard.press('Control+y');
  d = await blocks(pg);
  ok('U4 Ctrl+Y redoes the deletion', texts(d).join() === 'One,Three', texts(d));
  await pg.keyboard.press('Control+Shift+z');
  d = await blocks(pg);
  ok('U4b Ctrl+Shift+Z does the same (nothing left to redo: unchanged)', texts(d).join() === 'One,Three', texts(d));
  await pg.keyboard.press('Control+z');
  await pg.keyboard.press('Control+Shift+z');
  d = await blocks(pg);
  ok('U4c Ctrl+Z then Ctrl+Shift+Z ends where it started', texts(d).join() === 'One,Three', texts(d));
  ok('U5 undo and redo mark the page as changed (the Save button stays meaningful)', await pg.evaluate(() => window.ED.dirty === true));

  // moving
  await load(pg, [H('A'), H('B'), H('C')]);
  await blk(pg, 0).hover();
  await blk(pg, 0).locator('> .ae-blk-bar [aria-label="Turunkan"]').click();
  await blk(pg, 1).hover();
  await blk(pg, 1).locator('> .ae-blk-bar [aria-label="Turunkan"]').click();
  d = await blocks(pg);
  ok('U6 two moves make two steps', texts(d).join() === 'B,C,A', texts(d));
  await undoBtn(pg).click();
  d = await blocks(pg);
  ok('U6b the undo button reverts only the last move', texts(d).join() === 'B,A,C', texts(d));
  await undoBtn(pg).click();
  d = await blocks(pg);
  ok('U6c a second click reverts the first move', texts(d).join() === 'A,B,C', texts(d));
  await redoBtn(pg).click(); await redoBtn(pg).click();
  d = await blocks(pg);
  ok('U6d the redo button replays both', texts(d).join() === 'B,C,A', texts(d));
  await undoBtn(pg).click();
  await blk(pg, 0).hover();
  await blk(pg, 0).locator('> .ae-blk-bar [aria-label="Gandakan"]').click();
  ok('U7 a new change after an undo ends the redo line', await redoBtn(pg).isDisabled(), texts(await blocks(pg)));

  // typing: grouped by pauses, and undone with the keyboard while the cursor is in the text
  await load(pg, [text('<p>Start</p>')]);
  const rte = pg.locator('.ae-rootlist .ae-rte').first();
  await rte.click();
  await pg.keyboard.press('End');
  await pg.keyboard.type(' first');
  await settle(pg);
  await pg.keyboard.type(' second');
  await settle(pg);
  d = await blocks(pg);
  ok('U8 typing is in the content', /Start first second/.test(d[0].html), d[0].html);
  await pg.keyboard.press('Control+z');
  d = await blocks(pg);
  ok('U8b Ctrl+Z inside the text removes the last typed group only', /Start first/.test(d[0].html) && !/second/.test(d[0].html), d[0].html);
  ok('U8c the cursor is back in the same text block after the undo', await pg.evaluate(() => !!document.activeElement && !!document.activeElement.closest('.ae-rte')));
  await pg.keyboard.press('Control+z');
  d = await blocks(pg);
  ok('U8d a second Ctrl+Z removes the first group', d[0].html === '<p>Start</p>', d[0].html);
  await pg.keyboard.press('Control+y');
  await pg.keyboard.press('Control+y');
  d = await blocks(pg);
  ok('U8e Ctrl+Y twice brings the typing back', /Start first second/.test(d[0].html), d[0].html);
  // undo straight after typing (the pause has not passed): the typing so far is one step
  await load(pg, [text('<p>Quick</p>')]);
  await pg.locator('.ae-rootlist .ae-rte').first().click();
  await pg.keyboard.press('End');
  await pg.keyboard.type(' burst');
  await pg.keyboard.press('Control+z');
  d = await blocks(pg);
  ok('U9 Ctrl+Z straight after typing (before the pause) undoes that typing', d[0].html === '<p>Quick</p>', d[0].html);

  // settings of a block
  await load(pg, [H('Level')]);
  await blk(pg, 0).hover();
  await blk(pg, 0).locator('> .ae-blk-bar .ae-blk-t').click();
  await pg.locator('.ae-setbox select').first().selectOption('3');
  await settle(pg);
  d = await blocks(pg);
  ok('U10 a setting change (heading level) is a step', d[0].level === 3, d[0]);
  await pg.keyboard.press('Control+z');
  d = await blocks(pg);
  ok('U10b Ctrl+Z reverts it, even with the focus in the settings select', d[0].level === 2, d[0]);

  // fields outside the canvas keep their own undo
  await load(pg, [H('Keep'), H('Me')]);
  const titleIn = pg.locator('input[placeholder="Judul artikel"]');
  await titleIn.fill('');
  await titleIn.click();
  await pg.keyboard.type('Hello title');
  await pg.keyboard.press('Control+z');
  const tv = await titleIn.inputValue();
  d = await blocks(pg);
  ok('U11 Ctrl+Z in the page\'s own title field is left to the browser, and the blocks are untouched', tv !== 'Hello title' && texts(d).join() === 'Keep,Me', [tv, texts(d)]);

  // the limit: 100 steps
  await load(pg, []);
  await pg.evaluate(() => { for (let i = 0; i < 105; i++) document.querySelector('.ae-tile[data-type=hr]').click(); });
  d = await blocks(pg);
  ok('U12 105 additions give 105 blocks', d.length === 105, d.length);
  const n = await pg.evaluate(() => { let c = 0; while (window.__ed.canUndo() && c < 300) { window.__ed.undo(); c++; } return c; });
  d = await blocks(pg);
  ok('U12b only the last 100 steps can be undone (5 blocks stay)', n === 100 && d.length === 5, [n, d.length]);
  const m = await pg.evaluate(() => { let c = 0; while (window.__ed.canRedo() && c < 300) { window.__ed.redo(); c++; } return c; });
  d = await blocks(pg);
  ok('U12c all 100 steps can be redone', m === 100 && d.length === 105, [m, d.length]);

  // setBlocks: a new content resets; keep adds a step
  await load(pg, [H('x')]);
  ok('U13 setBlocks with new content clears the history', !(await pg.evaluate(() => window.__ed.canUndo())));
  await load(pg, [H('x'), H('y')], { keep: true });
  ok('U13b setBlocks with keep adds one step', await pg.evaluate(() => window.__ed.canUndo()));
  await pg.evaluate(() => window.__ed.undo());
  d = await blocks(pg);
  ok('U13c ... and undo goes back to the earlier content', texts(d).join() === 'x', texts(d));
  await load(pg, await blocks(pg), { keep: true });
  ok('U13d keep with the same content adds nothing', !(await pg.evaluate(() => window.__ed.canUndo())));

  // selection is kept when the block still exists
  await load(pg, [H('S1'), H('S2')]);
  await blk(pg, 1).hover();
  await blk(pg, 1).locator('> .ae-blk-bar [aria-label="Gandakan"]').click();
  await pg.keyboard.press('Control+z');
  d = await blocks(pg);
  ok('U14 undoing a duplicate removes the copy', texts(d).join() === 'S1,S2', texts(d));

  // columns: undo restores nested content
  await load(pg, [colsBlock([[H('in1')], [H('in2')]])]);
  await pg.locator('.ae-col .ae-blk').first().hover();
  await pg.locator('.ae-col .ae-blk').first().locator('> .ae-blk-bar [aria-label="Hapus"]').click();
  await pg.keyboard.press('Control+z');
  d = await blocks(pg);
  ok('U15 undo restores a block deleted inside a column', d[0].cols[0].length === 1 && d[0].cols[0][0].text === 'in1' && d[0].cols[1].length === 1, JSON.stringify(d));
  ok('U16 no console errors and no policy violations in the undo checks', pg.logs.length === 0 && (await pg.evaluate(() => window.__viol)).length === 0, [pg.logs, await pg.evaluate(() => window.__viol)]);

  /* ---------- V. keyboard moves between columns ---------- */
  await load(pg, [H('Top'), colsBlock([[H('c1a'), H('c1b')], [H('c2a')]]), H('Bottom')]);
  const handle = (loc) => loc.locator('> .ae-blk-bar .ae-blk-h');
  let hb = pg.locator('.ae-col').first().locator('.ae-blk').nth(1);
  await hb.hover();
  await handle(hb).focus();
  await pg.keyboard.press('ArrowRight');
  d = await blocks(pg);
  ok('V1 ArrowRight on a handle moves the block to the next column (same position, clamped)', d[1].cols[0].length === 1 && d[1].cols[1].map(b => b.text).join() === 'c2a,c1b', JSON.stringify(d[1].cols));
  ok('V1b the handle keeps the focus', await pg.evaluate(() => document.activeElement && document.activeElement.classList.contains('ae-blk-h')));
  await pg.keyboard.press('ArrowRight');
  d = await blocks(pg);
  ok('V2 ArrowRight from the last column leaves the columns block (placed after it)', texts(d).join() === 'Top,columns,c1b,Bottom', texts(d));
  await pg.keyboard.press('ArrowRight');
  d = await blocks(pg);
  ok('V3 ArrowRight at the top level, next to nothing nestable, does nothing', texts(d).join() === 'Top,columns,c1b,Bottom', texts(d));
  await pg.keyboard.press('ArrowLeft');
  d = await blocks(pg);
  ok('V4 ArrowLeft puts it into the last column of the columns block before it', d[1].cols[1].map(b => b.text).join() === 'c2a,c1b', JSON.stringify(d[1].cols));
  hb = pg.locator('.ae-col').first().locator('.ae-blk').first();
  await hb.hover();
  await handle(hb).focus();
  await pg.keyboard.press('ArrowLeft');
  d = await blocks(pg);
  ok('V5 ArrowLeft from the first column leaves the columns block (placed before it)', texts(d).join() === 'Top,c1a,columns,Bottom', texts(d));
  await pg.keyboard.press('ArrowRight');
  d = await blocks(pg);
  ok('V6 ArrowRight puts it at the START of the first column of the columns block after it', d[1].t === 'columns' && d[1].cols[0][0].text === 'c1a', JSON.stringify(d[1]));
  // a columns block cannot be nested
  await load(pg, [colsBlock([[], []]), colsBlock([[], []])]);
  await blk(pg, 0).hover();
  await handle(blk(pg, 0)).focus();
  await pg.keyboard.press('ArrowRight');
  d = await blocks(pg);
  ok('V7 a columns block is never moved into another one', d.length === 2 && d[0].cols.every(c => c.length === 0) && d[1].cols.every(c => c.length === 0), JSON.stringify(d));
  await load(pg, [H('K'), colsBlock([[], []])]);
  await blk(pg, 0).hover();
  await handle(blk(pg, 0)).focus();
  await pg.keyboard.press('ArrowRight');
  await pg.keyboard.press('Control+z');
  d = await blocks(pg);
  ok('V8 a keyboard move into a column is one undo step', d.length === 2 && d[0].t === 'h' && d[1].cols[0].length === 0, JSON.stringify(d));

  /* ---------- W. outline ---------- */
  await load(pg, [H('Intro'), colsBlock([[text('<p>Left text</p>'), { t: 'quote', text: 'A quote', cite: '' }], []]), { t: 'hr' }]);
  const outBtn = pg.locator('.ae-outbtn');
  ok('W1 the outline is closed at first and the block bar is shown', await pg.locator('.ae-out').isHidden() && await pg.locator('.ae-pal').isVisible() && (await outBtn.getAttribute('aria-pressed')) === 'false');
  await outBtn.click();
  ok('W2 "Struktur" replaces the block bar with the outline', await pg.locator('.ae-out').isVisible() && await pg.locator('.ae-pal').isHidden() && (await outBtn.getAttribute('aria-pressed')) === 'true');
  const rows = await pg.locator('.ae-out .ae-ol-b').evaluateAll(a => a.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  ok('W3 every block is listed in order, columns nested, with a snippet of its text', rows.length === 5 && /^H Judul Intro/.test(rows[0]) && /Kolom 2 kolom/.test(rows[1]) && /Left text/.test(rows[2]) && /A quote/.test(rows[3]) && /Garis pemisah/.test(rows[4]), rows);
  const heads = await pg.locator('.ae-out .ae-ol-ch').allTextContents();
  ok('W3b the columns are labelled and an empty column says so', heads.join() === 'Kolom 1,Kolom 2' && (await pg.locator('.ae-out .ae-ol-empty').count()) === 1, heads);
  await pg.locator('.ae-out .ae-ol-b').nth(3).click();
  ok('W4 clicking a row selects that block on the canvas and in the outline', await pg.locator('.ae-rootlist .ae-blk-quote.is-sel').count() === 1 && (await pg.locator('.ae-out .ae-ol-b').nth(3).getAttribute('aria-current')) === 'true');
  ok('W4b the block settings still show the chosen block', /Kutipan/.test(await pg.locator('.ae-set-t').innerText()));
  await pg.locator('.ae-rootlist > .ae-blk-hr').click({ position: { x: 20, y: 6 } });
  ok('W5 choosing a block on the canvas marks its row', (await pg.locator('.ae-out .ae-ol-b').nth(4).getAttribute('aria-current')) === 'true' && (await pg.locator('.ae-out .ae-ol-b').nth(3).getAttribute('aria-current')) === 'false');
  // changes on the canvas refresh the outline
  await pg.evaluate(() => document.querySelector('.ae-tile[data-type=quote]').click());
  await pg.waitForTimeout(450);
  ok('W6 adding a block updates the outline', (await pg.locator('.ae-out .ae-ol-b').count()) === 6);
  // actions
  await pg.locator('.ae-out .ae-ol-i').first().locator('> .ae-ol-r [data-k=down]').click();
  d = await blocks(pg);
  ok('W7 the row\'s ▼ moves the block down (and the outline follows)', d[1].t === 'h' && d[0].t === 'columns' && /Intro/.test(await pg.locator('.ae-out .ae-ol-b').nth(3).innerText()), texts(d));
  await pg.locator('.ae-out .ae-ol-i').nth(1).locator('> .ae-ol-r [data-k=dup]').click();
  d = await blocks(pg);
  ok('W8 the row\'s ⧉ duplicates a block (here the text inside the first column)', d[0].cols[0].length === 3, JSON.stringify(d[0].cols.map(c => c.length)));
  await pg.locator('.ae-out .ae-ol-i').nth(1).locator('> .ae-ol-r [data-k=del]').click();
  d = await blocks(pg);
  ok('W9 the row\'s ✕ deletes a block', d[0].cols[0].length === 2, JSON.stringify(d[0].cols.map(c => c.length)));
  await pg.keyboard.press('Control+z');
  d = await blocks(pg);
  ok('W9b Ctrl+Z after an outline delete brings it back', d[0].cols[0].length === 3, JSON.stringify(d[0].cols.map(c => c.length)));
  // keyboard in the outline
  await load(pg, [H('A'), H('B'), colsBlock([[H('C')], []])]);
  const mains = pg.locator('.ae-out .ae-ol-b');
  await mains.nth(0).focus();
  await pg.keyboard.press('ArrowDown');
  ok('W10 ArrowDown moves the focus to the next row', await pg.evaluate(() => /B/.test(document.activeElement.innerText)));
  await pg.keyboard.press('End');
  ok('W10b End goes to the last row', await pg.evaluate(() => /C/.test(document.activeElement.innerText)));
  await pg.keyboard.press('Home');
  await pg.keyboard.press('Alt+ArrowDown');
  d = await blocks(pg);
  ok('W11 Alt+ArrowDown moves the block down, and the focus stays on its row', texts(d).slice(0, 2).join() === 'B,A' && await pg.evaluate(() => /A/.test(document.activeElement.innerText) && document.activeElement.classList.contains('ae-ol-b')), texts(d));
  await pg.keyboard.press('Alt+ArrowRight');
  d = await blocks(pg);
  ok('W12 Alt+ArrowRight moves a block into the columns block beside it', d[1].t === 'columns' && d[1].cols[0].map(b => b.text).join() === 'A,C', JSON.stringify(d));
  ok('W12b ... and the outline shows it under "Kolom 1"', await pg.evaluate(() => { const r = [...document.querySelectorAll('.ae-out .ae-ol-col')][0]; return !!r && /A/.test(r.innerText) && /C/.test(r.innerText); }));
  // closing
  await outBtn.click();
  ok('W13 the second click on "Struktur" brings the block bar back', await pg.locator('.ae-out').isHidden() && await pg.locator('.ae-pal').isVisible());
  // a collapsed dock opens when the outline is requested
  await pg.locator('.ae-collapse').click();
  ok('W14 (setup) the dock is collapsed', await pg.locator('#ae-dock-body').isHidden());
  await outBtn.click();
  ok('W14b asking for the outline opens a collapsed dock', await pg.locator('#ae-dock-body').isVisible() && await pg.locator('.ae-out').isVisible());
  await outBtn.click();
  ok('W15 no console errors and no policy violations in the outline checks', pg.logs.length === 0 && (await pg.evaluate(() => window.__viol)).length === 0, [pg.logs, await pg.evaluate(() => window.__viol)]);

  // phone width: nothing overflows with the outline open
  await pg.setViewportSize({ width: 390, height: 844 });
  await outBtn.click();
  const ov = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok('W16 at phone width the outline does not widen the page', ov.sw <= ov.cw + 1, ov);
  await pg.close();

  await br.close();
  const bad = results.filter(x => !x.pass);
  console.log('\n' + (results.length - bad.length) + ' / ' + results.length + ' checks passed');
  if (bad.length) { console.log('FAILED: ' + bad.map(x => x.name).join(' | ')); process.exit(1); }
})();
