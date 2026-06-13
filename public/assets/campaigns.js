const store = window.CertificateIssuerStore;
const campaignForm = document.querySelector("#campaignForm");
const campaignTemplate = document.querySelector("#campaignTemplate");
const campaignList = document.querySelector("#campaignList");
const campaignLaneStatus = document.querySelector("#campaignLaneStatus");
const campaignPlanPreview = document.querySelector("#campaignPlanPreview");
const campaignCsvFile = document.querySelector("#campaignCsvFile");
const campaignCsvStatus = document.querySelector("#campaignCsvStatus");
const campaignCsvFileName = document.querySelector("#campaignCsvFileName");
const campaignCsvRows = document.querySelector("#campaignCsvRows");
const campaignCsvLabels = document.querySelector("#campaignCsvLabels");
const campaignCsvMapping = document.querySelector("#campaignCsvMapping");
const campaignCsvPreview = document.querySelector("#campaignCsvPreview");

const requiredLabels = ["unique_identifier", "email", "name_en"];
const labelRoles = {
  unique_identifier: "Certificate id",
  email: "Recipient email",
  name_en: "English name",
  name_ar: "Arabic name",
  issue_date: "Issue date",
  program_en: "English program",
  program_ar: "Arabic program",
  certificate_title_en: "English certificate title",
  certificate_title_ar: "Arabic certificate title",
  organization_en: "English organization",
  organization_ar: "Arabic organization"
};

let lastCampaignImport = null;

function renderTemplateOptions() {
  const selected = campaignTemplate.value;
  campaignTemplate.innerHTML = store.templates().map((template) => (
    `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)} (${escapeHtml(template.status)})</option>`
  )).join("");

  if (selected && [...campaignTemplate.options].some((option) => option.value === selected)) {
    campaignTemplate.value = selected;
  }
}

function renderMetrics() {
  const summary = store.summary();
  document.querySelector("#campaignMetric").textContent = String(summary.campaigns);
  document.querySelector("#activeMetric").textContent = String(summary.activeCampaigns);
  document.querySelector("#recipientMetric").textContent = String(summary.totalRecipients);
  document.querySelector("#templateMetric").textContent = String(summary.templates);
}

