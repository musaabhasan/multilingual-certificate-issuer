const store = window.CertificateIssuerStore;
const campaignForm = document.querySelector("#campaignForm");
const campaignTemplate = document.querySelector("#campaignTemplate");
const campaignTemplateMode = document.querySelector("#campaignTemplateMode");
const campaignTemplateName = document.querySelector("#campaignTemplateName");
const campaignTemplateFile = document.querySelector("#campaignTemplateFile");
const campaignTemplateFit = document.querySelector("#campaignTemplateFit");
const campaignTemplateStatus = document.querySelector("#campaignTemplateStatus");
const campaignTemplatePreview = document.querySelector("#campaignTemplatePreview");
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
const campaignSearch = document.querySelector("#campaignSearch");
const campaignStatusFilter = document.querySelector("#campaignStatusFilter");
const campaignSort = document.querySelector("#campaignSort");
const campaignCleanupMode = document.querySelector("#campaignCleanupMode");
const campaignCleanupAge = document.querySelector("#campaignCleanupAge");
const campaignCleanupSummary = document.querySelector("#campaignCleanupSummary");
const deleteOldCampaignRecords = document.querySelector("#deleteOldCampaignRecords");
const setCampaignStartNow = document.querySelector("#setCampaignStartNow");
const clearCampaignEnd = document.querySelector("#clearCampaignEnd");
const campaignEmailSubject = document.querySelector("#campaignEmailSubject");
const campaignEmailBody = document.querySelector("#campaignEmailBody");
const wizardBack = document.querySelector("#wizardBack");
const wizardNext = document.querySelector("#wizardNext");
const wizardCreate = document.querySelector("#wizardCreate");
const wizardStepOrder = ["csv", "design", "sending", "review"];

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
let lastCampaignTemplateUpload = null;
const recipientFilters = new Map();
const expandedCampaigns = new Set();
const csvEditors = new Set();
const campaignTabs = new Map();
let activeEmailSurface = null;
let currentWizardStep = "csv";

function setCampaignLaneStatus(text, state = "ready") {
  campaignLaneStatus.textContent = text;
  campaignLaneStatus.className = `status ${state}`;
}

function renderTemplateOptions() {
  const selected = campaignTemplate.value;
  const templates = reusableTemplates();
  if (templates.length === 0 && campaignTemplateMode.value === "saved") {
    campaignTemplateMode.value = "upload";
  }
  campaignTemplate.innerHTML = templateOptionsMarkup(selected);

  if (selected && templates.some((template) => template.id === selected)) {
    campaignTemplate.value = selected;
  }

  campaignTemplate.disabled = templates.length === 0;
}

function templateOptionsMarkup(selectedId = "") {
  const templates = reusableTemplates();
  if (templates.length === 0) {
    return '<option value="">No reusable templates</option>';
  }

  return templates.map((template) => {
    const selected = template.id === selectedId ? " selected" : "";
    return `<option value="${escapeHtml(template.id)}"${selected}>${escapeHtml(template.name)} (${escapeHtml(template.status)})</option>`;
  }).join("");
}

function reusableTemplates() {
  return typeof store.reusableTemplates === "function"
    ? store.reusableTemplates()
    : store.templates().filter((template) => !template.campaignOwned);
}

function renderMetrics() {
  const summary = store.summary();
  document.querySelector("#campaignMetric").textContent = String(summary.campaigns);
  document.querySelector("#activeMetric").textContent = String(summary.activeCampaigns);
  document.querySelector("#recipientMetric").textContent = String(summary.totalRecipients);
  document.querySelector("#templateMetric").textContent = String(summary.templates);
}

function renderWizard() {
  const activeIndex = wizardStepOrder.indexOf(currentWizardStep);
  document.querySelectorAll("[data-wizard-step]").forEach((section) => {
    section.hidden = section.dataset.wizardStep !== currentWizardStep;
    section.classList.toggle("active", section.dataset.wizardStep === currentWizardStep);
  });

  document.querySelectorAll("[data-wizard-step-indicator]").forEach((item) => {
    const step = item.dataset.wizardStepIndicator;
    const stepIndex = wizardStepOrder.indexOf(step);
    item.classList.toggle("active", step === currentWizardStep);
    item.classList.toggle("done", stepIndex >= 0 && stepIndex < activeIndex);
  });

  wizardBack.disabled = activeIndex <= 0;
  wizardNext.hidden = currentWizardStep === "review";
  wizardCreate.hidden = currentWizardStep !== "review";
  renderWizardTemplatePreview();
  renderWizardReviewSummary();
}

function goToWizardStep(step) {
  if (!wizardStepOrder.includes(step)) return;
  const targetIndex = wizardStepOrder.indexOf(step);
  const currentIndex = wizardStepOrder.indexOf(currentWizardStep);

  if (targetIndex > currentIndex) {
    for (let index = currentIndex; index < targetIndex; index += 1) {
      validateWizardStep(wizardStepOrder[index]);
    }
  }

  currentWizardStep = step;
  renderWizard();
}

function goToNextWizardStep() {
  const currentIndex = wizardStepOrder.indexOf(currentWizardStep);
  validateWizardStep(currentWizardStep);
  currentWizardStep = wizardStepOrder[Math.min(currentIndex + 1, wizardStepOrder.length - 1)];
  renderWizard();
}

function goToPreviousWizardStep() {
  const currentIndex = wizardStepOrder.indexOf(currentWizardStep);
  currentWizardStep = wizardStepOrder[Math.max(currentIndex - 1, 0)];
  renderWizard();
}

function validateWizardStep(step) {
  if (step === "csv") {
    const name = document.querySelector("#campaignName").value.trim();
    if (!name) {
      throw new Error("Enter a campaign name.");
    }

    if (!lastCampaignImport || lastCampaignImport.records.length === 0) {
      throw new Error("Upload a recipient CSV before continuing.");
    }

    const missing = missingLabels(lastCampaignImport.headers);
    if (missing.length > 0) {
      throw new Error(`CSV is missing required labels: ${missing.join(", ")}.`);
    }
  }

  if (step === "design") {
    if (campaignTemplateMode.value === "upload" && !lastCampaignTemplateUpload) {
      throw new Error("Upload the certificate template image before continuing.");
    }

    if (campaignTemplateMode.value === "saved" && !campaignTemplate.value) {
      throw new Error("Select a saved template before continuing.");
    }
  }

  if (step === "sending") {
    const randomDelayUnit = store.normalizeDelayUnit(document.querySelector("#campaignRandomUnit").value);
    const randomDelayMinSeconds = store.delayAmountToSeconds(document.querySelector("#campaignRandomMin").value, randomDelayUnit);
    const randomDelayMaxSeconds = store.delayAmountToSeconds(document.querySelector("#campaignRandomMax").value, randomDelayUnit);
    validateScheduleValues(
      toIsoDateTime(document.querySelector("#campaignStart").value),
      toIsoDateTime(document.querySelector("#campaignEnd").value),
      randomDelayMinSeconds,
      randomDelayMaxSeconds
    );

    if (!campaignEmailSubject.value.trim()) {
      throw new Error("Enter an email subject.");
    }
  }
}

function renderWizardTemplatePreview() {
  const preview = document.querySelector("#wizardTemplatePreview");
  const note = document.querySelector("#wizardTemplatePreviewNote");
  if (!preview || !note) return;

  let background = "";
  let name = "No template selected";
  let fit = "contain";

  if (campaignTemplateMode.value === "upload") {
    background = lastCampaignTemplateUpload?.path || "";
    name = lastCampaignTemplateUpload?.originalName || "Upload a template image";
    fit = campaignTemplateFit.value || "stretch";
  } else {
    const template = store.findTemplate(campaignTemplate.value);
    background = template?.layout?.background || "";
    name = template?.name || "Select a saved template";
    fit = template?.layout?.backgroundFit || "contain";
  }

  preview.style.setProperty("--wizard-preview-background", background ? `url("${browserAssetUrl(background)}")` : "none");
  preview.dataset.backgroundFit = normalizeBackgroundFit(fit);
  preview.classList.toggle("has-background", Boolean(background));
  note.textContent = background
    ? `${name} is selected. Recipient name, program, issue date, and QR placeholders are shown as a placement preview.`
    : "Template preview updates after you select or upload a certificate design.";
}

