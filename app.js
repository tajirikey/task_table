import { firebaseConfig } from "./config.js";

const FIREBASE_VER = "10.12.2";
const DEMO = !firebaseConfig.apiKey;

const DEFAULT_SETTINGS = {
  members: {
    a: { name: "夫", emoji: "👨", color: "#2f7bd6" },
    b: { name: "妻", emoji: "👩", color: "#e0577e" },
  },
};

const TASKS = {
  dinner: { icon: "🍳", label: "夕飯" },
  duty: { icon: "🏠", label: "在宅当番" },
  away: { icon: "🌙", label: "夜不在" },
};

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let settings = structuredClone(DEFAULT_SETTINGS);
let days = {}; // { "YYYY-MM-DD": {dinner, duty, away:[], memo} }
let viewMonth = new Date(); viewMonth.setDate(1);
let unwatchMonth = null;
let store = null;

/* =========================================================
 * Storage backends
 * ========================================================= */
function createDemoStore() {
  const KEY = "task_table_demo_v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());
  return {
    async signIn() {},
    async signOut() {},
    onAuth(cb) { cb({ email: "demo" }); },
    watchSettings(cb) { cb(load().settings || null); return () => {}; },
    async saveSettings(s) { const o = load(); o.settings = s; save(o); },
    watchRange(start, end, cb) {
      const fire = () => {
        const all = load().days || {};
        cb(Object.fromEntries(Object.entries(all).filter(([k]) => k >= start && k <= end)));
      };
      listeners.add(fire); fire();
      return () => listeners.delete(fire);
    },
    async saveDay(id, data) { const o = load(); o.days = o.days || {}; o.days[id] = data; save(o); emit(); },
    async deleteDay(id) { const o = load(); if (o.days) delete o.days[id]; save(o); emit(); },
  };
}

