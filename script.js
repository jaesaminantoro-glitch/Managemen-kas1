(() => {
'use strict';
const $ = id => document.getElementById(id);
const KEY_G = 'tf_glossary_v2', KEY_R = 'tf_rules_v2';
const uid = () => Math.random().toString(36).slice(2, 10);
const stamp = (() => { let l = 0; return () => (l = Math.max(Date.now(), l + 1)); })();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const load = (k) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch { return []; } };
let glossary = load(KEY_G), rules = load(KEY_R);
let toastTimer, lastResult = '';

const counts = () => {
  $('glossaryCount').textContent = glossary.filter(g => g.wrong.trim()).length;
  $('rulesCount').textContent = rules.filter(r => r.find).length;
};
const saveLocal = () => { try { localStorage.setItem(KEY_G, JSON.stringify(glossary)); localStorage.setItem(KEY_R, JSON.stringify(rules)); } catch {} };
const save = () => { saveLocal(); counts(); cloudSave(); };
const toast = msg => {
  let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2600);
};
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); kids.forEach(k => e.append(k)); return e; };

/* ---------- Tabs ---------- */
document.querySelectorAll('.main-tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.main-tab').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tab-panel').forEach(p => p.hidden = p.id !== 'panel-' + b.dataset.tab);
});

/* ---------- Tabel (glosarium & aturan) ---------- */
const cell = (...k) => el('td', {}, ...k);
const check = (on, field) => { const c = el('input', { type: 'checkbox', checked: on }); c.dataset.f = field; return c; };
const text = (v, f, ph) => { const i = el('input', { type: 'text', value: v, placeholder: ph }); i.dataset.f = f; return i; };
const delBtn = () => el('button', { className: 'del', title: 'Hapus', textContent: '🗑️' });

function renderGlossary() {
  const q = $('glossarySearch').value.trim().toLowerCase(), body = $('glossaryBody');
  body.replaceChildren();
  glossary.forEach(g => {
    const tr = el('tr'); tr.dataset.id = g.id;
    if (q && !(g.wrong + ' ' + g.right).toLowerCase().includes(q)) tr.hidden = true;
    const sel = el('select'); sel.dataset.f = 'mode';
    [['word', 'Kata utuh'], ['partial', 'Sebagian kata'], ['exact', 'Persis (Aa)']].forEach(([v, l]) => sel.append(el('option', { value: v, textContent: l, selected: g.mode === v })));
    tr.append(cell(check(g.on, 'on')), cell(text(g.wrong, 'wrong', 'contoh: pelayan')), cell(text(g.right, 'right', 'contoh: server')), cell(sel), cell(delBtn()));
    body.append(tr);
  });
  $('glossaryEmpty').hidden = glossary.length > 0;
  counts();
}
function renderRules() {
  const body = $('rulesBody'); body.replaceChildren();
  rules.forEach(r => {
    const tr = el('tr'); tr.dataset.id = r.id;
    const f = text(r.find, 'find', 'cari...'); if (r.regex && !compile(r)) f.classList.add('invalid');
    tr.append(cell(check(r.on, 'on')), cell(f), cell(text(r.repl, 'repl', 'ganti dengan...')), cell(check(r.regex, 'regex')), cell(delBtn()));
    body.append(tr);
  });
  $('rulesEmpty').hidden = rules.length > 0;
  counts();
}
function wire(bodyId, list, rerender) {
  const body = $(bodyId);
  const item = t => list().find(x => x.id === t.closest('tr').dataset.id);
  const upd = t => {
    const it = item(t); if (!it || !t.dataset.f) return;
    it[t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value;
    if (bodyId === 'rulesBody') { const f = t.closest('tr').querySelector('[data-f=find]'); f.classList.toggle('invalid', !!it.regex && !compile(it)); }
    save();
  };
  body.addEventListener('input', e => { if (e.target.type === 'text') upd(e.target); });
  body.addEventListener('change', e => upd(e.target));
  body.addEventListener('click', e => {
    if (!e.target.closest('.del')) return;
    const id = e.target.closest('tr').dataset.id; const l = list(); l.splice(l.findIndex(x => x.id === id), 1); rerender(); save();
  });
}
wire('glossaryBody', () => glossary, renderGlossary);
wire('rulesBody', () => rules, renderRules);
$('glossarySearch').oninput = renderGlossary;

const showTab = n => document.querySelector(`.main-tab[data-tab="${n}"]`).click();
function submitGlossary() {
  const w = $('newWrong').value.trim(), r = $('newRight').value.trim(), fb = $('addFeedback');
  fb.hidden = false;
  if (!w || !r) { fb.style.background = '#fff4e0'; fb.textContent = 'Isi istilah salah dan istilah benar dulu.'; ($('newWrong').value.trim() ? $('newRight') : $('newWrong')).focus(); return; }
  const mode = $('newMode').value, ex = glossary.find(g => g.wrong.trim().toLowerCase() === w.toLowerCase());
  if (ex) { ex.right = r; ex.mode = mode; ex.on = true; } else glossary.unshift({ id: uid(), on: true, wrong: w, right: r, mode, ts: stamp() });
  $('glossarySearch').value = ''; renderGlossary(); save();
  fb.style.background = '#eaf6ee'; fb.textContent = `✅ ${ex ? 'Diperbarui' : 'Ditambahkan'}: ${w} → ${r}  (total ${glossary.length} istilah)`;
  $('newWrong').value = ''; $('newRight').value = ''; $('newWrong').focus();
}
$('submitGlossaryBtn').onclick = submitGlossary;
[$('newWrong'), $('newRight')].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitGlossary(); } }));
$('goAddBtn').onclick = () => { showTab('add'); $('newWrong').focus(); };
$('addRuleBtn').onclick = () => { rules.unshift({ id: uid(), on: true, find: '', repl: '', regex: false, ts: stamp() }); renderRules(); save(); $('rulesBody').querySelector('input[type=text]')?.focus(); };