function renderWizardReviewSummary() {
  const summary = document.querySelector("#wizardReviewSummary");
  if (!summary) return;

  syncEmailEditors(campaignForm);
  const randomDelayUnit = store.normalizeDelayUnit(document.querySelector("#campaignRandomUnit").value);
  const randomDelayMinSeconds = store.delayAmountToSeconds(document.querySelector("#campaignRandomMin").value, randomDelayUnit);
  const randomDelayMaxSeconds = store.delayAmountToSeconds(document.querySelector("#campaignRandomMax").value, randomDelayUnit);
  const previewCampaign = {
    recipients: lastCampaignImport?.records.length || 0,
    failed: 0,
    windowStartAt: document.querySelector("#campaignStart").value,
    windowEndAt: document.querySelector("#campaignEnd").value,
    randomDelayUnit,
    randomDelayMinSeconds,
    randomDelayMaxSeconds,
    throttleSeconds: randomDelayMinSeconds || 60
  };
  const plan = store.deliveryPlan(previewCampaign);
  const templateName = campaignTemplateMode.value === "upload"
    ? (campaignTemplateName.value.trim() || lastCampaignTemplateUpload?.originalName || "Campaign upload")
    : (store.findTemplate(campaignTemplate.value)?.name || "Saved template");

  summary.innerHTML = `
    <div><dt>Campaign</dt><dd>${escapeHtml(document.querySelector("#campaignName").value.trim() || "Untitled campaign")}</dd></div>
    <div><dt>Recipients</dt><dd>${Number(lastCampaignImport?.records.length || 0)} from ${escapeHtml(lastCampaignImport?.fileName || "No CSV")}</dd></div>
    <div><dt>Labels</dt><dd>${escapeHtml((lastCampaignImport?.headers || []).join(", ") || "No labels")}</dd></div>
    <div><dt>Template</dt><dd>${escapeHtml(templateName)}</dd></div>
    <div><dt>Start</dt><dd>${escapeHtml(document.querySelector("#campaignStart").value || "When started")}</dd></div>
    <div><dt>End</dt><dd>${escapeHtml(document.querySelector("#campaignEnd").value || "Until complete")}</dd></div>
    <div><dt>Random delay</dt><dd>${store.formatDuration(plan.randomMin)}-${store.formatDuration(plan.randomMax)}</dd></div>
    <div><dt>Estimated run</dt><dd>${store.formatDuration(plan.estimatedDurationSeconds || plan.calculatedSpacingSeconds || 0)}</dd></div>
    <div><dt>Subject</dt><dd>${escapeHtml(campaignEmailSubject.value.trim() || "Your certificate is ready")}</dd></div>
    <div><dt>Tracking</dt><dd>Campaign lanes and Queue monitor will show pending, sent, failed, skipped, and completion status.</dd></div>
  `;
}

function campaignTabButton(campaignId, activeTab, tab, label) {
  const active = activeTab === tab;
  return `<button type="button" data-campaign-tab="${escapeHtml(tab)}" data-id="${escapeHtml(campaignId)}" aria-selected="${active ? "true" : "false"}">${escapeHtml(label)}</button>`;
}

function campaignSectionState(activeTab, tab) {
  return activeTab === tab ? "" : "hidden";
}

function readinessLabel(readiness) {
  if (readiness.ready && Number(readiness.summary.warn || 0) === 0) return "Ready to send";
  if (readiness.ready) return `${Number(readiness.summary.warn || 0)} review items`;
  return `${Number(readiness.summary.fail || 0)} blockers`;
}

function readinessStatusClass(readiness) {
  if (!readiness.ready) return "status failed";
  if (Number(readiness.summary.warn || 0) > 0) return "status warning";
  return "status ready";
}