function renderCampaigns() {
  const campaigns = store.campaigns();
  campaignLaneStatus.textContent = `${campaigns.length} campaigns`;

  campaignList.innerHTML = campaigns.map((campaign) => {
    const template = store.campaignTemplate(campaign);
    const pending = Math.max(Number(campaign.recipients || 0) - Number(campaign.sent || 0) - Number(campaign.failed || 0), 0);
    const plan = store.deliveryPlan(campaign);
    const planClass = plan.fitsMinimumWindow ? "status ready" : "status warning";
    const progress = Number(campaign.recipients || 0) > 0
      ? Math.round((Number(campaign.sent || 0) / Number(campaign.recipients || 0)) * 100)
      : 0;
    const recentRecipients = (campaign.recipientQueue || []).slice(0, 6);

    return `
      <article class="campaign-card">
        <div class="panel-header">
          <div>
            <h3>${escapeHtml(campaign.name)}</h3>
            <p>${escapeHtml(template?.name || "No template selected")}</p>
          </div>
          <span class="${store.statusClass(campaign.status)}">${store.statusLabel(campaign.status)}</span>
        </div>
        <div class="progress-bar" aria-label="Campaign progress"><span style="width: ${progress}%"></span></div>
        <dl class="detail-list compact-details">
          <div><dt>CSV file</dt><dd>${escapeHtml(campaign.importFileName || "No CSV attached")}</dd></div>
          <div><dt>Labels</dt><dd>${escapeHtml((campaign.labels || []).slice(0, 4).join(", ") || "None")}${(campaign.labels || []).length > 4 ? ` +${(campaign.labels || []).length - 4}` : ""}</dd></div>
          <div><dt>Recipients</dt><dd>${Number(campaign.recipients || 0)}</dd></div>
          <div><dt>Sent</dt><dd>${Number(campaign.sent || 0)}</dd></div>
          <div><dt>Pending</dt><dd>${pending}</dd></div>
          <div><dt>Failed</dt><dd>${Number(campaign.failed || 0)}</dd></div>
          <div><dt>Send start</dt><dd>${escapeHtml(campaign.windowStartAt || "Not set")}</dd></div>
          <div><dt>Send end</dt><dd>${escapeHtml(campaign.windowEndAt || "Not set")}</dd></div>
          <div><dt>Spacing</dt><dd>${store.formatDuration(plan.calculatedSpacingSeconds)}</dd></div>
          <div><dt>Random buffer</dt><dd>${store.formatDuration(plan.randomMin)}-${store.formatDuration(plan.randomMax)}</dd></div>
        </dl>
        <span class="${planClass}">${plan.fitsMinimumWindow ? "Buffer fits window" : "Window too short"}</span>
        <div class="table-scroll recipient-preview">
          <table class="data-table compact-preview">
            <thead><tr><th>#</th><th>Recipient</th><th>Email</th><th>Status</th></tr></thead>
            <tbody>
              ${recentRecipients.map((recipient) => `
                <tr>
                  <td>${Number(recipient.sequence || 0)}</td>
                  <td>${escapeHtml(recipient.displayName)}</td>
                  <td>${escapeHtml(recipient.email || "-")}</td>
                  <td><span class="${store.recipientStatusClass(recipient.status)}">${store.recipientStatusLabel(recipient.status)}</span></td>
                </tr>
              `).join("") || "<tr><td colspan=\"4\">No recipient CSV attached yet.</td></tr>"}
            </tbody>
          </table>
        </div>
        <div class="email-editor">
          <label>Email subject
            <input data-email-subject="${escapeHtml(campaign.id)}" type="text" value="${escapeAttribute(campaign.emailSubject)}">
          </label>
          <label>Email body
            <textarea data-email-body="${escapeHtml(campaign.id)}" class="short-textarea">${escapeHtml(campaign.emailBodyHtml)}</textarea>
          </label>
          <div class="attachment-note">PDF attachment: <strong>certificate.pdf required</strong></div>
          <button type="button" data-action="save-email" data-id="${escapeHtml(campaign.id)}">Save email</button>
        </div>
        <div class="event-list">
          ${(campaign.deliveryEvents || []).slice(-3).reverse().map((event) => `<div><strong>${escapeHtml(shortTime(event.at))}</strong><span>${escapeHtml(event.message)}</span></div>`).join("") || "<div><span>No campaign events yet.</span></div>"}
        </div>
        <div class="action-row">
          <button type="button" data-action="running" data-id="${escapeHtml(campaign.id)}">Start</button>
          <button type="button" data-action="paused" data-id="${escapeHtml(campaign.id)}">Pause</button>
          <button type="button" data-action="send-one" data-id="${escapeHtml(campaign.id)}">Send one now</button>
          <button type="button" data-action="completed" data-id="${escapeHtml(campaign.id)}" ${pending > 0 ? "disabled title=\"All recipients must be sent, failed, or skipped before closing.\"" : ""}>Close campaign</button>
          <a class="button" href="/queue.html">Queue details</a>
        </div>
      </article>
    `;
  }).join("");
}

campaignForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#campaignName").value.trim();
  if (!name) return;

  const created = store.createCampaign({
    name,
    templateId: campaignTemplate.value,
    status: document.querySelector("#campaignStatus").value,
    scheduledAt: toIsoDateTime(document.querySelector("#campaignStart").value),
    windowStartAt: toIsoDateTime(document.querySelector("#campaignStart").value),
    windowEndAt: toIsoDateTime(document.querySelector("#campaignEnd").value),
    randomDelayMinSeconds: Number(document.querySelector("#campaignRandomMin").value || 0),
    randomDelayMaxSeconds: Number(document.querySelector("#campaignRandomMax").value || 0),
    throttleSeconds: Number(document.querySelector("#campaignRandomMin").value || 60),
    smtpProfile: document.querySelector("#campaignSmtp").value.trim() || "Institution SMTP",
    emailSubject: document.querySelector("#campaignEmailSubject").value.trim() || "Your certificate is ready",
    emailBodyHtml: document.querySelector("#campaignEmailBody").value.trim() || "<p>Your certificate is attached as a PDF.</p><p>Verification link: <a href=\"{{verification_url}}\">{{verification_url}}</a></p>",
    attachPdf: true,
    recipients: 0,
    rendered: 0,
    sent: 0,
    failed: 0,
    labels: []
  }, lastCampaignImport);

  campaignLaneStatus.textContent = `Created ${created.name}`;
  campaignLaneStatus.className = "status ready";
  render();
});

