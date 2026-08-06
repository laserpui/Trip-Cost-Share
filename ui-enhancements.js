(() => {
  "use strict";

  const ICONS = {
    "refresh-cw": '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    "shield-check": '<path d="M12 3 4.5 6v5.4c0 4.8 3.2 8.2 7.5 9.6 4.3-1.4 7.5-4.8 7.5-9.6V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
    "arrow-left": '<path d="m15 18-6-6 6-6"/><path d="M9 12h10"/>',
    "log-in": '<path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/><path d="m14 8 4 4-4 4"/><path d="M18 12H9"/>',
    "log-out": '<path d="M14 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4"/><path d="m10 8-4 4 4 4"/><path d="M6 12h9"/>',
    "user-plus": '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6"/><path d="M18 8v6"/><path d="M15 11h6"/>',
    "circle-plus": '<circle cx="12" cy="12" r="9"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    "list-plus": '<path d="M8 7h8"/><path d="M8 12h5"/><path d="M8 17h4"/><circle cx="4" cy="7" r=".8" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r=".8" fill="currentColor" stroke="none"/><circle cx="4" cy="17" r=".8" fill="currentColor" stroke="none"/><path d="M18 14v6"/><path d="M15 17h6"/>',
    "scan-search": '<path d="M4 8V5a1 1 0 0 1 1-1h3"/><path d="M16 4h3a1 1 0 0 1 1 1v3"/><path d="M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="11" cy="11" r="3"/><path d="m13.2 13.2 3 3"/>',
    "save": '<path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8V4"/><path d="M8 20v-6h8v6"/>',
    "send": '<path d="m3 11 17-8-6 18-3-7-8-3Z"/><path d="m11 14 9-11"/>',
    "settings": '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 0 0-1.7 1L5 6.1 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/>',
    "share-2": '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.9 7.6-4.7"/><path d="m8.2 13.1 7.6 4.7"/>',
    "image": '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 20"/>',
    "pencil": '<path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m13.8 7.2 3 3"/>',
    "trash-2": '<path d="M4 7h16"/><path d="m9 7 .7-3h4.6l.7 3"/><path d="m6 7 1 13h10l1-13"/><path d="M10 11v5"/><path d="M14 11v5"/>',
    "x": '<path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
    "lock-keyhole": '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1"/><path d="M12 16v2"/>',
    "lock-open": '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M9 10V7a4 4 0 0 1 7.5-2"/><circle cx="12" cy="15" r="1"/><path d="M12 16v2"/>',
    "users": '<circle cx="9" cy="8" r="3"/><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6"/><circle cx="17" cy="9" r="2"/><path d="M15 15c3 0 5 1.5 5.5 5"/>',
    "receipt-text": '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/>',
    "clipboard-check": '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2"/><path d="m9 13 2 2 4-4"/>',
    "hand-coins": '<circle cx="16" cy="7" r="3"/><path d="M3 14h4l3 3h5l5-3"/><path d="M3 18h9"/><path d="M7 14c1-2 3-3 5-2l3 1"/>',
    "chart": '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    "route": '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3"/>',
    "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4"/><path d="M17 3v4"/><path d="M3 10h18"/><path d="M9 14h2"/><path d="M13 14h2"/><path d="M9 17h2"/>',
    "wallet": '<path d="M4 7h14a2 2 0 0 1 2 2v9H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M20 11h-5a2 2 0 0 0 0 4h5"/>',
    "badge-check": '<path d="m12 3 2 2.2 3-.2.8 2.9 2.5 1.6-1.2 2.8 1.2 2.8-2.5 1.6-.8 2.9-3-.2-2 2.2-2-2.2-3 .2-.8-2.9-2.5-1.6 1.2-2.8-1.2-2.8 2.5-1.6.8-2.9 3 .2L12 3Z"/><path d="m9 12 2 2 4-4"/>',
    "landmark": '<path d="m3 10 9-6 9 6"/><path d="M5 10v8"/><path d="M9 10v8"/><path d="M15 10v8"/><path d="M19 10v8"/><path d="M3 18h18"/><path d="M2 21h20"/>'
  };

  const buttonIcons = [
    [/รีเฟรช/, "refresh-cw"], [/หลังบ้าน/, "shield-check"], [/กลับหน้าหลัก/, "arrow-left"],
    [/เข้าสู่ระบบ/, "log-in"], [/ออกจากระบบ/, "log-out"], [/เพิ่มรายชื่อ|เพิ่มผู้ร่วม/, "user-plus"],
    [/เพิ่มผู้จ่าย/, "circle-plus"], [/เพิ่มรายการย่อย|เพิ่มรายการ$/, "list-plus"],
    [/ตรวจสอบการหาร|ตรวจสอบก่อนปิดยอด/, "scan-search"], [/ยืนยันบันทึกใบเสร็จ|บันทึกใบเสร็จ/, "save"],
    [/บันทึกการโอน|เพิ่มรายการโอน/, "send"], [/บันทึกการตั้งค่า/, "settings"],
    [/แชร์เป็นรูป/, "share-2"], [/ดูรูปเดิม|ดูใบเสร็จ|เปิดใบเสร็จ/, "image"],
    [/แก้ไข/, "pencil"], [/ลบรายการ|ลบ$/, "trash-2"], [/ยกเลิก/, "x"],
    [/ปิดยอด|ล็อกกิจกรรม/, "lock-keyhole"], [/เปิดกิจกรรม|เปิดรับข้อมูล/, "lock-open"], [/บันทึก$/, "save"]
  ];

  const headingIcons = [
    [/เพิ่มผู้ร่วมกิจกรรม|จัดการผู้ร่วมกิจกรรม|แก้ไขผู้ร่วมกิจกรรม/, "users"],
    [/บันทึกใบเสร็จ|ใบเสร็จและรายการค่าใช้จ่าย|จัดการใบเสร็จ|แก้ไขใบเสร็จ/, "receipt-text"],
    [/ตัวอย่างยอดก่อนบันทึก|ตรวจสอบ/, "clipboard-check"],
    [/บันทึกการชำระคืน|จัดการรายการชำระคืน|แก้ไขการชำระคืน/, "hand-coins"],
    [/สรุปยอดรายบุคคล/, "chart"], [/รายการโอนที่แนะนำ|คำแนะนำการโอน/, "route"],
    [/ตั้งค่ากิจกรรม/, "calendar"], [/เข้าสู่ระบบหลังบ้าน|ผู้ดูแลระบบ/, "shield-check"]
  ];

  const metricIcons = [
    [/ผู้ร่วมกิจกรรม/, "users"], [/ค่าใช้จ่ายทั้งหมด/, "wallet"],
    [/บันทึกชำระคืนแล้ว/, "badge-check"], [/ยอดรอตัดบัญชี/, "landmark"]
  ];

  function findIcon(text, mappings) {
    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    const match = mappings.find(([pattern]) => pattern.test(normalized));
    return match ? match[1] : null;
  }

  function createIcon(name, className) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add(className);
    svg.innerHTML = ICONS[name] || ICONS["circle-plus"];
    return svg;
  }

  function injectIcon(element, icon, className = "ui-icon") {
    if (!element || !icon || element.querySelector(`.${className}`)) return;
    element.prepend(createIcon(icon, className));
  }

  function enhanceButtons() {
    document.querySelectorAll("button.btn, a.btn").forEach((button) => {
      if (button.querySelector(".ui-icon")) return;
      const icon = findIcon(button.textContent, buttonIcons);
      if (icon) injectIcon(button, icon);
    });
  }

  function enhanceHeadings() {
    document.querySelectorAll(".panel-heading h2").forEach((heading) => {
      if (heading.closest(".heading-with-icon")) return;
      const icon = findIcon(heading.textContent, headingIcons);
      if (!icon) return;
      const wrapper = document.createElement("span");
      wrapper.className = "heading-with-icon";
      heading.parentNode.insertBefore(wrapper, heading);
      wrapper.appendChild(heading);
      wrapper.prepend(createIcon(icon, "heading-icon"));
    });
  }

  function enhanceMetrics() {
    document.querySelectorAll(".summary-card > span:first-child").forEach((label) => {
      if (label.querySelector(".metric-icon")) return;
      const icon = findIcon(label.textContent, metricIcons);
      if (icon) injectIcon(label, icon, "metric-icon");
    });
  }

  let scheduled = false;
  function enhanceUI() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceButtons();
      enhanceHeadings();
      enhanceMetrics();
    });
  }

  document.documentElement.classList.add("modern-ui");
  document.addEventListener("DOMContentLoaded", enhanceUI, { once: true });
  new MutationObserver(enhanceUI).observe(document.documentElement, { childList: true, subtree: true });
})();