function readinessListMarkup(readiness, limit = 6) {
  const checks = (readiness.checks || [])
    .filter((check) => check.status !== "pass")
    .slice(0, limit);
  const visibleChecks = checks.length > 0 ? checks : (readiness.checks || []).slice(0, Math.min(3, limit));

  return `
    <div class="readiness-list">
      ${visibleChecks.map((check) => `
        <div class="readiness-item ${escapeHtml(check.status)}">
          <span class="status ${readinessCheckClass(check.status)}">${escapeHtml(readinessCheckLabel(check.status))}</span>
          <div>
            <strong>${escapeHtml(check.label)}</strong>
            <small>${escapeHtml(check.detail)}</small>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function readinessCheckClass(status) {
  if (status === "fail") return "failed";
  if (status === "warn") return "warning";
  return "ready";
}

function readinessCheckLabel(status) {
  if (status === "fail") return "Fix";
  if (status === "warn") return "Review";
  return "Ready";
}

function disabledTitle(message) {
  return `disabled title="${escapeAttribute(message || "Campaign is not ready to send.")}"`;
}

function renderCampaigns() {
  const allCampaigns = store.campaigns();
  const campaigns = filteredCampaigns(allCampaigns);
  renderCampaignCleanup();
  campaignLaneStatus.textContent = campaigns.length === allCampaigns.length
    ? `${allCampaigns.length} campaigns`
    : `${campaigns.length} of ${allCampaigns.length}`;

  if (campaigns.length === 0) {
    campaignList.innerHTML = '<div class="empty-state">No campaigns match the current view.</div>';
    return;
  }

  campaignList.innerHTML = campaigns.map((campaign) => {
    const template = store.campaignTemplate(campaign);
    const templateSource = templateSourceLabel(campaign);
    const templateFile = campaign.templateFileName || template?.layout?.background || "Saved template";
    const counts = store.campaignCounts(campaign);
    const pending = counts.pending;
    const plan = store.deliveryPlan(campaign);
    const readiness = store.campaignReadiness(campaign);
    const planClass = plan.fitsMinimumWindow ? "status ready" : "status warning";
    const planLabel = plan.continuesUntilComplete
      ? "Continues until complete"
      : (plan.fitsMinimumWindow ? "Buffer fits window" : "Window too short");
    const progress = Number(campaign.recipients || 0) > 0
      ? Math.round(((counts.sent + counts.failed + counts.skipped) / Number(campaign.recipients || 0)) * 100)
      : 0;
    const recipientFilter = recipientFilters.get(campaign.id) || "";
    const allRecipients = campaign.recipientQueue || [];
    const matchingRecipients = filterRecipients(allRecipients, recipientFilter);
    const recipientRows = matchingRecipients.slice(0, 25);
    const hiddenRecipientCount = Math.max(0, matchingRecipients.length - recipientRows.length);
    const randomUnit = store.normalizeDelayUnit(campaign.randomDelayUnit);
    const randomMinAmount = store.delaySecondsToAmount(campaign.randomDelayMinSeconds, randomUnit);
    const randomMaxAmount = store.delaySecondsToAmount(campaign.randomDelayMaxSeconds, randomUnit);
    const expanded = expandedCampaigns.has(campaign.id);
    const csvEditorOpen = csvEditors.has(campaign.id);
    const activeTab = campaignTabs.get(campaign.id) || "overview";
    const primaryAction = campaign.status === "running" ? "paused" : "running";
    const primaryActionLabel = campaign.status === "running" ? "Stop sending" : "Start";
    const startBlockedAttribute = primaryAction === "running" && !readiness.ready ? disabledTitle(readiness.blockingMessage) : "";
    const sendBlockedAttribute = !readiness.ready ? disabledTitle(readiness.blockingMessage) : "";

    return `
      <article class="campaign-card ${expanded ? "expanded" : "collapsed"}">
        <div class="panel-header campaign-card-header">
          <div>
            <h3>${escapeHtml(campaign.name)}</h3>
            <p>${escapeHtml(template?.name || "No template selected")}</p>
          </div>
          <div class="campaign-header-actions">
            <span class="${store.statusClass(campaign.status)}">${store.statusLabel(campaign.status)}</span>
            <span class="${readinessStatusClass(readiness)}">${escapeHtml(readinessLabel(readiness))}</span>
            <button type="button" data-action="${primaryAction}" data-id="${escapeHtml(campaign.id)}" ${startBlockedAttribute}>${primaryActionLabel}</button>
            <button type="button" class="danger" data-action="delete-campaign" data-id="${escapeHtml(campaign.id)}">Delete record</button>
            <button type="button" data-action="toggle-details" data-id="${escapeHtml(campaign.id)}" aria-expanded="${expanded ? "true" : "false"}">${expanded ? "Hide details" : "Open details"}</button>
          </div>
        </div>
        <div class="progress-bar" aria-label="Campaign progress"><span style="width: ${progress}%"></span></div>
        <div class="campaign-summary-strip" aria-label="Campaign summary">
          <span><strong>${Number(campaign.recipients || 0)}</strong> recipients</span>
          <span><strong>${counts.sent}</strong> sent</span>
          <span><strong>${pending}</strong> pending</span>
          <span><strong>${counts.failed}</strong> failed</span>
          <span>${escapeHtml(campaign.importFileName || "No CSV attached")}</span>
          <span>${escapeHtml(readinessLabel(readiness))}</span>
          <span>${escapeHtml(planLabel)}</span>
        </div>
        <div class="campaign-details" ${expanded ? "" : "hidden"}>
          <div class="campaign-section-tabs" role="tablist" aria-label="Campaign detail sections">
            ${campaignTabButton(campaign.id, activeTab, "overview", "Overview")}
            ${campaignTabButton(campaign.id, activeTab, "recipients", "Recipients")}
            ${campaignTabButton(campaign.id, activeTab, "assets", "Assets")}
            ${campaignTabButton(campaign.id, activeTab, "message", "Message")}
            ${campaignTabButton(campaign.id, activeTab, "activity", "Activity")}
          </div>

          <section class="campaign-section" ${campaignSectionState(activeTab, "overview")}>
            <dl class="detail-list compact-details">
              <div><dt>CSV file</dt><dd>${escapeHtml(campaign.importFileName || "No CSV attached")}</dd></div>
              <div><dt>Template source</dt><dd>${escapeHtml(templateSource)}</dd></div>
              <div><dt>Template file</dt><dd>${escapeHtml(templateFile)}</dd></div>
              <div><dt>Labels</dt><dd>${escapeHtml((campaign.labels || []).slice(0, 4).join(", ") || "None")}${(campaign.labels || []).length > 4 ? ` +${(campaign.labels || []).length - 4}` : ""}</dd></div>
              <div><dt>Recipients</dt><dd>${Number(campaign.recipients || 0)}</dd></div>
              <div><dt>Sent</dt><dd>${counts.sent}</dd></div>
              <div><dt>Pending</dt><dd>${pending}</dd></div>
              <div><dt>Failed</dt><dd>${counts.failed}</dd></div>
              <div><dt>Skipped</dt><dd>${counts.skipped}</dd></div>
              <div><dt>Send start</dt><dd>${escapeHtml(campaign.windowStartAt || "Not set")}</dd></div>
              <div><dt>Send end</dt><dd>${escapeHtml(campaign.windowEndAt || "Until complete")}</dd></div>
              <div><dt>Spacing</dt><dd>${store.formatDuration(plan.calculatedSpacingSeconds)}</dd></div>
              <div><dt>Random buffer</dt><dd>${store.formatDuration(plan.randomMin)}-${store.formatDuration(plan.randomMax)}</dd></div>
            </dl>
            <div class="readiness-panel">
              <div>
                <strong>Readiness</strong>
                <span class="${readinessStatusClass(readiness)}">${escapeHtml(readinessLabel(readiness))}</span>
              </div>
              ${readinessListMarkup(readiness, 7)}
            </div>
            <div class="campaign-command-bar">
              <span class="${planClass}">${escapeHtml(planLabel)}</span>
              <button type="button" data-action="running" data-id="${escapeHtml(campaign.id)}" ${!readiness.ready ? disabledTitle(readiness.blockingMessage) : ""}>Start</button>
              <button type="button" data-action="paused" data-id="${escapeHtml(campaign.id)}">Stop sending</button>
              <button type="button" data-action="send-one" data-id="${escapeHtml(campaign.id)}" ${sendBlockedAttribute}>Send one now</button>
              <a class="button" href="/queue.html">Queue details</a>
            </div>
            <div class="campaign-assets">
              <h4>Schedule and speed</h4>
              <div class="asset-grid">
                <label>Send start
                  <input data-schedule-start="${escapeHtml(campaign.id)}" type="datetime-local" value="${escapeAttribute(toDateTimeInput(campaign.windowStartAt || campaign.scheduledAt))}">
                </label>
                <label>Send end
                  <input data-schedule-end="${escapeHtml(campaign.id)}" type="datetime-local" placeholder="Until complete" value="${escapeAttribute(toDateTimeInput(campaign.windowEndAt))}">
                </label>
                <label>Delay unit
                  <select data-schedule-unit="${escapeHtml(campaign.id)}">${delayUnitOptionsMarkup(randomUnit)}</select>
                </label>
                <label>Random delay min
                  <input data-schedule-min="${escapeHtml(campaign.id)}" type="number" min="0" step="0.01" value="${escapeAttribute(randomMinAmount)}">
                </label>
                <label>Random delay max
                  <input data-schedule-max="${escapeHtml(campaign.id)}" type="number" min="0" step="0.01" value="${escapeAttribute(randomMaxAmount)}">
                </label>
                <button type="button" data-action="save-schedule" data-id="${escapeHtml(campaign.id)}">Save schedule</button>
              </div>
            </div>
          </section>

          <section class="campaign-section" ${campaignSectionState(activeTab, "recipients")}>
            <div class="table-scroll recipient-preview">
              <div class="recipient-toolbar">
                <label>Find recipient
                  <input data-recipient-filter-input="${escapeHtml(campaign.id)}" type="search" placeholder="Name, email, or certificate id" value="${escapeAttribute(recipientFilter)}">
                </label>
                <button type="button" data-action="filter-recipients" data-id="${escapeHtml(campaign.id)}">Filter</button>
                <button type="button" data-action="clear-recipient-filter" data-id="${escapeHtml(campaign.id)}">Clear</button>
                <span>${recipientRows.length} of ${matchingRecipients.length} shown</span>
              </div>
              <table class="data-table compact-preview">
                <thead><tr><th>#</th><th>Recipient</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${recipientRows.map((recipient) => `
                    <tr>
                      <td>${Number(recipient.sequence || 0)}</td>
                      <td>${escapeHtml(recipient.displayName)}</td>
                      <td>${escapeHtml(recipient.email || "-")}</td>
                      <td><span class="${store.recipientStatusClass(recipient.status)}">${store.recipientStatusLabel(recipient.status)}</span></td>
                      <td>${recipientActionsMarkup(campaign.id, recipient)}</td>
                    </tr>
                  `).join("") || "<tr><td colspan=\"5\">No recipient CSV attached yet.</td></tr>"}
                </tbody>
              </table>
            </div>
            ${hiddenRecipientCount > 0 ? `<p class="subtle-note">Showing first ${recipientRows.length} matching recipients. Use the recipient filter to narrow larger lists.</p>` : ""}
            <div class="csv-editor-panel" ${csvEditorOpen ? "" : "hidden"}>
              <div class="panel-header">
                <div>
                  <h4>CSV data editor</h4>
                  <p>Edit labels or recipient rows, then save to rebuild this campaign's recipient queue.</p>
                </div>
                <span class="status ${allRecipients.length > 0 ? "ready" : "locked"}">${allRecipients.length} rows</span>
              </div>
              <textarea data-csv-editor="${escapeHtml(campaign.id)}" class="csv-textarea" spellcheck="false">${escapeHtml(campaignToCsv(campaign))}</textarea>
              <div class="action-row">
                <button type="button" data-action="save-csv-editor" data-id="${escapeHtml(campaign.id)}">Save CSV changes</button>
                <button type="button" data-action="download-csv" data-id="${escapeHtml(campaign.id)}">Download CSV</button>
              </div>
              <p class="subtle-note">Saving edited CSV data replaces the campaign recipient list and resets those recipients to queued.</p>
            </div>
          </section>

          <section class="campaign-section" ${campaignSectionState(activeTab, "assets")}>
            <div class="campaign-assets no-top-border">
              <h4>CSV and template assets</h4>
              <div class="asset-grid">
                <label>Replace campaign CSV
                  <input data-csv-upload="${escapeHtml(campaign.id)}" type="file" accept=".csv,text/csv">
                </label>
                <button type="button" data-action="toggle-csv-editor" data-id="${escapeHtml(campaign.id)}">${csvEditorOpen ? "Close CSV editor" : "Edit CSV data"}</button>
                <button type="button" data-action="download-csv" data-id="${escapeHtml(campaign.id)}" ${allRecipients.length === 0 ? "disabled" : ""}>Download CSV</button>
                <label>Saved template
                  <select data-template-select="${escapeHtml(campaign.id)}">${templateOptionsMarkup(campaign.templateId)}</select>
                </label>
                <button type="button" data-action="save-template" data-id="${escapeHtml(campaign.id)}">Use selected template</button>
                ${campaign.templateId && !campaign.campaignTemplateLayout ? `<a class="button" href="/designer.html?template=${encodeURIComponent(campaign.templateId)}">Edit template</a>` : ""}
                <label>Upload campaign template image
                  <input data-template-upload="${escapeHtml(campaign.id)}" type="file" accept="image/png,image/jpeg,image/webp">
                </label>
              </div>
            </div>
          </section>

          <section class="campaign-section" ${campaignSectionState(activeTab, "message")}>
            <div class="email-editor no-top-border">
              <label>Email subject
                <input data-email-subject="${escapeHtml(campaign.id)}" type="text" value="${escapeAttribute(campaign.emailSubject)}">
              </label>
              <label>Email body
                <textarea data-email-body="${escapeHtml(campaign.id)}" class="short-textarea email-body-input">${escapeHtml(campaign.emailBodyHtml)}</textarea>
              </label>
              <div class="attachment-note">PDF attachment: <strong>certificate.pdf required</strong></div>
              <button type="button" data-action="save-email" data-id="${escapeHtml(campaign.id)}">Save email</button>
            </div>
          </section>

          <section class="campaign-section" ${campaignSectionState(activeTab, "activity")}>
            <div class="event-list">
              ${(campaign.deliveryEvents || []).slice(-6).reverse().map((event) => `<div><strong>${escapeHtml(shortTime(event.at))}</strong><span>${escapeHtml(event.message)}</span></div>`).join("") || "<div><span>No campaign events yet.</span></div>"}
            </div>
            <div class="campaign-command-bar">
              <button type="button" data-action="restart-campaign" data-id="${escapeHtml(campaign.id)}">Restart campaign</button>
              <button type="button" data-action="reuse-campaign" data-id="${escapeHtml(campaign.id)}">Reuse with recipients</button>
              <button type="button" data-action="duplicate" data-id="${escapeHtml(campaign.id)}">Duplicate setup</button>
              <button type="button" data-action="completed" data-id="${escapeHtml(campaign.id)}" ${pending > 0 ? "disabled title=\"All recipients must be sent, failed, or skipped before closing.\"" : ""}>Close campaign</button>
              <button type="button" class="danger" data-action="delete-campaign" data-id="${escapeHtml(campaign.id)}">Delete</button>
            </div>
          </section>
        </div>
      </article>
    `;
  }).join("");
  enhanceEmailEditors(campaignList);
}

campaignForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  syncEmailEditors(campaignForm);
  try {
    wizardStepOrder.forEach(validateWizardStep);
  } catch (error) {
    setCampaignLaneStatus(error.message, "warning");
    const failingStep = wizardStepOrder.find((step) => {
      try {
        validateWizardStep(step);
        return false;
      } catch {
        return true;
      }
    });
    if (failingStep) {
      currentWizardStep = failingStep;
      renderWizard();
    }
    return;
  }

  const name = document.querySelector("#campaignName").value.trim();
  if (!name) return;

  setCampaignLaneStatus("Creating campaign", "pending");

  try {
    const randomDelayUnit = store.normalizeDelayUnit(document.querySelector("#campaignRandomUnit").value);
    const randomDelayMinSeconds = store.delayAmountToSeconds(document.querySelector("#campaignRandomMin").value, randomDelayUnit);
    const randomDelayMaxSeconds = store.delayAmountToSeconds(document.querySelector("#campaignRandomMax").value, randomDelayUnit);
    const windowStartAt = toIsoDateTime(document.querySelector("#campaignStart").value);
    const windowEndAt = toIsoDateTime(document.querySelector("#campaignEnd").value);
    const selectedStatus = normalizeCampaignStatusForSchedule(document.querySelector("#campaignStatus").value, windowStartAt);
    validateScheduleValues(windowStartAt, windowEndAt, randomDelayMinSeconds, randomDelayMaxSeconds);

    const templateAssignment = createTemplateAssignmentForNewCampaign(name);
    const created = store.createCampaign({
      name,
      templateId: templateAssignment.templateId,
      templateSource: templateAssignment.templateSource,
      templateFileName: templateAssignment.templateFileName,
      campaignTemplateName: templateAssignment.campaignTemplateName,
      campaignTemplateLayout: templateAssignment.campaignTemplateLayout || null,
      status: selectedStatus,
      scheduledAt: windowStartAt,
      windowStartAt,
      windowEndAt,
      randomDelayUnit,
      randomDelayMinSeconds,
      randomDelayMaxSeconds,
      throttleSeconds: randomDelayMinSeconds || 60,
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

    lastCampaignImport = null;
    lastCampaignTemplateUpload = null;
    campaignCsvFile.value = "";
    campaignTemplateFile.value = "";
    expandedCampaigns.clear();
    expandedCampaigns.add(created.id);
    currentWizardStep = "csv";
    resetCampaignCsvPreview();
    setTemplateUploadStatus("No template image selected", "locked");
    campaignTemplatePreview.textContent = "Upload a PNG, JPG, or WebP certificate background. Recipient name, program, date, and QR fields will be added automatically.";

    render();
    setCampaignLaneStatus(`Created ${created.name}`, "ready");
  } catch (error) {
    setCampaignLaneStatus(error.message, "warning");
  }
});

document.querySelectorAll("[data-wizard-step-target]").forEach((button) => {
  button.addEventListener("click", () => {
    try {
      goToWizardStep(button.dataset.wizardStepTarget);
      setCampaignLaneStatus("Campaign wizard updated", "ready");
    } catch (error) {
      setCampaignLaneStatus(error.message, "warning");
    }
  });
});

wizardNext.addEventListener("click", () => {
  try {
    goToNextWizardStep();
    setCampaignLaneStatus("Campaign wizard updated", "ready");
  } catch (error) {
    setCampaignLaneStatus(error.message, "warning");
  }
});

wizardBack.addEventListener("click", () => {
  goToPreviousWizardStep();
  setCampaignLaneStatus("Campaign wizard updated", "ready");
});

campaignList.addEventListener("click", async (event) => {
  const tabButton = event.target.closest("button[data-campaign-tab]");
  if (tabButton) {
    campaignTabs.set(tabButton.dataset.id, tabButton.dataset.campaignTab);
    renderCampaigns();
    setCampaignLaneStatus("Campaign section updated", "ready");
    return;
  }

  const recipientButton = event.target.closest("button[data-recipient-action]");
  if (recipientButton) {
    recipientButton.disabled = true;
    setCampaignLaneStatus(recipientButton.dataset.recipientAction === "preview" ? "Generating preview" : "Updating recipient", "pending");

    try {
      if (recipientButton.dataset.recipientAction === "preview") {
        await window.CertificateIssuerPreview.open(recipientButton.dataset.id, recipientButton.dataset.recipientId, setCampaignLaneStatus);
      } else {
        updateRecipientFromButton(recipientButton);
        render();
        setCampaignLaneStatus("Recipient queue updated", "ready");
      }
    } catch (error) {
      setCampaignLaneStatus(error.message, "warning");
    } finally {
      recipientButton.disabled = false;
    }
    return;
  }

  const button = event.target.closest("button[data-action]");
  if (!button) return;

  button.disabled = true;
  setCampaignLaneStatus("Updating campaign", "pending");

  try {
    if (button.dataset.action === "toggle-details") {
      if (expandedCampaigns.has(button.dataset.id)) {
        expandedCampaigns.delete(button.dataset.id);
      } else {
        expandedCampaigns.add(button.dataset.id);
      }
      renderCampaigns();
      setCampaignLaneStatus("Campaign view updated", "ready");
    } else if (button.dataset.action === "running") {
      await store.updateCampaignStatusAsync(button.dataset.id, "running");
      render();
      setCampaignLaneStatus("Campaign started. Queue worker will process due recipients.", "ready");
    } else if (button.dataset.action === "send-one") {
      await store.manualSendOneAsync(button.dataset.id);
      render();
      setCampaignLaneStatus("One due recipient processed", "ready");
    } else if (button.dataset.action === "completed") {
      await store.completeCampaignAsync(button.dataset.id);
      render();
      setCampaignLaneStatus("Campaign closed", "ready");
    } else if (button.dataset.action === "duplicate") {
      const copy = duplicateCampaign(button.dataset.id);
      expandedCampaigns.clear();
      expandedCampaigns.add(copy.id);
      render();
      setCampaignLaneStatus(`Duplicated ${copy.name}`, "ready");
    } else if (button.dataset.action === "reuse-campaign") {
      const copy = store.reuseCampaign(button.dataset.id);
      if (copy?.id) {
        expandedCampaigns.clear();
        expandedCampaigns.add(copy.id);
      }
      render();
      setCampaignLaneStatus(`Reusable campaign created: ${copy?.name || "campaign"}`, "ready");
    } else if (button.dataset.action === "restart-campaign") {
      if (!window.confirm("Restarting resets all recipients to queued and pauses this campaign. Continue?")) {
        setCampaignLaneStatus("Restart cancelled", "locked");
        return;
      }
      store.restartCampaign(button.dataset.id);
      render();
      setCampaignLaneStatus("Campaign queue reset. Start it when ready.", "ready");
    } else if (button.dataset.action === "delete-campaign") {
      const campaign = store.findCampaign(button.dataset.id);
      if (!window.confirm(`Delete ${campaign?.name || "this campaign"}? This removes the campaign queue and events.`)) {
        setCampaignLaneStatus("Delete cancelled", "locked");
        return;
      }
      store.deleteCampaign(button.dataset.id);
      forgetCampaignUiState([button.dataset.id]);
      render();
      setCampaignLaneStatus("Campaign deleted", "ready");
    } else if (button.dataset.action === "save-schedule") {
      saveCampaignSchedule(button.dataset.id);
      render();
      setCampaignLaneStatus("Campaign schedule updated", "ready");
    } else if (button.dataset.action === "filter-recipients") {
      const value = document.querySelector(`[data-recipient-filter-input="${cssEscape(button.dataset.id)}"]`)?.value.trim() || "";
      if (value) {
        recipientFilters.set(button.dataset.id, value);
      } else {
        recipientFilters.delete(button.dataset.id);
      }
      render();
      setCampaignLaneStatus("Recipient list filtered", "ready");
    } else if (button.dataset.action === "clear-recipient-filter") {
      recipientFilters.delete(button.dataset.id);
      render();
      setCampaignLaneStatus("Recipient filter cleared", "ready");
    } else if (button.dataset.action === "toggle-csv-editor") {
      if (csvEditors.has(button.dataset.id)) {
        csvEditors.delete(button.dataset.id);
      } else {
        expandedCampaigns.add(button.dataset.id);
        csvEditors.add(button.dataset.id);
        campaignTabs.set(button.dataset.id, "recipients");
      }
      renderCampaigns();
      setCampaignLaneStatus("CSV editor view updated", "ready");
    } else if (button.dataset.action === "save-csv-editor") {
      saveEditedCampaignCsv(button.dataset.id);
      expandedCampaigns.add(button.dataset.id);
      csvEditors.add(button.dataset.id);
      render();
      setCampaignLaneStatus("Campaign CSV data saved", "ready");
    } else if (button.dataset.action === "download-csv") {
      downloadCampaignCsv(button.dataset.id);
      setCampaignLaneStatus("CSV downloaded", "ready");
    } else if (button.dataset.action === "save-template") {
      const selectedTemplate = document.querySelector(`[data-template-select="${cssEscape(button.dataset.id)}"]`)?.value || "";
      if (!selectedTemplate) {
        throw new Error("Select a saved template first.");
      }
      const template = store.findTemplate(selectedTemplate);
      store.updateCampaign(button.dataset.id, {
        templateId: selectedTemplate,
        templateSource: "saved_template",
        templateFileName: "",
        campaignTemplateName: template?.name || "",
        campaignTemplateLayout: null,
        deliveryEvents: addCampaignEvent(store.findCampaign(button.dataset.id) || {}, `Template changed to ${template?.name || "saved template"}.`)
      });
      render();
      setCampaignLaneStatus("Campaign template updated", "ready");
    } else if (button.dataset.action === "save-email") {
      syncEmailEditors(campaignList);
      const subject = document.querySelector(`[data-email-subject="${cssEscape(button.dataset.id)}"]`)?.value.trim();
      const body = document.querySelector(`[data-email-body="${cssEscape(button.dataset.id)}"]`)?.value.trim();
      store.updateCampaign(button.dataset.id, {
        emailSubject: subject || "Your certificate is ready",
        emailBodyHtml: body || "<p>Your certificate is attached as a PDF.</p><p>Verification link: <a href=\"{{verification_url}}\">{{verification_url}}</a></p>",
        attachPdf: true
      });
      render();
      setCampaignLaneStatus("Email content saved", "ready");
    } else {
      await store.updateCampaignStatusAsync(button.dataset.id, button.dataset.action);
      render();
      setCampaignLaneStatus("Campaign updated", "ready");
    }
  } catch (error) {
    setCampaignLaneStatus(error.message, "warning");
  } finally {
    button.disabled = false;
  }
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

campaignTemplateMode.addEventListener("change", () => {
  renderTemplateMode();
  renderWizardTemplatePreview();
  renderWizardReviewSummary();
  renderPlanPreview();
});

campaignTemplate.addEventListener("change", () => {
  renderWizardTemplatePreview();
  renderWizardReviewSummary();
});

campaignTemplateFit.addEventListener("change", () => {
  renderWizardTemplatePreview();
  renderWizardReviewSummary();
});

campaignTemplateFile.addEventListener("change", async () => {
  const file = campaignTemplateFile.files && campaignTemplateFile.files[0];
  if (!file) return;

  setTemplateUploadStatus("Uploading template image", "pending");
  campaignTemplatePreview.textContent = file.name;
  try {
    lastCampaignTemplateUpload = await uploadTemplateImage(file);
    setTemplateUploadStatus("Template image ready", "ready");
    campaignTemplatePreview.textContent = file.name;
    renderWizardTemplatePreview();
    renderWizardReviewSummary();
  } catch (error) {
    lastCampaignTemplateUpload = null;
    setTemplateUploadStatus("Template upload failed", "failed");
    campaignTemplatePreview.textContent = error.message;
    renderWizardTemplatePreview();
  }
});

campaignList.addEventListener("change", async (event) => {
  const csvInput = event.target.closest("input[data-csv-upload]");
  if (csvInput) {
    const file = csvInput.files && csvInput.files[0];
    if (!file) return;

    setCampaignLaneStatus("Replacing campaign CSV", "pending");
    try {
      const importBatch = await parseCampaignCsvFile(file);
      const updated = store.attachImportToCampaign(csvInput.dataset.csvUpload, importBatch);
      render();
      setCampaignLaneStatus(`Attached ${importBatch.records.length} recipients to ${updated?.name || "campaign"}`, "ready");
    } catch (error) {
      setCampaignLaneStatus(error.message, "warning");
    }
    return;
  }

  const templateInput = event.target.closest("input[data-template-upload]");
  if (templateInput) {
    const file = templateInput.files && templateInput.files[0];
    if (!file) return;

    setCampaignLaneStatus("Uploading campaign template", "pending");
    try {
      const campaign = store.findCampaign(templateInput.dataset.templateUpload);
      if (!campaign) throw new Error("Campaign not found.");
      const uploaded = await uploadTemplateImage(file);
      store.updateCampaign(campaign.id, {
        templateId: campaign.templateId || campaignTemplateUploadId(campaign.name),
        templateSource: "campaign_upload",
        templateFileName: uploaded.originalName,
        campaignTemplateName: campaign.campaignTemplateName || `${campaign.name} certificate template`,
        campaignTemplateLayout: buildCampaignTemplateLayout(uploaded, "stretch"),
        deliveryEvents: addCampaignEvent(campaign, `Campaign template image changed to ${uploaded.originalName}.`)
      });
      render();
      setCampaignLaneStatus("Campaign template image updated", "ready");
    } catch (error) {
      setCampaignLaneStatus(error.message, "warning");
    }
  }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-rich-command], [data-rich-action], [data-rich-token]");
  if (!button) return;

  const editor = button.closest(".rich-editor");
  if (!editor) return;

  event.preventDefault();
  handleRichEditorButton(editor, button);
});

document.addEventListener("input", (event) => {
  const surface = event.target.closest?.(".rich-editor-surface");
  if (surface) {
    syncRichSurface(surface);
    renderWizardReviewSummary();
    return;
  }

  const source = event.target.closest?.(".rich-editor-source");
  if (source) {
    const editor = source.closest(".rich-editor");
    const surfaceElement = editor?.querySelector(".rich-editor-surface");
    if (surfaceElement) {
      surfaceElement.innerHTML = source.value;
    }
    renderWizardReviewSummary();
  }
});

document.addEventListener("focusin", (event) => {
  const surface = event.target.closest?.(".rich-editor-surface");
  if (surface) {
    activeEmailSurface = surface;
  }
});

["campaignName", "campaignStart", "campaignEnd", "campaignRandomUnit", "campaignRandomMin", "campaignRandomMax", "campaignEmailSubject", "campaignSmtp"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", () => {
    renderPlanPreview();
    renderWizardReviewSummary();
  });
});

