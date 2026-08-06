(() => {
  "use strict";

  const CONFIG = window.APP_CONFIG || {};
  const API_URL = String(CONFIG.API_URL || "").trim();
  const IS_DEMO = !/^https:\/\/script\.google\.com\/macros\/s\//.test(API_URL);
  const STORAGE_KEY = "trip-cost-share-v5-demo";
  const EPSILON = 0.011;

  const CATEGORY_LABELS = {
    food: "ค่าอาหาร",
    beverage: "เครื่องดื่ม",
    alcohol: "แอลกอฮอล์",
    lodging: "ที่พัก",
    activity: "กิจกรรม",
    transport: "การเดินทาง",
    shared: "ของใช้ส่วนกลาง",
    other: "อื่น ๆ"
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

  const state = {
    settings: {},
    participants: [],
    receipts: [],
    expenseLines: [],
    expenseShares: [],
    settlements: []
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    appTitle: $("appTitle"), eventDateLabel: $("eventDateLabel"), connectionBadge: $("connectionBadge"),
    demoBanner: $("demoBanner"), refreshBtn: $("refreshBtn"), lastUpdated: $("lastUpdated"), toast: $("toast"),
    participantCount: $("participantCount"), attendanceUnitCount: $("attendanceUnitCount"), grandTotal: $("grandTotal"),
    receiptCount: $("receiptCount"), settlementTotal: $("settlementTotal"), settlementCount: $("settlementCount"), openBalance: $("openBalance"),
    participantForm: $("participantForm"), participantName: $("participantName"), drinksAlcohol: $("drinksAlcohol"),
    attendanceDateOptions: $("attendanceDateOptions"), lodgingNightOptions: $("lodgingNightOptions"), participantList: $("participantList"),
    receiptForm: $("receiptForm"), receiptDate: $("receiptDate"), receiptMerchant: $("receiptMerchant"), receiptTotal: $("receiptTotal"),
    receiptImage: $("receiptImage"), receiptNote: $("receiptNote"), addPayerBtn: $("addPayerBtn"), payerRows: $("payerRows"),
    payerContributionTotal: $("payerContributionTotal"), addLineBtn: $("addLineBtn"), expenseLineRows: $("expenseLineRows"),
    lineTotal: $("lineTotal"), receiptValidation: $("receiptValidation"), previewReceiptBtn: $("previewReceiptBtn"), receiptSubmitBtn: $("receiptSubmitBtn"),
    previewSection: $("previewSection"), previewContent: $("previewContent"), receiptCards: $("receiptCards"),
    receiptShareTitle: $("receiptShareTitle"), receiptShareSubtitle: $("receiptShareSubtitle"), shareReceiptsBtn: $("shareReceiptsBtn"),
    settlementForm: $("settlementForm"), settlementDate: $("settlementDate"), settlementFrom: $("settlementFrom"), settlementTo: $("settlementTo"),
    settlementAmount: $("settlementAmount"), settlementNote: $("settlementNote"), settlementTableBody: $("settlementTableBody"),
    summaryShareTitle: $("summaryShareTitle"), summaryShareSubtitle: $("summaryShareSubtitle"), shareSummaryBtn: $("shareSummaryBtn"),
    integrityBox: $("integrityBox"), personSummaryBody: $("personSummaryBody"), transferRecommendationBody: $("transferRecommendationBody")
  };

  function money(value) {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 }).format(Number(value || 0));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function uid(prefix) {
    return `${prefix}_${crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
  }

  function round2(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }

  // Date-only values must not be converted through local midnight + toISOString(),
  // because Thailand is UTC+7 and that conversion can move the date back one day.
  function parseIsoDateUtc(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  }

  function isoFromUtcDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  function addIsoDays(value, days) {
    const date = parseIsoDateUtc(value);
    if (!date) return "";
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return isoFromUtcDate(date);
  }

  function isoToday() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function dateLabel(value) {
    const date = parseIsoDateUtc(value);
    return date ? date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }) : "-";
  }
  function participantById(id) { return state.participants.find((p) => p.id === id); }
  function activeParticipants() { return state.participants.filter((p) => p.active !== false); }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2800);
  }

  function setConnection(kind, label) {
    el.connectionBadge.className = `badge badge-${kind}`;
    el.connectionBadge.textContent = label;
  }

  function setBusy(busy) {
    const closed = String(state.settings?.status || "open") === "closed";
    document.querySelectorAll("button").forEach((button) => {
      const insideWriteForm = button.closest("#participantForm, #receiptForm, #settlementForm");
      button.disabled = busy || (closed && Boolean(insideWriteForm));
    });
  }

  function buildDateRange(start, end) {
    const cursor = parseIsoDateUtc(start);
    const stop = parseIsoDateUtc(end);
    if (!cursor || !stop) return [];
    const result = [];
    while (cursor <= stop && result.length < 31) {
      result.push(isoFromUtcDate(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  }

  function buildNightRange(start, end) {
    const dates = buildDateRange(start, end);
    return dates.slice(0, Math.max(0, dates.length - 1));
  }

  function saveDemo() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadDemo() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { Object.assign(state, JSON.parse(raw)); return; } catch (_) {}
    }
    const today = isoToday();
    state.settings = { eventName: "Trip Cost Share", startDate: today, endDate: addIsoDays(today, 1), status: "open" };
  }

  async function apiGet(action) {
    const url = new URL(API_URL); url.searchParams.set("action", action); url.searchParams.set("_", Date.now());
    const response = await fetch(url.toString(), { method: "GET", redirect: "follow" });
    const result = await response.json();
    if (!result.ok) throw new Error(result.message || "อ่านข้อมูลไม่สำเร็จ");
    return result;
  }

  async function apiPost(action, payload) {
    const response = await fetch(API_URL, {
      method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload })
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.message || "บันทึกข้อมูลไม่สำเร็จ");
    return result;
  }

  async function loadData() {
    setBusy(true);
    try {
      if (IS_DEMO) {
        loadDemo(); el.demoBanner.classList.remove("hidden"); setConnection("warning", "โหมดทดลอง");
      } else {
        const result = await apiGet("bootstrap"); Object.assign(state, result.data); el.demoBanner.classList.add("hidden"); setConnection("success", "เชื่อม Google Sheet แล้ว");
      }
      normalizeState(); renderAll();
      el.lastUpdated.textContent = `อัปเดตล่าสุด ${new Date().toLocaleString("th-TH")}`;
    } catch (error) {
      console.error(error); setConnection("danger", "เชื่อมต่อไม่สำเร็จ"); showToast(error.message);
    } finally { setBusy(false); }
  }

  function normalizeState() {
    ["participants", "receipts", "expenseLines", "expenseShares", "settlements"].forEach((key) => {
      if (!Array.isArray(state[key])) state[key] = [];
    });
    state.settings ||= {};
  }

  function participantOptions(selected = "") {
    return `<option value="">เลือกรายชื่อ</option>${activeParticipants().map((p) => `<option value="${esc(p.id)}" ${p.id === selected ? "selected" : ""}>${esc(p.name)}</option>`).join("")}`;
  }

  function renderDateOptions() {
    const dates = buildDateRange(state.settings.startDate, state.settings.endDate);
    const nights = buildNightRange(state.settings.startDate, state.settings.endDate);
    el.attendanceDateOptions.innerHTML = dates.map((d) => `<label class="check-card"><input type="checkbox" value="${d}" checked><span>${dateLabel(d)}</span></label>`).join("") || `<span class="field-hint">กรุณาตั้งค่าวันกิจกรรมในหน้าหลังบ้าน</span>`;
    el.lodgingNightOptions.innerHTML = nights.map((d) => `<label class="check-card"><input type="checkbox" value="${d}"><span>คืน ${dateLabel(d)}</span></label>`).join("") || `<span class="field-hint">กิจกรรมไม่มีคืนพัก</span>`;
    el.receiptDate.min = state.settings.startDate || "";
    el.receiptDate.max = state.settings.endDate || "";
    if (!el.receiptDate.value) el.receiptDate.value = state.settings.startDate || isoToday();
  }

  function renderParticipants() {
    const rows = activeParticipants();
    if (!rows.length) { el.participantList.className = "participant-list empty-state"; el.participantList.textContent = "ยังไม่มีรายชื่อ"; return; }
    el.participantList.className = "participant-list";
    el.participantList.innerHTML = rows.map((p) => `
      <div class="participant-item participant-v5-item">
        <div class="participant-meta">
          <div class="avatar">${esc(p.name.slice(0, 1))}</div>
          <div>
            <div class="participant-name">${esc(p.name)}</div>
            <div class="participant-status">มา ${(p.attendanceDates || []).length} วัน · พัก ${(p.lodgingNights || []).length} คืน · ${p.drinksAlcohol ? "ปกติดื่ม" : "ไม่ดื่ม"}</div>
          </div>
        </div>
      </div>`).join("");
  }

  function addPayerRow(data = {}) {
    const fragment = $("payerRowTemplate").content.cloneNode(true);
    const row = fragment.querySelector(".payer-row");
    row.querySelector(".payer-person").innerHTML = participantOptions(data.participantId || "");
    row.querySelector(".payer-amount").value = data.amount || "";
    row.querySelector(".remove-row-btn").addEventListener("click", () => { row.remove(); updateBuilderTotals(); });
    row.querySelectorAll("input,select").forEach((node) => node.addEventListener("input", updateBuilderTotals));
    el.payerRows.appendChild(fragment);
  }

  function participantShareOptionHtml(participant, mode, selectedIds = [], values = {}) {
    const selected = selectedIds.includes(participant.id);
    const label = mode === "manual" ? "ยอด (บาท)" : mode === "weighted" ? "หน่วย" : "";
    const inputValue = values[participant.id] ?? (mode === "weighted" ? 1 : "");
    return `<label class="participant-share-option">
      <span class="participant-share-main"><input class="share-person-check" type="checkbox" value="${esc(participant.id)}" ${selected ? "checked" : ""}><span>${esc(participant.name)}</span></span>
      ${label ? `<span class="share-value-wrap"><small>${label}</small><input class="share-person-value" data-person-id="${esc(participant.id)}" type="number" min="0" step="0.01" value="${esc(inputValue)}" ${selected ? "" : "disabled"}></span>` : ""}
    </label>`;
  }

  function defaultEligibleForLine(card) {
    const mode = card.querySelector(".line-split-mode").value;
    const category = card.querySelector(".line-category").value;
    const serviceDate = card.querySelector(".line-service-date").value || el.receiptDate.value;
    let people = activeParticipants();
    if (mode === "attendance_date") people = people.filter((p) => (p.attendanceDates || []).includes(el.receiptDate.value));
    if (mode === "lodging_night") people = people.filter((p) => (p.lodgingNights || []).includes(serviceDate));
    if (category === "alcohol") people = people.filter((p) => p.drinksAlcohol);
    return people.map((p) => p.id);
  }

  function renderLineParticipantOptions(card, preserve = true) {
    const mode = card.querySelector(".line-split-mode").value;
    const container = card.querySelector(".line-participant-options");
    const prior = preserve ? collectParticipantSelection(card) : { selectedIds: defaultEligibleForLine(card), values: {} };
    const fixedAll = mode === "all_equal";
    const values = prior.values || {};
    let selectedIds = prior.selectedIds || [];
    if (!preserve || fixedAll) selectedIds = fixedAll ? activeParticipants().map((p) => p.id) : defaultEligibleForLine(card);
    container.innerHTML = activeParticipants().map((p) => participantShareOptionHtml(p, mode, selectedIds, values)).join("") || `<span class="field-hint">กรุณาเพิ่มผู้ร่วมกิจกรรมก่อน</span>`;
    container.querySelectorAll(".share-person-check").forEach((check) => {
      if (fixedAll) check.disabled = true;
      check.addEventListener("change", () => {
        const input = container.querySelector(`.share-person-value[data-person-id="${CSS.escape(check.value)}"]`);
        if (input) input.disabled = !check.checked;
        refreshLinePreview(card);
      });
    });
    container.querySelectorAll(".share-person-value").forEach((input) => input.addEventListener("input", () => refreshLinePreview(card)));
    refreshLinePreview(card);
  }

  function addExpenseLine(data = {}) {
    const fragment = $("expenseLineTemplate").content.cloneNode(true);
    const card = fragment.querySelector(".expense-line-card");
    card.dataset.lineId = data.id || uid("line");
    card.querySelector(".line-description").value = data.description || "";
    card.querySelector(".line-category").value = data.category || "food";
    card.querySelector(".line-amount").value = data.amount || "";
    card.querySelector(".line-split-mode").value = data.splitMode || "attendance_date";
    card.querySelector(".line-service-date").value = data.serviceDate || el.receiptDate.value;
    card._initialSelection = { selectedIds: data.selectedParticipantIds || [], values: data.weights || data.manualShares || {} };
    card.querySelector(".remove-line-btn").addEventListener("click", () => { card.remove(); renumberLines(); updateBuilderTotals(); });
    card.querySelectorAll(".line-description,.line-amount").forEach((node) => node.addEventListener("input", () => { refreshLinePreview(card); updateBuilderTotals(); }));
    card.querySelector(".line-category").addEventListener("change", () => renderLineParticipantOptions(card, false));
    card.querySelector(".line-split-mode").addEventListener("change", () => { updateLineModeUi(card); renderLineParticipantOptions(card, false); });
    card.querySelector(".line-service-date").addEventListener("change", () => renderLineParticipantOptions(card, false));
    el.expenseLineRows.appendChild(fragment);
    updateLineModeUi(card);
    if (card._initialSelection.selectedIds.length) {
      const mode = card.querySelector(".line-split-mode").value;
      const container = card.querySelector(".line-participant-options");
      container.innerHTML = activeParticipants().map((p) => participantShareOptionHtml(p, mode, card._initialSelection.selectedIds, card._initialSelection.values)).join("");
      container.querySelectorAll(".share-person-check").forEach((check) => check.addEventListener("change", () => { const input = container.querySelector(`.share-person-value[data-person-id="${CSS.escape(check.value)}"]`); if (input) input.disabled = !check.checked; refreshLinePreview(card); }));
      container.querySelectorAll(".share-person-value").forEach((input) => input.addEventListener("input", () => refreshLinePreview(card)));
      refreshLinePreview(card);
    } else renderLineParticipantOptions(card, false);
    renumberLines(); updateBuilderTotals();
  }

  function updateLineModeUi(card) {
    const mode = card.querySelector(".line-split-mode").value;
    card.querySelector(".line-service-date-field").classList.toggle("hidden", mode !== "lodging_night");
    const hints = {
      attendance_date: "เลือกคนที่มาในวันที่ใบเสร็จอัตโนมัติ และสามารถปรับรายชื่อได้",
      lodging_night: "เลือกเฉพาะผู้ที่พักในคืนที่กำหนด",
      selected_equal: "เลือกเฉพาะผู้ที่ได้รับประโยชน์จากรายการนี้",
      person_days: "คิดน้ำหนักจากจำนวนวันที่เข้าร่วมของแต่ละคน",
      weighted: "กำหนดหน่วย เช่น ผู้ใหญ่ 1 หน่วย เด็ก 0.5 หน่วย หรือจำนวนแก้ว",
      manual: "ระบุยอดเงินของแต่ละคนโดยตรง ยอดรวมต้องตรงกับรายการ",
      all_equal: "ทุกคนในกิจกรรมรับผิดชอบเท่ากัน"
    };
    card.querySelector(".line-hint").textContent = hints[mode] || "";
  }

  function collectParticipantSelection(card) {
    const selectedIds = [...card.querySelectorAll(".share-person-check:checked")].map((node) => node.value);
    const values = {};
    card.querySelectorAll(".share-person-value").forEach((input) => { if (selectedIds.includes(input.dataset.personId)) values[input.dataset.personId] = Number(input.value || 0); });
    return { selectedIds, values };
  }

  function largestRemainder(amount, weightedIds) {
    const cents = Math.round(Number(amount || 0) * 100);
    const valid = weightedIds.filter((item) => item.weight > 0);
    const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0);
    if (!valid.length || totalWeight <= 0) return {};
    const raw = valid.map((item) => ({ ...item, raw: cents * item.weight / totalWeight }));
    const allocated = raw.map((item) => ({ ...item, cents: Math.floor(item.raw), remainder: item.raw - Math.floor(item.raw) }));
    let left = cents - allocated.reduce((sum, item) => sum + item.cents, 0);
    allocated.sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id));
    for (let i = 0; i < allocated.length && left > 0; i++, left--) allocated[i].cents += 1;
    return Object.fromEntries(allocated.map((item) => [item.id, item.cents / 100]));
  }

  function calculateLineShares(line) {
    const amount = Number(line.amount || 0);
    const participants = activeParticipants();
    let ids = [...new Set(line.selectedParticipantIds || [])].filter((id) => participants.some((p) => p.id === id));
    if (line.splitMode === "all_equal") ids = participants.map((p) => p.id);
    if (!ids.length) return { shares: {}, error: "ยังไม่ได้เลือกผู้ร่วมรับผิดชอบ" };

    if (line.splitMode === "manual") {
      const shares = {};
      ids.forEach((id) => { shares[id] = round2(Number(line.manualShares?.[id] || 0)); });
      const sum = round2(Object.values(shares).reduce((a, b) => a + b, 0));
      if (Math.abs(sum - amount) > EPSILON) return { shares, error: `ยอดรายบุคคลรวม ${money(sum)} ไม่ตรงกับยอดรายการ ${money(amount)}` };
      return { shares, error: "" };
    }

    const weighted = ids.map((id) => {
      const p = participantById(id);
      let weight = 1;
      if (line.splitMode === "person_days") weight = Math.max(1, (p?.attendanceDates || []).length);
      if (line.splitMode === "weighted") weight = Number(line.weights?.[id] || 0);
      return { id, weight };
    });
    if (weighted.some((item) => item.weight <= 0)) return { shares: {}, error: "น้ำหนักของผู้ร่วมรับผิดชอบต้องมากกว่า 0" };
    return { shares: largestRemainder(amount, weighted), error: "" };
  }

  function collectLine(card) {
    const mode = card.querySelector(".line-split-mode").value;
    const selection = collectParticipantSelection(card);
    return {
      id: card.dataset.lineId,
      description: card.querySelector(".line-description").value.trim(),
      category: card.querySelector(".line-category").value,
      amount: Number(card.querySelector(".line-amount").value || 0),
      splitMode: mode,
      serviceDate: card.querySelector(".line-service-date").value || el.receiptDate.value,
      selectedParticipantIds: selection.selectedIds,
      weights: mode === "weighted" ? selection.values : {},
      manualShares: mode === "manual" ? selection.values : {}
    };
  }

  function refreshLinePreview(card) {
    const line = collectLine(card);
    const result = calculateLineShares(line);
    const preview = card.querySelector(".line-preview");
    if (!line.amount) { preview.innerHTML = ""; return; }
    if (result.error) { preview.innerHTML = `<div class="inline-error">${esc(result.error)}</div>`; return; }
    preview.innerHTML = `<div class="mini-share-list">${Object.entries(result.shares).map(([id, amount]) => `<span>${esc(participantById(id)?.name || id)} <strong>${money(amount)}</strong></span>`).join("")}</div>`;
  }

  function renumberLines() {
    [...el.expenseLineRows.querySelectorAll(".expense-line-card")].forEach((card, index) => { card.querySelector(".line-number").textContent = `รายการที่ ${index + 1}`; });
  }

  function updateBuilderTotals() {
    const payerTotal = [...el.payerRows.querySelectorAll(".payer-amount")].reduce((sum, input) => sum + Number(input.value || 0), 0);
    const linesTotal = [...el.expenseLineRows.querySelectorAll(".line-amount")].reduce((sum, input) => sum + Number(input.value || 0), 0);
    el.payerContributionTotal.textContent = money(payerTotal);
    el.lineTotal.textContent = money(linesTotal);
  }

  function collectReceiptForm() {
    const payerContributions = [...el.payerRows.querySelectorAll(".payer-row")].map((row) => ({ participantId: row.querySelector(".payer-person").value, amount: round2(row.querySelector(".payer-amount").value) }));
    const lines = [...el.expenseLineRows.querySelectorAll(".expense-line-card")].map(collectLine);
    return {
      id: uid("receipt"), date: el.receiptDate.value, merchant: el.receiptMerchant.value.trim(), total: round2(el.receiptTotal.value),
      note: el.receiptNote.value.trim(), payerContributions, lines
    };
  }

  function validateReceipt(receipt) {
    const errors = [];
    if (!receipt.date) errors.push("กรุณาระบุวันที่ใบเสร็จ");
    if (!receipt.merchant) errors.push("กรุณาระบุร้านค้าหรือผู้ให้บริการ");
    if (!(receipt.total > 0)) errors.push("ยอดรวมใบเสร็จต้องมากกว่า 0");
    if (!receipt.payerContributions.length) errors.push("ต้องมีผู้สำรองจ่ายอย่างน้อย 1 คน");
    receipt.payerContributions.forEach((p, i) => { if (!p.participantId || !(p.amount > 0)) errors.push(`ข้อมูลผู้จ่ายลำดับ ${i + 1} ไม่ครบ`); });
    const duplicatePayers = receipt.payerContributions.map((p) => p.participantId).filter((id, i, all) => all.indexOf(id) !== i);
    if (duplicatePayers.length) errors.push("มีชื่อผู้สำรองจ่ายซ้ำ กรุณารวมยอดเป็นรายการเดียว");
    const payerTotal = round2(receipt.payerContributions.reduce((sum, p) => sum + p.amount, 0));
    if (Math.abs(payerTotal - receipt.total) > EPSILON) errors.push(`ยอดผู้สำรองจ่ายรวม ${money(payerTotal)} ไม่ตรงกับยอดใบเสร็จ ${money(receipt.total)}`);
    if (!receipt.lines.length) errors.push("ต้องมีรายการย่อยอย่างน้อย 1 รายการ");
    receipt.lines.forEach((line, i) => {
      if (!line.description || !(line.amount > 0)) errors.push(`รายการย่อยที่ ${i + 1} ยังไม่ครบ`);
      const result = calculateLineShares(line); if (result.error) errors.push(`รายการย่อยที่ ${i + 1}: ${result.error}`);
    });
    const lineTotal = round2(receipt.lines.reduce((sum, line) => sum + line.amount, 0));
    if (Math.abs(lineTotal - receipt.total) > EPSILON) errors.push(`ยอดรายการย่อยรวม ${money(lineTotal)} ไม่ตรงกับยอดใบเสร็จ ${money(receipt.total)}`);
    return errors;
  }

  function showReceiptPreview() {
    const receipt = collectReceiptForm();
    const errors = validateReceipt(receipt);
    el.receiptValidation.classList.toggle("hidden", !errors.length);
    el.receiptValidation.innerHTML = errors.length ? `<strong>กรุณาตรวจสอบ:</strong><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : "";
    el.previewSection.classList.remove("hidden");
    el.previewContent.innerHTML = receipt.lines.map((line) => {
      const result = calculateLineShares(line);
      return `<article class="preview-line-card"><div><strong>${esc(line.description || "ยังไม่ระบุ")}</strong><span>${esc(CATEGORY_LABELS[line.category])} · ${esc(SPLIT_LABELS[line.splitMode])} · ${money(line.amount)}</span></div><div class="preview-share-chips">${result.error ? `<span class="inline-error">${esc(result.error)}</span>` : Object.entries(result.shares).map(([id, amount]) => `<span>${esc(participantById(id)?.name || id)} ${money(amount)}</span>`).join("")}</div></article>`;
    }).join("") || `<div class="empty-state">ยังไม่มีรายการย่อย</div>`;
    el.previewSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return !errors.length;
  }

  async function fileToReceiptPayload(file) {
    if (!file) return null;
    const resized = await resizeImage(file, 1600, 0.82);
    return { name: file.name, mimeType: "image/jpeg", dataBase64: resized.split(",")[1] };
  }

  function resizeImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image(); img.onerror = reject;
        img.onload = () => {
          let { width, height } = img; const scale = Math.min(1, maxSize / Math.max(width, height)); width = Math.round(width * scale); height = Math.round(height * scale);
          const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function addParticipant(payload) {
    if (IS_DEMO) { state.participants.push({ ...payload, id: uid("p"), active: true, createdAt: new Date().toISOString() }); saveDemo(); }
    else Object.assign(state, (await apiPost("addParticipant", payload)).data);
  }

  async function addReceipt(payload) {
    if (IS_DEMO) {
      const receipt = { ...payload, receiptUrl: payload.receiptImage?.dataBase64 ? `data:${payload.receiptImage.mimeType};base64,${payload.receiptImage.dataBase64}` : "", receiptThumbnailUrl: "", createdAt: new Date().toISOString() };
      state.receipts.push({ id: receipt.id, date: receipt.date, merchant: receipt.merchant, total: receipt.total, note: receipt.note, payerContributions: receipt.payerContributions, receiptUrl: receipt.receiptUrl, receiptThumbnailUrl: receipt.receiptUrl, createdAt: receipt.createdAt });
      receipt.lines.forEach((line) => {
        state.expenseLines.push({ ...line, receiptId: receipt.id });
        const result = calculateLineShares(line);
        Object.entries(result.shares).forEach(([participantId, amount]) => state.expenseShares.push({ id: uid("share"), receiptId: receipt.id, lineId: line.id, participantId, amount }));
      });
      saveDemo();
    } else Object.assign(state, (await apiPost("addReceipt", payload)).data);
  }

  async function addSettlement(payload) {
    if (IS_DEMO) { state.settlements.push({ ...payload, id: uid("settle"), createdAt: new Date().toISOString() }); saveDemo(); }
    else Object.assign(state, (await apiPost("addSettlement", payload)).data);
  }

  function resetReceiptForm() {
    el.receiptForm.reset(); el.receiptDate.value = state.settings.startDate || isoToday(); el.payerRows.innerHTML = ""; el.expenseLineRows.innerHTML = "";
    addPayerRow(); addExpenseLine(); updateBuilderTotals(); el.previewSection.classList.add("hidden"); el.receiptValidation.classList.add("hidden");
  }

  function calculateSummary() {
    const participants = activeParticipants();
    const responsibility = Object.fromEntries(participants.map((p) => [p.id, 0]));
    state.expenseShares.forEach((share) => { if (responsibility[share.participantId] !== undefined) responsibility[share.participantId] += Number(share.amount || 0); });
    const paid = Object.fromEntries(participants.map((p) => [p.id, 0]));
    state.receipts.forEach((receipt) => (receipt.payerContributions || []).forEach((p) => { if (paid[p.participantId] !== undefined) paid[p.participantId] += Number(p.amount || 0); }));
    const sent = Object.fromEntries(participants.map((p) => [p.id, 0]));
    const received = Object.fromEntries(participants.map((p) => [p.id, 0]));
    state.settlements.forEach((s) => { if (sent[s.fromParticipantId] !== undefined) sent[s.fromParticipantId] += Number(s.amount || 0); if (received[s.toParticipantId] !== undefined) received[s.toParticipantId] += Number(s.amount || 0); });
    const rows = participants.map((p) => ({
      ...p, responsibility: round2(responsibility[p.id]), paid: round2(paid[p.id]), sent: round2(sent[p.id]), received: round2(received[p.id]),
      net: round2(paid[p.id] + sent[p.id] - received[p.id] - responsibility[p.id])
    }));
    return { rows, totalNet: round2(rows.reduce((sum, row) => sum + row.net, 0)) };
  }

  function transferRecommendations(rows) {
    const debtors = rows.filter((r) => r.net < -EPSILON).map((r) => ({ id: r.id, name: r.name, amount: round2(-r.net) })).sort((a, b) => b.amount - a.amount);
    const creditors = rows.filter((r) => r.net > EPSILON).map((r) => ({ id: r.id, name: r.name, amount: round2(r.net) })).sort((a, b) => b.amount - a.amount);
    const result = []; let i = 0; let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = round2(Math.min(debtors[i].amount, creditors[j].amount));
      if (amount > 0) result.push({ from: debtors[i], to: creditors[j], amount });
      debtors[i].amount = round2(debtors[i].amount - amount); creditors[j].amount = round2(creditors[j].amount - amount);
      if (debtors[i].amount <= EPSILON) i++; if (creditors[j].amount <= EPSILON) j++;
    }
    return result;
  }

  function renderReceipts() {
    if (!state.receipts.length) { el.receiptCards.className = "receipt-card-list empty-state"; el.receiptCards.textContent = "ยังไม่มีใบเสร็จ"; return; }
    el.receiptCards.className = "receipt-card-list";
    const sorted = [...state.receipts].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
    el.receiptCards.innerHTML = sorted.map((receipt) => {
      const lines = state.expenseLines.filter((line) => line.receiptId === receipt.id);
      const payers = (receipt.payerContributions || []).map((p) => `${participantById(p.participantId)?.name || "ไม่พบชื่อ"} ${money(p.amount)}`).join(" · ");
      return `<article class="receipt-card">
        <div class="receipt-card-head"><div><span>${dateLabel(receipt.date)}</span><h3>${esc(receipt.merchant)}</h3><small>ผู้สำรองจ่าย: ${esc(payers || "-")}</small></div><strong>${money(receipt.total)}</strong></div>
        ${receipt.note ? `<p class="receipt-note">${esc(receipt.note)}</p>` : ""}
        <div class="receipt-line-list">${lines.map((line) => `<div class="receipt-line-row"><div><span class="category-pill category-${esc(line.category)}">${esc(CATEGORY_LABELS[line.category] || line.category)}</span><strong>${esc(line.description)}</strong><small>${esc(SPLIT_LABELS[line.splitMode] || line.splitMode)}</small></div><strong>${money(line.amount)}</strong></div>`).join("")}</div>
        ${receipt.receiptUrl ? `<a class="btn btn-secondary receipt-view-btn" href="${esc(receipt.receiptUrl)}" target="_blank" rel="noopener">ดูรูปใบเสร็จ</a>` : ""}
      </article>`;
    }).join("");
  }

  function renderSettlements() {
    const sorted = [...state.settlements].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    el.settlementTableBody.innerHTML = sorted.length ? sorted.map((s) => `<tr><td>${dateLabel(s.date)}</td><td>${esc(participantById(s.fromParticipantId)?.name || "-")}</td><td>${esc(participantById(s.toParticipantId)?.name || "-")}</td><td>${esc(s.note || "-")}</td><td class="text-right"><strong>${money(s.amount)}</strong></td></tr>`).join("") : `<tr><td colspan="5" class="table-empty">ยังไม่มีรายการชำระคืน</td></tr>`;
  }

  function renderSummary() {
    const summary = calculateSummary();
    el.personSummaryBody.innerHTML = summary.rows.length ? summary.rows.map((r) => {
      const cls = Math.abs(r.net) <= EPSILON ? "net-zero" : r.net > 0 ? "net-positive" : "net-negative";
      const text = Math.abs(r.net) <= EPSILON ? "ยอดพอดี" : r.net > 0 ? `ควรได้รับคืน ${money(r.net)}` : `ต้องจ่ายเพิ่ม ${money(-r.net)}`;
      return `<tr><td><strong>${esc(r.name)}</strong></td><td class="text-right">${money(r.responsibility)}</td><td class="text-right">${money(r.paid)}</td><td class="text-right">${money(r.sent)}</td><td class="text-right">${money(r.received)}</td><td class="text-right"><span class="net-pill ${cls}">${text}</span></td></tr>`;
    }).join("") : `<tr><td colspan="6" class="table-empty">ยังไม่มีข้อมูล</td></tr>`;
    el.integrityBox.classList.toggle("hidden", Math.abs(summary.totalNet) <= EPSILON);
    el.integrityBox.textContent = Math.abs(summary.totalNet) > EPSILON ? `ยอดสุทธิรวมไม่เป็นศูนย์ (${money(summary.totalNet)}) กรุณาตรวจสอบยอดใบเสร็จ ผู้สำรองจ่าย หรือข้อมูลที่อ้างถึงรายชื่อที่ถูกลบ` : "";
    const recommendations = transferRecommendations(summary.rows);
    el.transferRecommendationBody.innerHTML = recommendations.length ? recommendations.map((r) => `<tr><td><strong>${esc(r.from.name)}</strong></td><td>${esc(r.to.name)}</td><td class="text-right"><strong>${money(r.amount)}</strong></td></tr>`).join("") : `<tr><td colspan="3" class="table-empty">ยอดชำระครบแล้ว หรือยังไม่มีข้อมูลเพียงพอ</td></tr>`;
    el.openBalance.textContent = money(summary.rows.filter((r) => r.net < 0).reduce((sum, r) => sum + -r.net, 0));
  }

  function renderHeaderAndCards() {
    const dates = buildDateRange(state.settings.startDate, state.settings.endDate);
    el.appTitle.textContent = state.settings.eventName || CONFIG.APP_NAME || "Trip Cost Share";
    el.eventDateLabel.textContent = dates.length ? `${dateLabel(dates[0])} – ${dateLabel(dates.at(-1))}` : "ยังไม่ได้ตั้งช่วงกิจกรรม";
    el.receiptShareTitle.textContent = el.summaryShareTitle.textContent = el.appTitle.textContent;
    el.receiptShareSubtitle.textContent = el.summaryShareSubtitle.textContent = el.eventDateLabel.textContent;
    el.participantCount.textContent = activeParticipants().length.toLocaleString("th-TH");
    el.attendanceUnitCount.textContent = `รวม ${activeParticipants().reduce((sum, p) => sum + (p.attendanceDates || []).length, 0)} คน-วัน`;
    el.grandTotal.textContent = money(state.receipts.reduce((sum, r) => sum + Number(r.total || 0), 0));
    el.receiptCount.textContent = `${state.receipts.length} ใบเสร็จ`;
    el.settlementTotal.textContent = money(state.settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0));
    el.settlementCount.textContent = `${state.settlements.length} รายการ`;
    const closed = String(state.settings.status || "open") === "closed";
    [el.participantForm, el.receiptForm, el.settlementForm].forEach((form) => {
      form.querySelectorAll("input,select,button").forEach((node) => { node.disabled = closed; });
    });
    if (closed) {
      setConnection("warning", "กิจกรรมปิดยอดแล้ว");
      el.demoBanner.classList.remove("hidden");
      el.demoBanner.innerHTML = "<strong>กิจกรรมปิดยอดแล้ว:</strong> สามารถดูและแชร์ข้อมูลได้ แต่ต้องเปิดกิจกรรมจากหน้าหลังบ้านก่อนเพิ่มข้อมูลใหม่";
    }
  }

  function renderSelectors() {
    const options = participantOptions();
    el.settlementFrom.innerHTML = options; el.settlementTo.innerHTML = options;
    el.payerRows.querySelectorAll(".payer-person").forEach((select) => { const current = select.value; select.innerHTML = participantOptions(current); });
    el.expenseLineRows.querySelectorAll(".expense-line-card").forEach((card) => renderLineParticipantOptions(card, card.querySelectorAll(".share-person-check:checked").length > 0));
  }

  function renderAll() {
    renderDateOptions(); renderHeaderAndCards(); renderParticipants(); renderSelectors(); renderReceipts(); renderSettlements(); renderSummary();
  }

  async function shareSection(sectionId, filename) {
    const node = $(sectionId);
    if (!window.html2canvas) { showToast("ไม่สามารถโหลดระบบสร้างรูปได้"); return; }
    const canvas = await html2canvas(node, { scale: Math.min(2, window.devicePixelRatio || 1), backgroundColor: "#ffffff", useCORS: true });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: el.appTitle.textContent });
    else { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
  }

  el.participantForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const attendanceDates = [...el.attendanceDateOptions.querySelectorAll("input:checked")].map((i) => i.value);
    const lodgingNights = [...el.lodgingNightOptions.querySelectorAll("input:checked")].map((i) => i.value);
    if (!attendanceDates.length) { showToast("กรุณาเลือกวันที่เข้าร่วมอย่างน้อย 1 วัน"); return; }
    setBusy(true);
    try {
      await addParticipant({ name: el.participantName.value.trim(), attendanceDates, lodgingNights, drinksAlcohol: el.drinksAlcohol.checked });
      el.participantForm.reset(); renderAll(); resetReceiptForm(); showToast("เพิ่มรายชื่อแล้ว");
    } catch (error) { showToast(error.message); } finally { setBusy(false); }
  });

  el.receiptDate.addEventListener("change", () => el.expenseLineRows.querySelectorAll(".expense-line-card").forEach((card) => {
    if (card.querySelector(".line-split-mode").value === "attendance_date") renderLineParticipantOptions(card, false);
  }));
  el.receiptTotal.addEventListener("input", updateBuilderTotals);
  el.addPayerBtn.addEventListener("click", () => addPayerRow());
  el.addLineBtn.addEventListener("click", () => addExpenseLine());
  el.previewReceiptBtn.addEventListener("click", showReceiptPreview);

  el.receiptForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const receipt = collectReceiptForm();
    const errors = validateReceipt(receipt);
    if (errors.length) { showReceiptPreview(); showToast("กรุณาแก้ข้อมูลก่อนบันทึก"); return; }
    setBusy(true);
    try {
      receipt.receiptImage = await fileToReceiptPayload(el.receiptImage.files[0]);
      await addReceipt(receipt); renderAll(); resetReceiptForm(); showToast("บันทึกใบเสร็จและผลการหารแล้ว");
    } catch (error) { console.error(error); showToast(error.message); } finally { setBusy(false); }
  });

  el.settlementForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (el.settlementFrom.value === el.settlementTo.value) { showToast("ผู้โอนและผู้รับต้องเป็นคนละคน"); return; }
    setBusy(true);
    try {
      await addSettlement({ date: el.settlementDate.value, fromParticipantId: el.settlementFrom.value, toParticipantId: el.settlementTo.value, amount: round2(el.settlementAmount.value), note: el.settlementNote.value.trim() });
      el.settlementForm.reset(); el.settlementDate.value = isoToday(); renderAll(); showToast("บันทึกการชำระคืนแล้ว");
    } catch (error) { showToast(error.message); } finally { setBusy(false); }
  });

  el.shareReceiptsBtn.addEventListener("click", () => shareSection("receiptShareSection", "expense-receipts.png"));
  el.shareSummaryBtn.addEventListener("click", () => shareSection("summaryShareSection", "expense-summary.png"));
  el.refreshBtn.addEventListener("click", loadData);

  el.settlementDate.value = isoToday();
  addPayerRow(); addExpenseLine();
  loadData();
})();
