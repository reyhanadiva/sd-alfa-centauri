/* Pratinjau pop-up dari panel: definisi disisipkan di halaman (#enp-def), jadi draf pun terlihat. Pemicu otomatis tidak dijalankan. */
(function () {
  'use strict';
  var defEl = document.getElementById('enp-def');
  if (defEl) {                                   // di dalam iframe (bare)
    var def = JSON.parse(defEl.textContent);
    var show = function () { window.ENPopups.close(true); window.ENPopups.open(def.slug, { def: def, preview: true }); };
    window.__enpShow = show;
    window.__enpSet = function (a) { document.documentElement.setAttribute('data-audience', a); show(); };
    var go = function () { window.ENPopups ? show() : setTimeout(go, 40); };
    go();
    return;
  }
  var frame = document.getElementById('enp-frame');
  if (!frame) return;
  var stage = document.querySelector('.enp-stage');
  function call(fn, arg) { try { frame.contentWindow[fn](arg); } catch (e) { /* belum siap */ } }
  Array.prototype.forEach.call(document.querySelectorAll('[data-aud]'), function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-aud]'), function (x) { x.className = x === b ? 'on' : ''; });
      call('__enpSet', b.getAttribute('data-aud'));
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-dev]'), function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-dev]'), function (x) { x.className = x === b ? 'on' : ''; });
      stage.className = 'enp-stage' + (b.getAttribute('data-dev') === 'mobile' ? ' mobile' : '');
      setTimeout(function () { call('__enpShow'); }, 60);
    });
  });
  document.getElementById('enp-reopen').addEventListener('click', function () { call('__enpShow'); });
})();