[campaignSearch, campaignStatusFilter, campaignSort].forEach((control) => {
  control.addEventListener("input", renderCampaigns);
});

[campaignCleanupMode, campaignCleanupAge].forEach((control) => {
  control.addEventListener("input", renderCampaignCleanup);
});

deleteOldCampaignRecords.addEventListener("click", () => {
  const candidates = campaignCleanupCandidates();
  if (candidates.length === 0) {
    setCampaignLaneStatus("No old campaign records match the cleanup selection.", "locked");
    return;
  }

  const names = candidates.slice(0, 5).map((campaign) => campaign.name || campaign.id).join(", ");
  const suffix = candidates.length > 5 ? ` and ${candidates.length - 5} more` : "";
  if (!window.confirm(`Delete ${candidates.length} campaign record${candidates.length === 1 ? "" : "s"}: ${names}${suffix}? This removes them from Campaigns and Queue.`)) {
    setCampaignLaneStatus("Cleanup cancelled", "locked");
    return;
  }

  const ids = candidates.map((campaign) => campaign.id);
  const deleted = store.deleteCampaigns(ids);
  forgetCampaignUiState(ids);
  render();
  setCampaignLaneStatus(`Deleted ${deleted.length} old campaign record${deleted.length === 1 ? "" : "s"}`, "ready");
});