/* ---------- Paste massal ---------- */
const SEPS = [/\t/, /\s*\|\s*/, /\s*(?:→|->|=>|⇒)\s*/, /\s*[,;]\s*/];
const unq = s => s.trim().replace(/^"(.*)"$/, '$1').trim();
$('parseBulkBtn').onclick = () => {
  let add = 0, upd = 0; const bad = [];
  $('bulkPaste').value.split(/\r?\n/).forEach(line => {
    if (!line.trim()) return;
    const sep = SEPS.find(s => s.test(line)), p = sep && line.split(sep);
    const w = p && unq(p[0]), r = p && unq(p[1] || '');
    if (!w || !r) { bad.push(line.trim()); return; }
    const ex = glossary.find(g => g.wrong.trim().toLowerCase() === w.toLowerCase());
    if (ex) { ex.right = r; upd++; } else { glossary.push({ id: uid(), on: true, wrong: w, right: r, mode: 'word', ts: stamp() }); add++; }
  });
  glossary = glossary.filter(g => g.wrong.trim() || g.right.trim());
  renderGlossary(); save();
  const pv = $('bulkPreview'); pv.hidden = false;
  pv.textContent = `✅ ${add} ditambahkan, ${upd} diperbarui` + (bad.length ? `, ${bad.length} baris dilewati (tidak ada pemisah / kosong): ${bad.slice(0, 3).join(' • ')}${bad.length > 3 ? '…' : ''}` : '.');
  pv.style.background = bad.length ? '#fff4e0' : '#eaf6ee';
  if (add + upd) $('bulkPaste').value = '';
};
$('clearBulkBtn').onclick = () => { $('bulkPaste').value = ''; $('bulkPreview').hidden = true; };
$('exportGlossaryBtn').onclick = () => {
  const rows = glossary.filter(g => g.wrong.trim() && g.right.trim());
  if (!rows.length) return toast('Glosarium masih kosong.');
  download('glosarium.txt', rows.map(g => `${g.wrong} | ${g.right}`).join('\n'));
};

