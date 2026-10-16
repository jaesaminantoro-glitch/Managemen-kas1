// ============================================================
//  TRANSLATION FIXER — Tanpa AI
//  100% offline, berbasis glosarium & aturan penggantian
// ============================================================

// ====== STATE ======
let glossary = []; // { id, from, to, mode, active }
let rules = [];    // { id, from, to, isRegex, active }
let lastStats = [];

// ====== STORAGE KEYS ======
const LS_GLOSSARY = "tfx_glossary";
const LS_RULES = "tfx_rules";

// ====== HELPERS ======
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function loadState() {
  try {
    glossary = JSON.parse(localStorage.getItem(LS_GLOSSARY) || "[]");
    rules = JSON.parse(localStorage.getItem(LS_RULES) || "[]");
  } catch {
    glossary = [];
    rules = [];
  }
}

function saveGlossary() {
  localStorage.setItem(LS_GLOSSARY, JSON.stringify(glossary));
}

function saveRules() {
  localStorage.setItem(LS_RULES, JSON.stringify(rules));
}

// ====== TAB SWITCHING ======
document.querySelectorAll(".main-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".main-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
    document.getElementById("panel-" + target).style.display = "block";
  });
});

// ============================================================
//                    GLOSARIUM
// ============================================================

const glossaryBody = document.getElementById("glossaryBody");
const glossaryEmpty = document.getElementById("glossaryEmpty");
const glossarySearch = document.getElementById("glossarySearch");

function renderGlossary() {
  const keyword = glossarySearch.value.trim().toLowerCase();
  const filtered = glossary.filter(
    (g) =>
      !keyword ||
      g.from.toLowerCase().includes(keyword) ||
      g.to.toLowerCase().includes(keyword)
  );

  glossaryBody.innerHTML = "";

  if (filtered.length === 0) {
    glossaryEmpty.style.display = "block";
    glossaryEmpty.textContent =
      glossary.length === 0
        ? "Belum ada istilah. Paste daftar di atas, atau klik + Tambah Manual."
        : "Tidak ada istilah yang cocok dengan pencarian.";
    return;
  }

  glossaryEmpty.style.display = "none";

  filtered.forEach((item) => {
    const tr = document.createElement("tr");

    // checkbox
    const tdCheck = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = item.active;
    cb.addEventListener("change", () => {
      item.active = cb.checked;
      saveGlossary();
    });
    tdCheck.appendChild(cb);

    // from
    const tdFrom = document.createElement("td");
    const inpFrom = document.createElement("input");
    inpFrom.type = "text";
    inpFrom.value = item.from;
    inpFrom.placeholder = "contoh: pelayan";
    inpFrom.addEventListener("input", () => {
      item.from = inpFrom.value;
      saveGlossary();
    });
    tdFrom.appendChild(inpFrom);

    // to
    const tdTo = document.createElement("td");
    const inpTo = document.createElement("input");
    inpTo.type = "text";
    inpTo.value = item.to;
    inpTo.placeholder = "contoh: server";
    inpTo.addEventListener("input", () => {
      item.to = inpTo.value;
      saveGlossary();
    });
    tdTo.appendChild(inpTo);

    // mode
    const tdMode = document.createElement("td");
    const sel = document.createElement("select");
    [
      { v: "exact", l: "Persis" },
      { v: "word", l: "Kata utuh" },
      { v: "regex", l: "Regex" },
    ].forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.v;
      o.textContent = opt.l;
      if (opt.v === item.mode) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      item.mode = sel.value;
      saveGlossary();
    });
    tdMode.appendChild(sel);

    // delete
    const tdDel = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "btn-icon";
    delBtn.textContent = "🗑️";
    delBtn.title = "Hapus";
    delBtn.addEventListener("click", () => {
      glossary = glossary.filter((g) => g.id !== item.id);
      saveGlossary();
      renderGlossary();
    });
    tdDel.appendChild(delBtn);

    tr.append(tdCheck, tdFrom, tdTo, tdMode, tdDel);
    glossaryBody.appendChild(tr);
  });
}

glossarySearch.addEventListener("input", renderGlossary);

document.getElementById("addGlossaryBtn").addEventListener("click", () => {
  glossary.unshift({
    id: uid(),
    from: "",
    to: "",
    mode: "word",
    active: true,
  });
  saveGlossary();
  renderGlossary();
  const firstInput = glossaryBody.querySelector("tr input[type='text']");
  if (firstInput) firstInput.focus();
});

// ============================================================
//          PASTE MASSAL (BULK PASTE)
// ============================================================

