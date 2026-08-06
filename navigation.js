(() => {
  "use strict";

  const publicMeta = {
    dashboard: { kicker: "OVERVIEW", title: "แดชบอร์ด", description: "ภาพรวมกิจกรรม ค่าใช้จ่าย และยอดที่ต้องชำระ" },
    participants: { kicker: "PARTICIPANTS", title: "บันทึกผู้ร่วมกิจกรรม", description: "เพิ่มรายชื่อและกำหนดวันที่เข้าร่วมกิจกรรม" },
    expenses: { kicker: "EXPENSES", title: "บันทึกค่าใช้จ่าย", description: "จัดการใบเสร็จ ผู้สำรองจ่าย และตรวจสอบการหาร" },
    lodging: { kicker: "LODGING & SETTLEMENT", title: "บันทึกข้อมูลที่พัก", description: "กำหนดคืนที่เข้าพักและบันทึกการชำระคืนระหว่างสมาชิก" }
  };

  const adminMeta = {
    overview: { kicker: "ADMIN OVERVIEW", title: "ภาพรวมระบบ", description: "ตรวจสอบและจัดการข้อมูลกิจกรรมทั้งหมด" },
    settings: { kicker: "EVENT SETTINGS", title: "ตั้งค่ากิจกรรม", description: "กำหนดชื่อ ช่วงวันที่ และสถานะการเปิดรับข้อมูล" },
    participants: { kicker: "MEMBER MANAGEMENT", title: "จัดการผู้ร่วมกิจกรรม", description: "เพิ่ม แก้ไข ลบ และกำหนดวันเข้าร่วมหรือคืนที่พัก" },
    receipts: { kicker: "RECEIPT MANAGEMENT", title: "จัดการใบเสร็จและค่าใช้จ่าย", description: "แก้ไขผู้จ่าย รายการย่อย วิธีหาร และรูปใบเสร็จ" },
    settlements: { kicker: "SETTLEMENT MANAGEMENT", title: "จัดการการชำระคืน", description: "เพิ่ม แก้ไข หรือลบรายการโอนระหว่างสมาชิก" }
  };

  const sidebar = document.getElementById("appSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const mobileMenu = document.getElementById("mobileMenuBtn");
  const title = document.getElementById("currentPageTitle");
  const kicker = document.getElementById("currentPageKicker");
  const description = document.getElementById("currentPageDescription");

  function openSidebar() {
    document.body.classList.add("sidebar-open");
    sidebar?.classList.add("open");
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    sidebar?.classList.remove("open");
  }

  mobileMenu?.addEventListener("click", openSidebar);
  overlay?.addEventListener("click", closeSidebar);

  function updateHeader(meta) {
    if (!meta) return;
    if (title) title.textContent = meta.title;
    if (kicker) kicker.textContent = meta.kicker;
    if (description) description.textContent = meta.description;
    document.title = `${meta.title} · Trip Cost Share v5.3`;
  }

  function showPublicPage(page, pushHash = true) {
    if (!publicMeta[page]) page = "dashboard";
    document.querySelectorAll("[data-page]").forEach((section) => section.classList.toggle("active", section.dataset.page === page));
    document.querySelectorAll("[data-page-target]").forEach((link) => link.classList.toggle("active", link.dataset.pageTarget === page && link.classList.contains("app-nav-link")));
    updateHeader(publicMeta[page]);
    if (pushHash && location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "lodging") updateLodgingPreview();
  }

  function updateLodgingPreview() {
    const preview = document.getElementById("lodgingParticipantPreview");
    const name = document.getElementById("participantName")?.value.trim();
    const attendanceCount = document.querySelectorAll("#attendanceDateOptions input:checked").length;
    if (!preview) return;
    preview.textContent = name
      ? `กำลังกำหนดที่พักให้ “${name}” · เข้าร่วม ${attendanceCount} วัน`
      : "กรุณากรอกชื่อผู้ร่วมกิจกรรมในหน้าก่อนหน้า";
  }

  document.querySelectorAll("[data-page-target]").forEach((link) => {
    link.addEventListener("click", () => showPublicPage(link.dataset.pageTarget));
  });

  document.getElementById("goLodgingBtn")?.addEventListener("click", () => {
    const nameInput = document.getElementById("participantName");
    const attendance = document.querySelectorAll("#attendanceDateOptions input:checked");
    if (!nameInput?.value.trim()) {
      nameInput?.focus();
      nameInput?.reportValidity();
      return;
    }
    if (!attendance.length) {
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = "กรุณาเลือกวันที่เข้าร่วมอย่างน้อย 1 วัน";
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2500);
      }
      return;
    }
    showPublicPage("lodging");
  });

  document.getElementById("backParticipantBtn")?.addEventListener("click", () => showPublicPage("participants"));
  document.getElementById("participantName")?.addEventListener("input", updateLodgingPreview);
  document.getElementById("attendanceDateOptions")?.addEventListener("change", updateLodgingPreview);

  const participantForm = document.getElementById("participantForm");
  participantForm?.addEventListener("submit", (event) => {
    const nameInput = document.getElementById("participantName");
    const attendance = document.querySelectorAll("#attendanceDateOptions input:checked");
    if (!nameInput?.value.trim() || !attendance.length) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showPublicPage("participants");
      window.setTimeout(() => {
        if (!nameInput?.value.trim()) nameInput?.focus();
      }, 80);
    }
  }, true);

  participantForm?.addEventListener("invalid", () => showPublicPage("participants"), true);

  function showAdminPage(page, pushHash = true) {
    if (!adminMeta[page]) page = "overview";
    document.querySelectorAll("[data-admin-page]").forEach((section) => section.classList.toggle("active", section.dataset.adminPage === page));
    document.querySelectorAll("[data-admin-page-target]").forEach((link) => link.classList.toggle("active", link.dataset.adminPageTarget === page && link.classList.contains("app-nav-link")));
    updateHeader(adminMeta[page]);
    if (pushHash && location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-admin-page-target]").forEach((link) => {
    link.addEventListener("click", () => showAdminPage(link.dataset.adminPageTarget));
  });

  const isAdmin = Boolean(document.querySelector("[data-admin-page]"));
  const initial = location.hash.replace("#", "");
  if (isAdmin) showAdminPage(adminMeta[initial] ? initial : "overview", false);
  else if (document.querySelector("[data-page]")) showPublicPage(publicMeta[initial] ? initial : "dashboard", false);

  window.addEventListener("hashchange", () => {
    const page = location.hash.replace("#", "");
    if (isAdmin) showAdminPage(adminMeta[page] ? page : "overview", false);
    else showPublicPage(publicMeta[page] ? page : "dashboard", false);
  });
})();
