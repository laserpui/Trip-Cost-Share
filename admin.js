(() => {
  "use strict";

  const CONFIG = window.APP_CONFIG || {};
  const API_URL = String(CONFIG.API_URL || "").trim();
  const IS_DEMO = !/^https:\/\/script\.google\.com\/macros\/s\//.test(API_URL);
  const STORAGE_KEY = "trip-cost-share-v5-demo";
  const TOKEN_KEY = "trip-cost-share-v5-admin-token";
  const ADMIN_SNAPSHOT_KEY = "trip-cost-share-v5.6-admin-snapshot";
  const EPSILON = 0.011;
  const state = { settings: {}, participants: [], receipts: [], expenseLines: [], expenseShares: [] };
  let adminToken = sessionStorage.getItem(TOKEN_KEY) || "";

  const $ = (id) => document.getElementById(id);
  const el = {
    badge: $("adminConnectionBadge"), loginSection: $("adminLoginSection"), app: $("adminApp"), demo: $("adminDemoBanner"),
    loginForm: $("adminLoginForm"), password: $("adminPassword"), refresh: $("adminRefreshBtn"), logout: $("adminLogoutBtn"), toast: $("toast"),
    participantCount: $("adminParticipantCount"), receiptCount: $("adminReceiptCount"), grandTotal: $("adminGrandTotal"), statusText: $("adminStatusText"),
    settingsForm: $("adminSettingsForm"), eventName: $("adminEventName"), startDate: $("adminStartDate"), endDate: $("adminEndDate"), eventStatus: $("adminEventStatus"), settingsSubmit: $("adminSettingsSubmitBtn"), settingsFeedback: $("adminSettingsFeedback"),
    participantForm: $("adminParticipantForm"), participantId: $("adminParticipantId"), participantName: $("adminParticipantName"), attendance: $("adminAttendanceOptions"), lodging: $("adminLodgingOptions"), drinks: $("adminDrinksAlcohol"), active: $("adminParticipantActive"), participantSubmit: $("adminParticipantSubmitBtn"), participantCancel: $("adminParticipantCancelBtn"), participantTable: $("adminParticipantTableBody"),
    receiptForm: $("adminReceiptForm"), receiptId: $("adminReceiptId"), receiptDate: $("adminReceiptDate"), receiptMerchant: $("adminReceiptMerchant"), receiptTotal: $("adminReceiptTotal"), receiptImage: $("adminReceiptImage"), receiptNote: $("adminReceiptNote"), existingReceipt: $("adminExistingReceipt"), viewReceipt: $("adminViewReceiptBtn"), removeReceipt: $("adminRemoveReceipt"), addPayer: $("adminAddPayerBtn"), payerRows: $("adminPayerRows"), addLine: $("adminAddLineBtn"), lineRows: $("adminLineRows"), receiptValidation: $("adminReceiptValidation"), receiptSubmit: $("adminReceiptSubmitBtn"), receiptCancel: $("adminReceiptCancelBtn"), receiptTable: $("adminReceiptTableBody")
  };

  function money(value) { return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 }).format(Number(value || 0)); }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }
  function round2(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
  function uid(prefix) { return `${prefix}_${crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`; }

  // Keep date-only values independent from the browser timezone.
  function parseIsoDateUtc(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  }
  function isoFromUtcDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
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
  function normalizeSettingDate(value) {
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function activePeople() { return state.participants.filter((p) => p.active !== false); }
  function person(id) { return state.participants.find((p) => p.id === id); }
  function showToast(message) { el.toast.textContent = message; el.toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2800); }
  function setBusy(value) {
    document.querySelectorAll("#adminSettingsForm button, #adminParticipantForm button, #adminReceiptForm button, [data-edit-person], [data-delete-person], [data-edit-receipt], [data-delete-receipt]").forEach((button) => { button.disabled = value; });
  }
  function setBadge(kind, text) { el.badge.className = `badge badge-${kind}`; el.badge.textContent = text; }
  function buildDateRange(start, end) { const cursor = parseIsoDateUtc(start); const stop = parseIsoDateUtc(end); if (!cursor || !stop) return []; const out = []; while (cursor <= stop && out.length < 31) { out.push(isoFromUtcDate(cursor)); cursor.setUTCDate(cursor.getUTCDate() + 1); } return out; }
  function saveDemo() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadDemo() { const raw = localStorage.getItem(STORAGE_KEY); if (raw) Object.assign(state, JSON.parse(raw)); }

  async function apiPost(action, payload = {}) {
    const response = await fetch(API_URL, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, payload, token: adminToken }) });
    const result = await response.json();
    if (!result.ok) { if (result.code === "AUTH_REQUIRED") logoutLocal(); throw new Error(result.message || "ทำรายการไม่สำเร็จ"); }
    return result;
  }

  async function login(password) {
    if (IS_DEMO) { if (password !== "Admin1234") throw new Error("รหัส Admin ไม่ถูกต้อง"); adminToken = "demo-token"; }
    else adminToken = (await apiPost("adminLogin", { password })).data.token;
    sessionStorage.setItem(TOKEN_KEY, adminToken); showAdmin(); await loadData();
  }

  function logoutLocal() { adminToken = ""; sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(ADMIN_SNAPSHOT_KEY); el.app.classList.add("hidden"); el.loginSection.classList.remove("hidden"); el.refresh.classList.add("hidden"); el.logout.classList.add("hidden"); setBadge("warning", "รอเข้าสู่ระบบ"); }
  async function logout() { try { if (!IS_DEMO && adminToken) await apiPost("adminLogout"); } catch (_) {} logoutLocal(); }
  function showAdmin() { el.loginSection.classList.add("hidden"); el.app.classList.remove("hidden"); el.refresh.classList.remove("hidden"); el.logout.classList.remove("hidden"); el.demo.classList.toggle("hidden", !IS_DEMO); setBadge("success", "ADMIN พร้อมใช้งาน"); }

  function saveAdminSnapshot() {
    if (IS_DEMO) return;
    try { sessionStorage.setItem(ADMIN_SNAPSHOT_KEY, JSON.stringify({ savedAt: Date.now(), data: state })); } catch (_) {}
  }

  function restoreAdminSnapshot() {
    if (IS_DEMO) return false;
    try {
      const raw = sessionStorage.getItem(ADMIN_SNAPSHOT_KEY);
      if (!raw) return false;
      const snapshot = JSON.parse(raw);
      if (!snapshot?.data) return false;
      Object.assign(state, snapshot.data);
      normalize();
      renderAll();
      setBadge("warning", "กำลังซิงก์ข้อมูล");
      return true;
    } catch (_) { return false; }
  }

  async function loadData(options = {}) {
    const hadSnapshot = options.allowSnapshot !== false && restoreAdminSnapshot();
    const forceFresh = options.forceFresh === true;
    setBusy(true);
    try {
      if (IS_DEMO) loadDemo();
      else Object.assign(state, (await apiPost("adminBootstrap", { fresh: forceFresh })).data);
      normalize();
      renderAll();
      saveAdminSnapshot();
      setBadge("success", "ADMIN พร้อมใช้งาน");
    } catch (error) {
      if (hadSnapshot) {
        setBadge("warning", "แสดงข้อมูลล่าสุดในเครื่อง");
        showToast("ซิงก์ข้อมูลไม่สำเร็จ กำลังแสดงข้อมูลล่าสุดในเครื่อง");
      } else showToast(error.message);
    } finally { setBusy(false); }
  }
  function normalize() {
    ["participants", "receipts", "expenseLines", "expenseShares"].forEach((key) => { if (!Array.isArray(state[key])) state[key] = []; });
    state.settings ||= {};
    state.settings.startDate = normalizeSettingDate(state.settings.startDate);
    state.settings.endDate = normalizeSettingDate(state.settings.endDate);
  }

  function options(selected = "", includeInactive = true) {
    const rows = includeInactive ? state.participants : activePeople();
    return `<option value="">เลือกรายชื่อ</option>${rows.map((p) => `<option value="${esc(p.id)}" ${p.id === selected ? "selected" : ""}>${esc(p.name)}${p.active === false ? " (ปิดใช้งาน)" : ""}</option>`).join("")}`;
  }

  function renderDateChecks(selectedAttendance = [], selectedLodging = []) {
    const dates = buildDateRange(state.settings.startDate, state.settings.endDate); const nights = dates.slice(0, -1);
    el.attendance.innerHTML = dates.map((d) => `<label class="check-card attendance-card"><input type="checkbox" value="${d}" ${selectedAttendance.includes(d) ? "checked" : ""}><span>${dateLabel(d)}</span></label>`).join("");
    el.lodging.innerHTML = nights.map((d) => `<label class="check-card lodging-card"><input type="checkbox" value="${d}" ${selectedLodging.includes(d) ? "checked" : ""}><span>คืน ${dateLabel(d)}</span></label>`).join("") || `<span class="field-hint">ไม่มีคืนพัก</span>`;
  }

  function largestRemainder(amount, weighted) {
    const cents = Math.round(Number(amount || 0) * 100); const valid = weighted.filter((x) => x.weight > 0); const totalWeight = valid.reduce((s, x) => s + x.weight, 0); if (!valid.length || !totalWeight) return {};
    const rows = valid.map((x) => { const raw = cents * x.weight / totalWeight; return { ...x, cents: Math.floor(raw), rem: raw - Math.floor(raw) }; }); let left = cents - rows.reduce((s, x) => s + x.cents, 0); rows.sort((a, b) => b.rem - a.rem || a.id.localeCompare(b.id)); for (let i = 0; i < rows.length && left > 0; i++, left--) rows[i].cents++;
    return Object.fromEntries(rows.map((x) => [x.id, x.cents / 100]));
  }
  function calcShares(line) {
    let ids = [...new Set(line.selectedParticipantIds || [])].filter((id) => state.participants.some((p) => p.id === id));
    if (line.splitMode === "all_equal") ids = activePeople().map((p) => p.id);
    if (!ids.length) return { shares: {}, error: "ยังไม่ได้เลือกผู้รับผิดชอบ" };
    if (line.splitMode === "manual") { const shares = {}; ids.forEach((id) => { shares[id] = round2(line.manualShares?.[id] || 0); }); const total = round2(Object.values(shares).reduce((a, b) => a + b, 0)); return Math.abs(total - line.amount) > EPSILON ? { shares, error: `ยอดรายบุคคลรวม ${money(total)} ไม่ตรงกับยอดรายการ` } : { shares, error: "" }; }
    const weighted = ids.map((id) => ({ id, weight: line.splitMode === "person_days" ? Math.max(1, (person(id)?.attendanceDates || []).length) : line.splitMode === "weighted" ? Number(line.weights?.[id] || 0) : 1 }));
    if (weighted.some((x) => x.weight <= 0)) return { shares: {}, error: "น้ำหนักต้องมากกว่า 0" };
    return { shares: largestRemainder(line.amount, weighted), error: "" };
  }

  function addPayerRow(data = {}) {
    const fragment = $("adminPayerRowTemplate").content.cloneNode(true); const row = fragment.querySelector(".payer-row");
    row.querySelector(".payer-person").innerHTML = options(data.participantId || ""); row.querySelector(".payer-amount").value = data.amount || "";
    row.querySelector(".remove-row-btn").addEventListener("click", () => row.remove()); el.payerRows.appendChild(fragment);
  }

  function shareOption(p, mode, selected, values) {
    const hasValue = mode === "weighted" || mode === "manual"; const value = values[p.id] ?? (mode === "weighted" ? 1 : "");
    return `<label class="participant-share-option"><span class="participant-share-main"><input class="share-person-check" type="checkbox" value="${esc(p.id)}" ${selected.includes(p.id) ? "checked" : ""}><span>${esc(p.name)}</span></span>${hasValue ? `<span class="share-value-wrap"><small>${mode === "manual" ? "บาท" : "หน่วย"}</small><input class="share-person-value" data-person-id="${esc(p.id)}" type="number" min="0" step="0.01" value="${esc(value)}" ${selected.includes(p.id) ? "" : "disabled"}></span>` : ""}</label>`;
  }

  function defaultIds(card) {
    const mode = card.querySelector(".line-split-mode").value; const category = card.querySelector(".line-category").value; const reference = card.querySelector(".line-service-date").value || el.receiptDate.value;
    let people = activePeople(); if (mode === "attendance_date") people = people.filter((p) => (p.attendanceDates || []).includes(el.receiptDate.value)); if (mode === "lodging_night") people = people.filter((p) => (p.lodgingNights || []).includes(reference)); if (category === "alcohol") people = people.filter((p) => p.drinksAlcohol); return people.map((p) => p.id);
  }
  function collectSelection(card) { const ids = [...card.querySelectorAll(".share-person-check:checked")].map((x) => x.value); const values = {}; card.querySelectorAll(".share-person-value").forEach((x) => { if (ids.includes(x.dataset.personId)) values[x.dataset.personId] = Number(x.value || 0); }); return { ids, values }; }
  function renderLinePeople(card, selectedIds, values) {
    const mode = card.querySelector(".line-split-mode").value; let selected = selectedIds || defaultIds(card); if (mode === "all_equal") selected = activePeople().map((p) => p.id);
    const container = card.querySelector(".line-participant-options"); container.innerHTML = state.participants.map((p) => shareOption(p, mode, selected, values || {})).join("");
    container.querySelectorAll(".share-person-check").forEach((check) => { if (mode === "all_equal") check.disabled = true; check.addEventListener("change", () => { const valueInput = container.querySelector(`.share-person-value[data-person-id="${CSS.escape(check.value)}"]`); if (valueInput) valueInput.disabled = !check.checked; refreshLine(card); }); });
    container.querySelectorAll(".share-person-value").forEach((input) => input.addEventListener("input", () => refreshLine(card))); refreshLine(card);
  }
  function updateLineUi(card) {
    const mode = card.querySelector(".line-split-mode").value;
    const input = card.querySelector(".line-service-date");
    const nights = buildDateRange(state.settings.startDate, state.settings.endDate).slice(0, -1);
    card.querySelector(".line-service-date-field").classList.toggle("hidden", mode !== "lodging_night");
    input.min = nights[0] || state.settings.startDate || "";
    input.max = nights.at(-1) || state.settings.startDate || "";
    if (mode === "lodging_night" && nights.length && !nights.includes(input.value)) input.value = nights.includes(el.receiptDate.value) ? el.receiptDate.value : nights.at(-1);
  }
  function collectLine(card) { const mode = card.querySelector(".line-split-mode").value; const sel = collectSelection(card); return { id: card.dataset.lineId, description: card.querySelector(".line-description").value.trim(), category: card.querySelector(".line-category").value, amount: Number(card.querySelector(".line-amount").value || 0), splitMode: mode, serviceDate: card.querySelector(".line-service-date").value || el.receiptDate.value, selectedParticipantIds: sel.ids, weights: mode === "weighted" ? sel.values : {}, manualShares: mode === "manual" ? sel.values : {} }; }
  function refreshLine(card) { const line = collectLine(card); const result = calcShares(line); card.querySelector(".line-preview").innerHTML = !line.amount ? "" : result.error ? `<div class="inline-error">${esc(result.error)}</div>` : `<div class="mini-share-list">${Object.entries(result.shares).map(([id, amount]) => `<span>${esc(person(id)?.name || id)} <strong>${money(amount)}</strong></span>`).join("")}</div>`; }
  function renumber() { [...el.lineRows.querySelectorAll(".expense-line-card")].forEach((card, i) => { card.querySelector(".line-number").textContent = `รายการที่ ${i + 1}`; }); }
  function addLine(data = {}) {
    const fragment = $("adminLineTemplate").content.cloneNode(true); const card = fragment.querySelector(".expense-line-card"); card.dataset.lineId = data.id || uid("line");
    card.querySelector(".line-description").value = data.description || ""; card.querySelector(".line-category").value = data.category || "food"; card.querySelector(".line-amount").value = data.amount || ""; card.querySelector(".line-split-mode").value = data.splitMode || "attendance_date"; card.querySelector(".line-service-date").value = data.serviceDate || el.receiptDate.value;
    card.querySelector(".remove-line-btn").addEventListener("click", () => { card.remove(); renumber(); }); card.querySelectorAll(".line-description,.line-amount").forEach((node) => node.addEventListener("input", () => refreshLine(card))); card.querySelector(".line-category").addEventListener("change", () => renderLinePeople(card)); card.querySelector(".line-split-mode").addEventListener("change", () => { updateLineUi(card); renderLinePeople(card); }); card.querySelector(".line-service-date").addEventListener("change", () => renderLinePeople(card));
    el.lineRows.appendChild(fragment); updateLineUi(card); renderLinePeople(card, data.selectedParticipantIds, data.weights || data.manualShares || {}); renumber();
  }

  function collectReceipt() { return { id: el.receiptId.value || uid("receipt"), date: el.receiptDate.value, merchant: el.receiptMerchant.value.trim(), total: round2(el.receiptTotal.value), note: el.receiptNote.value.trim(), removeReceipt: el.removeReceipt.checked, payerContributions: [...el.payerRows.querySelectorAll(".payer-row")].map((row) => ({ participantId: row.querySelector(".payer-person").value, amount: round2(row.querySelector(".payer-amount").value) })), lines: [...el.lineRows.querySelectorAll(".expense-line-card")].map(collectLine) }; }
  function validateReceipt(r) {
    const errors = []; if (!r.date || !r.merchant || !(r.total > 0)) errors.push("ข้อมูลใบเสร็จยังไม่ครบ"); if (!r.payerContributions.length) errors.push("ยังไม่มีผู้สำรองจ่าย");
    if (Math.abs(round2(r.payerContributions.reduce((s, p) => s + p.amount, 0)) - r.total) > EPSILON) errors.push("ยอดผู้สำรองจ่ายรวมไม่ตรงกับยอดใบเสร็จ"); if (!r.lines.length) errors.push("ยังไม่มีรายการย่อย"); if (Math.abs(round2(r.lines.reduce((s, x) => s + x.amount, 0)) - r.total) > EPSILON) errors.push("ยอดรายการย่อยรวมไม่ตรงกับยอดใบเสร็จ"); r.lines.forEach((line, i) => { const result = calcShares(line); if (!line.description || !(line.amount > 0) || result.error) errors.push(`รายการที่ ${i + 1}: ${result.error || "ข้อมูลไม่ครบ"}`); }); return errors;
  }
  async function imagePayload(file) { if (!file) return null; const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => { const img = new Image(); img.onerror = reject; img.onload = () => { const scale = Math.min(1, 1600 / Math.max(img.width, img.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL("image/jpeg", .82)); }; img.src = reader.result; }; reader.readAsDataURL(file); }); return { name: file.name, mimeType: "image/jpeg", dataBase64: dataUrl.split(",")[1] }; }

  async function saveAction(action, payload) {
    if (IS_DEMO) {
      if (action === "adminUpdateSettings") state.settings = { ...state.settings, ...payload };
      if (action === "adminSaveParticipant") { const i = state.participants.findIndex((x) => x.id === payload.id); const item = { ...payload, id: payload.id || uid("p"), updatedAt: new Date().toISOString(), createdAt: payload.createdAt || new Date().toISOString() }; if (i >= 0) state.participants[i] = item; else state.participants.push(item); }
      if (action === "adminDeleteParticipant") {
        const referenced = state.expenseShares.some((x) => x.participantId === payload.id) || state.receipts.some((r) => (r.payerContributions || []).some((x) => x.participantId === payload.id));
        if (referenced) throw new Error("รายชื่อนี้มีข้อมูลค่าใช้จ่ายอ้างอิงอยู่ กรุณาแก้รายการที่เกี่ยวข้องก่อนลบ");
        state.participants = state.participants.filter((x) => x.id !== payload.id);
      }
      if (action === "adminDeleteReceipt") { state.receipts = state.receipts.filter((x) => x.id !== payload.id); state.expenseLines = state.expenseLines.filter((x) => x.receiptId !== payload.id); state.expenseShares = state.expenseShares.filter((x) => x.receiptId !== payload.id); }
      if (action === "adminSaveReceipt") {
        const i = state.receipts.findIndex((x) => x.id === payload.id); const prior = i >= 0 ? state.receipts[i] : {}; const receipt = { ...prior, id: payload.id, date: payload.date, merchant: payload.merchant, total: payload.total, note: payload.note, payerContributions: payload.payerContributions, receiptUrl: payload.receiptImage ? `data:${payload.receiptImage.mimeType};base64,${payload.receiptImage.dataBase64}` : payload.removeReceipt ? "" : prior.receiptUrl || "" };
        if (i >= 0) state.receipts[i] = receipt; else state.receipts.push(receipt); state.expenseLines = state.expenseLines.filter((x) => x.receiptId !== payload.id); state.expenseShares = state.expenseShares.filter((x) => x.receiptId !== payload.id);
        payload.lines.forEach((line) => { state.expenseLines.push({ ...line, receiptId: payload.id }); const result = calcShares(line); Object.entries(result.shares).forEach(([participantId, amount]) => state.expenseShares.push({ id: uid("share"), receiptId: payload.id, lineId: line.id, participantId, amount })); });
      }
      saveDemo(); return;
    }
    Object.assign(state, (await apiPost(action, payload)).data);
    saveAdminSnapshot();
  }

  function renderSettings() { el.eventName.value = state.settings.eventName || ""; el.startDate.value = state.settings.startDate || ""; el.endDate.value = state.settings.endDate || ""; el.eventStatus.value = state.settings.status || "open"; renderDateChecks(); }
  function renderCards() { el.participantCount.textContent = activePeople().length; el.receiptCount.textContent = state.receipts.length; el.grandTotal.textContent = money(state.receipts.reduce((s, x) => s + Number(x.total || 0), 0)); el.statusText.textContent = String(state.settings.status || "open").toUpperCase(); }
  function renderTables() {
    el.participantTable.innerHTML = state.participants.length ? state.participants.map((p) => `<tr><td><strong>${esc(p.name)}</strong></td><td>${(p.attendanceDates || []).map(dateLabel).join(", ")}</td><td>${(p.lodgingNights || []).map((d) => `คืน ${dateLabel(d)}`).join(", ") || "-"}</td><td>${p.active === false ? "ปิดใช้งาน" : p.drinksAlcohol ? "ใช้งาน · ปกติดื่ม" : "ใช้งาน · ไม่ดื่ม"}</td><td class="text-right"><button class="btn btn-secondary" data-edit-person="${esc(p.id)}">แก้ไข</button> <button class="btn btn-danger" data-delete-person="${esc(p.id)}">ลบ</button></td></tr>`).join("") : `<tr><td colspan="5" class="table-empty">ยังไม่มีรายชื่อ</td></tr>`;
    el.receiptTable.innerHTML = state.receipts.length ? state.receipts.map((r) => `<tr><td>${dateLabel(r.date)}</td><td><strong>${esc(r.merchant)}</strong></td><td>${state.expenseLines.filter((l) => l.receiptId === r.id).length}</td><td>${r.receiptUrl ? `<a href="${esc(r.receiptUrl)}" target="_blank" rel="noopener">ดูรูป</a>` : "-"}</td><td class="text-right"><strong>${money(r.total)}</strong></td><td class="text-right"><button class="btn btn-secondary" data-edit-receipt="${esc(r.id)}">แก้ไข</button> <button class="btn btn-danger" data-delete-receipt="${esc(r.id)}">ลบ</button></td></tr>`).join("") : `<tr><td colspan="6" class="table-empty">ยังไม่มีใบเสร็จ</td></tr>`;
    bindTableActions();
  }
  function renderSelectors() { el.payerRows.querySelectorAll(".payer-person").forEach((select) => { const current = select.value; select.innerHTML = options(current); }); el.lineRows.querySelectorAll(".expense-line-card").forEach((card) => { const sel = collectSelection(card); renderLinePeople(card, sel.ids.length ? sel.ids : undefined, sel.values); }); }
  function renderAll() { renderSettings(); renderCards(); renderSelectors(); renderTables(); }

  function bindTableActions() {
    document.querySelectorAll("[data-edit-person]").forEach((b) => b.addEventListener("click", () => editParticipant(b.dataset.editPerson)));
    document.querySelectorAll("[data-delete-person]").forEach((b) => b.addEventListener("click", () => deleteParticipant(b.dataset.deletePerson)));
    document.querySelectorAll("[data-edit-receipt]").forEach((b) => b.addEventListener("click", () => editReceipt(b.dataset.editReceipt)));
    document.querySelectorAll("[data-delete-receipt]").forEach((b) => b.addEventListener("click", () => deleteReceipt(b.dataset.deleteReceipt)));
  }
  function editParticipant(id) { const p = person(id); if (!p) return; el.participantId.value = p.id; el.participantName.value = p.name; el.drinks.checked = p.drinksAlcohol; el.active.checked = p.active !== false; renderDateChecks(p.attendanceDates || [], p.lodgingNights || []); el.participantSubmit.textContent = "บันทึกการแก้ไข"; el.participantCancel.classList.remove("hidden"); el.participantForm.scrollIntoView({ block: "start" }); }
  function resetParticipant() { el.participantForm.reset(); el.participantId.value = ""; el.active.checked = true; renderDateChecks(); el.participantSubmit.textContent = "เพิ่มรายชื่อ"; el.participantCancel.classList.add("hidden"); }
  async function deleteParticipant(id) { if (!confirm("ยืนยันการลบรายชื่อนี้? ระบบจะไม่อนุญาตหากมีค่าใช้จ่ายอ้างอิงอยู่")) return; try { await saveAction("adminDeleteParticipant", { id }); renderAll(); showToast("ลบรายชื่อแล้ว"); } catch (e) { showToast(e.message); } }


  function editReceipt(id) {
    const r = state.receipts.find((x) => x.id === id); if (!r) return; el.receiptId.value = r.id; el.receiptDate.value = r.date; el.receiptMerchant.value = r.merchant; el.receiptTotal.value = r.total; el.receiptNote.value = r.note || ""; el.payerRows.innerHTML = ""; (r.payerContributions || []).forEach(addPayerRow); el.lineRows.innerHTML = ""; state.expenseLines.filter((l) => l.receiptId === id).forEach(addLine); el.existingReceipt.classList.toggle("hidden", !r.receiptUrl); el.viewReceipt.onclick = () => window.open(r.receiptUrl, "_blank", "noopener"); el.removeReceipt.checked = false; el.receiptSubmit.textContent = "บันทึกการแก้ไขใบเสร็จ"; el.receiptCancel.classList.remove("hidden"); el.receiptForm.scrollIntoView({ block: "start" });
  }
  function resetReceipt() { el.receiptForm.reset(); el.receiptId.value = ""; el.receiptDate.value = state.settings.startDate || isoToday(); el.payerRows.innerHTML = ""; el.lineRows.innerHTML = ""; addPayerRow(); addLine(); el.existingReceipt.classList.add("hidden"); el.receiptValidation.classList.add("hidden"); el.receiptSubmit.textContent = "บันทึกใบเสร็จ"; el.receiptCancel.classList.add("hidden"); }
  async function deleteReceipt(id) { if (!confirm("ยืนยันการลบใบเสร็จ รายการย่อย ผลการหาร และรูปที่แนบ?")) return; try { await saveAction("adminDeleteReceipt", { id }); renderAll(); showToast("ลบใบเสร็จแล้ว"); } catch (e) { showToast(e.message); } }

  el.loginForm.addEventListener("submit", async (event) => { event.preventDefault(); setBusy(true); try { await login(el.password.value); el.loginForm.reset(); } catch (e) { showToast(e.message); } finally { setBusy(false); } });
  el.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = { eventName: el.eventName.value.trim(), startDate: el.startDate.value, endDate: el.endDate.value, status: el.eventStatus.value };
    el.settingsFeedback.className = "settings-feedback hidden";
    if (!payload.eventName || !payload.startDate || !payload.endDate) return showToast("กรุณากรอกข้อมูลกิจกรรมให้ครบ");
    if (payload.endDate < payload.startDate) return showToast("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม");
    setBusy(true);
    try {
      try { await saveAction("adminUpdateSettings", payload); }
      catch (firstError) {
        if (/Unknown POST action|UNKNOWN_ACTION/i.test(String(firstError.message || ""))) await saveAction("adminSaveSettings", payload);
        else throw firstError;
      }
      normalize();
      const saved = state.settings || {};
      const verified = saved.eventName === payload.eventName && saved.startDate === payload.startDate && saved.endDate === payload.endDate && saved.status === payload.status;
      renderAll();
      el.settingsFeedback.className = `settings-feedback ${verified ? "settings-feedback-success" : "settings-feedback-warning"}`;
      el.settingsFeedback.innerHTML = verified
        ? `<strong>บันทึกกิจกรรมสำเร็จ</strong><span>${esc(saved.eventName)} · ${dateLabel(saved.startDate)} – ${dateLabel(saved.endDate)}</span>`
        : `<strong>บันทึกแล้ว แต่ข้อมูลตอบกลับไม่ตรงกับที่กรอก</strong><span>กรุณา Deploy Apps Script v5.5 เป็น New version แล้วรีเฟรชหน้า Admin</span>`;
      showToast(verified ? "บันทึกกิจกรรมเรียบร้อย" : "กรุณาตรวจสอบ Apps Script Deployment");
    } catch (e) {
      console.error(e);
      el.settingsFeedback.className = "settings-feedback settings-feedback-error";
      el.settingsFeedback.innerHTML = `<strong>บันทึกกิจกรรมไม่สำเร็จ</strong><span>${esc(e.message || "เกิดข้อผิดพลาด")}</span>`;
      showToast(e.message || "บันทึกกิจกรรมไม่สำเร็จ");
    } finally { setBusy(false); }
  });
  el.participantForm.addEventListener("submit", async (event) => { event.preventDefault(); const attendanceDates = [...el.attendance.querySelectorAll("input:checked")].map((x) => x.value); const lodgingNights = [...el.lodging.querySelectorAll("input:checked")].map((x) => x.value); const existing = person(el.participantId.value); const payload = { id: el.participantId.value || uid("p"), name: el.participantName.value.trim(), attendanceDates, lodgingNights, drinksAlcohol: el.drinks.checked, active: el.active.checked, createdAt: existing?.createdAt }; setBusy(true); try { await saveAction("adminSaveParticipant", payload); resetParticipant(); renderAll(); showToast("บันทึกรายชื่อแล้ว"); } catch (e) { showToast(e.message); } finally { setBusy(false); } });
  el.receiptForm.addEventListener("submit", async (event) => { event.preventDefault(); const payload = collectReceipt(); const errors = validateReceipt(payload); el.receiptValidation.classList.toggle("hidden", !errors.length); el.receiptValidation.innerHTML = errors.length ? `<strong>กรุณาตรวจสอบ:</strong><ul>${errors.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""; if (errors.length) return; setBusy(true); try { payload.receiptImage = await imagePayload(el.receiptImage.files[0]); const existing = state.receipts.find((x) => x.id === payload.id); payload.createdAt = existing?.createdAt; await saveAction("adminSaveReceipt", payload); resetReceipt(); renderAll(); showToast("บันทึกใบเสร็จแล้ว"); } catch (e) { showToast(e.message); } finally { setBusy(false); } });

  el.addPayer.addEventListener("click", () => addPayerRow()); el.addLine.addEventListener("click", () => addLine()); el.receiptDate.addEventListener("change", () => el.lineRows.querySelectorAll(".expense-line-card").forEach((card) => { const mode = card.querySelector(".line-split-mode").value; if (mode === "attendance_date") renderLinePeople(card); if (mode === "lodging_night") { updateLineUi(card); renderLinePeople(card); } }));
  el.participantCancel.addEventListener("click", resetParticipant); el.receiptCancel.addEventListener("click", resetReceipt); el.refresh.addEventListener("click", () => loadData({ allowSnapshot: false, forceFresh: true })); el.logout.addEventListener("click", logout);

  addPayerRow(); addLine();
  if (adminToken) { showAdmin(); loadData(); }
})();
