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
const setCampaignStartNow = document.querySelector("#setCampaignStartNow");
const clearCampaignEnd = document.querySelector("#clearCampaignEnd");
const campaignEmailSubject = document.querySelector("#campaignEmailSubject");
const campaignEmailBody = document.querySelector("#campaignEmailBody");

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

function setCampaignLaneStatus(text, state = "ready") {
  campaignLaneStatus.textContent = text;
  campaignLaneStatus.className = `status ${state}`;
}

function renderTemplateOptions() {
  const selected = campaignTemplate.value;
  const templates = store.templates();
  campaignTemplate.innerHTML = templateOptionsMarkup(selected);

  if (selected && templates.some((template) => template.id === selected)) {
    campaignTemplate.value = selected;
  }

  campaignTemplate.disabled = templates.length === 0;
}

function templateOptionsMarkup(selectedId = "") {
  const templates = store.templates();
  if (templates.length === 0) {
    return '<option value="">No saved templates</option>';
  }

  return templates.map((template) => {
    const selected = template.id === selectedId ? " selected" : "";
    return `<option value="${escapeHtml(template.id)}"${selected}>${escapeHtml(template.name)} (${escapeHtml(template.status)})</option>`;
  }).join("");
}

function renderMetrics() {
  const summary = store.summary();
  document.querySelector("#campaignMetric").textContent = String(summary.campaigns);
  document.querySelector("#activeMetric").textContent = String(summary.activeCampaigns);
  document.querySelector("#recipientMetric").textContent = String(summary.totalRecipients);
  document.querySelector("#templateMetric").textContent = String(summary.templates);
}