const bulkPaste = document.getElementById("bulkPaste");
const parseBulkBtn = document.getElementById("parseBulkBtn");
const clearBulkBtn = document.getElementById("clearBulkBtn");
const bulkPreview = document.getElementById("bulkPreview");

/**
 * Deteksi separator & pisahkan baris
 * Support: TAB (Excel), |, →, ,, ;, :, =
 */
function parseLine(line) {
  const separators = ["\t", "|", "→", ";", ",", " = ", ":"];
  for (const sep of separators) {
    if (line.includes(sep)) {
      const parts = line.split(sep).map((s) => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return { from: parts[0], to: parts[1] };
      }
    }
  }
  return null;
}

function parseBulkText(text) {
  const lines = text.split(/\r?\n/);
  const parsed = [];
  const skipped = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    if (
      idx === 0 &&
      (lower.includes("from") ||
        lower.includes("istilah salah") ||
        lower.includes("cari") ||
        lower.includes("salah"))
    ) {
      return;
    }

    const result = parseLine(trimmed);
    if (result) {
      parsed.push({
        id: uid(),
        from: result.from,
        to: result.to,
        mode: "word",
        active: true,
      });
    } else {
      skipped.push(trimmed);
    }
  });

  return { parsed, skipped };
}

parseBulkBtn.addEventListener("click", () => {
  const text = bulkPaste.value;
  if (!text.trim()) {
    alert("Belum ada teks yang ditempel. Copy dari Excel/Word lalu paste di kotak.");
    return;
  }

  const { parsed, skipped } = parseBulkText(text);

  if (parsed.length === 0) {
    alert(
      "Tidak ada istilah yang bisa diparse.\n\n" +
        "Format yang didukung:\n" +
        "  pelayan | server\n" +
        "  pelayan → server\n" +
        "  pelayan, server\n" +
        "  Atau copy langsung dari Excel (TAB)"
    );
    return;
  }

  let addedCount = 0;
  parsed.forEach((p) => {
    const dup = glossary.some(
      (g) => g.from.toLowerCase() === p.from.toLowerCase()
    );
    if (!dup) {
      glossary.unshift(p);
      addedCount++;
    }
  });

  saveGlossary();
  renderGlossary();

  bulkPreview.style.display = "block";
  let html = `<div class="preview-success">✅ <strong>${addedCount} istilah berhasil ditambahkan</strong>`;
  if (parsed.length - addedCount > 0) {
    html += ` <span style="color:#c33;">(${parsed.length - addedCount} duplikat di-skip)</span>`;
  }
  html += "</div>";

  if (skipped.length > 0) {
    html += `<div class="preview-warning">⚠️ <strong>${skipped.length} baris dilewati</strong> (format tidak dikenali):`;
    html += `<ul>${skipped.slice(0, 5).map((s) => `<li><code>${escapeHtml(s)}</code></li>`).join("")}`;
    if (skipped.length > 5) html += `<li>...dan ${skipped.length - 5} lainnya</li>`;
    html += `</ul></div>`;
  }

  html += `<div class="preview-list"><strong>Daftar yang ditambahkan:</strong><ul>`;
  parsed.slice(0, 10).forEach((p) => {
    if (glossary.some((g) => g.id === p.id)) {
      html += `<li><code>${escapeHtml(p.from)}</code> → <code>${escapeHtml(p.to)}</code></li>`;
    }
  });
  if (parsed.length > 10) html += `<li>...dan ${parsed.length - 10} lainnya</li>`;
  html += `</ul></div>`;

  bulkPreview.innerHTML = html;

  bulkPaste.value = "";
});

clearBulkBtn.addEventListener("click", () => {
  bulkPaste.value = "";
  bulkPreview.style.display = "none";
});

// ====== EXPORT GLOSARIUM ======
document.getElementById("exportGlossaryBtn").addEventListener("click", () => {
  if (glossary.length === 0) {
    alert("Glosarium masih kosong.");
    return;
  }
  const data = glossary.map(({ from, to, mode, active }) => ({ from, to, mode, active }));
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, "glosarium.json");
});

// ============================================================
//                    ATURAN GANTI
// ============================================================

const rulesBody = document.getElementById("rulesBody");
const rulesEmpty = document.getElementById("rulesEmpty");