/* ---------- Mesin penggantian ---------- */
const WB = ['(?<![\\p{L}\\p{N}_])', '(?![\\p{L}\\p{N}_])'];
const pat = g => { const s = esc(g.wrong.trim()).replace(/\s+/g, '\\s+'); return g.mode === 'partial' ? s : WB[0] + s + WB[1]; };
const activeGloss = () => {
  const seen = new Set();
  return glossary.filter(g => g.on && g.wrong.trim() && g.right.trim()).sort((a, b) => b.wrong.length - a.wrong.length)
    .filter(g => { const k = g.wrong.trim().toLowerCase() + g.mode; if (seen.has(k)) return false; seen.add(k); return true; });
};
function compile(r) {
  try {
    if (!r.regex) return new RegExp(esc(r.find), 'gu');
    const m = r.find.match(/^\/([\s\S]+)\/([a-z]*)$/);
    const flags = m ? [...new Set((m[2] + 'g').split(''))].join('') : 'g';
    return new RegExp(m ? m[1] : r.find, flags);
  } catch { return null; }
}
const expand = (m, s) => s.replace(/\$(\$|&|\d{1,2}|<[^>]+>)/g, (_, k) =>
  k === '$' ? '$' : k === '&' ? m[0] : k[0] === '<' ? (m.groups?.[k.slice(1, -1)] ?? '') : (m[+k] ?? ''));
function matchCase(m, g) {
  if (m === g.wrong.trim() || g.mode === 'exact') return g.right.trim();
  const r = g.right.trim();
  if (m.length > 1 && m === m.toUpperCase() && m !== m.toLowerCase()) return r.toUpperCase();
  if (m[0] !== m[0].toLowerCase() && g.wrong.trim()[0] === g.wrong.trim()[0].toLowerCase()) return r[0].toUpperCase() + r.slice(1);
  return r;
}
// ganti sambil melacak huruf mana yang berubah (mask '1' = hasil penggantian)
function sub(st, re, fn, onHit) {
  let out = '', mk = '', last = 0;
  for (const m of st.text.matchAll(re)) {
    if (!m[0].length) continue;
    const rep = fn(m); if (rep === null || rep === m[0]) continue;
    out += st.text.slice(last, m.index) + rep; mk += st.mask.slice(last, m.index) + '1'.repeat(rep.length);
    last = m.index + m[0].length; onHit(m);
  }
  st.text = out + st.text.slice(last); st.mask = mk + st.mask.slice(last);
}
function fix(input) {
  const st = { text: input, mask: '0'.repeat(input.length) }, stats = [], errors = [];
  const G = activeGloss();
  if (G.length) {
    const re = new RegExp(G.map(g => '(' + pat(g) + ')').join('|'), 'giu'), cnt = G.map(() => 0);
    sub(st, re, m => { const i = G.findIndex((_, k) => m[k + 1] !== undefined); const g = G[i];
      if (g.mode === 'exact' && m[0].replace(/\s+/g, ' ') !== g.wrong.trim().replace(/\s+/g, ' ')) return null;
      m.gi = i; return matchCase(m[0], g); }, m => cnt[m.gi]++);
    G.forEach((g, i) => cnt[i] && stats.push([`${g.wrong.trim()} → ${g.right.trim()}`, cnt[i]]));
  }
  rules.filter(r => r.on && r.find).forEach(r => {
    const re = compile(r); if (!re) return errors.push(r.find);
    let n = 0; const repl = r.regex ? r.repl.replace(/\\n/g, '\n').replace(/\\t/g, '\t') : r.repl;
    sub(st, re, m => r.regex ? expand(m, repl) : repl, () => n++);
    if (n) stats.push([`${r.find} → ${r.repl}`, n]);
  });
  return { ...st, stats, errors };
}

