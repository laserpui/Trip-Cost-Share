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

  const $ = (id) => document.getElementById(id);
  const sidebar = $("appSidebar");
  const overlay = $("sidebarOverlay");
  const mobileMenu = $("mobileMenuBtn");
  const title = $("currentPageTitle");
  const kicker = $("currentPageKicker");
  const description = $("currentPageDescription");
  const isAdmin = Boolean(document.querySelector("[data-admin-page]"));

  const pageSelector = isAdmin ? "[data-admin-page]" : "[data-page]";
  const targetSelector = isAdmin ? "[data-admin-page-target]" : "[data-page-target]";
  const pageKey = isAdmin ? "adminPage" : "page";
  const targetKey = isAdmin ? "adminPageTarget" : "pageTarget";
  const metaMap = isAdmin ? adminMeta : publicMeta;
  const defaultPage = isAdmin ? "overview" : "dashboard";
  const pageNodes = [...document.querySelectorAll(pageSelector)];
  const navTargets = [...document.querySelectorAll(targetSelector)];
  let currentPage = "";
  let previewFrame = 0;

  function openSidebar() {
    document.body.classList.add("sidebar-open");
    sidebar?.classList.add("open");
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    sidebar?.classList.remove("open");
  }

  mobileMenu?.addEventListener("click", openSidebar, { passive: true });
  overlay?.addEventListener("click", closeSidebar, { passive: true });

  function updateHeader(meta) {
    if (!meta) return;
    if (title && title.textContent !== meta.title) title.textContent = meta.title;
    if (kicker && kicker.textContent !== meta.kicker) kicker.textContent = meta.kicker;
    if (description && description.textContent !== meta.description) description.textContent = meta.description;
    document.title = `${meta.title} · Trip Cost Share v5.3.2`;
  }

  function updateLodgingPreviewNow() {
    previewFrame = 0;
    const preview = $("lodgingParticipantPreview");
    if (!preview) return;
    const name = $("participantName")?.value.trim();
    const attendanceCount = document.querySelectorAll("#attendanceDateOptions input:checked").length;
    preview.textContent = name
      ? `กำลังกำหนดที่พักให้ “${name}” · เข้าร่วม ${attendanceCount} วัน`
      : "กรุณากรอกชื่อผู้ร่วมกิจกรรมในหน้าก่อนหน้า";
  }

  function scheduleLodgingPreview() {
    if (previewFrame) return;
    previewFrame = requestAnimationFrame(updateLodgingPreviewNow);
  }

  function showPage(requestedPage, pushHash = true) {
    const page = metaMap[requestedPage] ? requestedPage : defaultPage;

    if (currentPage !== page) {
      pageNodes.forEach((section) => {
        section.classList.toggle("active", section.dataset[pageKey] === page);
      });
      navTargets.forEach((link) => {
        const active = link.dataset[targetKey] === page && link.classList.contains("app-nav-link");
        link.classList.toggle("active", active);
      });
      currentPage = page;
    }

    updateHeader(metaMap[page]);
    if (pushHash && location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
    closeSidebar();

    // Instant scroll is deliberate: smooth scrolling + glass layers caused noticeable jank on some devices.
    if (window.scrollY > 0) window.scrollTo(0, 0);
    if (!isAdmin && page === "lodging") scheduleLodgingPreview();
  }

  // Single delegated listener instead of registering a listener on every menu/quick-action item.
  document.addEventListener("click", (event) => {
    const target = event.target.closest(targetSelector);
    if (!target) return;
    const page = target.dataset[targetKey];
    if (!page || !metaMap[page]) return;
    if (target.tagName === "A") return;
    showPage(page);
  });

  if (!isAdmin) {
    $("goLodgingBtn")?.addEventListener("click", () => {
      const nameInput = $("participantName");
      const attendance = document.querySelectorAll("#attendanceDateOptions input:checked");
      if (!nameInput?.value.trim()) {
        nameInput?.focus();
        nameInput?.reportValidity();
        return;
      }
      if (!attendance.length) {
        const toast = $("toast");
        if (toast) {
          toast.textContent = "กรุณาเลือกวันที่เข้าร่วมอย่างน้อย 1 วัน";
          toast.classList.add("show");
          window.setTimeout(() => toast.classList.remove("show"), 2200);
        }
        return;
      }
      showPage("lodging");
    });

    $("backParticipantBtn")?.addEventListener("click", () => showPage("participants"));
    $("participantName")?.addEventListener("input", scheduleLodgingPreview, { passive: true });
    $("attendanceDateOptions")?.addEventListener("change", scheduleLodgingPreview, { passive: true });

    const participantForm = $("participantForm");
    participantForm?.addEventListener("submit", (event) => {
      const nameInput = $("participantName");
      const attendance = document.querySelectorAll("#attendanceDateOptions input:checked");
      if (!nameInput?.value.trim() || !attendance.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showPage("participants");
        window.setTimeout(() => {
          if (!nameInput?.value.trim()) nameInput?.focus();
        }, 40);
      }
    }, true);

    participantForm?.addEventListener("invalid", () => showPage("participants"), true);
  }

  const initial = location.hash.replace("#", "");
  showPage(metaMap[initial] ? initial : defaultPage, false);

  window.addEventListener("hashchange", () => {
    const page = location.hash.replace("#", "");
    showPage(metaMap[page] ? page : defaultPage, false);
  });
})();