function renderCampaigns() {
  const allCampaigns = store.campaigns();
  const campaigns = filteredCampaigns(allCampaigns);
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
        <span class="${planClass}">${escapeHtml(planLabel)}</span>
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
        <div class="campaign-assets">
          <h4>Campaign assets</h4>
          <div class="asset-grid">
            <label>Replace campaign CSV
              <input data-csv-upload="${escapeHtml(campaign.id)}" type="file" accept=".csv,text/csv">
            </label>
            <label>Saved template
              <select data-template-select="${escapeHtml(campaign.id)}">${templateOptionsMarkup(campaign.templateId)}</select>
            </label>
            <button type="button" data-action="save-template" data-id="${escapeHtml(campaign.id)}">Use selected template</button>
            <label>Upload campaign template image
              <input data-template-upload="${escapeHtml(campaign.id)}" type="file" accept="image/png,image/jpeg,image/webp">
            </label>
          </div>
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
          <button type="button" data-action="paused" data-id="${escapeHtml(campaign.id)}">Stop sending</button>
          <button type="button" data-action="send-one" data-id="${escapeHtml(campaign.id)}">Send one now</button>
          <button type="button" data-action="restart-campaign" data-id="${escapeHtml(campaign.id)}">Restart campaign</button>
          <button type="button" data-action="reuse-campaign" data-id="${escapeHtml(campaign.id)}">Reuse with recipients</button>
          <button type="button" data-action="duplicate" data-id="${escapeHtml(campaign.id)}">Duplicate setup</button>
          <button type="button" data-action="completed" data-id="${escapeHtml(campaign.id)}" ${pending > 0 ? "disabled title=\"All recipients must be sent, failed, or skipped before closing.\"" : ""}>Close campaign</button>
          <button type="button" class="danger" data-action="delete-campaign" data-id="${escapeHtml(campaign.id)}">Delete</button>
          <a class="button" href="/queue.html">Queue details</a>
        </div>
      </article>
    `;
  }).join("");
}

campaignForm.addEventListener("submit", async (event) => {
  event.preventDefault();
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
    resetCampaignCsvPreview();
    setTemplateUploadStatus("No template image selected", "locked");
    campaignTemplatePreview.textContent = "Upload a PNG, JPG, or WebP certificate background. Recipient name, program, date, and QR fields will be added automatically.";

    render();
    setCampaignLaneStatus(`Created ${created.name}`, "ready");
  } catch (error) {
    setCampaignLaneStatus(error.message, "warning");
  }
});

campaignList.addEventListener("click", async (event) => {
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
    if (button.dataset.action === "running") {
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
      render();
      setCampaignLaneStatus(`Duplicated ${copy.name}`, "ready");
    } else if (button.dataset.action === "reuse-campaign") {
      const copy = store.reuseCampaign(button.dataset.id);
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
        deliveryEvents: addCampaignEvent(store.findCampaign(button.dataset.id) || {}, `Template changed to ${template?.name || "saved template"}.`)
      });
      render();
      setCampaignLaneStatus("Campaign template updated", "ready");
    } else if (button.dataset.action === "save-email") {
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
  renderPlanPreview();
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
  } catch (error) {
    lastCampaignTemplateUpload = null;
    setTemplateUploadStatus("Template upload failed", "failed");
    campaignTemplatePreview.textContent = error.message;
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
      const template = saveCampaignTemplate({
        campaign,
        templateName: campaign.campaignTemplateName || `${campaign.name} certificate template`,
        upload: uploaded,
        fit: "stretch",
        replaceExistingOwnedTemplate: true
      });
      store.updateCampaign(campaign.id, {
        templateId: template.id,
        templateSource: "campaign_upload",
        templateFileName: uploaded.originalName,
        campaignTemplateName: template.name,
        deliveryEvents: addCampaignEvent(campaign, `Campaign template image changed to ${uploaded.originalName}.`)
      });
      render();
      setCampaignLaneStatus("Campaign template image updated", "ready");
    } catch (error) {
      setCampaignLaneStatus(error.message, "warning");
    }
  }
});

["campaignStart", "campaignEnd", "campaignRandomUnit", "campaignRandomMin", "campaignRandomMax"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", renderPlanPreview);
});

[campaignSearch, campaignStatusFilter, campaignSort].forEach((control) => {
  control.addEventListener("input", renderCampaigns);
});

setCampaignStartNow.addEventListener("click", () => {
  document.querySelector("#campaignStart").value = toDateTimeInput(new Date());
  renderPlanPreview();
});

clearCampaignEnd.addEventListener("click", () => {
  document.querySelector("#campaignEnd").value = "";
  renderPlanPreview();
});

document.querySelectorAll("[data-delay-preset-unit]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#campaignRandomUnit").value = button.dataset.delayPresetUnit;
    document.querySelector("#campaignRandomMin").value = button.dataset.delayPresetMin;
    document.querySelector("#campaignRandomMax").value = button.dataset.delayPresetMax;
    renderPlanPreview();
  });
});

document.querySelectorAll("[data-email-token]").forEach((button) => {
  button.addEventListener("click", () => {
    const active = document.activeElement;
    const target = active === campaignEmailSubject || active === campaignEmailBody ? active : campaignEmailBody;
    insertAtCursor(target, button.dataset.emailToken);
  });
});

function render() {
  renderTemplateOptions();
  renderTemplateMode();
  renderMetrics();
  renderCampaigns();
  renderPlanPreview();
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

    const template = saveCampaignTemplate({
      campaign: { name: campaignName },
      templateName: campaignTemplateName.value.trim() || `${campaignName} certificate template`,
      upload: lastCampaignTemplateUpload,
      fit: campaignTemplateFit.value,
      replaceExistingOwnedTemplate: false
    });

    return {
      templateId: template.id,
      templateSource: "campaign_upload",
      templateFileName: lastCampaignTemplateUpload.originalName,
      campaignTemplateName: template.name
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
    campaignTemplateName: template?.name || ""
  };
}

function saveCampaignTemplate({ campaign, templateName, upload, fit, replaceExistingOwnedTemplate }) {
  const existingTemplate = replaceExistingOwnedTemplate && campaign.templateSource === "campaign_upload"
    ? store.findTemplate(campaign.templateId)
    : null;

  return store.saveTemplate({
    id: existingTemplate?.id,
    name: templateName,
    status: "approved",
    campaignOwned: true,
    campaignId: campaign.id || "",
    layout: {
      page: { width: 297, height: 210, orientation: "landscape" },
      background: upload.path,
      backgroundFit: normalizeBackgroundFit(fit),
      elements: defaultCampaignTemplateElements()
    }
  });
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
}

async function parseCampaignCsvFile(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  const { headers, records } = buildRecords(rows);
  return { fileName: file.name, headers, records };
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