/* ---------- Perbaiki dokumen ---------- */
const input = $('inputText');
input.oninput = () => $('charCount').textContent = input.value.length.toLocaleString('id-ID');
$('applyBtn').onclick = () => {
  if (!input.value.trim()) return toast('Tempelkan teks dulu.');
  const r = fix(input.value); lastResult = r.text;
  const box = $('resultText'); box.replaceChildren();
  for (const m of r.mask.matchAll(/0+|1+/g)) {
    const s = r.text.slice(m.index, m.index + m[0].length);
    box.append(m[0][0] === '1' ? el('mark', { textContent: s }) : document.createTextNode(s));
  }
  const total = r.stats.reduce((a, s) => a + s[1], 0), ds = $('diffStats'); ds.replaceChildren();
  ds.append(el('p', { textContent: total ? `${total} penggantian dari ${r.stats.length} istilah/aturan.` : 'Tidak ada yang perlu diperbaiki.' }));
  const ul = el('ul'); r.stats.forEach(([k, n]) => ul.append(el('li', { textContent: `${k}: ${n}×` }))); ds.append(ul);
  if (r.errors.length) ds.append(el('p', { className: 'chk bad', textContent: 'Regex tidak valid, dilewati: ' + r.errors.join(', ') }));
  $('resultSection').hidden = false;
  $('resultSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (r.errors.length) toast('Ada aturan regex yang tidak valid.');
};
$('clearTextBtn').onclick = () => { input.value = ''; input.oninput(); $('resultSection').hidden = true; lastResult = ''; };
$('toggleDiffBtn').onclick = () => {
  const on = $('resultText').classList.toggle('show-diff');
  $('diffInfo').hidden = !on; $('toggleDiffBtn').textContent = on ? '🙈 Sembunyikan Perubahan' : '👁️ Tampilkan Perubahan';
};
$('copyBtn').onclick = async () => {
  try { await navigator.clipboard.writeText(lastResult); }
  catch { const t = el('textarea', { value: lastResult }); document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
  toast('Hasil disalin.');
};
function download(name, content) {
  const a = el('a', { href: URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })), download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('downloadBtn').onclick = () => download('hasil-perbaikan.txt', lastResult);

/* ---------- Cek konsistensi ---------- */
const count = (t, p, f = 'giu') => (t.match(new RegExp(p, f)) || []).length;
$('checkBtn').onclick = () => {
  const t = $('checkerText').value; if (!t.trim()) return toast('Tempelkan dokumen dulu.');
  const out = $('checkerResultBody'); out.replaceChildren();
  const add = (cls, msg) => out.append(el('div', { className: 'chk ' + cls, textContent: msg }));
  const G = glossary.filter(g => g.on && g.wrong.trim() && g.right.trim());
  const byWrong = {};
  G.forEach(g => (byWrong[g.wrong.trim().toLowerCase()] ||= new Set()).add(g.right.trim()));
  Object.entries(byWrong).forEach(([w, s]) => s.size > 1 && add('bad', `Konflik glosarium: "${w}" punya ${s.size} padanan (${[...s].join(', ')}).`));
  let issues = 0;
  G.forEach(g => {
    const w = count(t, pat(g), g.mode === 'exact' ? 'gu' : 'giu'), r = count(t, WB[0] + esc(g.right.trim()).replace(/\s+/g, '\\s+') + WB[1]);
    if (g.wrong.trim().toLowerCase() === g.right.trim().toLowerCase()) return;
    if (w && r) { issues++; add('warn', `Tidak konsisten: "${g.wrong}" muncul ${w}× dan "${g.right}" muncul ${r}×.`); }
    else if (w) { issues++; add('bad', `Belum diperbaiki: "${g.wrong}" muncul ${w}× (seharusnya "${g.right}").`); }
  });
  if (!G.length) add('warn', 'Glosarium masih kosong, tidak ada yang bisa dicek.');
  else if (!issues) add('ok', '✅ Semua istilah glosarium konsisten.');
  $('checkerResult').hidden = false;
};

/* ---------- Sinkron Firebase (Realtime Database, data bersama tanpa login) ---------- */
const withIds = o => Object.entries(o && typeof o === 'object' ? o : {}).filter(([, v]) => v && typeof v === 'object').map(([id, v]) => ({ ...v, id }));
const byTs = (a, b) => b.ts - a.ts;
const normG = a => a.filter(g => g && (g.wrong || g.right)).map(g => ({ id: g.id || uid(), on: g.on !== false, wrong: String(g.wrong || ''), right: String(g.right || ''), mode: ['word', 'partial', 'exact'].includes(g.mode) ? g.mode : 'word', ts: +g.ts || 0 }));
const normR = a => a.filter(Boolean).map(r => ({ id: r.id || uid(), on: r.on !== false, find: String(r.find || ''), repl: String(r.repl || ''), regex: !!r.regex, ts: +r.ts || 0 }));
const packG = g => ({ on: !!g.on, wrong: g.wrong, right: g.right, mode: g.mode, ts: g.ts });
const packR = r => ({ on: !!r.on, find: r.find, repl: r.repl, regex: !!r.regex, ts: r.ts });
const mapOf = (list, pack) => new Map(list.map(x => [x.id, JSON.stringify(pack(x))]));
const sig = (g, r) => JSON.stringify([[...mapOf(g, packG)].sort(), [...mapOf(r, packR)].sort()]);
const union = (remote, local, k) => { const s = new Set(remote.map(x => x[k].trim().toLowerCase())); return remote.concat(local.filter(x => !s.has(x[k].trim().toLowerCase()))); };
let cloudOk = false, applying = false, firstSnap = true, cloudTimer = null, pendingRemote = null;
let knownG = new Map(), knownR = new Map();   // kondisi terakhir yang diketahui di server (untuk menghitung selisih)
const status = t => $('syncStatus').textContent = t;
const editing = () => !!document.activeElement?.closest?.('.data-table');

function cloudSave() {
  if (!cloudOk || applying) return;
  clearTimeout(cloudTimer); status('☁️ Menyimpan…');
  cloudTimer = setTimeout(pushCloud, 800);
}
async function pushCloud() {
  clearTimeout(cloudTimer); cloudTimer = null;
  const paths = {};
  // Hanya kirim item yang berubah/dihapus, supaya edit orang lain tidak tertimpa
  const diff = (list, pack, known, node) => {
    const cur = mapOf(list, pack);
    cur.forEach((s, id) => { if (known.get(id) !== s) paths[`shared/${node}/${id}`] = JSON.parse(s); });
    known.forEach((s, id) => { if (!cur.has(id)) paths[`shared/${node}/${id}`] = null; });
  };
  diff(glossary, packG, knownG, 'glossary'); diff(rules, packR, knownR, 'rules');
  if (!Object.keys(paths).length) return status('☁️ Tersinkron · data bersama');
  try { await window.cloud.save(paths); status('☁️ Tersimpan di server · data bersama'); }
  catch (e) { status('⚠️ Gagal menyimpan ke server (' + (e.code || e.message) + '). Data tetap ada di browser.'); }
}
function applyData(g, r) {
  applying = true; glossary = g; rules = r;
  saveLocal(); renderGlossary(); renderRules(); applying = false;
}
function onRemote(remote) {
  const rg = normG(withIds(remote?.glossary)).sort(byTs), rr = normR(withIds(remote?.rules)).sort(byTs);
  if (firstSnap) {
    firstSnap = false;
    knownG = mapOf(rg, packG); knownR = mapOf(rr, packR);
    let first = true; try { first = localStorage.getItem('tf_synced_shared') !== '1'; } catch {}
    applyData(first ? union(rg, glossary, 'wrong') : rg, first ? union(rr, rules, 'find') : rr);   // pertama kali di perangkat ini: gabungkan data lokal
    try { localStorage.setItem('tf_synced_shared', '1'); } catch {}
    cloudOk = true;
    if (sig(glossary, rules) !== sig(rg, rr)) cloudSave(); else status('☁️ Tersinkron · data bersama');
    return;
  }
  if (cloudTimer) return;                                  // perubahan lokal belum terkirim
  if (editing()) { pendingRemote = remote ?? {}; return; } // jangan ganggu yang sedang mengetik
  knownG = mapOf(rg, packG); knownR = mapOf(rr, packR);
  if (sig(glossary, rules) === sig(rg, rr)) return;
  applyData(rg, rr); status('☁️ Diperbarui dari pengguna lain');
}
document.addEventListener('focusout', () => setTimeout(() => {
  if (pendingRemote && !editing() && !cloudTimer) { const p = pendingRemote; pendingRemote = null; onRemote(p); }
}, 0));
function initCloud() {
  status('☁️ Memuat dari server…');
  window.cloud.listen(onRemote, e => status('⚠️ Gagal memuat dari server (' + (e.code || e.message) + '). Cek aturan database dan DATABASE_URL.'));
}
if (window.cloud) initCloud(); else window.addEventListener('cloud-ready', initCloud, { once: true });
setTimeout(() => { if (!window.cloud) status('⚠️ Firebase tidak termuat (mungkin diblokir). Data disimpan di browser ini.'); }, 6000);

/* ---------- Init ---------- */
glossary = normG(glossary); rules = normR(rules);
renderGlossary(); renderRules();
})();
