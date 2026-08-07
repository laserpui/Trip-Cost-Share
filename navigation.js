(() => {
  "use strict";

  const publicMeta = {
    dashboard: { kicker: "OVERVIEW", title: "แดชบอร์ด", description: "ภาพรวมกิจกรรม ค่าใช้จ่าย และยอดสุทธิ" },
    participants: { kicker: "PARTICIPANTS", title: "บันทึกผู้ร่วมกิจกรรม", description: "เพิ่มรายชื่อและกำหนดวันที่เข้าร่วมกิจกรรม" },
    expenses: { kicker: "EXPENSES", title: "บันทึกค่าใช้จ่าย", description: "บันทึกใบเสร็จ ผู้สำรองจ่าย และตรวจสอบการหาร" },
    lodging: { kicker: "LODGING", title: "บันทึกข้อมูลที่พัก", description: "กำหนดคืนที่พักจริงของผู้ร่วมกิจกรรมที่บันทึกไว้" }
  };

  const adminMeta = {
    overview: { kicker: "ADMIN OVERVIEW", title: "ภาพรวมระบบ", description: "ตรวจสอบและจัดการข้อมูลกิจกรรมทั้งหมด" },
    settings: { kicker: "EVENT SETTINGS", title: "ตั้งค่ากิจกรรม", description: "กำหนดชื่อ ช่วงวันที่ และสถานะกิจกรรม" },
    participants: { kicker: "MEMBER MANAGEMENT", title: "จัดการผู้ร่วมกิจกรรม", description: "เพิ่ม แก้ไข ลบ และกำหนดวันเข้าร่วมหรือคืนที่พัก" },
    receipts: { kicker: "RECEIPT MANAGEMENT", title: "จัดการใบเสร็จและค่าใช้จ่าย", description: "แก้ไขผู้จ่าย รายการย่อย วิธีหาร และรูปใบเสร็จ" }
  };

  const $ = (id) => document.getElementById(id);
  const isAdmin = Boolean(document.querySelector("[data-admin-page]"));
  const meta = isAdmin ? adminMeta : publicMeta;
  const pageAttr = isAdmin ? "adminPage" : "page";
  const targetAttr = isAdmin ? "adminPageTarget" : "pageTarget";
  const pageSelector = isAdmin ? "[data-admin-page]" : "[data-page]";
  const targetSelector = isAdmin ? "[data-admin-page-target]" : "[data-page-target]";
  const defaultPage = isAdmin ? "overview" : "dashboard";
  const pages = [...document.querySelectorAll(pageSelector)];
  const targets = [...document.querySelectorAll(targetSelector)];
  const sidebar = $("appSidebar");

  function closeSidebar() { document.body.classList.remove("sidebar-open"); sidebar?.classList.remove("open"); }
  function openSidebar() { document.body.classList.add("sidebar-open"); sidebar?.classList.add("open"); }

  function showPage(requested, updateHash = true) {
    const page = meta[requested] ? requested : defaultPage;
    pages.forEach((node) => node.classList.toggle("active", node.dataset[pageAttr] === page));
    targets.forEach((node) => node.classList.toggle("active", node.classList.contains("app-nav-link") && node.dataset[targetAttr] === page));
    const m = meta[page];
    if ($("currentPageKicker")) $("currentPageKicker").textContent = m.kicker;
    if ($("currentPageTitle")) $("currentPageTitle").textContent = m.title;
    if ($("currentPageDescription")) $("currentPageDescription").textContent = m.description;
    document.title = `${m.title} · Trip Cost Share v5.4`;
    if (updateHash && location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
    closeSidebar();
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent("tripcost:pagechange", { detail: { page, isAdmin } }));
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest(targetSelector);
    if (!target || target.tagName === "A") return;
    const page = target.dataset[targetAttr];
    if (page) showPage(page);
  });

  $("mobileMenuBtn")?.addEventListener("click", openSidebar);
  $("sidebarOverlay")?.addEventListener("click", closeSidebar);

  const initial = location.hash.replace("#", "");
  showPage(meta[initial] ? initial : defaultPage, false);
  window.addEventListener("hashchange", () => { const page = location.hash.replace("#", ""); showPage(meta[page] ? page : defaultPage, false); });

  window.TripCostNavigation = { showPage };
})();
