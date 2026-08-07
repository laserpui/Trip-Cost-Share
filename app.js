(() => {
  "use strict";

  const CONFIG = window.APP_CONFIG || {};
  const API_URL = String(CONFIG.API_URL || "").trim();
  const HAS_API_URL = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/(?:exec|dev)(?:\?.*)?$/.test(API_URL);
  const IS_DEMO = !HAS_API_URL && CONFIG.ENABLE_DEMO_MODE === true;
  const CONFIG_ERROR = !HAS_API_URL && !IS_DEMO;
  const STORAGE_KEY = "trip-cost-share-v6-demo";
  const SNAPSHOT_KEY = "trip-cost-share-v6-snapshot";
  const SNAPSHOT_MAX_AGE_MS = Math.max(5, Number(CONFIG.SNAPSHOT_MAX_AGE_MINUTES || 30)) * 60 * 1000;
  const REQUEST_TIMEOUT_MS = Math.max(8000, Number(CONFIG.REQUEST_TIMEOUT_MS || 20000));
  const EPSILON = 0.011;

  const CATEGORY_LABELS = {
    food: "ค่าอาหาร",
    beverage: "เครื่องดื่ม",
    lodging: "ที่พัก",
    activity: "กิจกรรม",
    transport: "การเดินทาง",
    shared: "ของใช้ส่วนกลาง",
    other: "อื่น ๆ",
    alcohol: "เครื่องดื่มแอลกอฮอล์"
  };
  const SPLIT_LABELS = {
    attendance_date: "ผู้ที่มาในวันนั้น",
    lodging_night: "ผู้ที่พักคืนนั้น",
    selected_equal: "เลือกคนหารเท่ากัน",
    person_days: "ตามคน-วัน",
    weighted: "ตามหน่วย/น้ำหนัก",
    manual: "ระบุยอดต่อคน",
    all_equal: "ทุกคนเท่ากัน"
  };

  const state = { settings: {}, participants: [], receipts: [], expenseLines: [], expenseShares: [] };
  const $ = (id) => document.getElementById(id);
  const el = {
    appTitle: $("appTitle"), eventDateLabel: $("eventDateLabel"), connectionBadge: $("connectionBadge"), demoBanner: $("demoBanner"),
    refreshBtn: $("refreshBtn"), lastUpdated: $("lastUpdated"), toast: $("toast"),
    participantCount: $("participantCount"), attendanceUnitCount: $("attendanceUnitCount"), grandTotal: $("grandTotal"), receiptCount: $("receiptCount"),
    lodgingExpenseTotal: $("lodgingExpenseTotal"), lodgingExpenseCount: $("lodgingExpenseCount"), openBalance: $("openBalance"),
    participantForm: $("participantForm"), participantName: $("participantName"), attendanceDateOptions: $("attendanceDateOptions"), lodgingNightOptions: $("lodgingNightOptions"), drinksAlcohol: $("drinksAlcohol"), participantList: $("participantList"),
    receiptForm: $("receiptForm"), receiptDate: $("receiptDate"), receiptMerchant: $("receiptMerchant"), receiptTotal: $("receiptTotal"), receiptImage: $("receiptImage"), receiptImageHint: $("receiptImageHint"), receiptNote: $("receiptNote"),
    payerBuilderBlock: $("payerBuilderBlock"), payerModeHint: $("payerModeHint"), addPayerBtn: $("addPayerBtn"), payerRows: $("payerRows"), payerContributionTotal: $("payerContributionTotal"),
    lineBuilderBlock: $("lineBuilderBlock"), addLineBtn: $("addLineBtn"), expenseLineRows: $("expenseLineRows"), lineTotal: $("lineTotal"),
    receiptValidation: $("receiptValidation"), previewReceiptBtn: $("previewReceiptBtn"), receiptSubmitBtn: $("receiptSubmitBtn"), previewSection: $("previewSection"), previewContent: $("previewContent"),
    receiptCards: $("receiptCards"), receiptShareTitle: $("receiptShareTitle"), receiptShareSubtitle: $("receiptShareSubtitle"), shareReceiptsBtn: $("shareReceiptsBtn"),
    summaryShareTitle: $("summaryShareTitle"), summaryShareSubtitle: $("summaryShareSubtitle"), shareSummaryBtn: $("shareSummaryBtn"), integrityBox: $("integrityBox"), personSummaryBody: $("personSummaryBody"), transferRecommendationBody: $("transferRecommendationBody")
  };

  const money = (value) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 }).format(Number(value || 0));
  const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  const uid = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function parseIsoDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)) : null;
  }
  function isoFromDate(date) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`; }
  function addDays(value, days) { const date = parseIsoDate(value); if (!date) return ""; date.setUTCDate(date.getUTCDate() + Number(days || 0)); return isoFromDate(date); }
  function dateLabel(value) { const date = parseIsoDate(value); return date ? date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }) : "-"; }
  function isoToday() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function buildDateRange(start, end) {
    const cursor = parseIsoDate(start), stop = parseIsoDate(end), out = [];
    if (!cursor || !stop) return out;
    while (cursor <= stop && out.length < 31) { out.push(isoFromDate(cursor)); cursor.setUTCDate(cursor.getUTCDate() + 1); }
    return out;
  }
  function buildNightRange(start, end) { const dates = buildDateRange(start, end); return dates.slice(0, Math.max(0, dates.length - 1)); }

  function normalizeState() {
    state.settings ||= {};
    ["participants", "receipts", "expenseLines", "expenseShares"].forEach((key) => { if (!Array.isArray(state[key])) state[key] = []; });
    state.participants.forEach((p) => { p.attendanceDates = Array.isArray(p.attendanceDates) ? p.attendanceDates : []; p.lodgingNights = Array.isArray(p.lodgingNights) ? p.lodgingNights : []; p.active = p.active !== false; });
  }
  function activeParticipants() { return state.participants.filter((p) => p.active !== false); }
  function financialParticipants() {
    const referenced = new Set();
    state.expenseShares.forEach((s) => referenced.add(s.participantId));
    state.receipts.forEach((r) => (r.payerContributions || []).forEach((p) => referenced.add(p.participantId)));
    return state.participants.filter((p) => p.active !== false || referenced.has(p.id));
  }
  function participantById(id) { return state.participants.find((p) => p.id === id); }

  function showToast(message) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 3000);
  }
  function setConnection(kind, text) { el.connectionBadge.className = `status-badge ${kind}`; el.connectionBadge.textContent = text; }
  function setFormBusy(form, busy, submitButton, busyText) {
    if (!form) return;
    form.querySelectorAll("input,select,button").forEach((node) => {
      if (busy) { node.dataset.wasDisabled = node.disabled ? "1" : "0"; node.disabled = true; }
      else if (node.dataset.wasDisabled !== "1") node.disabled = false;
      if (!busy) delete node.dataset.wasDisabled;
    });
    if (submitButton) {
      if (busy) { submitButton.dataset.originalText = submitButton.textContent; submitButton.textContent = busyText || "กำลังบันทึก..."; }
      else if (submitButton.dataset.originalText) { submitButton.textContent = submitButton.dataset.originalText; delete submitButton.dataset.originalText; }
    }
    if (!busy) applyClosedState();
  }
  function applyClosedState() {
    const closed = String(state.settings.status || "open") === "closed";
    [el.participantForm, el.receiptForm].forEach((form) => form?.querySelectorAll("input,select,button").forEach((node) => { node.disabled = closed; }));
    if (closed) {
      setConnection("warning", "กิจกรรมปิดยอดแล้ว");
      el.demoBanner.classList.remove("hidden");
      el.demoBanner.innerHTML = "<strong>กิจกรรมปิดยอดแล้ว:</strong> เปิดกิจกรรมจากหน้า Admin ก่อนเพิ่มข้อมูลใหม่";
    } else if (!IS_DEMO && !CONFIG_ERROR) {
      el.demoBanner.classList.add("hidden");
    }
  }

  function saveDemo() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadDemo() {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) Object.assign(state, JSON.parse(raw)); } catch (_) {}
    if (!state.settings?.startDate) { const today = isoToday(); state.settings = { eventName: "Trip Cost Share", startDate: today, endDate: addDays(today, 1), status: "open" }; }
    normalizeState();
  }
  function saveSnapshot() {
    if (IS_DEMO) return;
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ savedAt: Date.now(), data: state })); } catch (_) {}
  }
  function restoreSnapshot() {
    if (IS_DEMO) return false;
    try {
      const snapshot = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
      if (!snapshot?.data || !snapshot.savedAt || Date.now() - snapshot.savedAt > SNAPSHOT_MAX_AGE_MS) return false;
      Object.assign(state, snapshot.data); normalizeState(); renderAll();
      el.lastUpdated.textContent = `ข้อมูลล่าสุดในเครื่อง ${new Date(snapshot.savedAt).toLocaleString("th-TH")} · กำลังซิงก์`;
      return true;
    } catch (_) { return false; }
  }

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal, redirect: "follow", cache: "no-store" });
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch (_) { throw new Error("เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON กรุณาตรวจ Deployment URL"); }
      if (!result.ok) { const error = new Error(result.message || "คำขอไม่สำเร็จ"); error.code = result.code || "ERROR"; throw error; }
      return result;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("เชื่อมต่อเซิร์ฟเวอร์นานเกินกำหนด กรุณาลองใหม่");
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function apiGet(action, fresh = false) {
    const url = new URL(API_URL); url.searchParams.set("action", action); if (fresh) url.searchParams.set("fresh", "1"); url.searchParams.set("_", String(Date.now()));
    return fetchJson(url.toString(), { method: "GET" });
  }
  async function apiPost(action, payload) {
    const delays = [0, 350, 800, 1500];
    let lastError;
    for (let i = 0; i < delays.length; i++) {
      if (delays[i]) await sleep(delays[i]);
      try {
        return await fetchJson(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, payload }) });
      } catch (error) {
        lastError = error;
        if (error.code !== "BUSY") throw error;
      }
    }
    throw lastError || new Error("ระบบกำลังบันทึกข้อมูลอื่น กรุณาลองอีกครั้ง");
  }

  async function loadData({ fresh = false, useSnapshot = true } = {}) {
    if (CONFIG_ERROR) {
      setConnection("danger", "ยังไม่ได้ตั้ง API URL");
      el.demoBanner.classList.remove("hidden");
      el.demoBanner.innerHTML = "<strong>ยังไม่ได้เชื่อม Google Sheet:</strong> กรุณาใส่ Web App URL จริงใน <code>config.js</code> ที่ค่า <code>API_URL</code> แล้วกด Ctrl + F5 — v6.1 จะไม่เข้าโหมดทดลองอัตโนมัติอีก";
      normalizeState(); renderAll();
      el.lastUpdated.textContent = "รอการตั้งค่า Google Apps Script URL";
      return;
    }
    const hadSnapshot = useSnapshot && restoreSnapshot();
    if (hadSnapshot) setConnection("warning", "กำลังซิงก์ข้อมูล");
    try {
      if (IS_DEMO) {
        loadDemo(); el.demoBanner.classList.remove("hidden"); setConnection("warning", "โหมดทดลอง");
      } else {
        const result = await apiGet("bootstrap", fresh); Object.assign(state, result.data); normalizeState(); saveSnapshot(); setConnection("success", "เชื่อม Google Sheet แล้ว");
      }
      renderAll(); el.lastUpdated.textContent = `อัปเดตล่าสุด ${new Date().toLocaleString("th-TH")}`;
    } catch (error) {
      console.error(error);
      if (hadSnapshot) { setConnection("warning", "แสดงข้อมูลล่าสุดในเครื่อง"); showToast("ซิงก์ข้อมูลไม่สำเร็จ จึงแสดงข้อมูลล่าสุดในเครื่อง"); }
      else { setConnection("danger", "เชื่อมต่อไม่สำเร็จ"); showToast(error.message); }
    }
  }

  function renderHeader() {
    const dates = buildDateRange(state.settings.startDate, state.settings.endDate);
    const title = state.settings.eventName || CONFIG.APP_NAME || "Trip Cost Share";
    el.appTitle.textContent = title;
    el.eventDateLabel.textContent = dates.length ? `${dateLabel(dates[0])} – ${dateLabel(dates.at(-1))}` : "ยังไม่ได้ตั้งช่วงกิจกรรม";
    el.receiptShareTitle.textContent = el.summaryShareTitle.textContent = title;
    el.receiptShareSubtitle.textContent = el.summaryShareSubtitle.textContent = el.eventDateLabel.textContent;
    if (HAS_API_URL && String(state.settings.status || "open") !== "closed") setConnection("success", "เชื่อม Google Sheet แล้ว");
    applyClosedState();
  }
  function renderAttendanceOptions() {
    const dates = buildDateRange(state.settings.startDate, state.settings.endDate);
    el.attendanceDateOptions.innerHTML = dates.length ? dates.map((date) => `<label class="choice-card"><input type="checkbox" value="${esc(date)}" checked><span>${esc(dateLabel(date))}</span></label>`).join("") : `<span class="field-hint">กรุณาตั้งช่วงวันที่ใน Admin</span>`;
  }
  function renderLodgingOptions() {
    const nights = buildNightRange(state.settings.startDate, state.settings.endDate);
    el.lodgingNightOptions.innerHTML = nights.length ? nights.map((date) => `<label class="choice-card"><input type="checkbox" value="${esc(date)}"><span>คืน ${esc(dateLabel(date))}</span></label>`).join("") : `<span class="field-hint">กิจกรรมนี้ไม่มีคืนพัก</span>`;
  }
  function renderParticipants() {
    const rows = activeParticipants();
    if (!rows.length) { el.participantList.className = "participant-list empty-state"; el.participantList.textContent = "ยังไม่มีรายชื่อ"; return; }
    el.participantList.className = "participant-list";
    el.participantList.innerHTML = rows.map((p) => `<div class="participant-item"><span class="avatar">${esc(p.name.slice(0,1))}</span><div><strong>${esc(p.name)}</strong><small>เข้าร่วม ${(p.attendanceDates || []).length} วัน · พัก ${(p.lodgingNights || []).length} คืน · ${p.drinksAlcohol ? "ดื่มแอลกอฮอล์" : "ไม่ดื่มแอลกอฮอล์"}</small></div></div>`).join("");
  }

  function participantOptions(selected = "", includeInactive = false) {
    const rows = includeInactive ? state.participants : activeParticipants();
    return `<option value="">เลือกรายชื่อ</option>${rows.map((p) => `<option value="${esc(p.id)}" ${p.id === selected ? "selected" : ""}>${esc(p.name)}${p.active === false ? " (ปิดใช้งาน)" : ""}</option>`).join("")}`;
  }

  function addPayerRow(data = {}) {
    const fragment = $("payerRowTemplate").content.cloneNode(true); const row = fragment.querySelector(".payer-row");
    row.querySelector(".payer-person").innerHTML = participantOptions(data.participantId || "");
    row.querySelector(".payer-amount").value = data.amount || "";
    row.querySelector(".remove-row-btn").addEventListener("click", () => { if (el.payerRows.children.length <= 1) return showToast("ต้องมีผู้จ่ายอย่างน้อย 1 คน"); row.remove(); syncPayerMode(); updateBuilderTotals(); });
    row.querySelectorAll("input,select").forEach((node) => node.addEventListener("input", updateBuilderTotals));
    el.payerRows.appendChild(fragment); syncPayerMode(); updateBuilderTotals();
  }
  function syncPayerMode() {
    const rows = [...el.payerRows.querySelectorAll(".payer-row")]; const single = rows.length === 1;
    el.payerBuilderBlock.classList.toggle("single-mode", single);
    el.payerModeHint.textContent = single ? "เลือกผู้จ่าย 1 คน ระบบใช้ยอดรวมใบเสร็จอัตโนมัติ" : "ระบุยอดของผู้จ่ายแต่ละคน ยอดรวมต้องตรงกับใบเสร็จ";
    el.addPayerBtn.textContent = single ? "มีผู้จ่ายหลายคน" : "เพิ่มผู้จ่าย";
    if (single) rows[0].querySelector(".payer-amount").value = el.receiptTotal.value || "";
  }

  function participantSelectionHtml(participant, mode, selected, values = {}) {
    const checked = selected.includes(participant.id); const needsValue = mode === "weighted" || mode === "manual";
    const label = mode === "manual" ? "บาท" : "หน่วย"; const value = values[participant.id] ?? (mode === "weighted" ? 1 : "");
    return `<label class="share-option"><span class="share-option-main"><input class="share-person-check" type="checkbox" value="${esc(participant.id)}" ${checked ? "checked" : ""}><span>${esc(participant.name)}</span></span>${needsValue ? `<span class="share-value"><small>${label}</small><input class="share-person-value" data-person-id="${esc(participant.id)}" type="number" min="0" step="0.01" value="${esc(value)}" ${checked ? "" : "disabled"}></span>` : ""}</label>`;
  }
  function lineCandidates(card) {
    const mode = card.querySelector(".line-split-mode").value;
    const category = card.querySelector(".line-category").value;
    const serviceDate = card.querySelector(".line-service-date").value || el.receiptDate.value;
    let rows = activeParticipants();
    if (mode === "attendance_date") rows = rows.filter((p) => p.attendanceDates.includes(el.receiptDate.value));
    if (mode === "lodging_night") rows = rows.filter((p) => p.lodgingNights.includes(serviceDate));
    if (category === "alcohol") rows = rows.filter((p) => p.drinksAlcohol === true);
    return rows;
  }
  function defaultSelected(card) {
    return lineCandidates(card).map((p) => p.id);
  }
  function collectLineSelection(card) {
    const selectedIds = [...card.querySelectorAll(".share-person-check:checked")].map((x) => x.value); const values = {};
    card.querySelectorAll(".share-person-value").forEach((input) => { if (selectedIds.includes(input.dataset.personId)) values[input.dataset.personId] = Number(input.value || 0); });
    return { selectedIds, values };
  }
  function renderLineParticipants(card, preserve = true) {
    const mode = card.querySelector(".line-split-mode").value; const container = card.querySelector(".line-participant-options");
    const prior = preserve ? collectLineSelection(card) : { selectedIds: defaultSelected(card), values: {} };
    const candidates = lineCandidates(card);
    const selected = mode === "all_equal" ? candidates.map((p) => p.id) : prior.selectedIds.filter((id) => candidates.some((p) => p.id === id));
    const ids = selected.length ? selected : (preserve && prior.selectedIds.length ? [] : defaultSelected(card));
    container.innerHTML = candidates.length ? candidates.map((p) => participantSelectionHtml(p, mode, ids, prior.values)).join("") : `<span class="field-hint">ไม่มีผู้ร่วมกิจกรรมที่ตรงกับเงื่อนไขนี้</span>`;
    container.querySelectorAll(".share-person-check").forEach((check) => {
      if (mode === "all_equal") check.disabled = true;
      check.addEventListener("change", () => { const input = container.querySelector(`.share-person-value[data-person-id="${CSS.escape(check.value)}"]`); if (input) input.disabled = !check.checked; updateLinePreview(card); });
    });
    container.querySelectorAll(".share-person-value").forEach((input) => input.addEventListener("input", () => updateLinePreview(card)));
    updateLinePreview(card);
  }
  function setLineDefaultsFromCategory(card) {
    const category = card.querySelector(".line-category").value; const split = card.querySelector(".line-split-mode");
    if (category === "lodging") split.value = "lodging_night";
    else if (["food","beverage","alcohol"].includes(category)) split.value = "attendance_date";
    else if (category === "shared") split.value = "person_days";
    else split.value = "selected_equal";
    updateLineModeUi(card); renderLineParticipants(card, false);
  }
  function updateLineModeUi(card) {
    const mode = card.querySelector(".line-split-mode").value; const serviceField = card.querySelector(".line-service-date-field"); const serviceInput = card.querySelector(".line-service-date");
    serviceField.classList.toggle("hidden", mode !== "lodging_night");
    const nights = buildNightRange(state.settings.startDate, state.settings.endDate);
    if (mode === "lodging_night") {
      serviceInput.min = nights[0] || ""; serviceInput.max = nights.at(-1) || "";
      if (!nights.includes(serviceInput.value)) serviceInput.value = nights.includes(el.receiptDate.value) ? el.receiptDate.value : (nights[0] || "");
    }
    const hint = {
      attendance_date: "เลือกเฉพาะผู้ที่มีสถานะเข้าร่วมในวันที่ใบเสร็จ",
      lodging_night: "เลือกเฉพาะผู้ที่พักในคืนอ้างอิง",
      selected_equal: "เลือกคนที่เกี่ยวข้องกับรายการนี้",
      person_days: "คิดตามจำนวนวันที่เข้าร่วมของแต่ละคน",
      weighted: "กำหนดหน่วยหรือน้ำหนักของแต่ละคน",
      manual: "ระบุยอดรายคนโดยตรง และยอดรวมต้องตรงกับรายการ",
      all_equal: "หารเท่ากันทุกคนที่ยังใช้งานอยู่"
    };
    card.querySelector(".line-hint").textContent = hint[mode] || "";
  }
  function addExpenseLine(data = {}) {
    const fragment = $("expenseLineTemplate").content.cloneNode(true); const card = fragment.querySelector(".line-card");
    card.dataset.lineId = data.id || uid("line");
    card.querySelector(".line-description").value = data.description || "";
    const category = data.category || "food";
    card.querySelector(".line-category").value = category;
    card.querySelector(".line-amount").value = data.amount || "";
    card.querySelector(".line-split-mode").value = data.splitMode || (category === "lodging" ? "lodging_night" : "attendance_date");
    card.querySelector(".line-service-date").value = data.serviceDate || el.receiptDate.value;
    card.querySelector(".remove-line-btn").addEventListener("click", () => { if (el.expenseLineRows.children.length <= 1) return showToast("ต้องมีรายการย่อยอย่างน้อย 1 รายการ"); card.remove(); renumberLines(); syncLineMode(); updateBuilderTotals(); });
    card.querySelector(".line-category").addEventListener("change", () => setLineDefaultsFromCategory(card));
    card.querySelector(".line-split-mode").addEventListener("change", () => { updateLineModeUi(card); renderLineParticipants(card, false); });
    card.querySelector(".line-service-date").addEventListener("change", () => renderLineParticipants(card, false));
    card.querySelector(".line-amount").addEventListener("input", () => { updateBuilderTotals(); updateLinePreview(card); });
    el.expenseLineRows.appendChild(fragment); renumberLines(); updateLineModeUi(card);
    renderLineParticipants(card, false); syncLineMode(); updateBuilderTotals();
  }
  function renumberLines() { [...el.expenseLineRows.querySelectorAll(".line-card")].forEach((card, i) => card.querySelector(".line-number").textContent = `รายการที่ ${i + 1}`); }
  function syncLineMode() {
    const cards = [...el.expenseLineRows.querySelectorAll(".line-card")]; const single = cards.length === 1;
    el.lineBuilderBlock.classList.toggle("single-mode", single);
    if (single) cards[0].querySelector(".line-amount").value = el.receiptTotal.value || "";
    cards.forEach(updateLinePreview);
  }

  function allocateCents(totalCents, weighted) {
    const valid = weighted.filter((x) => Number(x.weight) > 0); const totalWeight = valid.reduce((s,x) => s + Number(x.weight), 0);
    if (!valid.length || !(totalWeight > 0)) return { error: "ไม่มีน้ำหนักสำหรับคำนวณ" };
    const rows = valid.map((x) => { const raw = totalCents * Number(x.weight) / totalWeight; return { id:x.id, cents:Math.floor(raw), remainder:raw-Math.floor(raw) }; });
    let left = totalCents - rows.reduce((s,x) => s+x.cents,0); rows.sort((a,b) => b.remainder-a.remainder || a.id.localeCompare(b.id));
    for (let i=0;i<rows.length && left>0;i++,left--) rows[i].cents++;
    return { shares:Object.fromEntries(rows.map((x) => [x.id, x.cents/100])) };
  }
  function collectLine(card) {
    const mode = card.querySelector(".line-split-mode").value; const selection = collectLineSelection(card);
    const totalCards = el.expenseLineRows.querySelectorAll(".line-card").length;
    const amount = totalCards === 1 ? round2(el.receiptTotal.value) : round2(card.querySelector(".line-amount").value);
    return {
      id: card.dataset.lineId || uid("line"), description: card.querySelector(".line-description").value.trim(), category: card.querySelector(".line-category").value,
      amount, splitMode: mode, serviceDate: mode === "lodging_night" ? card.querySelector(".line-service-date").value : el.receiptDate.value,
      selectedParticipantIds: selection.selectedIds, weights: mode === "weighted" ? selection.values : {}, manualShares: mode === "manual" ? selection.values : {}
    };
  }
  function calculateLineShares(line) {
    let ids = [...new Set(line.selectedParticipantIds || [])].filter((id) => participantById(id));
    if (line.splitMode === "all_equal") ids = activeParticipants().filter((p) => line.category !== "alcohol" || p.drinksAlcohol === true).map((p) => p.id);
    if (!ids.length) return { error:"ไม่มีผู้ร่วมรับผิดชอบ", shares:{} };
    const cents = Math.round(Number(line.amount || 0) * 100); if (!(cents > 0)) return { error:"ยอดรายการต้องมากกว่า 0", shares:{} };
    if (line.splitMode === "manual") {
      const shares = {}; let sum = 0;
      for (const id of ids) { const c = Math.round(Number(line.manualShares?.[id] || 0) * 100); if (c < 0) return { error:"ยอดรายบุคคลต้องไม่ติดลบ", shares:{} }; shares[id] = c/100; sum += c; }
      return sum === cents ? { shares } : { error:"ยอดรายบุคคลรวมไม่ตรงกับยอดรายการ", shares:{} };
    }
    const weighted = ids.map((id) => {
      let weight = 1;
      if (line.splitMode === "person_days") weight = Math.max(1, participantById(id)?.attendanceDates?.length || 0);
      if (line.splitMode === "weighted") weight = Number(line.weights?.[id] || 0);
      return { id, weight };
    });
    return allocateCents(cents, weighted);
  }
  function updateLinePreview(card) {
    if (!card.isConnected) return;
    const line = collectLine(card); const result = calculateLineShares(line); const box = card.querySelector(".line-preview");
    if (result.error) { box.innerHTML = `<span>${esc(result.error)}</span>`; return; }
    box.innerHTML = `<strong>${Object.keys(result.shares).length} คน</strong> · ${Object.entries(result.shares).map(([id,a]) => `${esc(participantById(id)?.name || id)} ${money(a)}`).join(" · ")}`;
  }
  function updateBuilderTotals() {
    syncPayerMode(); syncLineMode();
    const payerRows = [...el.payerRows.querySelectorAll(".payer-row")]; const total = Number(el.receiptTotal.value || 0);
    if (payerRows.length === 1) payerRows[0].querySelector(".payer-amount").value = total || "";
    const payerTotal = payerRows.length === 1 ? total : payerRows.reduce((s,row) => s + Number(row.querySelector(".payer-amount").value || 0),0);
    const cards = [...el.expenseLineRows.querySelectorAll(".line-card")]; if (cards.length === 1) cards[0].querySelector(".line-amount").value = total || "";
    const linesTotal = cards.length === 1 ? total : cards.reduce((s,card) => s + Number(card.querySelector(".line-amount").value || 0),0);
    el.payerContributionTotal.textContent = money(payerTotal); el.lineTotal.textContent = money(linesTotal);
  }

  function collectReceipt() {
    const total = round2(el.receiptTotal.value); const payerRows = [...el.payerRows.querySelectorAll(".payer-row")];
    return {
      id: uid("receipt"), date: el.receiptDate.value, merchant: el.receiptMerchant.value.trim(), total, note: el.receiptNote.value.trim(),
      payerContributions: payerRows.map((row) => ({ participantId: row.querySelector(".payer-person").value, amount: payerRows.length === 1 ? total : round2(row.querySelector(".payer-amount").value) })),
      lines: [...el.expenseLineRows.querySelectorAll(".line-card")].map(collectLine)
    };
  }
  function validateReceipt(receipt) {
    const errors = []; const eventDates = buildDateRange(state.settings.startDate,state.settings.endDate);
    if (!activeParticipants().length) errors.push("กรุณาเพิ่มผู้ร่วมกิจกรรมก่อน");
    if (!eventDates.includes(receipt.date)) errors.push("วันที่ใบเสร็จต้องอยู่ในช่วงกิจกรรม");
    if (!receipt.merchant) errors.push("กรุณาระบุร้านค้าหรือผู้ให้บริการ");
    if (!(receipt.total > 0)) errors.push("ยอดใบเสร็จต้องมากกว่า 0");
    if (!receipt.payerContributions.length) errors.push("ต้องมีผู้จ่ายอย่างน้อย 1 คน");
    receipt.payerContributions.forEach((p,i) => { if (!p.participantId || !(p.amount > 0)) errors.push(`ข้อมูลผู้จ่ายลำดับ ${i+1} ไม่ครบ`); });
    if (new Set(receipt.payerContributions.map((p) => p.participantId)).size !== receipt.payerContributions.length) errors.push("มีผู้จ่ายซ้ำ กรุณารวมยอดเป็นชื่อเดียว");
    const payerTotal = round2(receipt.payerContributions.reduce((s,p) => s+p.amount,0)); if (Math.abs(payerTotal-receipt.total)>EPSILON) errors.push(`ยอดผู้จ่ายรวม ${money(payerTotal)} ไม่ตรงกับยอดใบเสร็จ ${money(receipt.total)}`);
    if (!receipt.lines.length) errors.push("ต้องมีรายการย่อยอย่างน้อย 1 รายการ");
    receipt.lines.forEach((line,i) => { if (!line.description) errors.push(`รายการที่ ${i+1} ยังไม่มีรายละเอียด`); if (!(line.amount>0)) errors.push(`รายการที่ ${i+1} ต้องมียอดมากกว่า 0`); const result=calculateLineShares(line); if (result.error) errors.push(`รายการที่ ${i+1}: ${result.error}`); });
    const lineTotal=round2(receipt.lines.reduce((s,l)=>s+l.amount,0)); if (Math.abs(lineTotal-receipt.total)>EPSILON) errors.push(`ยอดรายการย่อยรวม ${money(lineTotal)} ไม่ตรงกับยอดใบเสร็จ ${money(receipt.total)}`);
    return errors;
  }
  function showReceiptErrors(errors) {
    el.receiptValidation.classList.toggle("hidden", !errors.length);
    el.receiptValidation.innerHTML = errors.length ? `<strong>กรุณาตรวจสอบ:</strong><ul>${errors.map((e)=>`<li>${esc(e)}</li>`).join("")}</ul>` : "";
  }
  function showPreview() {
    const receipt=collectReceipt(), errors=validateReceipt(receipt); showReceiptErrors(errors); el.previewSection.classList.remove("hidden");
    el.previewContent.innerHTML = receipt.lines.map((line) => { const result=calculateLineShares(line); return `<article class="preview-card"><div><div><strong>${esc(line.description || "ยังไม่ระบุ")}</strong><small>${esc(CATEGORY_LABELS[line.category] || line.category)} · ${esc(SPLIT_LABELS[line.splitMode] || line.splitMode)}</small></div><strong>${money(line.amount)}</strong></div><div class="preview-shares">${result.error ? `<span>${esc(result.error)}</span>` : Object.entries(result.shares).map(([id,a])=>`<span>${esc(participantById(id)?.name || id)} ${money(a)}</span>`).join("")}</div></article>`; }).join("");
    return !errors.length;
  }

  async function resizeReceipt(file) {
    if (!file) return null;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("รองรับเฉพาะรูป JPG, PNG หรือ WebP");
    const maxWidth = Number(CONFIG.RECEIPT_MAX_WIDTH || 1280), quality = Number(CONFIG.RECEIPT_JPEG_QUALITY || .76);
    const dataUrl = await new Promise((resolve,reject) => { const reader=new FileReader(); reader.onerror=reject; reader.onload=()=>resolve(reader.result); reader.readAsDataURL(file); });
    const img = await new Promise((resolve,reject) => { const image=new Image(); image.onload=()=>resolve(image); image.onerror=reject; image.src=dataUrl; });
    const scale=Math.min(1,maxWidth/Math.max(img.width,img.height)); const canvas=document.createElement("canvas"); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale)); canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
    const result=canvas.toDataURL("image/jpeg",quality); if (result.length > 6*1024*1024) throw new Error("รูปใบเสร็จยังมีขนาดใหญ่เกินไป กรุณาใช้รูปขนาดเล็กลง");
    return { name:(file.name || "receipt.jpg").replace(/\.[^.]+$/,"") + ".jpg", mimeType:"image/jpeg", dataBase64:result.split(",")[1] };
  }

  async function addParticipant(payload) {
    if (IS_DEMO) { const p={...payload,active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; state.participants.push(p); saveDemo(); return p; }
    const result=await apiPost("addParticipant",payload); const p=result.data.participant; state.participants.push(p); saveSnapshot(); return p;
  }
  async function addReceipt(receipt) {
    if (IS_DEMO) {
      const now=new Date().toISOString(); const stored={id:receipt.id,date:receipt.date,merchant:receipt.merchant,total:receipt.total,note:receipt.note,payerContributions:receipt.payerContributions,receiptUrl:receipt.receiptImage?.dataBase64?`data:${receipt.receiptImage.mimeType};base64,${receipt.receiptImage.dataBase64}`:"",receiptThumbnailUrl:"",createdAt:now,updatedAt:now};
      state.receipts.push(stored); receipt.lines.forEach((line)=>{state.expenseLines.push({...line,receiptId:receipt.id,createdAt:now,updatedAt:now}); const calc=calculateLineShares(line); Object.entries(calc.shares||{}).forEach(([participantId,amount])=>state.expenseShares.push({id:uid("share"),receiptId:receipt.id,lineId:line.id,participantId,amount,createdAt:now}));}); saveDemo(); return;
    }
    const result=await apiPost("addReceipt",receipt); state.receipts.push(result.data.receipt); state.expenseLines.push(...(result.data.expenseLines||[])); state.expenseShares.push(...(result.data.expenseShares||[])); saveSnapshot();
  }

  function calculateSummary() {
    const people=financialParticipants(); const responsible=Object.fromEntries(people.map((p)=>[p.id,0])); const paid=Object.fromEntries(people.map((p)=>[p.id,0]));
    state.expenseShares.forEach((s)=>{ if (responsible[s.participantId]!==undefined) responsible[s.participantId]+=Number(s.amount||0); });
    state.receipts.forEach((r)=>(r.payerContributions||[]).forEach((p)=>{ if (paid[p.participantId]!==undefined) paid[p.participantId]+=Number(p.amount||0); }));
    const rows=people.map((p)=>({...p,responsibility:round2(responsible[p.id]),paid:round2(paid[p.id]),net:round2(paid[p.id]-responsible[p.id])}));
    return { rows,totalNet:round2(rows.reduce((s,r)=>s+r.net,0)) };
  }
  function transferRecommendations(rows) {
    const debtors=rows.filter((r)=>r.net<-EPSILON).map((r)=>({name:r.name,amount:round2(-r.net)})).sort((a,b)=>b.amount-a.amount);
    const creditors=rows.filter((r)=>r.net>EPSILON).map((r)=>({name:r.name,amount:round2(r.net)})).sort((a,b)=>b.amount-a.amount); const out=[]; let i=0,j=0;
    while(i<debtors.length&&j<creditors.length){const amount=round2(Math.min(debtors[i].amount,creditors[j].amount)); if(amount>0)out.push({from:debtors[i].name,to:creditors[j].name,amount}); debtors[i].amount=round2(debtors[i].amount-amount); creditors[j].amount=round2(creditors[j].amount-amount); if(debtors[i].amount<=EPSILON)i++; if(creditors[j].amount<=EPSILON)j++;}
    return out;
  }
  function renderSummary() {
    const summary=calculateSummary();
    el.personSummaryBody.innerHTML=summary.rows.length?summary.rows.map((r)=>{const cls=Math.abs(r.net)<=EPSILON?"net-zero":r.net>0?"net-positive":"net-negative"; const label=Math.abs(r.net)<=EPSILON?"ยอดพอดี":r.net>0?`ควรได้รับคืน ${money(r.net)}`:`ต้องจ่ายเพิ่ม ${money(-r.net)}`; return `<tr><td><strong>${esc(r.name)}</strong>${r.active===false?`<small> (ปิดใช้งาน)</small>`:""}</td><td class="right">${money(r.responsibility)}</td><td class="right">${money(r.paid)}</td><td class="right"><span class="net-chip ${cls}">${label}</span></td></tr>`;}).join(""):`<tr><td colspan="4" class="empty-cell">ยังไม่มีข้อมูล</td></tr>`;
    el.integrityBox.classList.toggle("hidden",Math.abs(summary.totalNet)<=EPSILON); el.integrityBox.textContent=Math.abs(summary.totalNet)>EPSILON?`ยอดสุทธิรวมไม่เป็นศูนย์ (${money(summary.totalNet)}) กรุณาตรวจสอบข้อมูลอ้างอิง`:"";
    const recommendations=transferRecommendations(summary.rows); el.transferRecommendationBody.innerHTML=recommendations.length?recommendations.map((r)=>`<tr><td><strong>${esc(r.from)}</strong></td><td>${esc(r.to)}</td><td class="right"><strong>${money(r.amount)}</strong></td></tr>`).join(""):`<tr><td colspan="3" class="empty-cell">ยอดพอดี หรือยังไม่มีข้อมูลเพียงพอ</td></tr>`;
    el.openBalance.textContent=money(summary.rows.filter((r)=>r.net<0).reduce((s,r)=>s-r.net,0));
  }
  function renderMetrics() {
    const active=activeParticipants(); el.participantCount.textContent=active.length.toLocaleString("th-TH"); el.attendanceUnitCount.textContent=`${active.reduce((s,p)=>s+p.attendanceDates.length,0)} คน-วัน`;
    el.grandTotal.textContent=money(state.receipts.reduce((s,r)=>s+Number(r.total||0),0)); el.receiptCount.textContent=`${state.receipts.length} ใบเสร็จ`;
    const lodging=state.expenseLines.filter((l)=>l.category==="lodging"); el.lodgingExpenseTotal.textContent=money(lodging.reduce((s,l)=>s+Number(l.amount||0),0)); el.lodgingExpenseCount.textContent=`${lodging.length} รายการ`;
  }
  function renderReceipts() {
    if (!state.receipts.length) { el.receiptCards.className="receipt-list empty-state"; el.receiptCards.textContent="ยังไม่มีใบเสร็จ"; return; }
    const sorted=[...state.receipts].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt).localeCompare(String(a.createdAt)));
    const linesByReceipt=new Map(); state.expenseLines.forEach((line)=>{if(!linesByReceipt.has(line.receiptId))linesByReceipt.set(line.receiptId,[]);linesByReceipt.get(line.receiptId).push(line);});
    el.receiptCards.className="receipt-list";
    el.receiptCards.innerHTML=sorted.map((receipt)=>{const lines=linesByReceipt.get(receipt.id)||[]; const payers=(receipt.payerContributions||[]).map((p)=>`${participantById(p.participantId)?.name||"ไม่พบชื่อ"} ${money(p.amount)}`).join(" · "); return `<article class="receipt-card"><div class="receipt-card-head"><div><small>${esc(dateLabel(receipt.date))}</small><h3>${esc(receipt.merchant)}</h3><small>ผู้สำรองจ่าย: ${esc(payers||"-")}</small></div><strong>${money(receipt.total)}</strong></div>${receipt.note?`<p>${esc(receipt.note)}</p>`:""}<div>${lines.map((line)=>`<div class="receipt-line"><div><span class="category-pill">${esc(CATEGORY_LABELS[line.category]||"รายการเดิม")}</span><strong>${esc(line.description)}</strong><small>${esc(SPLIT_LABELS[line.splitMode]||line.splitMode)}</small></div><strong>${money(line.amount)}</strong></div>`).join("")}</div>${receipt.receiptUrl?`<a class="btn secondary" href="${esc(receipt.receiptUrl)}" target="_blank" rel="noopener">ดูรูปใบเสร็จ</a>`:""}</article>`;}).join("");
  }
  function renderSelectors() {
    el.payerRows.querySelectorAll(".payer-person").forEach((select)=>{const current=select.value; select.innerHTML=participantOptions(current);});
    el.expenseLineRows.querySelectorAll(".line-card").forEach((card)=>renderLineParticipants(card,true));
  }
  function renderAll() { renderHeader(); renderAttendanceOptions(); renderLodgingOptions(); renderParticipants(); renderMetrics(); renderSelectors(); renderReceipts(); renderSummary(); }

  function resetParticipantForm() { el.participantForm.reset(); renderAttendanceOptions(); renderLodgingOptions(); }
  function resetReceiptForm() {
    el.receiptForm.reset(); el.receiptDate.value=state.settings.startDate||isoToday(); el.payerRows.innerHTML=""; el.expenseLineRows.innerHTML=""; addPayerRow(); addExpenseLine(); el.previewSection.classList.add("hidden"); showReceiptErrors([]); updateBuilderTotals();
  }

  async function ensureHtml2Canvas() {
    if (window.html2canvas) return;
    await new Promise((resolve,reject)=>{const script=document.createElement("script"); script.src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"; script.onload=resolve; script.onerror=()=>reject(new Error("โหลดระบบสร้างรูปไม่สำเร็จ")); document.head.appendChild(script);});
  }
  async function shareSection(id,filename) {
    try { await ensureHtml2Canvas(); const node=$(id); const canvas=await html2canvas(node,{scale:Math.min(2,window.devicePixelRatio||1),backgroundColor:"#ffffff",useCORS:true}); const blob=await new Promise((resolve)=>canvas.toBlob(resolve,"image/png")); if(!blob)throw new Error("สร้างรูปไม่สำเร็จ"); const file=new File([blob],filename,{type:"image/png"}); if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:el.appTitle.textContent}); else {const url=URL.createObjectURL(blob); const link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);} } catch(error){if(error?.name!=="AbortError")showToast(error.message||"แชร์รูปไม่สำเร็จ");}
  }

  el.participantForm.addEventListener("submit",async(event)=>{
    event.preventDefault(); const name=el.participantName.value.trim(); const attendanceDates=[...el.attendanceDateOptions.querySelectorAll("input:checked")].map((x)=>x.value); const lodgingNights=[...el.lodgingNightOptions.querySelectorAll("input:checked")].map((x)=>x.value);
    if(!name)return showToast("กรุณากรอกชื่อ"); if(!attendanceDates.length)return showToast("กรุณาเลือกวันที่เข้าร่วมอย่างน้อย 1 วัน");
    const payload={id:uid("p"),name,attendanceDates,lodgingNights,drinksAlcohol:Boolean(el.drinksAlcohol?.checked),active:true}; setFormBusy(el.participantForm,true,$("saveParticipantBtn"),"กำลังบันทึก...");
    try{await addParticipant(payload);normalizeState();resetParticipantForm();renderAll();showToast("บันทึกผู้ร่วมกิจกรรมแล้ว");}catch(error){console.error(error);showToast(error.message);}finally{setFormBusy(el.participantForm,false,$("saveParticipantBtn"));}
  });

  el.receiptDate.addEventListener("change",()=>el.expenseLineRows.querySelectorAll(".line-card").forEach((card)=>{if(card.querySelector(".line-split-mode").value==="attendance_date")renderLineParticipants(card,false);}));
  el.receiptTotal.addEventListener("input",updateBuilderTotals);
  el.receiptImage.addEventListener("change",()=>{const file=el.receiptImage.files[0];el.receiptImageHint.textContent=file?`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`:"ไม่บังคับ";});
  el.addPayerBtn.addEventListener("click",()=>addPayerRow());
  el.addLineBtn.addEventListener("click",()=>addExpenseLine());
  el.previewReceiptBtn.addEventListener("click",showPreview);
  el.receiptForm.addEventListener("submit",async(event)=>{
    event.preventDefault(); const receipt=collectReceipt(); const errors=validateReceipt(receipt); if(errors.length){showReceiptErrors(errors);showPreview();return showToast("กรุณาตรวจสอบข้อมูลก่อนบันทึก");}
    setFormBusy(el.receiptForm,true,el.receiptSubmitBtn,"กำลังบันทึก...");
    try{receipt.receiptImage=await resizeReceipt(el.receiptImage.files[0]);await addReceipt(receipt);normalizeState();renderAll();resetReceiptForm();showToast("บันทึกค่าใช้จ่ายเรียบร้อย");}
    catch(error){console.error(error);showReceiptErrors([`บันทึกไม่สำเร็จ: ${error.message}`]);showToast(error.message);}
    finally{setFormBusy(el.receiptForm,false,el.receiptSubmitBtn);}
  });
  el.refreshBtn.addEventListener("click",()=>loadData({fresh:true,useSnapshot:false}));
  el.shareReceiptsBtn.addEventListener("click",()=>shareSection("receiptShareSection","expense-list.png"));
  el.shareSummaryBtn.addEventListener("click",()=>shareSection("summaryShareSection","expense-summary.png"));

  addPayerRow(); addExpenseLine(); loadData();
})();