campaignList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "running") {
    store.startCampaign(button.dataset.id);
  } else if (button.dataset.action === "send-one") {
    store.manualSendOne(button.dataset.id);
  } else if (button.dataset.action === "completed") {
    store.completeCampaign(button.dataset.id);
  } else if (button.dataset.action === "save-email") {
    const subject = document.querySelector(`[data-email-subject="${cssEscape(button.dataset.id)}"]`)?.value.trim();
    const body = document.querySelector(`[data-email-body="${cssEscape(button.dataset.id)}"]`)?.value.trim();
    store.updateCampaign(button.dataset.id, {
      emailSubject: subject || "Your certificate is ready",
      emailBodyHtml: body || "<p>Your certificate is attached as a PDF.</p><p>Verification link: <a href=\"{{verification_url}}\">{{verification_url}}</a></p>",
      attachPdf: true
    });
  } else {
    store.updateCampaign(button.dataset.id, { status: button.dataset.action });
  }
  render();
});

campaignCsvFile.addEventListener("change", async () => {
  const file = campaignCsvFile.files && campaignCsvFile.files[0];
  if (!file) return;

  try {
    await importCampaignCsv(file);
  } catch (error) {
    lastCampaignImport = null;
    campaignCsvRows.textContent = "0";
    campaignCsvLabels.textContent = "0";
    campaignCsvFileName.textContent = file.name;
    campaignCsvMapping.innerHTML = `<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`;
    campaignCsvPreview.innerHTML = "<thead><tr><th>Status</th></tr></thead><tbody><tr><td>CSV could not be imported.</td></tr></tbody>";
    setCsvStatus("CSV error", "status failed");
  }

  renderPlanPreview();
});

["campaignStart", "campaignEnd", "campaignRandomMin", "campaignRandomMax"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", renderPlanPreview);
});

function render() {
  store.syncDeliveryProgress();
  renderTemplateOptions();
  renderMetrics();
  renderCampaigns();
  renderPlanPreview();
}

function renderPlanPreview() {
  const recipientCount = lastCampaignImport?.records.length || 0;
  const previewCampaign = {
    recipients: recipientCount,
    failed: 0,
    windowStartAt: document.querySelector("#campaignStart").value,
    windowEndAt: document.querySelector("#campaignEnd").value,
    randomDelayMinSeconds: Number(document.querySelector("#campaignRandomMin").value || 0),
    randomDelayMaxSeconds: Number(document.querySelector("#campaignRandomMax").value || 0),
    throttleSeconds: 60
  };
  const plan = store.deliveryPlan(previewCampaign);

  if (!recipientCount) {
    campaignPlanPreview.textContent = "Upload this campaign's CSV to calculate exact delivery spacing.";
    campaignPlanPreview.className = "plan-preview";
    return;
  }

  if (!previewCampaign.windowStartAt || !previewCampaign.windowEndAt) {
    campaignPlanPreview.textContent = `${recipientCount} recipients loaded. Set start and end times to calculate the average interval.`;
    campaignPlanPreview.className = "plan-preview";
    return;
  }

  campaignPlanPreview.textContent = `For ${recipientCount} recipients: ${store.formatDuration(plan.calculatedSpacingSeconds)} average spacing, randomized ${store.formatDuration(plan.randomMin)}-${store.formatDuration(plan.randomMax)}.`;
  campaignPlanPreview.className = plan.fitsMinimumWindow ? "plan-preview ready" : "plan-preview warning";
}

