(function () {
  let modal = null;
  let lastFocused = null;

  function ensureModal() {
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "preview-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="preview-dialog" role="dialog" aria-modal="true" aria-label="Certificate and message preview">
        <div class="preview-header">
          <div>
            <p class="eyebrow">Campaign preview</p>
            <h2 data-preview-title>Preview</h2>
          </div>
          <button type="button" data-preview-close>Close</button>
        </div>
        <div data-preview-status class="status pending">Loading preview</div>
        <div class="preview-grid" hidden>
          <section class="preview-panel">
            <div class="preview-panel-header">
              <h3>Email message</h3>
              <span class="pill sent">Not sent</span>
            </div>
            <dl class="detail-list compact-details">
              <div><dt>To</dt><dd data-preview-to>-</dd></div>
              <div><dt>Attachment</dt><dd data-preview-attachment>certificate.pdf</dd></div>
              <div class="full-detail"><dt>Subject</dt><dd data-preview-subject>-</dd></div>
            </dl>
            <iframe title="Email body preview" class="preview-email-frame" sandbox=""></iframe>
          </section>
          <section class="preview-panel">
            <div class="preview-panel-header">
              <h3>Certificate PDF</h3>
              <a data-preview-pdf-link class="button" href="#" target="_blank" rel="noopener">Open PDF</a>
            </div>
            <iframe title="Certificate PDF preview" class="preview-pdf-frame"></iframe>
          </section>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-preview-close]")) {
        closePreview();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (!modal.hidden && event.key === "Escape") {
        closePreview();
      }
    });
    return modal;
  }

  async function openPreview(campaignId, recipientId, setStatus = null) {
    const target = ensureModal();
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    target.hidden = false;
    target.querySelector("[data-preview-status]").textContent = "Generating preview";
    target.querySelector("[data-preview-status]").className = "status pending";
    target.querySelector(".preview-grid").hidden = true;
    target.querySelector(".preview-email-frame").srcdoc = "";
    target.querySelector(".preview-pdf-frame").removeAttribute("src");

    try {
      const preview = await window.CertificateIssuerStore.previewCampaignRecipientAsync(campaignId, recipientId);
      if (!preview) {
        throw new Error("Preview could not be generated.");
      }

      renderPreview(target, preview);
      if (setStatus) setStatus("Preview ready", "ready");
    } catch (error) {
      target.querySelector("[data-preview-status]").textContent = error.message;
      target.querySelector("[data-preview-status]").className = "status warning";
      if (setStatus) setStatus(error.message, "warning");
    }
  }

  function renderPreview(target, preview) {
    const title = preview.recipientName || preview.recipientEmail || "Recipient";
    const toLine = [preview.recipientName, preview.recipientEmail].filter(Boolean).join(" <") + (preview.recipientName && preview.recipientEmail ? ">" : "");
    const pdfUrl = `${preview.certificateUrl}${preview.certificateUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(preview.generatedAt || Date.now())}`;

    target.querySelector("[data-preview-title]").textContent = title;
    target.querySelector("[data-preview-to]").textContent = toLine || "-";
    target.querySelector("[data-preview-subject]").textContent = preview.subject || "-";
    target.querySelector("[data-preview-attachment]").textContent = preview.attachmentName || "certificate.pdf";
    target.querySelector("[data-preview-status]").textContent = `Generated ${formatPreviewTime(preview.generatedAt)}`;
    target.querySelector("[data-preview-status]").className = "status ready";
    target.querySelector("[data-preview-pdf-link]").href = pdfUrl;
    target.querySelector(".preview-email-frame").srcdoc = emailPreviewDocument(preview.bodyHtml || "");
    target.querySelector(".preview-pdf-frame").src = pdfUrl;
    target.querySelector(".preview-grid").hidden = false;
  }

  function closePreview() {
    if (!modal) return;
    modal.hidden = true;
    modal.querySelector(".preview-email-frame").srcdoc = "";
    modal.querySelector(".preview-pdf-frame").removeAttribute("src");
    if (lastFocused) {
      lastFocused.focus();
    }
  }

  function emailPreviewDocument(bodyHtml) {
    return `<!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <base target="_blank">
        <style>
          body { margin: 0; padding: 16px; color: #202124; font: 14px/1.55 Arial, sans-serif; }
          a { color: #1976d2; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>${bodyHtml}</body>
      </html>`;
  }

  function formatPreviewTime(value) {
    if (!value) return "now";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  window.CertificateIssuerPreview = {
    open: openPreview,
    close: closePreview
  };
})();