setCampaignStartNow.addEventListener("click", () => {
  document.querySelector("#campaignStart").value = toDateTimeInput(new Date());
  renderPlanPreview();
  renderWizardReviewSummary();
});

clearCampaignEnd.addEventListener("click", () => {
  document.querySelector("#campaignEnd").value = "";
  renderPlanPreview();
  renderWizardReviewSummary();
});

document.querySelectorAll("[data-delay-preset-unit]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#campaignRandomUnit").value = button.dataset.delayPresetUnit;
    document.querySelector("#campaignRandomMin").value = button.dataset.delayPresetMin;
    document.querySelector("#campaignRandomMax").value = button.dataset.delayPresetMax;
    renderPlanPreview();
    renderWizardReviewSummary();
  });
});

document.querySelectorAll("[data-email-token]").forEach((button) => {
  button.addEventListener("click", () => {
    insertEmailToken(button.dataset.emailToken);
  });
});

function render() {
  renderTemplateOptions();
  renderTemplateMode();
  renderMetrics();
  renderCampaigns();
  enhanceEmailEditors(document);
  renderPlanPreview();
  renderWizard();
}

async function initializeCampaigns() {
  setCampaignLaneStatus("Loading campaigns", "pending");
  try {
    await store.refreshState();
    render();
  } catch (error) {
    setCampaignLaneStatus(error.message, "warning");
  }
}