function renderRules() {
  rulesBody.innerHTML = "";

  if (rules.length === 0) {
    rulesEmpty.style.display = "block";
    return;
  }
  rulesEmpty.style.display = "none";

  rules.forEach((item) => {
    const tr = document.createElement("tr");

    const tdCheck = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = item.active;
    cb.addEventListener("change", () => {
      item.active = cb.checked;
      saveRules();
    });
    tdCheck.appendChild(cb);

    const tdFrom = document.createElement("td");
    const inpFrom = document.createElement("input");
    inpFrom.type = "text";
    inpFrom.value = item.from;
    inpFrom.placeholder = "pola yang dicari";
    inpFrom.addEventListener("input", () => {
      item.from = inpFrom.value;
      saveRules();
    });
    tdFrom.appendChild(inpFrom);

    const tdTo = document.createElement("td");
    const inpTo = document.createElement("input");
    inpTo.type = "text";
    inpTo.value = item.to;
    inpTo.placeholder = "ganti dengan";
    inpTo.addEventListener("input", () => {
      item.to = inpTo.value;
      saveRules();
    });
    tdTo.appendChild(inpTo);

    const tdRegex = document.createElement("td");
    const cbRegex = document.createElement("input");
    cbRegex.type = "checkbox";
    cbRegex.checked = !!item.isRegex;
    cbRegex.addEventListener("change", () => {
      item.isRegex = cbRegex.checked;
      saveRules();
    });
    tdRegex.appendChild(cbRegex);

    const tdDel = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "btn-icon";
    delBtn.textContent = "🗑️";
    delBtn.addEventListener("click", () => {
      rules = rules.filter((r) => r.id !== item.id);
      saveRules();
      renderRules();
    });
    tdDel.appendChild(delBtn);

    tr.append(tdCheck, tdFrom, tdTo, tdRegex, tdDel);
    rulesBody.appendChild(tr);
  });
}

document.getElementById("addRuleBtn").addEventListener("click", () => {
  rules.unshift({
    id: uid(),
    from: "",
    to: "",
    isRegex: false,
    active: true,
  });
  saveRules();
  renderRules();
  const firstInput = rulesBody.querySelector("tr input[type='text']");
  if (firstInput) firstInput.focus();
});

// ============================================================
//          MESIN PERBAIKAN (CORE)
// ============================================================

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyRule(text, rule, stats, label) {
  if (!rule.active || !rule.from) return text;

  const { from, to, mode, isRegex } = rule;
  let regex;
  let counter = 0;

  try {
    if (isRegex || mode === "regex") {
      regex = new RegExp(from, "g");
    } else if (mode === "exact" || mode === undefined) {
      regex = new RegExp(escapeRegex(from), "g");
    } else {
      regex = new RegExp(`\\b${escapeRegex(from)}\\b`, "gi");
    }
  } catch (err) {
    return text;
  }

  const result = text.replace(regex, (match) => {
    counter++;
    return to;
  });

  if (counter > 0) {
    stats.push({
      label: label || "aturan",
      from,
      to,
      count: counter,
    });
  }

  return result;
}

function fixDocument(text) {
  const stats = [];
  let result = text;

  glossary.forEach((g) => {
    result = applyRule(result, g, stats, "glosarium");
  });

  rules.forEach((r) => {
    result = applyRule(result, r, stats, "aturan");
  });

  return { result, stats };
}

// ============================================================
//          PANEL PROSES DOKUMEN
// ============================================================

