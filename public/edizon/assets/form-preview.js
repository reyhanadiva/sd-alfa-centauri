(function () {
  'use strict';
  var boot = JSON.parse(document.getElementById('boot').textContent);
  var def = boot.def, root = document.documentElement;
  root.setAttribute('data-audience', 'kids');
  var pop = document.getElementById('openpop'), mount = document.getElementById('mount');
  function draw() {
    if (!window.ENForms) { setTimeout(draw, 50); return; }
    if (boot.layout === 'popup') { pop.hidden = false; window.ENForms.close(); window.ENForms.open(def.slug, { def: def, preview: true }); }
    else { while (mount.firstChild) mount.removeChild(mount.firstChild); window.ENForms.mount(mount, def.slug, { def: def, preview: true }); }
  }
  pop.addEventListener('click', draw);
  Array.prototype.forEach.call(document.querySelectorAll('#aud a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      root.setAttribute('data-audience', a.getAttribute('data-set'));
      Array.prototype.forEach.call(document.querySelectorAll('#aud a'), function (x) { x.className = x === a ? 'on' : ''; });
      if (boot.layout === 'popup') draw();   // pada halaman, pengamat tema menggambar ulang sendiri
    });
  });
  window.addEventListener('load', draw);
})();