function renderPlanPreview() {
  const recipientCount = lastCampaignImport?.records.length || 0;
  const randomDelayUnit = store.normalizeDelayUnit(document.querySelector("#campaignRandomUnit").value);
  const randomDelayMinSeconds = store.delayAmountToSeconds(document.querySelector("#campaignRandomMin").value, randomDelayUnit);
  const randomDelayMaxSeconds = store.delayAmountToSeconds(document.querySelector("#campaignRandomMax").value, randomDelayUnit);
  const previewCampaign = {
    recipients: recipientCount,
    failed: 0,
    windowStartAt: document.querySelector("#campaignStart").value,
    windowEndAt: document.querySelector("#campaignEnd").value,
    randomDelayUnit,
    randomDelayMinSeconds,
    randomDelayMaxSeconds,
    throttleSeconds: randomDelayMinSeconds || 60
  };
  const plan = store.deliveryPlan(previewCampaign);

  if (!recipientCount) {
    campaignPlanPreview.textContent = "Upload this campaign's CSV to calculate exact delivery spacing.";
    campaignPlanPreview.className = "plan-preview";
    return;
  }

  if (!previewCampaign.windowStartAt) {
    campaignPlanPreview.textContent = `${recipientCount} recipients loaded. Set a start time to schedule delivery.`;
    campaignPlanPreview.className = "plan-preview";
    return;
  }

  if (plan.continuesUntilComplete) {
    campaignPlanPreview.textContent = `For ${recipientCount} recipients: starts ${shortTime(previewCampaign.windowStartAt)}, continues until complete, randomized ${store.formatDuration(plan.randomMin)}-${store.formatDuration(plan.randomMax)} between emails. Estimated run time ${store.formatDuration(plan.estimatedDurationSeconds)}.`;
    campaignPlanPreview.className = "plan-preview ready";
    return;
  }

  campaignPlanPreview.textContent = `For ${recipientCount} recipients: ${store.formatDuration(plan.calculatedSpacingSeconds)} average spacing, randomized ${store.formatDuration(plan.randomMin)}-${store.formatDuration(plan.randomMax)}.`;
  campaignPlanPreview.className = plan.fitsMinimumWindow ? "plan-preview ready" : "plan-preview warning";
}

