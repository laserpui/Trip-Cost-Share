(() => {
  "use strict";

  const publicPages = {
    dashboard: { kicker: "OVERVIEW", title: "แดชบอร์ด", description: "ภาพรวมกิจกรรมและค่าใช้จ่าย" },
    participants: { kicker: "PARTICIPANTS", title: "ผู้ร่วมกิจกรรม", description: "เพิ่มชื่อ วันที่เข้าร่วม และคืนที่พัก" },
    expenses: { kicker: "EXPENSES", title: "บันทึกค่าใช้จ่าย", description: "ใบเสร็จ ผู้สำรองจ่าย และวิธีหาร" }
  };
  const adminPages = {
    overview: { kicker: "ADMIN", title: "ภาพรวมระบบ", description: "ตรวจสอบข้อมูลและสถานะระบบ" },
    settings: { kicker: "SETTINGS", title: "ตั้งค่ากิจกรรม", description: "ชื่อ ช่วงวันที่ และสถานะกิจกรรม" },
    participants: { kicker: "MEMBERS", title: "จัดการผู้ร่วมกิจกรรม", description: "เพิ่ม แก้ไข และลบข้อมูลผู้ร่วมกิจกรรม" },
    receipts: { kicker: "RECEIPTS", title: "จัดการค่าใช้จ่าย", description: "แก้ไขหรือลบใบเสร็จและผลการหาร" }
  };

  const $ = (id) => document.getElementById(id);
  const isAdmin = Boolean(document.querySelector("[data-admin-page]"));
  const meta = isAdmin ? adminPages : publicPages;
  const pageSelector = isAdmin ? "[data-admin-page]" : "[data-page]";
  const targetSelector = isAdmin ? "[data-admin-page-target]" : "[data-page-target]";
  const dataKey = isAdmin ? "adminPage" : "page";
  const targetKey = isAdmin ? "adminPageTarget" : "pageTarget";
  const fallback = isAdmin ? "overview" : "dashboard";
  const pages = [...document.querySelectorAll(pageSelector)];
  const targets = [...document.querySelectorAll(targetSelector)];

  function closeSidebar() { document.body.classList.remove("sidebar-open"); }
  function openSidebar() { document.body.classList.add("sidebar-open"); }

  function showPage(requested, updateHash = true) {
    const page = meta[requested] ? requested : fallback;
    pages.forEach((node) => node.classList.toggle("active", node.dataset[dataKey] === page));
    targets.forEach((node) => {
      if (node.tagName === "A") return;
      node.classList.toggle("active", node.dataset[targetKey] === page);
    });
    const info = meta[page];
    if ($("currentPageKicker")) $("currentPageKicker").textContent = info.kicker;
    if ($("currentPageTitle")) $("currentPageTitle").textContent = info.title;
    if ($("currentPageDescription")) $("currentPageDescription").textContent = info.description;
    document.title = `${info.title} · Trip Cost Share`;
    if (updateHash && location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
    closeSidebar();
    window.scrollTo(0, 0);
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest(targetSelector);
    if (!target || target.tagName === "A") return;
    const page = target.dataset[targetKey];
    if (page) showPage(page);
  });
  $("mobileMenuBtn")?.addEventListener("click", openSidebar);
  $("sidebarOverlay")?.addEventListener("click", closeSidebar);
  window.addEventListener("hashchange", () => showPage(location.hash.slice(1), false));

  showPage(meta[location.hash.slice(1)] ? location.hash.slice(1) : fallback, false);
  window.TripCostNavigation = { showPage };
})();
