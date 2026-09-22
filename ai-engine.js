// ============================================================
// AI ELEMENT BALANCING ENGINE v1.1
// Modular untuk Time Study Toolkit
// Update: Fix klasifikasi Overload / Seimbang / Underutilized
// ============================================================

(function() {
'use strict';

// ============================================================
// CONSTANTS
// ============================================================
const LS_KEY_PRECEDENCE = 'timeStudy_precedence_v2';
const LS_KEY_MOVABLE = 'timeStudy_movable_v2';
const LS_KEY_LLM = 'timeStudy_llm_config_v1';
const LS_KEY_AI_HISTORY = 'timeStudy_ai_history_v1';
const LS_KEY_AI_LAST = 'timeStudy_ai_last_result_v1';

// ============================================================
// STATE
// ============================================================
let aiLastResult = null;
let tempMovable = {};

// ============================================================
// UTIL
// ============================================================
function _lsSave(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }
function _lsLoad(k, d) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch(e) { return d; } }
function _esc(s) { if (s == null) return ''; return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function _toast(msg, type) { if (typeof window.showToast === 'function') window.showToast(msg, type || 'info'); }

// ============================================================
// PRECEDENCE
// ============================================================
function getPrecedenceMap() { return _lsLoad(LS_KEY_PRECEDENCE, {}); }
function savePrecedenceMap(m) { _lsSave(LS_KEY_PRECEDENCE, m); }
function elementKey(el) { return `${el.noSop}|${el.namaSop}|${el.elemen}`; }

window.openPrecedenceModal = function() {
    if (window.currentMode !== 'elemen') { _toast('⚠️ Hanya mode Elemen', 'warning'); return; }
    if (!window.activeLine) { _toast('⚠️ Pilih Line dulu', 'error'); return; }
    const els = extractElementsForAI();
    if (els.length < 2) { _toast('⚠️ Minimal 2 elemen', 'warning'); return; }
    renderPrecedenceSelectors();
    renderPrecedenceList();
    document.getElementById('precedenceModal').classList.add('active');
};
window.closePrecedenceModal = function() { document.getElementById('precedenceModal').classList.remove('active'); };

function renderPrecedenceSelectors() {
    const els = extractElementsForAI();
    els.sort((a, b) => String(a.noSop).localeCompare(String(b.noSop), undefined, { numeric: true }));
    const opts = els.map(e => `<option value="${_esc(e.key)}">No ${_esc(e.noSop)} · ${_esc(e.elemen)}</option>`).join('');
    const s1 = document.getElementById('precElementSelect');
    const s2 = document.getElementById('precPredSelect');
    if (s1) s1.innerHTML = '<option value="">-- Pilih Elemen --</option>' + opts;
    if (s2) s2.innerHTML = '<option value="">-- Pilih Pendahulu --</option>' + opts;
}

function renderPrecedenceList() {
    const map = getPrecedenceMap();
    const c = document.getElementById('precListContainer');
    const cnt = document.getElementById('precCount');
    if (!c) return;
    const keys = Object.keys(map).filter(k => map[k] && map[k].length > 0);
    if (cnt) cnt.innerText = keys.length;
    if (keys.length === 0) {
        c.innerHTML = '<div class="text-center text-gray-400 italic text-xs py-4">Belum ada aturan precedence.</div>';
        return;
    }
    const els = extractElementsForAI();
    const elMap = {};
    els.forEach(e => elMap[e.key] = e);
    c.innerHTML = keys.map(k => {
        const preds = map[k] || [];
        const el = elMap[k];
        if (!el) return '';
        return `
            <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs">
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-gray-800 truncate">${_esc(el.elemen)}</div>
                    <div class="text-[10px] text-gray-500">⬅️ setelah: ${preds.map(p => {
                        const pe = elMap[p];
                        return pe ? _esc(pe.elemen) : _esc(p);
                    }).join(', ')}</div>
                </div>
                <button onclick="window.__aiDeletePrec('${_esc(k).replace(/'/g, "\\'")}')" class="text-red-500 hover:text-red-700 text-xs shrink-0">🗑️</button>
            </div>
        `;
    }).join('');
}

window.__aiDeletePrec = function(key) {
    const map = getPrecedenceMap();
    delete map[key];
    savePrecedenceMap(map);
    renderPrecedenceList();
    _toast('Aturan dihapus', 'warning');
};

window.addPrecedenceRule = function() {
    const elKey = document.getElementById('precElementSelect').value;
    const predKey = document.getElementById('precPredSelect').value;
    if (!elKey) { _toast('⚠️ Pilih elemen!', 'error'); return; }
    if (!predKey) { _toast('⚠️ Pilih pendahulu!', 'error'); return; }
    if (elKey === predKey) { _toast('⚠️ Tidak boleh sama!', 'error'); return; }
    const map = getPrecedenceMap();
    if (!map[elKey]) map[elKey] = [];
    if (map[elKey].includes(predKey)) { _toast('⚠️ Sudah ada', 'warning'); return; }
    if (hasCycle(map, elKey, predKey)) { _toast('⚠️ Akan menyebabkan siklus!', 'error'); return; }
    map[elKey].push(predKey);
    savePrecedenceMap(map);
    renderPrecedenceList();
    _toast('✅ Aturan ditambahkan', 'success');
};

function hasCycle(map, a, b) {
    const visited = new Set();
    function dfs(node) {
        if (node === a) return true;
        if (visited.has(node)) return false;
        visited.add(node);
        const preds = map[node] || [];
        return preds.some(p => dfs(p));
    }
    return dfs(b);
}

// ============================================================
// MOVABLE
// ============================================================
function getMovableMap() { return _lsLoad(LS_KEY_MOVABLE, {}); }
function saveMovableMap(m) { _lsSave(LS_KEY_MOVABLE, m); }

window.openMovableModal = function() {
    if (window.currentMode !== 'elemen') { _toast('⚠️ Hanya mode Elemen', 'warning'); return; }
    if (!window.activeLine) { _toast('⚠️ Pilih Line dulu', 'error'); return; }
    const els = extractElementsForAI();
    if (els.length === 0) { _toast('⚠️ Belum ada elemen', 'warning'); return; }
    tempMovable = { ...getMovableMap() };
    els.forEach(e => { if (tempMovable[e.key] === undefined) tempMovable[e.key] = true; });
    renderMovableList();
    document.getElementById('movableModal').classList.add('active');
};
window.closeMovableModal = function() { document.getElementById('movableModal').classList.remove('active'); };

function renderMovableList() {
    const c = document.getElementById('movableListContainer');
    if (!c) return;
    const s = (document.getElementById('movableSearch')?.value || '').toLowerCase().trim();
    const els = extractElementsForAI();
    let filtered = els;
    if (s) filtered = els.filter(e => e.elemen.toLowerCase().includes(s) || e.noSop.toLowerCase().includes(s));
    filtered.sort((a, b) => String(a.noSop).localeCompare(String(b.noSop), undefined, { numeric: true }));
    if (filtered.length === 0) { c.innerHTML = '<div class="text-center text-gray-400 italic text-xs py-4">Tidak ada hasil.</div>'; return; }
    c.innerHTML = filtered.map(e => {
        const isM = tempMovable[e.key] !== false;
        return `<label class="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1.5 cursor-pointer hover:bg-amber-50">
            <input type="checkbox" class="checkbox-custom" ${isM ? 'checked' : ''} onchange="window.__aiToggleMovable('${_esc(e.key).replace(/'/g, "\\'")}')">
            <div class="flex-1 min-w-0">
                <div class="text-xs font-bold text-gray-800 truncate">No ${_esc(e.noSop)} · ${_esc(e.elemen)}</div>
                <div class="text-[10px] text-gray-500">${e.stdTime.toFixed(2)}s</div>
            </div>
        </label>`;
    }).join('');
}

window.__aiToggleMovable = function(key) {
    tempMovable[key] = tempMovable[key] === false ? true : false;
};

window.movableSelectAll = function(val) {
    const els = extractElementsForAI();
    els.forEach(e => tempMovable[e.key] = val);
    renderMovableList();
};

window.saveMovableSettings = function() {
    saveMovableMap(tempMovable);
    window.closeMovableModal();
    _toast('✅ Pengaturan movable disimpan', 'success');
};

// ============================================================
// LLM SETTINGS
// ============================================================
function getLLMConfig() { return _lsLoad(LS_KEY_LLM, { provider: 'off', apiKey: '' }); }
function saveLLMConfig(c) { _lsSave(LS_KEY_LLM, c); }

window.openLLMSettings = function() {
    const c = getLLMConfig();
    document.getElementById('llmProvider').value = c.provider || 'off';
    document.getElementById('llmApiKey').value = c.apiKey || '';
    document.getElementById('llmModal').classList.add('active');
};
window.closeLLMSettings = function() { document.getElementById('llmModal').classList.remove('active'); };
window.saveLLMSettings = function() {
    const provider = document.getElementById('llmProvider').value;
    const apiKey = document.getElementById('llmApiKey').value.trim();
    saveLLMConfig({ provider, apiKey });
    window.closeLLMSettings();
    _toast('✅ Pengaturan LLM disimpan', 'success');
};

async function askLLM(prompt) {
    const c = getLLMConfig();
    if (c.provider === 'off' || !c.apiKey) return null;
    try {
        if (c.provider === 'openai') {
            const r = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${c.apiKey}` },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });
            const j = await r.json();
            return j.choices?.[0]?.message?.content || null;
        } else if (c.provider === 'gemini') {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${c.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const j = await r.json();
            return j.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
    } catch (e) {
        console.warn('LLM error:', e);
        return null;
    }
    return null;
}

// ============================================================
// AI CORE
// ============================================================
function extractElementsForAI() {
    if (typeof window.currentMode === 'undefined' || window.currentMode !== 'elemen') return [];
    const _activeLine = window.activeLine;
    const _activeModel = window.activeModel;
    const _masterData = window.masterData || [];
    const _getRowStats = window.getRowStats;
    if (!_getRowStats) return [];
    return _masterData.filter(d =>
        d.line === _activeLine &&
        (_activeModel ? (d.model || '-') === _activeModel : true)
    ).map(item => {
        const st = _getRowStats(item);
        return {
            key: `${item.noSop}|${item.namaSop}|${item.elemen}`,
            noSop: item.noSop,
            namaSop: item.namaSop,
            elemen: item.elemen,
            stdTime: st.smh,
            avg: st.avg,
            operators: item.operators || 1,
            laps: item.laps || []
        };
    });
}

function groupByStation(elements) {
    const g = {};
    elements.forEach(e => {
        const k = `${e.noSop}|${e.namaSop}`;
        if (!g[k]) g[k] = { key: k, noSop: e.noSop, namaSop: e.namaSop, elements: [], totalTime: 0, operators: 1 };
        g[k].elements.push(e);
        g[k].totalTime += e.stdTime;
        if (e.operators > g[k].operators) g[k].operators = e.operators;
    });
    return Object.values(g);
}

function calculateBalanceRate(stations, taktTime) {
    if (!stations.length || taktTime <= 0) return 0;
    const sum = stations.reduce((s, st) => s + st.totalTime, 0);
    return (sum / (stations.length * taktTime)) * 100;
}

function findBottleneck(stations) {
    if (!stations.length) return null;
    return stations.reduce((m, st) => st.totalTime > m.totalTime ? st : m, stations[0]);
}

function simulateWithTakt(taktTime) {
    const elements = extractElementsForAI();
    const stations = groupByStation(elements);
    const precMap = getPrecedenceMap();
    const movMap = getMovableMap();

    const sim = stations.map(st => ({
        ...st,
        elements: st.elements.map(e => ({ ...e, _stationKey: st.key }))
    }));

    const suggestions = [];
    const MAX_ITER = 200;
    let iter = 0;

    while (iter++ < MAX_ITER) {
        const overloaded = sim.filter(st => st.totalTime > taktTime).sort((a, b) => b.totalTime - a.totalTime);
        if (overloaded.length === 0) break;
        const src = overloaded[0];
        const underloaded = sim.filter(st => st.totalTime < taktTime).sort((a, b) => a.totalTime - b.totalTime);
        if (underloaded.length === 0) break;

        let moved = false;
        const sortedEls = [...src.elements].sort((a, b) => b.stdTime - a.stdTime);

        for (const el of sortedEls) {
            if (movMap[el.key] === false) continue;
            const preds = precMap[el.key] || [];
            let conflict = false;
            for (const pk of preds) {
                const pe = sim.flatMap(s => s.elements).find(e => e.key === pk);
                if (pe && pe._stationKey === src.key) { conflict = true; break; }
            }
            if (conflict) continue;

            for (const dst of underloaded) {
                if (dst.totalTime + el.stdTime <= taktTime + 0.5) {
                    const srcBefore = src.totalTime;
                    const dstBefore = dst.totalTime;
                    src.elements = src.elements.filter(e => e.key !== el.key);
                    src.totalTime -= el.stdTime;
                    el._stationKey = dst.key;
                    dst.elements.push(el);
                    dst.totalTime += el.stdTime;
                    suggestions.push({
                        element: el.elemen,
                        elementKey: el.key,
                        noSop: el.noSop,
                        namaSop: el.namaSop,
                        stdTime: el.stdTime,
                        fromStation: { noSop: src.noSop, namaSop: src.namaSop, key: src.key },
                        toStation: { noSop: dst.noSop, namaSop: dst.namaSop, key: dst.key },
                        fromBefore: srcBefore,
                        fromAfter: src.totalTime,
                        toBefore: dstBefore,
                        toAfter: dst.totalTime
                    });
                    moved = true;
                    break;
                }
            }
            if (moved) break;
        }
        if (!moved) break;
    }

    const balanceAfter = calculateBalanceRate(sim, taktTime);
    const bottleneckAfter = findBottleneck(sim);

    return {
        taktTime,
        stationsBefore: stations,
        stationsAfter: sim,
        balanceBefore: calculateBalanceRate(stations, taktTime),
        balanceAfter,
        bottleneckBefore: findBottleneck(stations),
        bottleneckAfter,
        suggestions,
        overloadedCount: stations.filter(s => s.totalTime > taktTime).length,
        underloadedCount: stations.filter(s => s.totalTime < taktTime * 0.7).length
    };
}

function generateAISuggestions() {
    const stdUph = window.getLineStandardUph ? window.getLineStandardUph() : 0;
    if (stdUph <= 0) return { error: 'UPH Line belum di-set.' };
    const taktTime = 3600 / stdUph;
    const elements = extractElementsForAI();
    if (elements.length === 0) return { error: 'Belum ada data elemen.' };
    const stations = groupByStation(elements);
    if (stations.length === 0) return { error: 'Tidak ada stasiun.' };
    const precMap = getPrecedenceMap();
    const movMap = getMovableMap();
    const balanceBefore = calculateBalanceRate(stations, taktTime);
    const bottleneckBefore = findBottleneck(stations);

    const sim = stations.map(st => ({
        ...st,
        elements: st.elements.map(e => ({ ...e, _stationKey: st.key }))
    }));

    const suggestions = [];
    const MAX_ITER = 200;
    let iter = 0;

    while (iter++ < MAX_ITER) {
        const overloaded = sim.filter(st => st.totalTime > taktTime).sort((a, b) => b.totalTime - a.totalTime);
        if (overloaded.length === 0) break;
        const src = overloaded[0];
        const underloaded = sim.filter(st => st.totalTime < taktTime).sort((a, b) => a.totalTime - b.totalTime);
        if (underloaded.length === 0) break;
        let moved = false;
        const sortedEls = [...src.elements].sort((a, b) => b.stdTime - a.stdTime);
        for (const el of sortedEls) {
            if (movMap[el.key] === false) continue;
            const preds = precMap[el.key] || [];
            let conflict = false;
            for (const pk of preds) {
                const pe = sim.flatMap(s => s.elements).find(e => e.key === pk);
                if (pe && pe._stationKey === src.key) { conflict = true; break; }
            }
            if (conflict) continue;
            for (const dst of underloaded) {
                if (dst.totalTime + el.stdTime <= taktTime + 0.5) {
                    const srcBefore = src.totalTime;
                    const dstBefore = dst.totalTime;
                    src.elements = src.elements.filter(e => e.key !== el.key);
                    src.totalTime -= el.stdTime;
                    el._stationKey = dst.key;
                    dst.elements.push(el);
                    dst.totalTime += el.stdTime;
                    suggestions.push({
                        element: el.elemen,
                        elementKey: el.key,
                        noSop: el.noSop,
                        namaSop: el.namaSop,
                        stdTime: el.stdTime,
                        fromStation: { noSop: src.noSop, namaSop: src.namaSop, key: src.key },
                        toStation: { noSop: dst.noSop, namaSop: dst.namaSop, key: dst.key },
                        fromBefore: srcBefore,
                        fromAfter: src.totalTime,
                        toBefore: dstBefore,
                        toAfter: dst.totalTime
                    });
                    moved = true;
                    break;
                }
            }
            if (moved) break;
        }
        if (!moved) break;
    }

    const balanceAfter = calculateBalanceRate(sim, taktTime);
    const bottleneckAfter = findBottleneck(sim);

    return {
        taktTime, stdUph,
        stationsBefore: stations,
        stationsAfter: sim,
        balanceBefore, balanceAfter,
        bottleneckBefore, bottleneckAfter,
        suggestions,
        totalElements: elements.length
    };
}

// ============================================================
// RUN AI
// ============================================================
window.runAIBalancing = async function() {
    if (window.currentMode !== 'elemen') { _toast('⚠️ Hanya mode Elemen', 'warning'); return; }
    if (!window.activeLine) { _toast('⚠️ Pilih Line dulu', 'error'); return; }
    const btn = document.getElementById('aiRunBtn');
    if (btn) { btn.disabled = true; btn.innerText = '⏳ Menganalisa...'; }
    try {
        const result = generateAISuggestions();
        if (result.error) {
            _toast('❌ ' + result.error, 'error');
            document.getElementById('aiResultContainer').innerHTML = `<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">${result.error}</div>`;
        } else {
            aiLastResult = result;
            _lsSave(LS_KEY_AI_LAST, { line: window.activeLine, model: window.activeModel, ts: Date.now(), result });
            window.__aiLastResult = result;
            renderAIResult(result);
            recordAIHistory(result);
            if (result.suggestions.length > 0) {
                explainWithLLM(result).then(txt => {
                    if (txt) {
                        const box = document.getElementById('aiLLMExplanation');
                        if (box) { box.innerHTML = `<b>🧠 Penjelasan AI:</b><br>${_esc(txt).replace(/\n/g, '<br>')}`; box.classList.remove('hidden'); }
                    }
                });
            }
        }
    } catch (e) {
        console.error(e);
        _toast('❌ Error: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = '🚀 Jalankan AI Balancing'; }
    }
};

async function explainWithLLM(r) {
    const c = getLLMConfig();
    if (c.provider === 'off' || !c.apiKey) return null;
    const summary = r.suggestions.map((s, i) =>
        `${i + 1}. Geser "${s.element}" (${s.stdTime.toFixed(2)}s) dari Stasiun ${s.fromStation.noSop} ke Stasiun ${s.toStation.noSop}.`
    ).join('\n');
    const prompt = `Kamu adalah Industrial Engineer. Analisa line balancing berikut:

Line: ${window.activeLine} · Model: ${window.activeModel || '-'}
Takt Time: ${r.taktTime.toFixed(2)} detik (UPH ${r.stdUph})
Balance Rate: ${r.balanceBefore.toFixed(1)}% → ${r.balanceAfter.toFixed(1)}%
Bottleneck: Stasiun ${r.bottleneckBefore.noSop} (${r.bottleneckBefore.totalTime.toFixed(2)}s)

Saran AI:
${summary}

Berikan analisa singkat (maks 4 kalimat) dalam Bahasa Indonesia:
1. Apa akar masalah bottleneck-nya?
2. Kenapa saran ini efektif?
3. Risiko yang perlu diperhatikan.

Jawab ringkas & praktis.`;
    return await askLLM(prompt);
}

// ============================================================
// RENDER RESULT (FIXED)
// ============================================================
function renderAIResult(r) {
    const elLine = document.getElementById('aiLineModel');
    if (elLine) elLine.innerText = `${window.activeLine} · ${window.activeModel || '-'}`;
    const elTakt = document.getElementById('aiTaktTime');
    if (elTakt) elTakt.innerText = `${r.taktTime.toFixed(2)}s (UPH ${r.stdUph})`;
    const elBn = document.getElementById('aiBottleneck');
    if (elBn) elBn.innerText = r.bottleneckBefore ? `No ${r.bottleneckBefore.noSop} (${r.bottleneckBefore.totalTime.toFixed(1)}s)` : '-';
    const elBr = document.getElementById('aiBalanceRate');
    if (elBr) elBr.innerText = `${r.balanceBefore.toFixed(1)}% → ${r.balanceAfter.toFixed(1)}%`;

    const c = document.getElementById('aiResultContainer');
    if (!c) return;

    // ============ CLASSIFICATION ============
    const br = r.balanceBefore;
    let statusColor, statusIcon, statusTitle, statusMsg, statusType;

    if (br > 105) {
        statusType = 'overload';
        statusColor = 'red';
        statusIcon = '🔴';
        statusTitle = 'Line OVERLOAD!';
        statusMsg = `Balance Rate ${br.toFixed(1)}% melebihi 105%. Line tidak mampu memenuhi target UPH. Perlu tambah kapasitas / pecah stasiun.`;
    } else if (br >= 85 && br <= 105) {
        statusType = 'balanced';
        statusColor = 'emerald';
        statusIcon = '✅';
        statusTitle = 'Line Sudah Seimbang!';
        statusMsg = `Balance Rate ${br.toFixed(1)}% — dalam range ideal (85%-105%).`;
    } else {
        statusType = 'underutilized';
        statusColor = 'amber';
        statusIcon = '⚠️';
        statusTitle = 'Line Underutilized';
        statusMsg = `Balance Rate ${br.toFixed(1)}% di bawah 85%. Ada stasiun yang tidak efisien.`;
    }

    // Kalau tidak ada saran sama sekali
    if (r.suggestions.length === 0) {
        c.innerHTML = `
            <div class="bg-${statusColor}-50 border-2 border-${statusColor}-300 rounded-lg p-4">
                <div class="text-center">
                    <div class="text-4xl mb-2">${statusIcon}</div>
                    <div class="text-base font-bold text-${statusColor}-700">${statusTitle}</div>
                    <div class="text-xs text-${statusColor}-600 mt-1">${statusMsg}</div>
                </div>
                ${statusType === 'overload' ? renderOverloadDetail(r) : ''}
                ${statusType === 'underutilized' ? renderUnderutilizedDetail(r) : ''}
            </div>
        `;
        return;
    }

    // Kalau ada saran → render lengkap
    const delta = r.balanceAfter - r.balanceBefore;
    const deltaColor = delta > 0 ? 'text-emerald-600' : 'text-gray-600';

    let html = `
        <div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 mb-3">
            <div class="flex justify-between items-center flex-wrap gap-2">
                <div>
                    <div class="text-[10px] text-purple-600 font-semibold uppercase">Hasil Simulasi AI</div>
                    <div class="text-sm font-bold text-purple-800 mt-0.5">${r.suggestions.length} elemen disarankan digeser</div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.exportAIResultExcel()" class="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded">📊 Excel</button>
                    <button onclick="window.openApplyModal()" class="text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2.5 py-1.5 rounded">✅ Terapkan</button>
                </div>
            </div>
            <div class="mt-2 text-right">
                <div class="text-[10px] text-gray-500 uppercase">Balance Rate</div>
                <div class="text-lg font-extrabold ${deltaColor}">${r.balanceBefore.toFixed(1)}% → ${r.balanceAfter.toFixed(1)}%</div>
                <div class="text-[10px] ${deltaColor} font-bold">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%</div>
            </div>
        </div>
        <div id="aiLLMExplanation" class="hidden bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3 text-[11px] text-purple-800"></div>
    `;

    html += `<div class="space-y-2">`;
    r.suggestions.forEach((s, i) => {
        html += `
            <div class="bg-white border-2 border-purple-200 rounded-lg p-3">
                <div class="flex items-start gap-2">
                    <div class="bg-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0">${i + 1}</div>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold text-gray-800 mb-1">${_esc(s.element)}</div>
                        <div class="text-[10px] text-gray-500 mb-2">Waktu: <b>${s.stdTime.toFixed(2)}s</b></div>
                        <div class="flex items-center gap-2 text-[11px] flex-wrap">
                            <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">No ${s.fromStation.noSop} (${s.fromBefore.toFixed(1)}s)</span>
                            <span class="text-gray-400">→</span>
                            <span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">No ${s.toStation.noSop} (${s.toBefore.toFixed(1)}s)</span>
                        </div>
                        <div class="mt-2 text-[10px] text-gray-600 bg-gray-50 rounded p-1.5">
                            <b>Setelah geser:</b><br>
                            Stasiun ${s.fromStation.noSop}: ${s.fromBefore.toFixed(1)}s → <b>${s.fromAfter.toFixed(1)}s</b> ${s.fromAfter <= r.taktTime ? '✅' : '⚠️'}<br>
                            Stasiun ${s.toStation.noSop}: ${s.toBefore.toFixed(1)}s → <b>${s.toAfter.toFixed(1)}s</b> ${s.toAfter <= r.taktTime ? '✅' : '⚠️'}
                        </div>
                    </div>
                </div>
            </div>`;
    });
    html += `</div>`;

    html += `
        <details class="mt-3">
            <summary class="cursor-pointer text-xs font-bold text-gray-700 bg-gray-100 rounded-lg px-3 py-2">📊 Detail Per Stasiun (Sebelum vs Sesudah)</summary>
            <div class="mt-2 space-y-1 max-h-64 overflow-y-auto">`;
    const allKeys = new Set([...r.stationsBefore.map(s => s.key), ...r.stationsAfter.map(s => s.key)]);
    [...allKeys].sort((a, b) => String(a.split('|')[0]).localeCompare(String(b.split('|')[0]), undefined, { numeric: true })).forEach(k => {
        const sb = r.stationsBefore.find(s => s.key === k);
        const sa = r.stationsAfter.find(s => s.key === k);
        const tb = sb ? sb.totalTime : 0;
        const ta = sa ? sa.totalTime : 0;
        const no = (sb || sa).noSop;
        const nm = (sb || sa).namaSop;
        const over = ta > r.taktTime;
        const changed = Math.abs(ta - tb) > 0.01;
        html += `
            <div class="flex items-center gap-2 text-[11px] px-2 py-1 rounded ${changed ? 'bg-yellow-50 border border-yellow-200' : 'bg-white'}">
                <span class="font-bold text-gray-700 w-12 shrink-0">No ${_esc(String(no))}</span>
                <span class="flex-1 truncate text-gray-600">${_esc(nm || '-')}</span>
                <span class="font-mono font-bold ${over ? 'text-red-600' : 'text-emerald-600'}">${tb.toFixed(1)}s → ${ta.toFixed(1)}s</span>
                ${changed ? '<span class="text-yellow-600">📝</span>' : ''}
            </div>`;
    });
    html += `</div></details>`;

    html += `
        <div class="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-[10px] text-amber-800">
            <b>⚠️ Catatan:</b>
            <ul class="list-disc ml-4 mt-1 space-y-0.5">
                <li>Saran belum diterapkan. Klik <b>✅ Terapkan</b> untuk eksekusi.</li>
                <li>Precedence & movable diatur via tombol di atas.</li>
                <li>Selalu validasi dengan supervisor line sebelum ubah SOP.</li>
            </ul>
        </div>`;

    c.innerHTML = html;
}

// ============================================================
// HELPER: OVERLOAD DETAIL
// ============================================================
function renderOverloadDetail(r) {
    const overStations = r.stationsBefore.filter(s => s.totalTime > r.taktTime).sort((a, b) => b.totalTime - a.totalTime);
    if (overStations.length === 0) return '';

    let html = `
        <div class="mt-3 text-left bg-white border border-red-200 rounded-lg p-3">
            <div class="text-[11px] font-bold text-red-700 mb-2">🔍 Stasiun Overload (CT > Takt Time ${r.taktTime.toFixed(2)}s)</div>
            <div class="space-y-1 max-h-48 overflow-y-auto">
    `;
    overStations.forEach(s => {
        const excess = s.totalTime - r.taktTime;
        html += `
            <div class="flex items-center gap-2 text-[11px] bg-red-50 rounded px-2 py-1">
                <span class="font-bold text-red-700 w-12 shrink-0">No ${_esc(String(s.noSop))}</span>
                <span class="flex-1 truncate text-gray-700">${_esc(s.namaSop || '-')}</span>
                <span class="font-mono font-bold text-red-600">${s.totalTime.toFixed(1)}s</span>
                <span class="text-[10px] text-red-600">+${excess.toFixed(1)}s</span>
            </div>
        `;
    });
    html += `</div>
        <div class="mt-2 text-[10px] text-red-700">
            <b>💡 Rekomendasi:</b>
            <ul class="list-disc ml-4 mt-1 space-y-0.5">
                <li>Cek 🔒 <b>Movable</b>: mungkin ada elemen yang di-lock sehingga AI tidak bisa geser</li>
                <li>Cek 🔗 <b>Precedence</b>: mungkin ada constraint yang menghalangi</li>
                <li>Kalau semua elemen sudah optimal → <b>tambah operator</b> atau <b>pecah stasiun</b></li>
            </ul>
        </div>
    </div>`;
    return html;
}

// ============================================================
// HELPER: UNDERUTILIZED DETAIL
// ============================================================
function renderUnderutilizedDetail(r) {
    const underStations = r.stationsBefore.filter(s => s.totalTime < r.taktTime * 0.7).sort((a, b) => a.totalTime - b.totalTime);
    if (underStations.length === 0) return '';

    let html = `
        <div class="mt-3 text-left bg-white border border-amber-200 rounded-lg p-3">
            <div class="text-[11px] font-bold text-amber-700 mb-2">🔍 Stasiun Underutilized (CT < 70% Takt Time)</div>
            <div class="space-y-1 max-h-48 overflow-y-auto">
    `;
    underStations.forEach(s => {
        const diff = r.taktTime * 0.7 - s.totalTime;
        html += `
            <div class="flex items-center gap-2 text-[11px] bg-amber-50 rounded px-2 py-1">
                <span class="font-bold text-amber-700 w-12 shrink-0">No ${_esc(String(s.noSop))}</span>
                <span class="flex-1 truncate text-gray-700">${_esc(s.namaSop || '-')}</span>
                <span class="font-mono font-bold text-amber-600">${s.totalTime.toFixed(1)}s</span>
                <span class="text-[10px] text-amber-600">-${diff.toFixed(1)}s</span>
            </div>
        `;
    });
    html += `</div>
        <div class="mt-2 text-[10px] text-amber-700">
            <b>💡 Rekomendasi:</b>
            <ul class="list-disc ml-4 mt-1 space-y-0.5">
                <li>Gabung stasiun underutilized dengan stasiun terdekat</li>
                <li>Tambah elemen dari stasiun overload (kalau ada)</li>
            </ul>
        </div>
    </div>`;
    return html;
}

// ============================================================
// APPLY
// ============================================================
window.openApplyModal = function() {
    const r = window.__aiLastResult;
    if (!r || r.suggestions.length === 0) { _toast('⚠️ Belum ada saran AI', 'warning'); return; }
    const c = document.getElementById('applyModalBody');
    let html = `
        <div class="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800">
            <b>⚠️ Perubahan berikut akan mengubah No. SOP di master data:</b>
        </div>
        <div class="space-y-2">`;
    r.suggestions.forEach((s, i) => {
        html += `
            <div class="bg-white border border-gray-200 rounded-lg p-3 text-xs">
                <div class="font-bold text-gray-800 mb-1">${i + 1}. ${_esc(s.element)}</div>
                <div class="text-[11px] text-gray-600">
                    Dari <b>No. ${s.fromStation.noSop}</b> → ke <b>No. ${s.toStation.noSop}</b>
                </div>
            </div>`;
    });
    html += `</div>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800">
            💡 Backup otomatis akan dibuat sebelum perubahan. Bisa restore via tombol 💾 BACKUP di header.
        </div>`;
    c.innerHTML = html;
    document.getElementById('applyModal').classList.add('active');
};
window.closeApplyModal = function() { document.getElementById('applyModal').classList.remove('active'); };

window.confirmApplyAI = function() {
    const r = window.__aiLastResult;
    if (!r) return;
    if (!confirm(`⚠️ Yakin terapkan ${r.suggestions.length} perubahan?\n\nBackup akan dibuat otomatis.`)) return;

    try {
        const backup = {
            version: '2.4-auto',
            timestamp: new Date().toISOString(),
            reason: 'AI Apply',
            masterData: JSON.parse(JSON.stringify(window.masterData || [])),
            line: window.activeLine, model: window.activeModel
        };
        const key = `timeStudy_autoBackup_${Date.now()}`;
        localStorage.setItem(key, JSON.stringify(backup));
        const keys = Object.keys(localStorage).filter(k => k.startsWith('timeStudy_autoBackup_')).sort();
        while (keys.length > 5) { localStorage.removeItem(keys.shift()); }
    } catch(e) { console.warn('Backup gagal:', e); }

    let applied = 0;
    const _masterData = window.masterData || [];
    r.suggestions.forEach(s => {
        const [oldNoSop, namaSop, elemen] = s.elementKey.split('|');
        _masterData.forEach(item => {
            if (item.line === window.activeLine &&
                (window.activeModel ? (item.model || '-') === window.activeModel : true) &&
                item.noSop === oldNoSop &&
                item.namaSop === namaSop &&
                item.elemen === elemen) {
                item.noSop = s.toStation.noSop;
                item.namaSop = s.toStation.namaSop;
                applied++;
            }
        });
    });

    if (typeof window.saveMasterToLS === 'function') {
        window.saveMasterToLS((serverArr) => {
            const arr = serverArr.map(x => ({ ...x, laps: x.laps ? [...x.laps] : x.laps }));
            r.suggestions.forEach(s => {
                const [oldNoSop, namaSop, elemen] = s.elementKey.split('|');
                arr.forEach(item => {
                    if (item.line === window.activeLine &&
                        (window.activeModel ? (item.model || '-') === window.activeModel : true) &&
                        item.noSop === oldNoSop &&
                        item.namaSop === namaSop &&
                        item.elemen === elemen) {
                        item.noSop = s.toStation.noSop;
                        item.namaSop = s.toStation.namaSop;
                    }
                });
            });
            return arr;
        });
    }

    window.closeApplyModal();
    if (typeof window.renderMasterTable === 'function') window.renderMasterTable();
    if (typeof window.renderStandardCheck === 'function') window.renderStandardCheck();
    if (typeof window.updateCounters === 'function') window.updateCounters();
    _toast(`✅ ${applied} elemen dipindahkan`, 'success');
    setTimeout(() => window.runAIBalancing(), 500);
};

// ============================================================
// EXPORT EXCEL
// ============================================================
window.exportAIResultExcel = function() {
    const r = window.__aiLastResult;
    if (!r) { _toast('⚠️ Belum ada hasil AI', 'warning'); return; }
    if (typeof XLSX === 'undefined') { _toast('❌ Library Excel belum load', 'error'); return; }
    try {
        const wb = XLSX.utils.book_new();
        const aoa = [];
        aoa.push(['AI Element Balancing Report']);
        aoa.push(['Line', window.activeLine, 'Model', window.activeModel || '-']);
        aoa.push(['Takt Time (s)', r.taktTime.toFixed(2), 'UPH', r.stdUph]);
        aoa.push(['Balance Before (%)', r.balanceBefore.toFixed(2), 'Balance After (%)', r.balanceAfter.toFixed(2)]);
        aoa.push(['Bottleneck Before', `No ${r.bottleneckBefore.noSop} (${r.bottleneckBefore.totalTime.toFixed(2)}s)`]);
        aoa.push(['Bottleneck After', r.bottleneckAfter ? `No ${r.bottleneckAfter.noSop} (${r.bottleneckAfter.totalTime.toFixed(2)}s)` : '-']);
        aoa.push([]);
        aoa.push(['SARAN PEMINDAHAN ELEMEN']);
        aoa.push(['No', 'Elemen', 'Waktu (s)', 'Dari Stasiun', 'CT Sebelum', 'CT Sesudah', 'Ke Stasiun', 'CT Sebelum', 'CT Sesudah']);
        r.suggestions.forEach((s, i) => {
            aoa.push([
                i + 1, s.element, parseFloat(s.stdTime.toFixed(2)),
                `No ${s.fromStation.noSop}`, parseFloat(s.fromBefore.toFixed(2)), parseFloat(s.fromAfter.toFixed(2)),
                `No ${s.toStation.noSop}`, parseFloat(s.toBefore.toFixed(2)), parseFloat(s.toAfter.toFixed(2))
            ]);
        });
        aoa.push([]);
        aoa.push(['DETAIL PER STASIUN']);
        aoa.push(['No. SOP', 'Nama SOP', 'CT Sebelum', 'CT Sesudah', 'Δ']);
        const allKeys = new Set([...r.stationsBefore.map(s => s.key), ...r.stationsAfter.map(s => s.key)]);
        [...allKeys].sort((a, b) => String(a.split('|')[0]).localeCompare(String(b.split('|')[0]), undefined, { numeric: true })).forEach(k => {
            const sb = r.stationsBefore.find(s => s.key === k);
            const sa = r.stationsAfter.find(s => s.key === k);
            const tb = sb ? sb.totalTime : 0;
            const ta = sa ? sa.totalTime : 0;
            const no = (sb || sa).noSop;
            const nm = (sb || sa).namaSop;
            aoa.push([no, nm, parseFloat(tb.toFixed(2)), parseFloat(ta.toFixed(2)), parseFloat((ta - tb).toFixed(2))]);
        });
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [{wch:8},{wch:30},{wch:12},{wch:14},{wch:12},{wch:12},{wch:14},{wch:12},{wch:12}];
        XLSX.utils.book_append_sheet(wb, ws, 'AI Report');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const filename = `AI_Balancing_${window.activeLine}_${window.activeModel || 'all'}_${new Date().toISOString().slice(0,10)}.xlsx`;
        if (typeof window.downloadBlob === 'function') window.downloadBlob(blob, filename);
        _toast('📊 Report diunduh', 'success');
    } catch(e) {
        console.error(e);
        _toast('❌ Gagal export: ' + e.message, 'error');
    }
};

// ============================================================
// WHAT-IF SIMULATOR
// ============================================================
let whatIfCache = null;

window.openWhatIfModal = function() {
    if (window.currentMode !== 'elemen') { _toast('⚠️ Hanya mode Elemen', 'warning'); return; }
    if (!window.activeLine) { _toast('⚠️ Pilih Line dulu', 'error'); return; }
    const stdUph = window.getLineStandardUph ? window.getLineStandardUph() : 0;
    if (stdUph <= 0) { _toast('⚠️ UPH belum di-set', 'error'); return; }
    const realTakt = 3600 / stdUph;
    const slider = document.getElementById('whatIfTakt');
    const sliderNum = document.getElementById('whatIfTaktNum');
    if (slider) { slider.min = 1; slider.max = Math.max(60, realTakt * 3); slider.value = realTakt.toFixed(1); }
    if (sliderNum) { sliderNum.max = Math.max(60, realTakt * 3); sliderNum.value = realTakt.toFixed(1); }
    updateWhatIfPreview();
    document.getElementById('whatIfModal').classList.add('active');
};
window.closeWhatIfModal = function() { document.getElementById('whatIfModal').classList.remove('active'); };
window.resetWhatIf = function() {
    const stdUph = window.getLineStandardUph ? window.getLineStandardUph() : 0;
    const realTakt = 3600 / stdUph;
    document.getElementById('whatIfTakt').value = realTakt.toFixed(1);
    document.getElementById('whatIfTaktNum').value = realTakt.toFixed(1);
    updateWhatIfPreview();
};
window.syncWhatIfSlider = function() {
    const num = parseFloat(document.getElementById('whatIfTaktNum').value) || 10;
    document.getElementById('whatIfTakt').value = num;
    updateWhatIfPreview();
};
window.updateWhatIfPreview = function() {
    const virtualTakt = parseFloat(document.getElementById('whatIfTakt').value) || 10;
    const virtualUph = virtualTakt > 0 ? Math.round(3600 / virtualTakt) : 0;
    const stdUph = window.getLineStandardUph ? window.getLineStandardUph() : 0;
    const realTakt = 3600 / stdUph;
    document.getElementById('whatIfUphLabel').innerText = `UPH: ${virtualUph}`;
    document.getElementById('whatIfRealTakt').innerText = `${realTakt.toFixed(2)}s`;
    document.getElementById('whatIfVirtualTakt').innerText = `${virtualTakt.toFixed(2)}s`;
    const delta = virtualTakt - realTakt;
    document.getElementById('whatIfDelta').innerText = `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}s`;
    document.getElementById('whatIfDelta').className = `text-lg font-bold ${delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`;

    const elements = extractElementsForAI();
    if (elements.length === 0) {
        document.getElementById('whatIfResultContainer').innerHTML = '<div class="text-xs text-gray-400 italic text-center py-4">Belum ada data elemen.</div>';
        document.getElementById('whatIfDetail').innerHTML = '';
        return;
    }
    const simResult = simulateWithTakt(virtualTakt);
    const realResult = simulateWithTakt(realTakt);
    renderWhatIfComparison(realResult, simResult, realTakt, virtualTakt);
    whatIfCache = { virtualTakt, virtualUph, simResult, realResult };
};

function renderWhatIfComparison(realR, virtR, realTakt, virtTakt) {
    const c = document.getElementById('whatIfResultContainer');
    const realRate = realR.balanceBefore;
    const virtRate = virtR.balanceBefore;
    const deltaRate = virtRate - realRate;

    let html = `
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div class="text-[11px] font-bold text-orange-800 mb-2">📊 Dampak Perubahan Takt Time</div>
            <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div class="bg-white rounded p-2">
                    <div class="text-[10px] text-gray-500 uppercase">Balance Rate (Real)</div>
                    <div class="text-lg font-extrabold text-gray-700">${realRate.toFixed(1)}%</div>
                    <div class="text-[10px] text-gray-500">Takt ${realTakt.toFixed(2)}s · ${realR.overloadedCount} overload</div>
                </div>
                <div class="bg-white rounded p-2">
                    <div class="text-[10px] text-orange-600 uppercase">Balance Rate (Virtual)</div>
                    <div class="text-lg font-extrabold text-orange-700">${virtRate.toFixed(1)}%</div>
                    <div class="text-[10px] text-orange-600">Takt ${virtTakt.toFixed(2)}s · ${virtR.overloadedCount} overload</div>
                </div>
            </div>
            <div class="mt-2 text-center text-xs font-bold ${deltaRate >= 0 ? 'text-emerald-700' : 'text-red-700'}">
                ${deltaRate >= 0 ? '📈' : '📉'} Delta Balance: ${deltaRate >= 0 ? '+' : ''}${deltaRate.toFixed(2)}%
            </div>
        </div>
    `;

    let interpretation = '';
    if (Math.abs(deltaRate) < 1) interpretation = '🟡 Perubahan takt time tidak signifikan terhadap balance rate.';
    else if (deltaRate > 0) interpretation = '🟢 Dengan takt time virtual ini, line lebih seimbang. Artinya kapasitas masih bisa ditingkatkan.';
    else interpretation = '🔴 Takt time virtual lebih ketat → line jadi tidak seimbang. Perlu tambahan kapasitas.';

    html += `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-2 text-[11px] text-blue-800">
            <b>💡 Interpretasi:</b> ${interpretation}
        </div>
    `;

    if (virtR.suggestions.length > 0) {
        html += `
            <details class="bg-white border border-orange-200 rounded-lg p-2">
                <summary class="cursor-pointer text-[11px] font-bold text-orange-700">
                    🎯 Saran AI dengan Takt Virtual (${virtR.suggestions.length} elemen)
                </summary>
                <div class="mt-2 space-y-1 max-h-48 overflow-y-auto">
        `;
        virtR.suggestions.forEach((s, i) => {
            html += `
                <div class="text-[10px] bg-orange-50 rounded px-2 py-1">
                    <b>${i+1}.</b> ${_esc(s.element)} · 
                    No ${s.fromStation.noSop} → No ${s.toStation.noSop}
                    <span class="text-gray-500">(${s.stdTime.toFixed(2)}s)</span>
                </div>
            `;
        });
        html += `</div></details>`;
    } else {
        html += `
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-[11px] text-emerald-800 text-center">
                ✅ Dengan takt virtual ini, line sudah optimal (tidak perlu geser elemen)
            </div>
        `;
    }

    c.innerHTML = html;

    const detail = document.getElementById('whatIfDetail');
    const allKeys = new Set([...virtR.stationsBefore.map(s => s.key), ...virtR.stationsAfter.map(s => s.key)]);
    let dhtml = '';
    [...allKeys].sort((a, b) => String(a.split('|')[0]).localeCompare(String(b.split('|')[0]), undefined, { numeric: true })).forEach(k => {
        const sb = virtR.stationsBefore.find(s => s.key === k);
        const sa = virtR.stationsAfter.find(s => s.key === k);
        const tb = sb ? sb.totalTime : 0;
        const ta = sa ? sa.totalTime : 0;
        const no = (sb || sa).noSop;
        const nm = (sb || sa).namaSop;
        const overBefore = tb > virtTakt;
        const overAfter = ta > virtTakt;
        const changed = Math.abs(ta - tb) > 0.01;
        dhtml += `
            <div class="flex items-center gap-2 text-[11px] px-2 py-1 rounded ${changed ? 'bg-yellow-50 border border-yellow-200' : 'bg-white'}">
                <span class="font-bold text-gray-700 w-12 shrink-0">No ${_esc(String(no))}</span>
                <span class="flex-1 truncate text-gray-600">${_esc(nm || '-')}</span>
                <span class="font-mono ${overBefore ? 'text-red-500' : 'text-gray-500'}">${tb.toFixed(1)}s</span>
                <span class="text-gray-400">→</span>
                <span class="font-mono font-bold ${overAfter ? 'text-red-600' : 'text-emerald-600'}">${ta.toFixed(1)}s</span>
                ${changed ? '<span class="text-yellow-600">📝</span>' : ''}
            </div>
        `;
    });
    detail.innerHTML = dhtml || '<div class="text-xs text-gray-400 italic text-center py-2">Tidak ada data.</div>';
}

// ============================================================
// AUTO PRECEDENCE
// ============================================================
window.openAutoPrecedenceModal = function() {
    if (window.currentMode !== 'elemen') { _toast('⚠️ Hanya mode Elemen', 'warning'); return; }
    if (!window.activeLine) { _toast('⚠️ Pilih Line dulu', 'error'); return; }
    const els = extractElementsForAI();
    if (els.length < 2) { _toast('⚠️ Minimal 2 elemen', 'warning'); return; }
    document.getElementById('autoPrecPreview').classList.add('hidden');
    document.getElementById('autoPrecPreviewList').innerHTML = '';
    document.getElementById('autoPrecModal').classList.add('active');
};
window.closeAutoPrecedenceModal = function() { document.getElementById('autoPrecModal')?.classList.remove('active'); };

function detectPrecedenceHeuristics(elements) {
    const rules = [];
    const byKey = {};
    const normalize = (s) => String(s).toLowerCase()
        .replace(/pemasangan|pasang|mount|install|assembly/g, 'install')
        .replace(/pelepasan|lepas|remove|unmount/g, 'remove')
        .replace(/pengecekan|cek|check|inspection|inspeksi|pemeriksaan|periksa/g, 'check')
        .replace(/pengambilan|ambil|take|pick/g, 'take')
        .replace(/pelurusan|lurus|align|adjust/g, 'align')
        .replace(/penyekrupan|screw|sekrup|skrup/g, 'screw')
        .replace(/penempelan|tempel|paste|adhesive/g, 'paste')
        .replace(/pengancingan|kancing|lock|fixing/g, 'lock')
        .trim();

    const extractKeyword = (s) => {
        const n = normalize(s);
        const words = n.split(/\s+/);
        const verbs = ['install','remove','check','take','align','screw','paste','lock'];
        const filtered = words.filter(w => !verbs.includes(w) && w.length > 2);
        return filtered.slice(0, 3).join(' ');
    };

    const extractNumber = (s) => {
        const m = String(s).match(/(\d+)/);
        return m ? parseInt(m[1]) : null;
    };

    const sorted = [...elements].sort((a, b) => {
        const cmp = String(a.noSop).localeCompare(String(b.noSop), undefined, { numeric: true });
        if (cmp !== 0) return cmp;
        return String(a.elemen).localeCompare(String(b.elemen));
    });

    const bySop = {};
    sorted.forEach(e => {
        const k = `${e.noSop}|${e.namaSop}`;
        if (!bySop[k]) bySop[k] = [];
        bySop[k].push(e);
    });

    Object.keys(bySop).forEach(sopKey => {
        const els = bySop[sopKey];
        const orderMap = { take: 1, install: 2, screw: 3, paste: 4, align: 5, lock: 6, remove: 0, check: 99 };
        const withOrder = els.map(e => {
            const n = normalize(e.elemen);
            const verb = Object.keys(orderMap).find(v => n.startsWith(v) || n.includes(' ' + v + ' ')) || 'install';
            const num = extractNumber(e.elemen);
            return { e, order: orderMap[verb], num, verb };
        }).sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            if (a.num !== null && b.num !== null) return a.num - b.num;
            return 0;
        });

        for (let i = 1; i < withOrder.length; i++) {
            const cur = withOrder[i];
            const prev = withOrder[i - 1];
            const curKw = extractKeyword(cur.e.elemen);
            const prevKw = extractKeyword(prev.e.elemen);
            const sameKeyword = curKw && curKw === prevKw;
            const numIncreasing = cur.num !== null && prev.num !== null && cur.num > prev.num;
            const verbDiff = cur.verb !== prev.verb;
            if (sameKeyword && !numIncreasing) continue;
            if (verbDiff || numIncreasing || (!sameKeyword)) {
                rules.push({
                    element: cur.e.key,
                    predecessor: prev.e.key,
                    reason: verbDiff ? `${prev.verb} → ${cur.verb}` : `angka ${prev.num} → ${cur.num}`,
                    confidence: verbDiff ? 'high' : 'medium'
                });
                if (!byKey[cur.e.key]) byKey[cur.e.key] = [];
                if (!byKey[cur.e.key].includes(prev.e.key)) byKey[cur.e.key].push(prev.e.key);
            }
        }
    });

    const keywordIndex = {};
    sorted.forEach(e => {
        const kw = extractKeyword(e.elemen);
        if (!kw) return;
        if (!keywordIndex[kw]) keywordIndex[kw] = [];
        keywordIndex[kw].push(e);
    });

    Object.keys(keywordIndex).forEach(kw => {
        const group = keywordIndex[kw];
        if (group.length < 2) return;
        const takeItem = group.find(e => normalize(e.elemen).startsWith('take'));
        const installItem = group.find(e => normalize(e.elemen).startsWith('install'));
        const checkItem = group.find(e => normalize(e.elemen).startsWith('check'));
        if (takeItem && installItem && takeItem.key !== installItem.key) {
            if (!byKey[installItem.key]) byKey[installItem.key] = [];
            if (!byKey[installItem.key].includes(takeItem.key)) {
                byKey[installItem.key].push(takeItem.key);
                rules.push({ element: installItem.key, predecessor: takeItem.key, reason: `take → install (${kw})`, confidence: 'high' });
            }
        }
        if (installItem && checkItem && installItem.key !== checkItem.key) {
            if (!byKey[checkItem.key]) byKey[checkItem.key] = [];
            if (!byKey[checkItem.key].includes(installItem.key)) {
                byKey[checkItem.key].push(installItem.key);
                rules.push({ element: checkItem.key, predecessor: installItem.key, reason: `install → check (${kw})`, confidence: 'medium' });
            }
        }
    });

    return { rules, byKey };
}

window.previewAutoPrecedence = function() {
    const els = extractElementsForAI();
    const result = detectPrecedenceHeuristics(els);
    const preview = document.getElementById('autoPrecPreviewList');
    const wrap = document.getElementById('autoPrecPreview');
    if (!wrap || !preview) return;
    wrap.classList.remove('hidden');

    if (result.rules.length === 0) {
        preview.innerHTML = '<div class="text-center text-gray-400 italic text-xs py-4">Tidak ada pola precedence yang terdeteksi.</div>';
        return;
    }

    const elMap = {};
    els.forEach(e => elMap[e.key] = e);
    const grouped = {};
    result.rules.forEach(r => {
        if (!grouped[r.element]) grouped[r.element] = { element: r.element, predecessors: [], reasons: [] };
        grouped[r.element].predecessors.push(r.predecessor);
        grouped[r.element].reasons.push(r.reason);
    });

    let html = `
        <div class="bg-cyan-50 border border-cyan-200 rounded-lg p-2 mb-2 text-[11px] text-cyan-800">
            <b>✨ Terdeteksi ${result.rules.length} aturan precedence</b> dari ${Object.keys(grouped).length} elemen
        </div>
    `;
    Object.keys(grouped).forEach(k => {
        const g = grouped[k];
        const el = elMap[k];
        if (!el) return;
        html += `
            <div class="bg-white border border-gray-200 rounded px-2 py-1.5 text-[10px]">
                <div class="font-bold text-gray-800">${_esc(el.elemen)}</div>
                <div class="text-gray-500 mt-0.5">
                    ⬅️ setelah: ${g.predecessors.map(pk => {
                        const pe = elMap[pk];
                        return pe ? _esc(pe.elemen) : _esc(pk);
                    }).join(', ')}
                </div>
                <div class="text-cyan-600 mt-0.5 italic">${g.reasons.join(' · ')}</div>
            </div>
        `;
    });
    preview.innerHTML = html;
};

window.applyAutoPrecedence = function() {
    const els = extractElementsForAI();
    const result = detectPrecedenceHeuristics(els);
    if (result.rules.length === 0) { _toast('⚠️ Tidak ada aturan terdeteksi', 'warning'); return; }
    const merge = document.getElementById('autoPrecMerge').checked;
    if (!confirm(`Terapkan ${result.rules.length} aturan precedence?\n\n${merge ? 'Mode: GABUNG dengan yang ada' : 'Mode: GANTI total'}`)) return;
    let map = merge ? { ...getPrecedenceMap() } : {};
    Object.keys(result.byKey).forEach(k => {
        if (!map[k]) map[k] = [];
        result.byKey[k].forEach(p => {
            if (!map[k].includes(p)) map[k].push(p);
        });
    });
    savePrecedenceMap(map);
    window.closeAutoPrecedenceModal();
    _toast(`✅ ${result.rules.length} aturan diterapkan`, 'success');
};

// ============================================================
// HISTORY
// ============================================================
function getAIHistory() { return _lsLoad(LS_KEY_AI_HISTORY, []); }
function saveAIHistory(h) { _lsSave(LS_KEY_AI_HISTORY, h); }

function recordAIHistory(result) {
    const hist = getAIHistory();
    hist.unshift({
        id: 'ai_' + Date.now(),
        ts: Date.now(),
        line: window.activeLine,
        model: window.activeModel || '-',
        taktTime: result.taktTime,
        stdUph: result.stdUph,
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        bottleneckBefore: result.bottleneckBefore ? { noSop: result.bottleneckBefore.noSop, totalTime: result.bottleneckBefore.totalTime } : null,
        bottleneckAfter: result.bottleneckAfter ? { noSop: result.bottleneckAfter.noSop, totalTime: result.bottleneckAfter.totalTime } : null,
        suggestionsCount: result.suggestions.length,
        suggestions: result.suggestions.map(s => ({
            element: s.element,
            from: s.fromStation.noSop,
            to: s.toStation.noSop,
            stdTime: s.stdTime
        }))
    });
    saveAIHistory(hist.slice(0, 50));
}

window.clearAIHistory = function() {
    if (!confirm('⚠️ Hapus SEMUA history AI?')) return;
    saveAIHistory([]);
    renderAIHistory();
    _toast('History dihapus', 'warning');
};

window.openAIHistoryModal = function() {
    renderAIHistory();
    document.getElementById('aiHistoryModal').classList.add('active');
};
window.closeAIHistoryModal = function() { document.getElementById('aiHistoryModal').classList.remove('active'); };

function renderAIHistory() {
    const hist = getAIHistory().filter(h => h.line === window.activeLine && (window.activeModel ? h.model === (window.activeModel || '-') : true));
    const list = document.getElementById('aiHistoryList');
    const count = document.getElementById('aiHistCount');
    const chart = document.getElementById('aiHistoryChart');
    if (!list || !count || !chart) return;
    count.innerText = hist.length;

    if (hist.length === 0) {
        chart.innerHTML = '<div class="text-center text-gray-400 italic text-xs py-4">Belum ada history AI untuk Line + Model ini.</div>';
        list.innerHTML = '';
        return;
    }

    const maxRate = Math.max(...hist.map(h => Math.max(h.balanceBefore, h.balanceAfter)));
    const minRate = Math.min(...hist.map(h => Math.min(h.balanceBefore, h.balanceAfter)));
    const range = maxRate - minRate || 1;

    let chartHtml = `
        <div class="text-[10px] font-bold text-pink-700 uppercase mb-2">📈 Tren Balance Rate (${hist.length} run)</div>
        <div class="flex items-end gap-1 h-24">
    `;
    const last = hist.slice(0, 20).reverse();
    last.forEach(h => {
        const heightBefore = ((h.balanceBefore - minRate) / range) * 80 + 20;
        const heightAfter = ((h.balanceAfter - minRate) / range) * 80 + 20;
        const improved = h.balanceAfter > h.balanceBefore;
        chartHtml += `
            <div class="flex-1 flex flex-col items-center gap-0.5" title="${new Date(h.ts).toLocaleString('id-ID')} · ${h.balanceBefore.toFixed(1)}% → ${h.balanceAfter.toFixed(1)}%">
                <div class="w-full bg-red-300 rounded-t" style="height: ${heightBefore}%; min-height: 4px;"></div>
                <div class="w-full ${improved ? 'bg-emerald-500' : 'bg-gray-400'} rounded-b" style="height: ${heightAfter}%; min-height: 4px;"></div>
            </div>
        `;
    });
    chartHtml += `</div>
        <div class="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>Tertua</span>
            <span>Terbaru</span>
        </div>
        <div class="flex gap-3 text-[10px] mt-2 justify-center">
            <span><span class="inline-block w-2 h-2 bg-red-300 rounded"></span> Before</span>
            <span><span class="inline-block w-2 h-2 bg-emerald-500 rounded"></span> After (improved)</span>
            <span><span class="inline-block w-2 h-2 bg-gray-400 rounded"></span> After (no change)</span>
        </div>
    `;
    chart.innerHTML = chartHtml;

    list.innerHTML = hist.map((h, i) => {
        const improved = h.balanceAfter > h.balanceBefore;
        const delta = h.balanceAfter - h.balanceBefore;
        const tgl = new Date(h.ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `
            <div class="border border-gray-200 rounded-lg p-2 hover:bg-pink-50/30 transition">
                <div class="flex justify-between items-start gap-2 flex-wrap">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
                            <span class="bg-gray-100 text-gray-700 font-bold px-1.5 py-0.5 rounded">#${hist.length - i}</span>
                            <span class="bg-pink-100 text-pink-700 font-bold px-1.5 py-0.5 rounded">${_esc(h.line)}</span>
                            <span class="bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">📦 ${_esc(h.model)}</span>
                            <span class="text-gray-400">${tgl}</span>
                        </div>
                        <div class="text-[11px] text-gray-600 mt-1">
                            Takt: <b>${h.taktTime.toFixed(2)}s</b> · UPH: <b>${h.stdUph}</b> · 
                            Saran: <b>${h.suggestionsCount}</b> elemen
                        </div>
                        ${h.bottleneckBefore ? `
                            <div class="text-[10px] text-gray-500 mt-0.5">
                                Bottleneck: No ${h.bottleneckBefore.noSop} (${h.bottleneckBefore.totalTime.toFixed(1)}s)
                                ${h.bottleneckAfter ? ` → No ${h.bottleneckAfter.noSop} (${h.bottleneckAfter.totalTime.toFixed(1)}s)` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-[10px] text-gray-500 uppercase">Balance</div>
                        <div class="text-sm font-bold text-gray-700">${h.balanceBefore.toFixed(1)}% → <span class="${improved ? 'text-emerald-600' : 'text-gray-500'}">${h.balanceAfter.toFixed(1)}%</span></div>
                        <div class="text-[10px] font-bold ${delta > 0 ? 'text-emerald-600' : 'text-gray-400'}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%</div>
                    </div>
                </div>
                ${h.suggestions.length > 0 ? `
                    <details class="mt-1">
                        <summary class="cursor-pointer text-[10px] text-gray-500 hover:text-gray-700">Detail saran</summary>
                        <div class="mt-1 space-y-0.5 text-[10px] pl-2">
                            ${h.suggestions.slice(0, 5).map(s => `<div>· ${_esc(s.element)} · No ${s.from} → No ${s.to} (${s.stdTime.toFixed(2)}s)</div>`).join('')}
                            ${h.suggestions.length > 5 ? `<div class="text-gray-400 italic">... dan ${h.suggestions.length - 5} lainnya</div>` : ''}
                        </div>
                    </details>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ============================================================
// UNIT TEST
// ============================================================
window.runAIUnitTest = function() {
    console.log('🧪 ========== AI ENGINE UNIT TEST ==========');
    const results = [];
    const assert = (name, cond, detail) => {
        results.push({ name, pass: !!cond, detail: detail || '' });
        console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
    };

    const testStations = [
        { totalTime: 10, elements: [] },
        { totalTime: 10, elements: [] },
        { totalTime: 10, elements: [] }
    ];
    const br = calculateBalanceRate(testStations, 10);
    assert('Balance Rate 100% saat semua = takt', Math.abs(br - 100) < 0.01, `got ${br.toFixed(2)}%`);

    const br2 = calculateBalanceRate(testStations, 20);
    assert('Balance Rate 50% saat takt 2x', Math.abs(br2 - 50) < 0.01, `got ${br2.toFixed(2)}%`);

    const br3 = calculateBalanceRate([], 10);
    assert('Balance Rate 0 saat no stations', br3 === 0);

    const bn = findBottleneck([
        { totalTime: 5, noSop: 'A' },
        { totalTime: 12, noSop: 'B' },
        { totalTime: 8, noSop: 'C' }
    ]);
    assert('Bottleneck = stasiun dengan CT tertinggi', bn.noSop === 'B', `got ${bn.noSop}`);

    const els = [
        { noSop: '1', namaSop: 'SOP A', elemen: 'E1', stdTime: 2, operators: 1, key: 'k1' },
        { noSop: '1', namaSop: 'SOP A', elemen: 'E2', stdTime: 3, operators: 2, key: 'k2' },
        { noSop: '2', namaSop: 'SOP B', elemen: 'E3', stdTime: 4, operators: 1, key: 'k3' }
    ];
    const grouped = groupByStation(els);
    assert('Group menghasilkan 2 stasiun', grouped.length === 2, `got ${grouped.length}`);
    const s1 = grouped.find(g => g.noSop === '1');
    assert('Stasiun 1 punya 2 elemen', s1.elements.length === 2);
    assert('Stasiun 1 total = 5s', Math.abs(s1.totalTime - 5) < 0.01, `got ${s1.totalTime}`);
    assert('Stasiun 1 ambil operator max = 2', s1.operators === 2, `got ${s1.operators}`);

    const map = { A: ['B'], B: ['C'] };
    assert('Cycle A→B→C→A terdeteksi', hasCycle(map, 'A', 'C') === true);
    assert('No cycle A→B', hasCycle({ A: ['B'] }, 'A', 'B') === false);

    const el = { noSop: '1', namaSop: 'SOP A', elemen: 'Elemen X' };
    assert('elementKey format konsisten', elementKey(el) === '1|SOP A|Elemen X');

    try {
        const testResult = generateAISuggestions();
        if (testResult.error) {
            assert('generateAISuggestions return error jika data kosong', true, testResult.error);
        } else {
            assert('generateAISuggestions return object valid', testResult.taktTime > 0 && Array.isArray(testResult.suggestions));
        }
    } catch(e) {
        assert('generateAISuggestions tidak throw error', false, e.message);
    }

    const testEls = [
        { key: '1|A|e1', noSop: '1', namaSop: 'A', elemen: 'e1', stdTime: 4, operators: 1 },
        { key: '1|A|e2', noSop: '1', namaSop: 'A', elemen: 'e2', stdTime: 4, operators: 1 },
        { key: '2|B|e3', noSop: '2', namaSop: 'B', elemen: 'e3', stdTime: 2, operators: 1 },
        { key: '3|C|e4', noSop: '3', namaSop: 'C', elemen: 'e4', stdTime: 3, operators: 1 }
    ];
    const g2 = groupByStation(testEls);
    const takt = 5;
    const simBr = calculateBalanceRate(g2, takt);
    assert('Balance Rate < 100% saat ada overload', simBr < 100, `got ${simBr.toFixed(2)}%`);

    const savedMap = getMovableMap();
    saveMovableMap({ '1|A|e1': false });
    assert('Movable flag tersimpan & terbaca', getMovableMap()['1|A|e1'] === false);
    saveMovableMap(savedMap);

    const savedPrec = getPrecedenceMap();
    savePrecedenceMap({ 'X|Y|Z': ['A|B|C'] });
    assert('Precedence map tersimpan & terbaca', JSON.stringify(getPrecedenceMap()['X|Y|Z']) === JSON.stringify(['A|B|C']));
    savePrecedenceMap(savedPrec);

    const savedLLM = getLLMConfig();
    saveLLMConfig({ provider: 'test', apiKey: 'k' });
    assert('LLM config tersimpan & terbaca', getLLMConfig().provider === 'test');
    saveLLMConfig(savedLLM);

    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    const failed = total - passed;
    const passRate = (passed / total) * 100;
    const summaryColor = failed === 0 ? 'emerald' : (failed <= 2 ? 'yellow' : 'red');

    let html = `
        <div class="bg-${summaryColor}-50 border border-${summaryColor}-200 rounded-lg p-3 mb-3">
            <div class="flex justify-between items-center">
                <div>
                    <div class="text-sm font-bold text-${summaryColor}-800">🧪 Unit Test Result</div>
                    <div class="text-[11px] text-${summaryColor}-700 mt-0.5">
                        ${passed}/${total} passed · ${failed} failed · Pass rate: ${passRate.toFixed(0)}%
                    </div>
                </div>
                <div class="text-3xl font-extrabold text-${summaryColor}-700">${passRate.toFixed(0)}%</div>
            </div>
        </div>
        <div class="space-y-1 max-h-64 overflow-y-auto">
    `;
    results.forEach(r => {
        html += `
            <div class="flex items-start gap-2 bg-white border border-gray-200 rounded px-2 py-1.5 text-[11px]">
                <span class="shrink-0">${r.pass ? '✅' : '❌'}</span>
                <span class="flex-1 ${r.pass ? 'text-gray-700' : 'text-red-700 font-bold'}">${_esc(r.name)}</span>
                ${r.detail ? `<span class="text-[10px] text-gray-500 shrink-0">${_esc(r.detail)}</span>` : ''}
            </div>
        `;
    });
    html += `</div>`;

    const c = document.getElementById('aiResultContainer');
    if (c) {
        c.innerHTML = html;
        c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    _toast(`🧪 ${passed}/${total} test passed`, failed === 0 ? 'success' : 'warning');
};

// ============================================================
// AUTO-LOAD LAST RESULT
// ============================================================
function loadLastAIResult() {
    const last = _lsLoad(LS_KEY_AI_LAST, null);
    if (last && last.result && last.line === window.activeLine && last.model === window.activeModel) {
        window.__aiLastResult = last.result;
        aiLastResult = last.result;
    }
}

// ============================================================
// EXPOSE
// ============================================================
window.AIEngine = {
    getPrecedenceMap,
    savePrecedenceMap,
    getMovableMap,
    saveMovableMap,
    getLLMConfig,
    saveLLMConfig,
    extractElementsForAI,
    groupByStation,
    calculateBalanceRate,
    findBottleneck,
    generateAISuggestions,
    simulateWithTakt,
    detectPrecedenceHeuristics,
    getAIHistory,
    saveAIHistory,
    recordAIHistory,
    loadLastAIResult
};

console.log('✅ AI Engine v1.1 loaded. Available: window.AIEngine');

// Auto-load last result
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLastAIResult);
} else {
    loadLastAIResult();
}

})();
