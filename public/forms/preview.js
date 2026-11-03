/* Pratinjau formulir dari panel: definisi disisipkan di halaman (#enf-def), jadi draf pun bisa dilihat. Tidak ada data yang dikirim. */
(function () {
  'use strict';
  var def = JSON.parse(document.getElementById('enf-def').textContent);
  var root = document.documentElement;
  function ready(fn) { (function w() { window.ENForms ? fn() : setTimeout(w, 40); })(); }
  function drawPopup() { window.ENForms.close(); window.ENForms.open(def.slug, { def: def, preview: true }); }
  ready(function () {
    var m = document.querySelector('[data-enf-preview]');
    if (m) { window.ENForms.mount(m, def.slug, { def: def, preview: true }); return; }
    drawPopup();
    var reopen = document.getElementById('enf-reopen');
    if (reopen) reopen.addEventListener('click', drawPopup);
    Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (b) {
      b.addEventListener('click', function () {
        root.setAttribute('data-audience', b.getAttribute('data-set'));
        Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (x) { x.className = x === b ? 'on' : ''; });
        drawPopup();
      });
    });
  });
})();