function filteredCampaigns(campaigns) {
  const query = campaignSearch.value.trim().toLowerCase();
  const status = campaignStatusFilter.value;
  const sort = campaignSort.value;

  return campaigns
    .filter((campaign) => {
      if (status !== "all" && campaign.status !== status) return false;
      if (query === "") return true;

      const template = store.campaignTemplate(campaign);
      const searchable = [
        campaign.name,
        campaign.importFileName,
        campaign.emailSubject,
        campaign.smtpProfile,
        template?.name,
        ...(campaign.labels || [])
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    })
    .sort((left, right) => compareCampaigns(left, right, sort));
}

function renderCampaignCleanup() {
  const candidates = campaignCleanupCandidates();
  const modeLabel = campaignCleanupMode.options[campaignCleanupMode.selectedIndex]?.textContent || "selected scope";
  const ageLabel = campaignCleanupAge.value === "0"
    ? ""
    : ` ${campaignCleanupAge.options[campaignCleanupAge.selectedIndex]?.textContent.toLowerCase() || ""}`;

  campaignCleanupSummary.textContent = candidates.length === 0
    ? `No ${modeLabel.toLowerCase()}${ageLabel} are available to delete.`
    : `${candidates.length} ${modeLabel.toLowerCase()}${ageLabel} ready for cleanup.`;
  deleteOldCampaignRecords.disabled = candidates.length === 0;
}

function campaignCleanupCandidates() {
  const campaigns = campaignCleanupMode.value === "filtered_non_active"
    ? filteredCampaigns(store.campaigns())
    : store.campaigns();
  const mode = campaignCleanupMode.value;
  const ageDays = Number(campaignCleanupAge.value || 0);
  const cutoff = ageDays > 0 ? Date.now() - ageDays * 24 * 60 * 60 * 1000 : 0;

  return campaigns.filter((campaign) => {
    if (!campaign.id) return false;
    if (["running", "scheduled"].includes(campaign.status)) return false;
    if (mode === "completed" && campaign.status !== "completed") return false;
    if (mode === "paused_completed" && !["paused", "completed"].includes(campaign.status)) return false;
    if (mode === "non_active" && ["running", "scheduled"].includes(campaign.status)) return false;
    if (mode === "filtered_non_active" && ["running", "scheduled"].includes(campaign.status)) return false;

    if (cutoff > 0) {
      const referenceTime = campaignReferenceTime(campaign);
      if (referenceTime === 0 || referenceTime > cutoff) return false;
    }

    return true;
  });
}

function campaignReferenceTime(campaign) {
  return sortableTime(campaign.completedAt)
    || sortableTime(campaign.updatedAt)
    || sortableTime(campaign.windowStartAt)
    || sortableTime(campaign.scheduledAt)
    || 0;
}

function compareCampaigns(left, right, sort) {
  if (sort === "name_asc") {
    return String(left.name || "").localeCompare(String(right.name || ""));
  }

  if (sort === "start_asc") {
    return sortableTime(left.windowStartAt || left.scheduledAt) - sortableTime(right.windowStartAt || right.scheduledAt);
  }

  if (sort === "pending_desc") {
    return pendingCount(right) - pendingCount(left);
  }

  return sortableTime(right.updatedAt) - sortableTime(left.updatedAt);
}

function pendingCount(campaign) {
  return store.campaignCounts(campaign).pending;
}

function forgetCampaignUiState(ids) {
  const idSet = new Set(ids.map(String));
  idSet.forEach((id) => {
    recipientFilters.delete(id);
    expandedCampaigns.delete(id);
    csvEditors.delete(id);
    campaignTabs.delete(id);
  });
}

function filterRecipients(recipients, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return recipients;

  return recipients.filter((recipient) => {
    const data = recipient.data && typeof recipient.data === "object" ? Object.values(recipient.data) : [];
    return [
      recipient.displayName,
      recipient.email,
      recipient.identifier,
      recipient.nameEn,
      recipient.nameAr,
      ...data
    ].join(" ").toLowerCase().includes(normalizedQuery);
  });
}

function recipientActionsMarkup(campaignId, recipient) {
  const status = recipient.status || "queued";
  const retryLabel = status === "sent" ? "Resend" : "Retry";
  const skipDisabled = status === "sent" || status === "skipped";

  return `
    <div class="table-actions">
      <button type="button" data-recipient-action="preview" data-id="${escapeHtml(campaignId)}" data-recipient-id="${escapeHtml(recipient.id)}">Preview</button>
      <button type="button" data-recipient-action="retry" data-id="${escapeHtml(campaignId)}" data-recipient-id="${escapeHtml(recipient.id)}">${retryLabel}</button>
      <button type="button" data-recipient-action="skip" data-id="${escapeHtml(campaignId)}" data-recipient-id="${escapeHtml(recipient.id)}" ${skipDisabled ? "disabled" : ""}>Skip</button>
      <button type="button" class="danger" data-recipient-action="remove" data-id="${escapeHtml(campaignId)}" data-recipient-id="${escapeHtml(recipient.id)}">Remove</button>
    </div>
  `;
}

function updateRecipientFromButton(button) {
  const campaignId = button.dataset.id;
  const recipientId = button.dataset.recipientId;
  const campaign = store.findCampaign(campaignId);
  const recipient = (campaign?.recipientQueue || []).find((record) => record.id === recipientId);
  if (!campaign || !recipient) {
    throw new Error("Recipient not found.");
  }

  if (button.dataset.recipientAction === "remove") {
    if (!window.confirm(`Remove ${recipient.displayName || recipient.email || "this recipient"} from this campaign?`)) {
      throw new Error("Recipient removal cancelled.");
    }
    store.removeRecipient(campaignId, recipientId);
    return;
  }

  if (button.dataset.recipientAction === "retry") {
    if (recipient.status === "sent" && !window.confirm(`Queue ${recipient.displayName || recipient.email || "this recipient"} for resending?`)) {
      throw new Error("Resend cancelled.");
    }
    store.retryRecipient(campaignId, recipientId);
    return;
  }

  if (button.dataset.recipientAction === "skip") {
    store.skipRecipient(campaignId, recipientId);
  }
}

function saveCampaignSchedule(campaignId) {
  const campaign = store.findCampaign(campaignId);
  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const startValue = document.querySelector(`[data-schedule-start="${cssEscape(campaignId)}"]`)?.value || "";
  const endValue = document.querySelector(`[data-schedule-end="${cssEscape(campaignId)}"]`)?.value || "";
  const randomDelayUnit = store.normalizeDelayUnit(document.querySelector(`[data-schedule-unit="${cssEscape(campaignId)}"]`)?.value || "seconds");
  const minValue = document.querySelector(`[data-schedule-min="${cssEscape(campaignId)}"]`)?.value || 0;
  const maxValue = document.querySelector(`[data-schedule-max="${cssEscape(campaignId)}"]`)?.value || 0;
  const randomDelayMinSeconds = store.delayAmountToSeconds(minValue, randomDelayUnit);
  const randomDelayMaxSeconds = store.delayAmountToSeconds(maxValue, randomDelayUnit);
  const windowStartAt = toIsoDateTime(startValue);
  const windowEndAt = toIsoDateTime(endValue);

  validateScheduleValues(windowStartAt, windowEndAt, randomDelayMinSeconds, randomDelayMaxSeconds);

  const startDate = windowStartAt ? new Date(windowStartAt) : null;
  const status = startDate && startDate.getTime() > Date.now() && campaign.status !== "paused"
    ? "scheduled"
    : (campaign.status === "draft" ? "scheduled" : campaign.status);

  store.updateCampaignSchedule(campaignId, {
    status,
    scheduledAt: windowStartAt,
    windowStartAt,
    windowEndAt,
    windowExpiredAt: "",
    nextSendAfterAt: "",
    randomDelayUnit,
    randomDelayMinSeconds,
    randomDelayMaxSeconds,
    throttleSeconds: randomDelayMinSeconds
  });
}

function delayUnitOptionsMarkup(selectedUnit) {
  return store.delayUnitOptions().map((unit) => {
    const selected = unit.value === selectedUnit ? " selected" : "";
    return `<option value="${escapeHtml(unit.value)}"${selected}>${escapeHtml(unit.label)}</option>`;
  }).join("");
}

function sortableTime(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function validateScheduleValues(windowStartAt, windowEndAt, randomDelayMinSeconds, randomDelayMaxSeconds) {
  if (windowStartAt && windowEndAt && new Date(windowEndAt).getTime() <= new Date(windowStartAt).getTime()) {
    throw new Error("Send end must be after send start, or leave it blank to continue until complete.");
  }

  if (randomDelayMaxSeconds < randomDelayMinSeconds) {
    throw new Error("Random delay max must be greater than or equal to the minimum.");
  }
}

function normalizeCampaignStatusForSchedule(status, windowStartAt) {
  if (status === "running" && windowStartAt) {
    const startDate = new Date(windowStartAt);
    if (!Number.isNaN(startDate.getTime()) && startDate.getTime() > Date.now()) {
      return "scheduled";
    }
  }

  return status;
}

function duplicateCampaign(campaignId) {
  const source = store.findCampaign(campaignId);
  if (!source) {
    throw new Error("Campaign not found.");
  }

  const copyName = nextCopyName(source.name || "Campaign");
  return store.createCampaign({
    name: copyName,
    templateId: source.templateId,
    templateSource: source.templateSource,
    templateFileName: source.templateFileName,
    campaignTemplateName: source.campaignTemplateName,
    campaignTemplateLayout: source.campaignTemplateLayout || null,
    status: "draft",
    scheduledAt: "",
    windowStartAt: "",
    windowEndAt: "",
    windowExpiredAt: "",
    nextSendAfterAt: "",
    randomDelayUnit: source.randomDelayUnit,
    randomDelayMinSeconds: source.randomDelayMinSeconds,
    randomDelayMaxSeconds: source.randomDelayMaxSeconds,
    throttleSeconds: source.throttleSeconds,
    smtpProfile: source.smtpProfile,
    emailSubject: source.emailSubject,
    emailBodyHtml: source.emailBodyHtml,
    attachPdf: true,
    recipients: 0,
    rendered: 0,
    sent: 0,
    failed: 0,
    labels: [],
    recipientQueue: [],
    importFileName: "",
    importedAt: "",
    sampleRows: [],
    deliveryEvents: [
      { at: new Date().toISOString(), message: `Campaign setup copied from ${source.name || "campaign"}.` }
    ]
  });
}

function nextCopyName(name) {
  const existingNames = new Set(store.campaigns().map((campaign) => String(campaign.name || "").toLowerCase()));
  let candidate = `${name} copy`;
  let count = 2;

  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${name} copy ${count}`;
    count += 1;
  }

  return candidate;
}

function insertAtCursor(target, token) {
  const value = target.value || "";
  const start = Number.isInteger(target.selectionStart) ? target.selectionStart : value.length;
  const end = Number.isInteger(target.selectionEnd) ? target.selectionEnd : start;
  target.value = `${value.slice(0, start)}${token}${value.slice(end)}`;
  const cursor = start + token.length;
  target.focus();
  target.setSelectionRange(cursor, cursor);
}

function enhanceEmailEditors(root = document) {
  root.querySelectorAll("textarea.email-body-input:not([data-rich-enhanced])").forEach((textarea) => {
    textarea.dataset.richEnhanced = "true";
    textarea.classList.add("rich-editor-source");
    textarea.hidden = true;

    const editor = document.createElement("div");
    editor.className = "rich-editor";
    editor.innerHTML = `
      <div class="rich-editor-toolbar" aria-label="Email formatting toolbar">
        <button type="button" data-rich-command="bold" title="Bold"><strong>B</strong></button>
        <button type="button" data-rich-command="italic" title="Italic"><em>I</em></button>
        <button type="button" data-rich-command="underline" title="Underline"><span class="underline-command">U</span></button>
        <button type="button" data-rich-command="insertUnorderedList" title="Bullet list">List</button>
        <button type="button" data-rich-command="insertOrderedList" title="Numbered list">1.</button>
        <button type="button" data-rich-command="createLink" title="Insert link">Link</button>
        <button type="button" data-rich-command="removeFormat" title="Clear formatting">Clear</button>
        <span class="rich-editor-divider"></span>
        <button type="button" data-rich-token="{{name_en}}">name_en</button>
        <button type="button" data-rich-token="{{name_ar}}">name_ar</button>
        <button type="button" data-rich-token="{{program_en}}">program_en</button>
        <button type="button" data-rich-token="{{certificate_number}}">certificate_number</button>
        <button type="button" data-rich-token="{{verification_url}}">verification_url</button>
        <span class="rich-editor-divider"></span>
        <button type="button" data-rich-action="toggle-source">HTML</button>
      </div>
      <div class="rich-editor-surface" contenteditable="true" role="textbox" aria-multiline="true"></div>
    `;

    const surface = editor.querySelector(".rich-editor-surface");
    surface.innerHTML = textarea.value || defaultEmailBody();
    textarea.parentNode.insertBefore(editor, textarea);
    editor.appendChild(textarea);
    syncRichSurface(surface);
  });
}

function handleRichEditorButton(editor, button) {
  const surface = editor.querySelector(".rich-editor-surface");
  const source = editor.querySelector(".rich-editor-source");
  if (!surface || !source) return;

  if (button.dataset.richAction === "toggle-source") {
    toggleRichEditorSource(editor, button);
    return;
  }

  if (button.dataset.richToken) {
    insertIntoRichEditor(surface, button.dataset.richToken);
    return;
  }

  const command = button.dataset.richCommand;
  if (!command) return;

  if (!source.hidden) {
    surface.innerHTML = source.value;
    toggleRichEditorSource(editor, editor.querySelector("[data-rich-action='toggle-source']"));
  }

  surface.focus();
  activeEmailSurface = surface;

  if (command === "createLink") {
    const url = window.prompt("Enter the link URL");
    if (!url) return;
    const safeUrl = normalizeEmailLink(url);
    if (window.getSelection()?.toString()) {
      document.execCommand("createLink", false, safeUrl);
    } else {
      document.execCommand("insertHTML", false, `<a href="${escapeAttribute(safeUrl)}">${escapeHtml(safeUrl)}</a>`);
    }
  } else {
    document.execCommand(command, false, null);
  }

  syncRichSurface(surface);
}

function toggleRichEditorSource(editor, button) {
  const surface = editor.querySelector(".rich-editor-surface");
  const source = editor.querySelector(".rich-editor-source");
  if (!surface || !source) return;

  if (source.hidden) {
    source.value = surface.innerHTML.trim();
    source.hidden = false;
    surface.hidden = true;
    editor.classList.add("source-mode");
    if (button) button.textContent = "Visual";
    source.focus();
  } else {
    surface.innerHTML = source.value || defaultEmailBody();
    source.hidden = true;
    surface.hidden = false;
    editor.classList.remove("source-mode");
    if (button) button.textContent = "HTML";
    surface.focus();
    syncRichSurface(surface);
  }
}

function syncEmailEditors(root = document) {
  root.querySelectorAll(".rich-editor").forEach((editor) => {
    const surface = editor.querySelector(".rich-editor-surface");
    const source = editor.querySelector(".rich-editor-source");
    if (!surface || !source) return;

    if (source.hidden) {
      source.value = surface.innerHTML.trim();
    } else {
      surface.innerHTML = source.value;
    }
  });
}

function syncRichSurface(surface) {
  const editor = surface.closest(".rich-editor");
  const source = editor?.querySelector(".rich-editor-source");
  if (source && source.hidden) {
    source.value = surface.innerHTML.trim();
  }
}

function insertEmailToken(token) {
  const active = document.activeElement;
  if (active === campaignEmailSubject) {
    insertAtCursor(campaignEmailSubject, token);
    return;
  }

  const rememberedSurface = activeEmailSurface && document.body.contains(activeEmailSurface) ? activeEmailSurface : null;
  const surface = active?.closest?.(".rich-editor-surface") || rememberedSurface || document.querySelector("#campaignEmailBody")?.closest(".rich-editor")?.querySelector(".rich-editor-surface");
  if (surface) {
    insertIntoRichEditor(surface, token);
  }
}

function insertIntoRichEditor(surface, value) {
  surface.hidden = false;
  const editor = surface.closest(".rich-editor");
  const source = editor?.querySelector(".rich-editor-source");
  const toggle = editor?.querySelector("[data-rich-action='toggle-source']");
  if (source && !source.hidden) {
    toggleRichEditorSource(editor, toggle);
  }

  surface.focus();
  activeEmailSurface = surface;
  document.execCommand("insertText", false, value);
  syncRichSurface(surface);
}

function normalizeEmailLink(url) {
  const trimmed = String(url || "").trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function defaultEmailBody() {
  return '<p>Hello {{name_en}},</p><p>Your certificate is attached as a PDF.</p><p>Verification link: <a href="{{verification_url}}">{{verification_url}}</a></p>';
}

function renderTemplateMode() {
  const mode = campaignTemplateMode.value;
  document.querySelectorAll("[data-template-mode-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.templateModePanel !== mode;
  });
}

function createTemplateAssignmentForNewCampaign(campaignName) {
  if (campaignTemplateMode.value === "upload") {
    if (!lastCampaignTemplateUpload) {
      throw new Error("Upload the campaign template image before creating the campaign.");
    }

    const templateName = campaignTemplateName.value.trim() || `${campaignName} certificate template`;

    return {
      templateId: campaignTemplateUploadId(campaignName),
      templateSource: "campaign_upload",
      templateFileName: lastCampaignTemplateUpload.originalName,
      campaignTemplateName: templateName,
      campaignTemplateLayout: buildCampaignTemplateLayout(lastCampaignTemplateUpload, campaignTemplateFit.value)
    };
  }

  if (!campaignTemplate.value) {
    throw new Error("Select a saved template or upload a template image for this campaign.");
  }

  const template = store.findTemplate(campaignTemplate.value);
  return {
    templateId: campaignTemplate.value,
    templateSource: "saved_template",
    templateFileName: "",
    campaignTemplateName: template?.name || "",
    campaignTemplateLayout: null
  };
}

function buildCampaignTemplateLayout(upload, fit) {
  return {
    page: { width: 297, height: 210, orientation: "landscape" },
    background: upload.path,
    backgroundFit: normalizeBackgroundFit(fit),
    elements: defaultCampaignTemplateElements()
  };
}

function campaignTemplateUploadId(name) {
  const slug = String(name || "campaign")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "campaign";
  return `campaign-template-${slug}-${Date.now().toString(36)}`;
}

function defaultCampaignTemplateElements() {
  return [
    {
      type: "csv_text",
      key: "recipient_name_en",
      label: "Recipient Name",
      source: "name_en",
      x: 66,
      y: 80,
      width: 165,
      height: 16,
      font: "arial",
      fontSize: 24,
      align: "center",
      direction: "ltr",
      color: "#111827"
    },
    {
      type: "csv_text",
      key: "recipient_name_ar",
      label: "Arabic Recipient Name",
      source: "name_ar",
      x: 66,
      y: 99,
      width: 165,
      height: 16,
      font: "traditional_arabic",
      fontSize: 24,
      align: "center",
      direction: "rtl",
      color: "#111827"
    },
    {
      type: "csv_text",
      key: "program_en",
      label: "Program",
      source: "program_en",
      x: 78,
      y: 123,
      width: 142,
      height: 12,
      font: "arial",
      fontSize: 15,
      align: "center",
      direction: "ltr",
      color: "#344054"
    },
    {
      type: "csv_text",
      key: "issue_date",
      label: "Issue Date",
      source: "issue_date",
      x: 124,
      y: 151,
      width: 50,
      height: 9,
      font: "arial",
      fontSize: 11,
      align: "center",
      direction: "ltr",
      color: "#344054"
    },
    {
      type: "verification_qr",
      key: "verification_qr",
      label: "Verification QR",
      x: 251,
      y: 164,
      width: 28,
      height: 28,
      fit: "contain"
    }
  ];
}

async function uploadTemplateImage(file) {
  const formData = new FormData();
  formData.append("asset", file);
  formData.append("category", "backgrounds");

  const response = await fetch("/upload-asset.php", {
    method: "POST",
    headers: {
      "X-CSRF-Token": window.CertificateIssuerAuth?.csrfToken || ""
    },
    body: formData
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Template image upload failed.");
  }

  return { ...payload, originalName: file.name };
}

function setTemplateUploadStatus(text, state = "locked") {
  campaignTemplateStatus.textContent = text;
  campaignTemplateStatus.className = `status ${state}`;
}

function normalizeBackgroundFit(value) {
  return ["cover", "contain", "stretch"].includes(value) ? value : "stretch";
}

function templateSourceLabel(campaign) {
  if (campaign.templateSource === "campaign_upload") return "Campaign upload";
  return "Saved template";
}

function addCampaignEvent(campaign, message, date = new Date()) {
  return [
    ...(Array.isArray(campaign.deliveryEvents) ? campaign.deliveryEvents : []),
    { at: date.toISOString(), message }
  ].slice(-80);
}

function resetCampaignCsvPreview() {
  setCsvStatus("No CSV selected", "status locked");
  campaignCsvFileName.textContent = "Upload a recipient CSV for this campaign.";
  campaignCsvRows.textContent = "0";
  campaignCsvLabels.textContent = "0";
  campaignCsvMapping.innerHTML = `
    <tr><td><code>email</code></td><td>Recipient email</td><td><span class="pill sent">Required</span></td></tr>
    <tr><td><code>name_en</code></td><td>English name</td><td><span class="pill sent">Required</span></td></tr>
    <tr><td><code>unique_identifier</code></td><td>Certificate id</td><td><span class="pill queued">Recommended</span></td></tr>
  `;
  campaignCsvPreview.innerHTML = '<thead><tr><th>Preview</th><th>Status</th></tr></thead><tbody><tr><td>Select a CSV to preview the first rows.</td><td><span class="pill queued">Waiting</span></td></tr></tbody>';
}

async function importCampaignCsv(file) {
  campaignCsvFileName.textContent = file.name;
  setCsvStatus("Reading CSV", "status pending");

  const { headers, records } = await parseCampaignCsvFile(file);
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

  renderWizardReviewSummary();
}

async function parseCampaignCsvFile(file) {
  const text = await file.text();
  return parseCampaignCsvText(text, file.name);
}

function parseCampaignCsvText(text, fileName = "edited-recipients.csv") {
  const rows = parseCsv(text);
  const { headers, records } = buildRecords(rows);
  return { fileName, headers, records };
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

function campaignToCsv(campaign) {
  const headers = campaignCsvHeaders(campaign);
  const rows = [headers];
  const queue = Array.isArray(campaign.recipientQueue) ? campaign.recipientQueue : [];

  queue.forEach((recipient) => {
    const data = recipient.data && typeof recipient.data === "object" ? recipient.data : {};
    rows.push(headers.map((header) => {
      if (Object.prototype.hasOwnProperty.call(data, header)) return data[header];
      if (header === "email") return recipient.email || "";
      if (header === "name_en") return recipient.nameEn || recipient.displayName || "";
      if (header === "name_ar") return recipient.nameAr || "";
      if (header === "unique_identifier") return recipient.identifier || "";
      return "";
    }));
  });

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function campaignCsvHeaders(campaign) {
  const labels = Array.isArray(campaign.labels) ? campaign.labels.filter(Boolean) : [];
  const queue = Array.isArray(campaign.recipientQueue) ? campaign.recipientQueue : [];
  const dataKeys = queue.flatMap((recipient) => (
    recipient.data && typeof recipient.data === "object" ? Object.keys(recipient.data) : []
  ));
  const fallback = ["unique_identifier", "email", "name_en", "name_ar"];
  return [...new Set([...labels, ...dataKeys, ...fallback])];
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function saveEditedCampaignCsv(campaignId) {
  const campaign = store.findCampaign(campaignId);
  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const textarea = document.querySelector(`[data-csv-editor="${cssEscape(campaignId)}"]`);
  if (!textarea) {
    throw new Error("CSV editor is not open.");
  }

  const counts = store.campaignCounts(campaign);
  const hasProgress = counts.sent > 0 || counts.failed > 0 || counts.skipped > 0 || counts.rendered > 0;
  if (hasProgress && !window.confirm("Saving CSV changes rebuilds this campaign recipient queue and resets delivery progress for these recipients. Continue?")) {
    throw new Error("CSV save cancelled.");
  }

  const fileName = campaign.importFileName || `${campaign.name || "campaign"}-recipients.csv`;
  const importBatch = {
    ...parseCampaignCsvText(textarea.value, fileName),
    status: campaign.status === "completed" ? "draft" : (campaign.status === "running" ? "paused" : campaign.status),
    message: `CSV data edited in the campaign editor.`
  };
  const missing = missingLabels(importBatch.headers);
  if (missing.length > 0) {
    throw new Error(`CSV is missing required labels: ${missing.join(", ")}.`);
  }

  store.attachImportToCampaign(campaignId, importBatch);
}

function downloadCampaignCsv(campaignId) {
  const campaign = store.findCampaign(campaignId);
  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const textarea = document.querySelector(`[data-csv-editor="${cssEscape(campaignId)}"]`);
  const csv = textarea?.value || campaignToCsv(campaign);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = campaign.importFileName || `${campaign.name || "campaign"}-recipients.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
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

function toDateTimeInput(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
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

void initializeCampaigns();