async function importCampaignCsv(file) {
  campaignCsvFileName.textContent = file.name;
  setCsvStatus("Reading CSV", "status pending");

  const text = await file.text();
  const rows = parseCsv(text);
  const { headers, records } = buildRecords(rows);
  const missing = missingLabels(headers);

  lastCampaignImport = { fileName: file.name, headers, records };
  campaignCsvRows.textContent = String(records.length);
  campaignCsvLabels.textContent = String(headers.length);
  renderMapping(headers, records);
  renderPreview(headers, records);

  if (records.length === 0) {
    setCsvStatus("No recipient rows", "status failed");
  } else if (missing.length > 0) {
    setCsvStatus(`Missing ${missing.join(", ")}`, "status warning");
  } else {
    setCsvStatus("CSV ready for this campaign", "status ready");
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (quoted) {
    throw new Error("CSV has an unclosed quoted value.");
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "") || rows.length === 0) {
    rows.push(row);
  }

  return rows;
}

function buildRecords(rows) {
  if (rows.length < 2) {
    throw new Error("CSV must include a header row and at least one recipient row.");
  }

  const headers = rows[0].map(normalizeHeader);
  const duplicateLabels = headers.filter((header, index) => headers.indexOf(header) !== index);

  if (duplicateLabels.length > 0) {
    throw new Error(`Duplicate labels: ${[...new Set(duplicateLabels)].join(", ")}`);
  }

  const records = rows.slice(1)
    .filter((row) => row.some((value) => value.trim() !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() || ""])));

  return { headers, records };
}

function normalizeHeader(header, index) {
  const cleaned = header.replace(/^\uFEFF/, "").trim();
  return cleaned || `unnamed_label_${index + 1}`;
}

function renderMapping(headers, records) {
  campaignCsvMapping.innerHTML = headers.map((header) => `
    <tr>
      <td><code>${escapeHtml(header)}</code></td>
      <td>${escapeHtml(roleFor(header))}</td>
      <td>${pillFor(validationFor(header, records))}</td>
    </tr>
  `).join("");
}

function renderPreview(headers, records) {
  const rowsToShow = records.slice(0, 8);
  campaignCsvPreview.innerHTML = `
    <thead>
      <tr>${headers.slice(0, 8).map((header) => `<th>${escapeHtml(header)}</th>`).join("")}<th>Status</th></tr>
    </thead>
    <tbody>
      ${rowsToShow.map((record) => `
        <tr>
          ${headers.slice(0, 8).map((header) => `<td${header.endsWith("_ar") ? " dir=\"rtl\"" : ""}>${escapeHtml(record[header])}</td>`).join("")}
          <td>${pillFor(rowStatus(record))}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
}

function validationFor(header, records) {
  if (requiredLabels.includes(header)) return "Required";
  if (header === "name_ar" || header.endsWith("_ar")) return "RTL";
  if (header === "issue_date" || header.endsWith("_date")) return "Date";
  if (records.some((record) => /^[=+\-@]/.test(record[header] || ""))) return "Formula check";
  return "Accepted";
}

function roleFor(header) {
  if (labelRoles[header]) return labelRoles[header];
  if (header.startsWith("label_") || header.startsWith("custom_label_")) return "Certificate label";
  if (header.startsWith("value_") || header.startsWith("custom_value_")) return "Certificate value";
  return "Custom data";
}

function rowStatus(record) {
  return requiredLabels.every((header) => (record[header] || "").trim() !== "") ? "Accepted" : "Missing data";
}

function missingLabels(headers) {
  return requiredLabels.filter((header) => !headers.includes(header));
}

function pillFor(validation) {
  const className = validation === "Required" || validation === "Accepted" ? "pill sent" : "pill queued";
  return `<span class="${className}">${escapeHtml(validation)}</span>`;
}

function setCsvStatus(text, className) {
  campaignCsvStatus.textContent = text;
  campaignCsvStatus.className = className;
}

function shortTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toIsoDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", "&#10;");
}

function cssEscape(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

render();
