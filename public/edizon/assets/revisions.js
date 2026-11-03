/* Riwayat versi untuk editor artikel, pop-up, dan kuis: daftar 30 versi terakhir, pratinjau, dan "Kembalikan".
   Mengembalikan hanya memuat isi lama ke editor sebagai perubahan yang BELUM disimpan; baru jadi versi baru dan tayang saat Simpan ditekan.
   Dipakai bersama: ED.revisions({ kind, getId, getState, keep, preview, apply }) mengembalikan { node, refresh }. */
(function () {
  'use strict';
  var E = window.ED, el = E.el;

  E.revisions = function (o) {
    var loaded = false, busy = false, pending = null; // pending: id of the version waiting for its "yes, restore"
    var msg = el('p', { class: 'rev-msg', role: 'status' });
    var ul = el('ul', { class: 'rev-list' });
    var count = el('small', { class: 'muted' });
    var keepNote = el('p', { class: 'muted rev-note' });
    var det = el('details', { class: 'rev', ontoggle: function () { if (det.open && !loaded) load(); } },
      el('summary', null, 'Riwayat versi ', count),
      el('div', { class: 'rev-body' }, keepNote, msg, ul));
    var node = el('section', { class: 'card rev-card' }, det);

    function say(t, bad) { msg.textContent = t || ''; msg.className = 'rev-msg' + (bad ? ' err' : ''); }
    function api(qs) {
      return fetch('revisions.php?' + qs, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return { ok: false, errors: ['Respons server tidak dikenali (status ' + r.status + ').'] }; }); });
    }
    function idq() { return 'kind=' + encodeURIComponent(o.kind) + '&id=' + encodeURIComponent(String(o.getId())); }

    function load() {
      if (!o.getId()) { count.textContent = ''; clear(); ul.appendChild(el('li', { class: 'rev-empty', text: 'Belum ada versi. Versi pertama tercatat saat Anda menyimpan.' })); return Promise.resolve(); }
      say('Memuat…');
      return api(idq()).then(function (j) {
        if (!j.ok) { say((j.errors || ['Riwayat tidak bisa dibaca.']).join(' '), true); return; }
        loaded = true; say('');
        draw(j.revs || [], j.keep || 30);
      }).catch(function () { say('Koneksi terputus. Riwayat tidak bisa dimuat.', true); });
    }
    function clear() { E.clear(ul); pending = null; }

    function draw(revs, keep) {
      clear();
      count.textContent = revs.length ? '(' + revs.length + ')' : '';
      keepNote.textContent = 'Yang disimpan: ' + keep + ' versi terakhir. Mengembalikan versi hanya memuatnya ke editor; klik Simpan agar menjadi versi tayang.' + (o.keepNote ? ' ' + o.keepNote : '');
      if (!revs.length) { ul.appendChild(el('li', { class: 'rev-empty', text: 'Belum ada versi. Versi pertama tercatat saat Anda menyimpan.' })); return; }
      revs.forEach(function (r, i) {
        var confirmBox = el('div', { class: 'rev-confirm', hidden: true });
        var restoreBtn = el('button', { type: 'button', class: 'btn ghost sm', 'data-act': 'restore', onclick: function () { ask(r, confirmBox); } }, 'Kembalikan');
        ul.appendChild(el('li', { class: 'rev-item', 'data-rev': String(r.id) },
          el('div', { class: 'rev-row' },
            el('div', { class: 'rev-meta' },
              el('strong', { text: r.at }), i === 0 ? el('span', { class: 'rev-badge', text: 'terakhir disimpan' }) : null,
              el('span', { class: 'muted', text: ' · ' + r.by }),
              el('div', { class: 'rev-sum' }, r.title ? el('span', { text: r.title + ' · ' }) : null, el('span', { class: 'muted', text: r.summary }))),
            el('div', { class: 'rev-act' },
              el('a', { class: 'btn ghost sm', href: o.preview(r.id), target: '_blank', rel: 'noopener', 'data-act': 'preview', title: 'Buka versi ini seperti tampilan sebenarnya (tidak mengubah apa pun)' }, 'Pratinjau'),
              restoreBtn)),
          confirmBox));
      });
    }

    // two steps instead of a browser dialog: "Kembalikan" asks, "Ya, kembalikan" does it
    function ask(r, box) {
      Array.prototype.forEach.call(ul.querySelectorAll('.rev-confirm'), function (b) { if (b !== box) b.hidden = true; });
      say('');
      E.clear(box); box.hidden = false; pending = r.id;
      box.appendChild(el('span', { text: E.dirty ? 'Perubahan yang belum disimpan akan diganti oleh versi ini. ' : 'Isi editor akan diganti oleh versi ini. ' }));
      box.appendChild(el('button', { type: 'button', class: 'btn sm', 'data-act': 'yes', onclick: function () { restore(r); } }, 'Ya, kembalikan'));
      box.appendChild(el('button', { type: 'button', class: 'btn ghost sm', 'data-act': 'no', onclick: function () { box.hidden = true; pending = null; } }, 'Batal'));
      var y = box.querySelector('[data-act=yes]'); if (y) y.focus();
    }

    function restore(r) {
      if (busy) return;
      busy = true; say('Memuat versi…');
      api(idq() + '&rev=' + encodeURIComponent(String(r.id))).then(function (j) {
        if (!j.ok || !j.data) { say((j.errors || ['Versi tidak bisa dimuat.']).join(' '), true); return; }
        var cur = o.getState(), merged = JSON.parse(JSON.stringify(j.data));
        (o.keep || []).forEach(function (k) { if (k in cur) merged[k] = JSON.parse(JSON.stringify(cur[k])); else delete merged[k]; });
        o.apply(merged);
        E.markDirty();
        pending = null;
        Array.prototype.forEach.call(ul.querySelectorAll('.rev-confirm'), function (b) { b.hidden = true; });
        say('Versi ' + r.at + ' sudah dimuat ke editor. Periksa isinya, lalu klik Simpan untuk menjadikannya versi tayang.');
      }).catch(function () { say('Koneksi terputus. Versi tidak bisa dimuat.', true); })
        .then(function () { busy = false; });
    }

    return {
      node: node,
      /** after a save: the new version is on top */
      refresh: function () { if (det.open || loaded) { loaded = false; if (det.open) load(); else count.textContent = ''; } },
    };
  };
})();
