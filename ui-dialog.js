(() => {
  "use strict";

  const ICONS = {
    info: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7.5h.01"/></svg>',
    success: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.3 4.2 3.1 17a2 2 0 0 0 1.7 3h14.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 16.5h.01"/></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 4.5 6v5.4c0 4.8 3.2 8.2 7.5 9.6 4.3-1.4 7.5-4.8 7.5-9.6V6L12 3Z"/><path d="m9 9 6 6M15 9l-6 6"/></svg>'
  };

  let activeDialog = null;
  let priorFocus = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  function closeActive(result) {
    if (!activeDialog) return;
    const { overlay, resolve, keyHandler } = activeDialog;
    document.removeEventListener("keydown", keyHandler);
    overlay.classList.add("closing");
    document.body.classList.remove("dialog-open");
    setTimeout(() => overlay.remove(), 150);
    activeDialog = null;
    if (priorFocus && typeof priorFocus.focus === "function") {
      try { priorFocus.focus({ preventScroll: true }); } catch (_) { priorFocus.focus(); }
    }
    resolve(result);
  }

  function createDialog(options = {}) {
    if (activeDialog) closeActive(null);

    const tone = ["info", "success", "warning", "danger"].includes(options.tone) ? options.tone : "info";
    const title = options.title || "แจ้งเตือน";
    const message = options.message || "";
    const detail = options.detail || "";
    const confirmText = options.confirmText || "ตกลง";
    const cancelText = options.cancelText || "ยกเลิก";
    const showCancel = options.showCancel === true;
    const promptConfig = options.prompt || null;

    priorFocus = document.activeElement;

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "dialog-overlay";
      overlay.innerHTML = `
        <section class="dialog-card dialog-${tone}" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div class="dialog-icon">${ICONS[tone]}</div>
          <div class="dialog-copy">
            <h2 id="dialog-title">${escapeHtml(title)}</h2>
            ${message ? `<p>${escapeHtml(message)}</p>` : ""}
            ${detail ? `<div class="dialog-detail">${escapeHtml(detail)}</div>` : ""}
          </div>
          ${promptConfig ? `
            <label class="dialog-prompt-field">
              ${promptConfig.label ? `<span>${escapeHtml(promptConfig.label)}</span>` : ""}
              <input class="dialog-prompt-input" type="${escapeHtml(promptConfig.type || "text")}" autocomplete="off" spellcheck="false" placeholder="${escapeHtml(promptConfig.placeholder || "")}" value="${escapeHtml(promptConfig.value || "")}">
              ${promptConfig.hint ? `<small>${escapeHtml(promptConfig.hint)}</small>` : ""}
              <small class="dialog-prompt-error" aria-live="polite"></small>
            </label>` : ""}
          <div class="dialog-actions">
            ${showCancel ? `<button class="dialog-btn dialog-btn-secondary" type="button" data-dialog-cancel>${escapeHtml(cancelText)}</button>` : ""}
            <button class="dialog-btn dialog-btn-primary ${tone === "danger" ? "dialog-btn-danger" : ""}" type="button" data-dialog-confirm>${escapeHtml(confirmText)}</button>
          </div>
        </section>`;

      document.body.appendChild(overlay);
      document.body.classList.add("dialog-open");
      requestAnimationFrame(() => overlay.classList.add("open"));

      const confirmBtn = overlay.querySelector("[data-dialog-confirm]");
      const cancelBtn = overlay.querySelector("[data-dialog-cancel]");
      const input = overlay.querySelector(".dialog-prompt-input");
      const errorNode = overlay.querySelector(".dialog-prompt-error");

      function validateAndConfirm() {
        if (!promptConfig) return closeActive(true);
        const value = input.value;
        const validator = typeof promptConfig.validate === "function" ? promptConfig.validate : null;
        const error = validator ? validator(value) : "";
        if (error) {
          errorNode.textContent = error;
          input.classList.add("invalid");
          input.focus();
          return;
        }
        closeActive(value);
      }

      const keyHandler = (event) => {
        if (event.key === "Escape" && showCancel) {
          event.preventDefault();
          closeActive(null);
        }
        if (event.key === "Enter" && (!event.shiftKey && !event.ctrlKey && !event.metaKey)) {
          if (document.activeElement === input || !promptConfig) {
            event.preventDefault();
            validateAndConfirm();
          }
        }
        if (event.key === "Tab") {
          const focusable = [...overlay.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
          if (!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      };

      activeDialog = { overlay, resolve, keyHandler };
      document.addEventListener("keydown", keyHandler);
      confirmBtn.addEventListener("click", validateAndConfirm);
      cancelBtn?.addEventListener("click", () => closeActive(null));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay && showCancel) closeActive(null);
      });
      input?.addEventListener("input", () => { input.classList.remove("invalid"); errorNode.textContent = ""; });

      setTimeout(() => (input || confirmBtn).focus(), 30);
    });
  }

  const TripDialog = {
    alert(options = {}) {
      return createDialog({ ...options, showCancel: false });
    },
    confirm(options = {}) {
      return createDialog({ ...options, showCancel: true });
    },
    prompt(options = {}) {
      return createDialog({ ...options, showCancel: true, prompt: options.prompt || {} });
    },
    close() { closeActive(null); }
  };

  window.TripDialog = TripDialog;
})();