const inputText = document.getElementById("inputText");
const charCount = document.getElementById("charCount");
const applyBtn = document.getElementById("applyBtn");
const clearTextBtn = document.getElementById("clearTextBtn");
const resultSection = document.getElementById("resultSection");
const resultText = document.getElementById("resultText");
const diffInfo = document.getElementById("diffInfo");
const diffStats = document.getElementById("diffStats");
const toggleDiffBtn = document.getElementById("toggleDiffBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

inputText.addEventListener("input", () => {
  charCount.textContent = inputText.value.length;
});

clearTextBtn.addEventListener("click", () => {
  inputText.value = "";
  charCount.textContent = "0";
  resultSection.style.display = "none";
});

applyBtn.addEventListener("click", () => {
  const text = inputText.value;
  if (!text.trim()) {
    alert("Masukkan teks terlebih dahulu.");
    return;
  }

  const activeGlossary = glossary.filter((g) => g.active && g.from).length;
  const activeRules = rules.filter((r) => r.active && r.from).length;

  if (activeGlossary === 0 && activeRules === 0) {
    alert("Belum ada aturan aktif. Tambahkan istilah di tab 📚 Glosarium atau 🔧 Aturan Ganti.");
    return;
  }

  const { result, stats } = fixDocument(text);
  lastStats = stats;

  resultText.textContent = result;
  resultSection.style.display = "block";
  document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });

  highlightOn = false;
  toggleDiffBtn.textContent = "👁️ Tampilkan Perubahan";

  if (stats.length > 0) {
    diffStats.innerHTML = "";
    stats.forEach((s) => {
      const div = document.createElement("div");
      div.className = "diff-item";
      div.innerHTML = `
        <span><span class="from">${escapeHtml(s.from)}</span> → <span class="to">${escapeHtml(s.to)}</span></span>
        <span class="count">${s.count}×</span>
      `;
      diffStats.appendChild(div);
    });
    diffInfo.style.display = "block";
  } else {
    diffStats.innerHTML = "<p>Tidak ada perubahan yang terjadi. Coba cek apakah istilah di glosarium cocok dengan teks Anda.</p>";
    diffInfo.style.display = "block";
  }

  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ====== TOGGLE HIGHLIGHT ======
let highlightOn = false;
toggleDiffBtn.addEventListener("click", () => {
  highlightOn = !highlightOn;
  if (highlightOn) {
    const original = inputText.value;
    const { result } = fixDocument(original);
    let highlighted = escapeHtml(result);
    lastStats.forEach((s) => {
      if (!s.to) return;
      const esc = escapeRegex(escapeHtml(s.to));
      highlighted = highlighted.replace(
        new RegExp(esc, "g"),
        `<span class="highlight-change">${escapeHtml(s.to)}</span>`
      );
    });
    resultText.innerHTML = highlighted;
    toggleDiffBtn.textContent = "👁️ Sembunyikan Highlight";
  } else {
    resultText.textContent = lastStats.length ? fixDocument(inputText.value).result : inputText.value;
    toggleDiffBtn.textContent = "👁️ Tampilkan Perubahan";
  }
});

// ====== COPY & DOWNLOAD ======
copyBtn.addEventListener("click", async () => {
  const text = resultText.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "✅ Tersalin!";
    setTimeout(() => (copyBtn.textContent = "📋 Salin"), 1500);
  } catch {
    alert("Gagal menyalin.");
  }
});

downloadBtn.addEventListener("click", () => {
  const text = resultText.textContent;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, "hasil-perbaikan.txt");
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
//              CEK KONSISTENSI
// ============================================================

const checkerText = document.getElementById("checkerText");
const checkBtn = document.getElementById("checkBtn");
const checkerResult = document.getElementById("checkerResult");
const checkerResultBody = document.getElementById("checkerResultBody");

checkBtn.addEventListener("click", () => {
  const text = checkerText.value.trim();
  if (!text) {
    alert("Masukkan teks terlebih dahulu.");
    return;
  }

  const issues = [];

  glossary.forEach((g) => {
    if (!g.active || !g.from || !g.to) return;
    const re = new RegExp(`\\b${escapeRegex(g.from)}\\b`, "gi");
    const matches = text.match(re);
    if (matches && matches.length > 0) {
      issues.push({
        term: g.to,
        variants: [
          { text: g.from, count: matches.length, type: "salah" },
          { text: g.to, count: "-", type: "benar" },
        ],
        note: `Istilah "${g.from}" masih muncul ${matches.length}× dan seharusnya diganti jadi "${g.to}".`,
      });
    }
  });

  checkerResult.style.display = "block";
  checkerResultBody.innerHTML = "";

  if (issues.length === 0) {
    const div = document.createElement("div");
    div.className = "no-issue";
    div.textContent = "✅ Tidak ditemukan inkonsistensi. Semua istilah sudah sesuai dengan glosarium Anda.";
    checkerResultBody.appendChild(div);
  } else {
    issues.forEach((issue) => {
      const div = document.createElement("div");
      div.className = "inconsistency-item";
      div.innerHTML = `
        <div class="term">⚠️ ${escapeHtml(issue.term)}</div>
        <div style="margin-bottom:6px; font-size:0.85rem; color:#555;">${escapeHtml(issue.note)}</div>
        <div class="variants">
          ${issue.variants
            .map(
              (v) =>
                `<span class="variant" style="${v.type === "salah" ? "background:#fee;color:#c33;" : "background:#e8f5e9;color:#2e7d32;"}">
                  ${escapeHtml(v.text)} ${v.count !== "-" ? `(${v.count}×)` : ""}
                </span>`
            )
            .join("")}
        </div>
      `;
      checkerResultBody.appendChild(div);
    });
  }
});

// ============================================================
//              UTIL
// ============================================================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
//              INIT
// ============================================================

loadState();
renderGlossary();
renderRules();