async function createFirebaseStore() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VER}`;
  const [{ initializeApp }, authMod, fs] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = fs.getFirestore(app);
  return {
    signIn: (email, pw) => authMod.signInWithEmailAndPassword(auth, email, pw),
    signOut: () => authMod.signOut(auth),
    onAuth: (cb) => authMod.onAuthStateChanged(auth, cb),
    watchSettings(cb) {
      return fs.onSnapshot(fs.doc(db, "settings", "main"),
        (snap) => cb(snap.exists() ? snap.data() : null),
        (err) => showError(err));
    },
    saveSettings: (s) => fs.setDoc(fs.doc(db, "settings", "main"), s),
    watchRange(start, end, cb) {
      const q = fs.query(fs.collection(db, "days"),
        fs.where(fs.documentId(), ">=", start),
        fs.where(fs.documentId(), "<=", end));
      return fs.onSnapshot(q, (snap) => {
        const out = {};
        snap.forEach((d) => { out[d.id] = d.data(); });
        cb(out);
      }, (err) => showError(err));
    },
    saveDay: (id, data) => fs.setDoc(fs.doc(db, "days", id), data),
    deleteDay: (id) => fs.deleteDoc(fs.doc(db, "days", id)),
  };
}

/* =========================================================
 * Helpers
 * ========================================================= */
function member(key) { return settings.members[key]; }

function bgFor(value) {
  if (value === "a" || value === "b") return member(value).color;
  if (value === "both") return `linear-gradient(90deg, ${member("a").color} 50%, ${member("b").color} 50%)`;
  return null;
}

function whoLabel(value, { short = false } = {}) {
  if (value === "a" || value === "b") { const m = member(value); return short ? m.emoji : `${m.emoji} ${m.name}`; }
  if (value === "both") return short ? `${member("a").emoji}${member("b").emoji}` : `${member("a").emoji}${member("b").emoji} ふたり`;
  if (value === "none") return short ? "—" : "なし";
  return "";
}

function pillHtml(task, value) {
  if (!value) return "";
  const bg = bgFor(value);
  const nm = value === "a" || value === "b" ? member(value).name : value === "both" ? "2人" : "なし";
  const emo = value === "a" || value === "b" ? member(value).emoji : value === "both" ? "👫" : "";
  const cls = bg ? "pill" : "pill none";
  const style = bg ? `style="background:${bg}"` : "";
  return `<span class="${cls}" ${style} title="${TASKS[task].label}：${esc(whoLabel(value))}">`
    + `<span class="ti">${TASKS[task].icon}</span>${esc(emo)}<span class="nm">${esc(nm)}</span></span>`;
}

function awayPillHtml(key) {
  const m = member(key);
  return `<span class="pill away" style="box-shadow: inset 4px 0 0 ${m.color}" title="夜不在：${esc(m.name)}">`
    + `<span class="ti">🌙</span>${esc(m.emoji)}<span class="nm">${esc(m.name)}</span></span>`;
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}
function showError(err) { console.error(err); toast("エラー：" + (err.code || err.message)); }

/* =========================================================
 * Render
 * ========================================================= */
function renderLegend() {
  const a = member("a"), b = member("b");
  $("#legend").innerHTML = `
    <span><i class="sw" style="background:${a.color}"></i>${esc(a.emoji)} ${esc(a.name)}</span>
    <span><i class="sw" style="background:${b.color}"></i>${esc(b.emoji)} ${esc(b.name)}</span>
    <span><i class="sw" style="background:linear-gradient(90deg,${a.color} 50%,${b.color} 50%)"></i>ふたり</span>
    <span>🍳 夕飯</span><span>🏠 在宅当番</span><span><i class="sw" style="background:#2d2f4a"></i>🌙 夜不在</span>`;
}

function renderToday() {
  const id = ymd(new Date());
  const d = days[id] || {};
  const now = new Date();
  const wd = "日月火水木金土"[now.getDay()];
  const item = (task, value) => {
    const bg = bgFor(value);
    const style = bg ? `style="background:${bg};color:#fff"` : "";
    return `<span class="t-item" ${style}>${TASKS[task].icon} ${TASKS[task].label}：<b>${esc(whoLabel(value) || "未定")}</b></span>`;
  };
  const away = (d.away || []).map((k) => `${member(k).emoji} ${member(k).name}`).join("・");
  $("#today-card").innerHTML = `
    <div class="t-head">今日 ${now.getMonth() + 1}/${now.getDate()}（${wd}）</div>
    <div class="t-rows">
      ${item("dinner", d.dinner)}
      ${item("duty", d.duty)}
      <span class="t-item" ${away ? 'style="background:#2d2f4a;color:#fff"' : ""}>🌙 夜不在：<b>${esc(away || "なし")}</b></span>
    </div>
    ${d.memo ? `<div style="font-size:13px;color:var(--muted)">📝 ${esc(d.memo)}</div>` : ""}`;
}

function gridRange() {
  const first = new Date(viewMonth);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const end = new Date(last); end.setDate(last.getDate() + (6 - last.getDay()));
  return { start, end };
}

function renderCalendar() {
  $("#month-label").textContent = `${viewMonth.getFullYear()}年 ${viewMonth.getMonth() + 1}月`;
  const { start, end } = gridRange();
  const todayId = ymd(new Date());
  let html = "";
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const id = ymd(d);
    const data = days[id] || {};
    const cls = ["cell"];
    if (d.getMonth() !== viewMonth.getMonth()) cls.push("other");
    if (id === todayId) cls.push("today");
    if (d.getDay() === 0) cls.push("sun");
    if (d.getDay() === 6) cls.push("sat");
    html += `<button type="button" class="${cls.join(" ")}" data-id="${id}">
      <span class="d">${d.getDate()}</span>
      ${pillHtml("dinner", data.dinner)}
      ${pillHtml("duty", data.duty)}
      ${(data.away || []).map(awayPillHtml).join("")}
      ${data.memo ? `<span class="memo-dot">📝${esc(data.memo)}</span>` : ""}
    </button>`;
  }
  $("#calendar-grid").innerHTML = html;
}

function renderAll() { renderLegend(); renderToday(); renderCalendar(); }

function watchCurrentMonth() {
  if (unwatchMonth) unwatchMonth();
  const { start, end } = gridRange();
  // 今日のカードのため、表示月外でも今日を含める
  const today = ymd(new Date());
  const s = ymd(start) < today ? ymd(start) : today;
  const e = ymd(end) > today ? ymd(end) : today;
  unwatchMonth = store.watchRange(s, e, (data) => { days = data; renderAll(); });
}

/* =========================================================
 * Day editor
 * ========================================================= */
let editing = null; // {id, dinner, duty, away:Set, memo}

function segButtons(container, options, isOn, onClick) {
  container.innerHTML = "";
  for (const opt of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = opt.label;
    if (isOn(opt.value)) {
      b.classList.add("on");
      b.style.background = bgFor(opt.value) || "#8a857c";
    }
    b.addEventListener("click", () => { onClick(opt.value); renderEditor(); });
    container.appendChild(b);
  }
}

function renderEditor() {
  const a = member("a"), b = member("b");
  const people = [
    { value: "a", label: `${a.emoji} ${a.name}` },
    { value: "b", label: `${b.emoji} ${b.name}` },
  ];
  segButtons($("#seg-dinner"),
    [...people, { value: "both", label: "👫 ふたり" }, { value: "none", label: "なし" }],
    (v) => editing.dinner === v,
    (v) => { editing.dinner = editing.dinner === v ? undefined : v; });
  segButtons($("#seg-duty"),
    [...people, { value: "none", label: "なし" }],
    (v) => editing.duty === v,
    (v) => { editing.duty = editing.duty === v ? undefined : v; });
  segButtons($("#seg-away"), people,
    (v) => editing.away.has(v),
    (v) => { editing.away.has(v) ? editing.away.delete(v) : editing.away.add(v); });
  // away buttons use dark color for "on"
  $("#seg-away").querySelectorAll("button.on").forEach((btn) => { btn.style.background = "#2d2f4a"; });
}

function openDay(id) {
  const d = days[id] || {};
  editing = { id, dinner: d.dinner, duty: d.duty, away: new Set(d.away || []), memo: d.memo || "" };
  const [y, m, dd] = id.split("-").map(Number);
  const wd = "日月火水木金土"[new Date(y, m - 1, dd).getDay()];
  $("#day-title").textContent = `${m}月${dd}日（${wd}）`;
  $("#day-memo").value = editing.memo;
  renderEditor();
  $("#day-dialog").returnValue = "";
  $("#day-dialog").showModal();
}

async function saveEditing() {
  const memo = $("#day-memo").value.trim();
  const data = {};
  if (editing.dinner) data.dinner = editing.dinner;
  if (editing.duty) data.duty = editing.duty;
  if (editing.away.size) data.away = [...editing.away].sort();
  if (memo) data.memo = memo;
  try {
    if (Object.keys(data).length) await store.saveDay(editing.id, data);
    else await store.deleteDay(editing.id);
    toast("保存しました");
  } catch (err) { showError(err); }
}

/* =========================================================
 * Settings
 * ========================================================= */
function openSettings() {
  const wrap = $("#member-settings");
  wrap.innerHTML = ["a", "b"].map((k, i) => {
    const m = member(k);
    return `<div class="member-row" data-key="${k}">
      <label>${i + 1}人目の名前<input type="text" class="name" maxlength="8" value="${esc(m.name)}" required></label>
      <label>アイコン<input type="text" class="emoji" maxlength="4" value="${esc(m.emoji)}"></label>
      <label>色<input type="color" class="color" value="${esc(m.color)}"></label>
    </div>`;
  }).join("");
  $("#settings-dialog").returnValue = "";
  $("#settings-dialog").showModal();
}

async function saveSettingsFromForm() {
  const next = { members: {} };
  document.querySelectorAll("#member-settings .member-row").forEach((row) => {
    next.members[row.dataset.key] = {
      name: row.querySelector(".name").value.trim() || "?",
      emoji: row.querySelector(".emoji").value.trim() || "🙂",
      color: row.querySelector(".color").value,
    };
  });
  try { await store.saveSettings(next); settings = next; renderAll(); toast("設定を保存しました"); }
  catch (err) { showError(err); }
}

/* =========================================================
 * Boot
 * ========================================================= */
function bindUi() {
  $("#prev-month").onclick = () => { viewMonth.setMonth(viewMonth.getMonth() - 1); watchCurrentMonth(); };
  $("#next-month").onclick = () => { viewMonth.setMonth(viewMonth.getMonth() + 1); watchCurrentMonth(); };
  $("#today-btn").onclick = () => { viewMonth = new Date(); viewMonth.setDate(1); watchCurrentMonth(); };
  $("#calendar-grid").addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (cell) openDay(cell.dataset.id);
  });
  $("#day-clear").onclick = () => {
    editing.dinner = undefined; editing.duty = undefined; editing.away.clear();
    $("#day-memo").value = ""; renderEditor();
  };
  $("#day-dialog").addEventListener("close", () => {
    if ($("#day-dialog").returnValue === "save") saveEditing();
  });
  $("#settings-btn").onclick = openSettings;
  $("#settings-dialog").addEventListener("close", () => {
    if ($("#settings-dialog").returnValue === "save") saveSettingsFromForm();
  });
  $("#logout-btn").onclick = () => store.signOut();
  $("#logout-btn").hidden = DEMO;

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#login-error").textContent = "";
    try {
      await store.signIn($("#login-email").value.trim(), $("#login-password").value);
    } catch (err) {
      $("#login-error").textContent = "ログインに失敗しました（メールアドレスまたはパスワードを確認してください）";
      console.error(err);
    }
  });
}

let unwatchSettings = null;
async function main() {
  bindUi();
  $("#demo-banner").hidden = !DEMO;
  try {
    store = DEMO ? createDemoStore() : await createFirebaseStore();
  } catch (err) {
    document.body.innerHTML = `<p style="padding:20px">Firebase の読み込みに失敗しました：${esc(err.message)}</p>`;
    return;
  }
  store.onAuth((user) => {
    if (user) {
      $("#login-view").hidden = true;
      $("#main-view").hidden = false;
      $("#login-password").value = "";
      unwatchSettings = store.watchSettings((s) => {
        settings = s && s.members ? s : structuredClone(DEFAULT_SETTINGS);
        renderAll();
      });
      watchCurrentMonth();
    } else {
      if (unwatchMonth) { unwatchMonth(); unwatchMonth = null; }
      if (unwatchSettings) { unwatchSettings(); unwatchSettings = null; }
      days = {};
      $("#main-view").hidden = true;
      $("#login-view").hidden = false;
    }
  });
}

main();
