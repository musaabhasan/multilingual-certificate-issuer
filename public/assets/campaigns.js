const store = window.CertificateIssuerStore;
const campaignForm = document.querySelector("#campaignForm");
const campaignTemplate = document.querySelector("#campaignTemplate");
const campaignTemplateMode = document.querySelector("#campaignTemplateMode");
const campaignTemplateName = document.querySelector("#campaignTemplateName");
const campaignTemplateFile = document.querySelector("#campaignTemplateFile");
const campaignTemplateFit = document.querySelector("#campaignTemplateFit");
const campaignTemplateStatus = document.querySelector("#campaignTemplateStatus");
const campaignTemplatePreview = document.querySelector("#campaignTemplatePreview");
const campaignTemplateFieldStatus = document.querySelector("#campaignTemplateFieldStatus");
const campaignTemplateFieldMapping = document.querySelector("#campaignTemplateFieldMapping");
const wizardTemplatePreviewSample = document.querySelector("#wizardTemplatePreviewSample");
const wizardTemplatePreviewShuffle = document.querySelector("#wizardTemplatePreviewShuffle");
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
const campaignIncludeVerificationLink = document.querySelector("#campaignIncludeVerificationLink");
const wizardBack = document.querySelector("#wizardBack");
const wizardNext = document.querySelector("#wizardNext");
const wizardCreate = document.querySelector("#wizardCreate");
const wizardStepOrder = ["csv", "design", "sending", "review"];

const csvCoreFields = [
  { key: "email", label: "Email address", role: "Recipient email", required: true },
  { key: "unique_identifier", label: "Unique identifier", role: "Certificate id", required: true },
  { key: "name_en", label: "Recipient name", role: "Primary certificate name", required: true },
  { key: "name_ar", label: "Arabic name", role: "Arabic certificate name", required: false }
];
const requiredMappedFields = csvCoreFields.filter((field) => field.required).map((field) => field.key);
const csvFieldAliases = {
  email: ["email", "email_address", "recipient_email", "mail", "e_mail", "recipient_mail"],
  unique_identifier: ["unique_identifier", "certificate_number", "certificate_id", "certificate_no", "id", "identifier", "recipient_id", "student_id", "employee_id", "serial"],
  name_en: ["name_en", "recipient_name", "full_name", "name", "english_name", "name_english", "participant_name", "student_name", "employee_name"],
  name_ar: ["name_ar", "recipient_name_ar", "arabic_name", "name_arabic", "full_name_ar", "participant_name_ar", "student_name_ar"]
};
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
let wizardPreviewSampleIndex = -1;
let wizardTemplateFieldMap = {};

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
  renderWizardTemplateFieldMapping();
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

    const missing = missingLabels(lastCampaignImport);
    if (missing.length > 0) {
      throw new Error(`Map the required CSV fields before continuing: ${missing.join(", ")}.`);
    }

    const rowIssues = requiredMappedRowIssues(lastCampaignImport);
    if (rowIssues.missingRows > 0) {
      throw new Error(`${rowIssues.missingRows} recipient row${rowIssues.missingRows === 1 ? "" : "s"} are missing required mapped values.`);
    }

    if (rowIssues.invalidEmails > 0) {
      throw new Error(`${rowIssues.invalidEmails} recipient row${rowIssues.invalidEmails === 1 ? " has" : "s have"} an invalid email address.`);
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

  const selected = selectedWizardTemplateLayout();
  const layout = applyWizardTemplateFieldMapping(selected.layout);
  const background = normalizeAssetPath(layout.background);
  const fit = layout.backgroundFit || "contain";
  const sample = wizardPreviewSample();
  const elements = Array.isArray(layout.elements) ? layout.elements : [];

  preview.style.setProperty("--wizard-preview-background", background ? `url("${browserAssetUrl(background)}")` : "none");
  preview.dataset.backgroundFit = normalizeBackgroundFit(fit);
  preview.classList.toggle("has-background", Boolean(background));
  preview.innerHTML = renderWizardPreviewElements(layout, sample.record);

  if (wizardTemplatePreviewSample) {
    wizardTemplatePreviewSample.textContent = sample.record
      ? `Sample ${sample.index + 1}/${sample.total}: ${wizardRecipientLabel(sample.record)}`
      : "Upload CSV to preview a recipient";
    wizardTemplatePreviewSample.className = `status ${sample.record ? "ready" : "locked"}`;
  }

  if (wizardTemplatePreviewShuffle) {
    wizardTemplatePreviewShuffle.disabled = !sample.record || sample.total < 2;
  }

  if (!selected.ready) {
    note.textContent = selected.note;
  } else if (sample.record) {
    note.textContent = `${selected.name} is shown with ${elements.length} placed item${elements.length === 1 ? "" : "s"} using a recipient from this campaign CSV.`;
  } else {
    note.textContent = `${selected.name} is selected. Upload the campaign CSV to fill the placed fields with recipient data.`;
  }
}

function selectedWizardTemplateLayout() {
  if (campaignTemplateMode.value === "upload") {
    if (!lastCampaignTemplateUpload) {
      return {
        ready: false,
        name: "Uploaded template",
        note: "Upload a template image to preview the campaign certificate design.",
        layout: { page: { width: 297, height: 210, orientation: "landscape" }, background: "", backgroundFit: campaignTemplateFit.value || "stretch", elements: [] }
      };
    }

    return {
      ready: true,
      name: campaignTemplateName.value.trim() || lastCampaignTemplateUpload.originalName || "Uploaded template",
      note: "",
      layout: buildCampaignTemplateLayout(lastCampaignTemplateUpload, campaignTemplateFit.value)
    };
  }

  const template = store.findTemplate(campaignTemplate.value);
  if (!template?.layout) {
    return {
      ready: false,
      name: "Saved template",
      note: "Select a saved template to preview the certificate design.",
      layout: { page: { width: 297, height: 210, orientation: "landscape" }, background: "", backgroundFit: "contain", elements: [] }
    };
  }

  return {
    ready: true,
    name: template.name || "Saved template",
    note: "",
    layout: normalizeWizardTemplateLayout(template.layout)
  };
}

function normalizeWizardTemplateLayout(layout = {}) {
  return {
    page: {
      width: Number(layout.page?.width || 297),
      height: Number(layout.page?.height || 210),
      orientation: layout.page?.orientation || "landscape"
    },
    background: normalizeAssetPath(layout.background),
    backgroundFit: normalizeBackgroundFit(layout.backgroundFit || "contain"),
    elements: Array.isArray(layout.elements) ? layout.elements : []
  };
}

function applyWizardTemplateFieldMapping(layout = {}) {
  const normalized = normalizeWizardTemplateLayout(layout);
  return {
    ...normalized,
    elements: normalized.elements.map((element, index) => {
      if (!isTemplateDataElement(element)) {
        return element;
      }

      return {
        ...element,
        source: resolveTemplateElementSource(element, index)
      };
    })
  };
}

function renderWizardTemplateFieldMapping() {
  if (!campaignTemplateFieldMapping || !campaignTemplateFieldStatus) return;

  const selected = selectedWizardTemplateLayout();
  const layout = normalizeWizardTemplateLayout(selected.layout);
  const fields = layout.elements
    .map((element, index) => ({ element, index, key: templateElementMapKey(element, index) }))
    .filter(({ element }) => isTemplateDataElement(element));

  if (!selected.ready) {
    campaignTemplateFieldStatus.textContent = "Select a template";
    campaignTemplateFieldStatus.className = "status locked";
    campaignTemplateFieldMapping.innerHTML = '<p class="subtle-note">Template fields appear here after you select a design.</p>';
    return;
  }

  if (fields.length === 0) {
    campaignTemplateFieldStatus.textContent = "No mapped fields";
    campaignTemplateFieldStatus.className = "status locked";
    campaignTemplateFieldMapping.innerHTML = '<p class="subtle-note">This design has no CSV-backed text fields.</p>';
    return;
  }

  campaignTemplateFieldStatus.textContent = `${fields.length} field${fields.length === 1 ? "" : "s"} mapped`;
  campaignTemplateFieldStatus.className = "status ready";
  campaignTemplateFieldMapping.innerHTML = fields.map(({ element, index, key }) => {
    const source = resolveTemplateElementSource(element, index);
    const sample = sampleValueForTemplateSource(source);
    return `
      <div class="template-field-row">
        <div>
          <strong>${escapeHtml(templateElementLabel(element, index))}</strong>
          <small>Saved source: ${escapeHtml(element.source || "none")}</small>
        </div>
        <select data-template-field-map="${escapeAttribute(key)}">
          ${templateSourceOptionsMarkup(source)}
        </select>
        <small>${escapeHtml(sample || "No sample value")}</small>
      </div>
    `;
  }).join("");
}

function isTemplateDataElement(element) {
  const type = String(element?.type || "csv_text");
  return type === "csv_text";
}

function templateElementMapKey(element, index) {
  return `${index}:${String(element?.key || element?.label || element?.source || "field")}`;
}

function resolveTemplateElementSource(element, index) {
  const mapKey = templateElementMapKey(element, index);
  const explicit = String(wizardTemplateFieldMap[mapKey] || "").trim();
  if (explicit && templateSourceIsAvailable(explicit)) {
    return explicit;
  }

  const inferred = inferTemplateElementSource(element);
  const current = String(element?.source || "").trim();
  if (inferred && shouldPreferInferredTemplateSource(element, current, inferred)) {
    return inferred;
  }

  if (current && templateSourceIsAvailable(current)) {
    return current;
  }

  return inferred || current;
}

function inferTemplateElementSource(element) {
  const text = normalizeHeaderKey([
    element?.label || "",
    element?.key || ""
  ].join(" "));
  const candidates = [];

  if (/(arabic|name_ar|recipient_name_ar|full_name_ar|participant_name_ar)/.test(text)) {
    candidates.push("name_ar");
  }
  if (/(email|e_mail|mail)/.test(text)) {
    candidates.push("email");
  }
  if (/(unique|identifier|certificate_id|certificate_number|certificate_no|student_id|employee_id|serial)/.test(text)) {
    candidates.push("unique_identifier");
  }
  if (/(recipient|participant|student|employee|full_name|name_en|name)/.test(text)) {
    candidates.push("name_en");
  }
  if (/(program|course|session|workshop|training)/.test(text)) {
    candidates.push("program_en", "program", "course");
  }
  if (/(issue|issued|date)/.test(text)) {
    candidates.push("issue_date", "date");
  }
  if (/(organization|institution|college|company)/.test(text)) {
    candidates.push("organization_en", "organization");
  }
  if (/(title|certificate_title)/.test(text)) {
    candidates.push("certificate_title_en", "title");
  }

  return candidates.find(templateSourceIsAvailable) || candidates[0] || "";
}

function shouldPreferInferredTemplateSource(element, current, inferred) {
  if (!inferred || inferred === current) return false;
  if (!current) return true;

  const text = normalizeHeaderKey([element?.label || "", element?.key || ""].join(" "));
  const currentRole = templateSourceRole(current);
  const inferredRole = templateSourceRole(inferred);
  if (currentRole && inferredRole && currentRole !== inferredRole) {
    return templateTextMatchesRole(text, inferredRole);
  }

  return !templateSourceIsAvailable(current);
}

function templateTextMatchesRole(text, role) {
  if (role === "email") return /(email|e_mail|mail)/.test(text);
  if (role === "identifier") return /(unique|identifier|certificate|number|no|id|serial)/.test(text);
  if (role === "arabic") return /(arabic|name_ar|full_name_ar|participant_name_ar)/.test(text);
  if (role === "name") return /(recipient|participant|student|employee|full_name|name)/.test(text);
  if (role === "program") return /(program|course|session|workshop|training)/.test(text);
  if (role === "date") return /(date|issue|issued)/.test(text);
  return false;
}

function templateSourceRole(source) {
  const key = normalizeHeaderKey(source);
  if (key === "email" || key.includes("mail")) return "email";
  if (key === "unique_identifier" || key.includes("identifier") || key.includes("certificate")) return "identifier";
  if (key === "name_ar" || key.includes("arabic")) return "arabic";
  if (key === "name_en" || key.includes("name") || key.includes("recipient") || key.includes("participant")) return "name";
  if (key.includes("program") || key.includes("course")) return "program";
  if (key.includes("date")) return "date";
  return "";
}

function templateSourceIsAvailable(source) {
  const value = String(source || "").trim();
  if (!value) return false;
  const fieldMap = normalizeFieldMap(lastCampaignImport?.fieldMap || {});
  const headers = new Set(Array.isArray(lastCampaignImport?.headers) ? lastCampaignImport.headers : []);
  return Object.prototype.hasOwnProperty.call(fieldMap, value)
    || headers.has(value)
    || commonTemplateSources().includes(value);
}

function commonTemplateSources() {
  return [
    "unique_identifier",
    "certificate_number",
    "email",
    "name_en",
    "name_ar",
    "program_en",
    "program_ar",
    "issue_date",
    "certificate_title_en",
    "certificate_title_ar",
    "organization_en",
    "organization_ar"
  ];
}

function templateSourceOptionsMarkup(selectedSource) {
  const selected = String(selectedSource || "").trim();
  const values = templateSourceOptionValues(selected);
  return values.map((value) => `<option value="${escapeAttribute(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(templateSourceOptionLabel(value))}</option>`).join("");
}

function templateSourceOptionValues(selectedSource = "") {
  const fieldMap = normalizeFieldMap(lastCampaignImport?.fieldMap || {});
  const headers = Array.isArray(lastCampaignImport?.headers) ? lastCampaignImport.headers : [];
  const mappedCore = Object.keys(fieldMap);
  const values = [...mappedCore, ...headers, ...commonTemplateSources()];
  if (selectedSource) values.unshift(selectedSource);
  return [...new Set(values.filter(Boolean))];
}

function templateSourceOptionLabel(value) {
  const fieldMap = normalizeFieldMap(lastCampaignImport?.fieldMap || {});
  if (Object.prototype.hasOwnProperty.call(fieldMap, value)) {
    const mapped = fieldMap[value] || "not mapped";
    return `${fieldLabel(value)} (${mapped})`;
  }

  if ((lastCampaignImport?.headers || []).includes(value)) {
    return `CSV: ${value}`;
  }

  return value;
}

function templateElementLabel(element, index) {
  return String(element?.label || element?.key || element?.source || `Field ${index + 1}`);
}

function sampleValueForTemplateSource(source) {
  const sample = wizardPreviewSample();
  return sample.record ? valueForTemplateSource(sample.record, source) : "";
}

function valueForTemplateSource(record, source) {
  const fieldMap = normalizeFieldMap(lastCampaignImport?.fieldMap || {});
  const key = String(source || "").trim();
  if (!key || !record) return "";
  if (Object.prototype.hasOwnProperty.call(fieldMap, key) && fieldMap[key]) {
    return String(record[fieldMap[key]] ?? "").trim();
  }
  return String(record[key] ?? "").trim();
}

function renderWizardPreviewElements(layout, record) {
  const elements = Array.isArray(layout.elements) ? layout.elements : [];
  if (elements.length === 0) {
    return '<div class="wizard-preview-empty">Certificate design preview</div>';
  }

  return elements.map((element) => wizardPreviewElementMarkup(element, layout, record)).join("");
}

function wizardPreviewElementMarkup(element, layout, record) {
  if (!element || typeof element !== "object") return "";

  const type = element.type || "csv_text";
  const style = wizardPreviewElementStyle(element, layout);
  if (type === "verification_qr") {
    return `<div class="wizard-preview-field wizard-preview-qr" style="${style}" aria-label="${escapeAttribute(element.label || "Verification QR")}">QR</div>`;
  }

  if (type === "image") {
    const src = normalizeAssetPath(element.src);
    if (!src) return "";
    const fit = imageFitToCss(element.fit || "contain");
    return `<div class="wizard-preview-field wizard-preview-image" style="${style} background-image:url('${escapeAttribute(browserAssetUrl(src))}'); background-size:${escapeAttribute(fit)};" aria-label="${escapeAttribute(element.label || "Image")}"></div>`;
  }

  const value = wizardPreviewTextValue(element, record);
  const align = normalizedAlign(element.align);
  return `<div class="wizard-preview-field" data-align="${escapeAttribute(align)}" dir="${escapeAttribute(normalizedDirection(element.direction))}" style="${style}">${escapeHtml(value)}</div>`;
}

function wizardPreviewElementStyle(element, layout) {
  const page = layout.page || {};
  const pageWidth = Math.max(1, Number(page.width || 297));
  const pageHeight = Math.max(1, Number(page.height || 210));
  const left = clampPercent(Number(element.x || 0) / pageWidth * 100);
  const top = clampPercent(Number(element.y || 0) / pageHeight * 100);
  const width = clampPercent(Number(element.width || 20) / pageWidth * 100);
  const height = clampPercent(Number(element.height || 8) / pageHeight * 100);
  const fontSize = Math.max(7, Math.min(34, Number(element.fontSize || 12) * 0.45));
  const color = /^#[0-9A-Fa-f]{6}$/.test(String(element.color || "")) ? element.color : "#202124";
  const align = normalizedAlign(element.align);

  return [
    `left:${left}%`,
    `top:${top}%`,
    `width:${width}%`,
    `height:${height}%`,
    `font-size:${fontSize.toFixed(1)}px`,
    `font-family:${fontCssFamily(element.font || "dejavusans")}, Arial, sans-serif`,
    `color:${color}`,
    `text-align:${align}`
  ].join("; ");
}

function wizardPreviewTextValue(element, record) {
  if ((element.type || "csv_text") === "static_text") {
    return String(element.text || element.label || "Text");
  }

  const source = String(element.source || element.key || "").trim();
  if (record) {
    const value = valueForTemplateSource(record, source);
    if (value) return value;
  }

  return source ? `{{${source}}}` : (element.label || "Field");
}

function wizardPreviewSample() {
  const records = Array.isArray(lastCampaignImport?.records) ? lastCampaignImport.records : [];
  if (records.length === 0) {
    wizardPreviewSampleIndex = -1;
    return { record: null, index: -1, total: 0 };
  }

  if (wizardPreviewSampleIndex < 0 || wizardPreviewSampleIndex >= records.length) {
    chooseWizardPreviewSample();
  }

  return {
    record: records[wizardPreviewSampleIndex] || records[0],
    index: Math.max(0, wizardPreviewSampleIndex),
    total: records.length
  };
}

function chooseWizardPreviewSample() {
  const count = Array.isArray(lastCampaignImport?.records) ? lastCampaignImport.records.length : 0;
  wizardPreviewSampleIndex = count > 0 ? Math.floor(Math.random() * count) : -1;
}

function wizardRecipientLabel(record) {
  const fieldMap = normalizeFieldMap(lastCampaignImport?.fieldMap || {});
  return mappedValue(record, fieldMap, "name_en")
    || mappedValue(record, fieldMap, "name_ar")
    || mappedValue(record, fieldMap, "email")
    || "recipient";
}

function normalizedAlign(value) {
  return ["left", "center", "right"].includes(value) ? value : "left";
}

function normalizedDirection(value) {
  return ["ltr", "rtl"].includes(value) ? value : "ltr";
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)).toFixed(3);
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
    <div><dt>Verification link</dt><dd>${campaignIncludeVerificationLink?.checked ? "Append if missing" : "Not appended"}</dd></div>
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
    const designReviewLabel = campaign.designReviewedAt ? `Reviewed ${shortTime(campaign.designReviewedAt)}` : "Preview required";

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
            <button type="button" data-action="review-design" data-id="${escapeHtml(campaign.id)}">Review design</button>
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
          <span>${escapeHtml(designReviewLabel)}</span>
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
              <div><dt>Design review</dt><dd>${escapeHtml(designReviewLabel)}</dd></div>
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
              <button type="button" data-action="review-design" data-id="${escapeHtml(campaign.id)}">Review design</button>
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
                <thead><tr><th>#</th><th>Certificate id</th><th>Recipient</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${recipientRows.map((recipient) => `
                    <tr>
                      <td>${Number(recipient.sequence || 0)}</td>
                      <td>
                        <input class="table-input" data-recipient-edit="identifier" data-id="${escapeHtml(campaign.id)}" data-recipient-id="${escapeHtml(recipient.id)}" value="${escapeAttribute(recipient.identifier || "")}">
                      </td>
                      <td>
                        <input class="table-input" data-recipient-edit="displayName" data-id="${escapeHtml(campaign.id)}" data-recipient-id="${escapeHtml(recipient.id)}" value="${escapeAttribute(recipient.displayName || "")}">
                      </td>
                      <td>
                        <input class="table-input" type="email" data-recipient-edit="email" data-id="${escapeHtml(campaign.id)}" data-recipient-id="${escapeHtml(recipient.id)}" value="${escapeAttribute(recipient.email || "")}">
                      </td>
                      <td><span class="${store.recipientStatusClass(recipient.status)}">${store.recipientStatusLabel(recipient.status)}</span></td>
                      <td>${recipientActionsMarkup(campaign.id, recipient)}</td>
                    </tr>
                  `).join("") || "<tr><td colspan=\"6\">No recipient CSV attached yet.</td></tr>"}
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
              <label class="checkbox-row">
                <input data-email-verification-link="${escapeHtml(campaign.id)}" type="checkbox" ${campaign.includeVerificationLink ? "checked" : ""}>
                Append verification link when it is not already in the email body
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
    validateScheduleValues(windowStartAt, windowEndAt, randomDelayMinSeconds, randomDelayMaxSeconds);

    const templateAssignment = createTemplateAssignmentForNewCampaign(name);
    const created = store.createCampaign({
      name,
      templateId: templateAssignment.templateId,
      templateSource: templateAssignment.templateSource,
      templateFileName: templateAssignment.templateFileName,
      campaignTemplateName: templateAssignment.campaignTemplateName,
      campaignTemplateLayout: templateAssignment.campaignTemplateLayout || null,
      status: "draft",
      scheduledAt: windowStartAt,
      windowStartAt,
      windowEndAt,
      randomDelayUnit,
      randomDelayMinSeconds,
      randomDelayMaxSeconds,
      throttleSeconds: randomDelayMinSeconds || 60,
      smtpProfile: document.querySelector("#campaignSmtp").value.trim() || "Institution SMTP",
      emailSubject: document.querySelector("#campaignEmailSubject").value.trim() || "Your certificate is ready",
      emailBodyHtml: document.querySelector("#campaignEmailBody").value.trim() || defaultEmailBody(),
      includeVerificationLink: Boolean(campaignIncludeVerificationLink?.checked),
      attachPdf: true,
      recipients: 0,
      rendered: 0,
      sent: 0,
      failed: 0,
      labels: [],
      deliveryEvents: [
        { at: new Date().toISOString(), message: "Campaign created as a draft. Use Start when you are ready to activate the sending schedule." }
      ]
    }, lastCampaignImport);

    lastCampaignImport = null;
    lastCampaignTemplateUpload = null;
    wizardPreviewSampleIndex = -1;
    wizardTemplateFieldMap = {};
    campaignCsvFile.value = "";
    campaignTemplateFile.value = "";
    if (campaignIncludeVerificationLink) campaignIncludeVerificationLink.checked = false;
    expandedCampaigns.clear();
    expandedCampaigns.add(created.id);
    currentWizardStep = "csv";
    resetCampaignCsvPreview();
    setTemplateUploadStatus("No template image selected", "locked");
    campaignTemplatePreview.textContent = "Upload a PNG, JPG, or WebP certificate background. Recipient name, program, date, and QR fields will be added automatically.";

    render();
    setCampaignLaneStatus(`Created ${created.name} as a draft. Use Start to begin sending.`, "ready");
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
        persistCampaignEmailFromEditors(recipientButton.dataset.id);
        const preview = await window.CertificateIssuerPreview.open(recipientButton.dataset.id, recipientButton.dataset.recipientId, setCampaignLaneStatus);
        if (!preview) {
          throw new Error("Preview could not be generated.");
        }
        store.markCampaignDesignReviewed(
          recipientButton.dataset.id,
          preview.designReviewedAt || preview.generatedAt || new Date().toISOString(),
          recipientButton.dataset.recipientId
        );
        render();
        setCampaignLaneStatus("Certificate preview reviewed", "ready");
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
      persistCampaignEmailFromEditors(button.dataset.id);
      const beforeStart = store.findCampaign(button.dataset.id);
      const started = await store.updateCampaignStatusAsync(button.dataset.id, "running");
      render();
      setCampaignLaneStatus(startCampaignMessage(beforeStart, started), "ready");
    } else if (button.dataset.action === "send-one") {
      persistCampaignEmailFromEditors(button.dataset.id);
      await store.manualSendOneAsync(button.dataset.id);
      render();
      setCampaignLaneStatus("One due recipient processed", "ready");
    } else if (button.dataset.action === "review-design") {
      await reviewCampaignDesign(button.dataset.id);
      render();
      setCampaignLaneStatus("Certificate preview reviewed. Start or send when ready.", "ready");
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
      const scheduleResult = saveCampaignSchedule(button.dataset.id);
      render();
      setCampaignLaneStatus(scheduleResult.message, "ready");
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
        designReviewedAt: "",
        designReviewRecipientId: "",
        deliveryEvents: addCampaignEvent(store.findCampaign(button.dataset.id) || {}, `Template changed to ${template?.name || "saved template"}.`)
      });
      render();
      setCampaignLaneStatus("Campaign template updated", "ready");
    } else if (button.dataset.action === "save-email") {
      persistCampaignEmailFromEditors(button.dataset.id, { force: true });
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
    wizardPreviewSampleIndex = -1;
    campaignCsvRows.textContent = "0";
    campaignCsvLabels.textContent = "0";
    campaignCsvFileName.textContent = file.name;
    campaignCsvMapping.innerHTML = `<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`;
    campaignCsvPreview.innerHTML = "<thead><tr><th>Status</th></tr></thead><tbody><tr><td>CSV could not be imported.</td></tr></tbody>";
    setCsvStatus("CSV error", "status failed");
  }

  renderPlanPreview();
  renderWizardTemplatePreview();
});

campaignCsvMapping.addEventListener("change", (event) => {
  const select = event.target.closest("[data-csv-field-map]");
  if (!select || !lastCampaignImport) return;

  lastCampaignImport.fieldMap = {
    ...normalizeFieldMap(lastCampaignImport.fieldMap),
    [select.dataset.csvFieldMap]: select.value
  };
  renderMapping(lastCampaignImport.headers, lastCampaignImport.records, lastCampaignImport.fieldMap);
  renderPreview(lastCampaignImport.headers, lastCampaignImport.records, lastCampaignImport.fieldMap);
  updateCsvMappingStatus(lastCampaignImport);
  renderWizardTemplatePreview();
  renderWizardReviewSummary();
  renderPlanPreview();
});

campaignTemplateFieldMapping?.addEventListener("change", (event) => {
  const select = event.target.closest("[data-template-field-map]");
  if (!select) return;

  wizardTemplateFieldMap = {
    ...wizardTemplateFieldMap,
    [select.dataset.templateFieldMap]: select.value
  };
  renderWizardTemplateFieldMapping();
  renderWizardTemplatePreview();
  renderWizardReviewSummary();
});

campaignCsvPreview.addEventListener("input", (event) => {
  const input = event.target.closest("[data-csv-preview-row][data-csv-preview-header]");
  if (!input || !lastCampaignImport) return;

  const rowIndex = Number(input.dataset.csvPreviewRow);
  const header = input.dataset.csvPreviewHeader;
  if (!Number.isInteger(rowIndex) || !lastCampaignImport.records[rowIndex] || !header) return;

  lastCampaignImport.records[rowIndex][header] = input.value;
  const statusCell = input.closest("tr")?.querySelector("[data-row-status]");
  if (statusCell) {
    statusCell.innerHTML = pillFor(rowStatus(lastCampaignImport.records[rowIndex], lastCampaignImport.fieldMap));
  }

  updateCsvMappingStatus(lastCampaignImport);
  renderWizardTemplatePreview();
  renderWizardReviewSummary();
  renderPlanPreview();
});

wizardTemplatePreviewShuffle?.addEventListener("click", () => {
  chooseWizardPreviewSample();
  renderWizardTemplatePreview();
  renderWizardReviewSummary();
});

campaignTemplateMode.addEventListener("change", () => {
  wizardTemplateFieldMap = {};
  renderTemplateMode();
  renderWizardTemplateFieldMapping();
  renderWizardTemplatePreview();
  renderWizardReviewSummary();
  renderPlanPreview();
});

campaignTemplate.addEventListener("change", () => {
  wizardTemplateFieldMap = {};
  renderWizardTemplateFieldMapping();
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
    wizardTemplateFieldMap = {};
    setTemplateUploadStatus("Template image ready", "ready");
    campaignTemplatePreview.textContent = file.name;
    renderWizardTemplateFieldMapping();
    renderWizardTemplatePreview();
    renderWizardReviewSummary();
  } catch (error) {
    lastCampaignTemplateUpload = null;
    wizardTemplateFieldMap = {};
    setTemplateUploadStatus("Template upload failed", "failed");
    campaignTemplatePreview.textContent = error.message;
    renderWizardTemplateFieldMapping();
    renderWizardTemplatePreview();
  }
});

campaignList.addEventListener("change", async (event) => {
  const recipientEdit = event.target.closest("[data-recipient-edit]");
  if (recipientEdit) {
    try {
      updateRecipientFromInput(recipientEdit);
      render();
      setCampaignLaneStatus("Recipient data updated. Review the certificate before sending.", "ready");
    } catch (error) {
      render();
      setCampaignLaneStatus(error.message, "warning");
    }
    return;
  }

  const csvInput = event.target.closest("input[data-csv-upload]");
  if (csvInput) {
    const file = csvInput.files && csvInput.files[0];
    if (!file) return;

    setCampaignLaneStatus("Replacing campaign CSV", "pending");
    try {
      const campaign = store.findCampaign(csvInput.dataset.csvUpload);
      const importBatch = await parseCampaignCsvFile(file);
      importBatch.fieldMap = mapForHeaders(importBatch.headers, campaign?.csvFieldMap || null);
      importBatch.status = campaign?.status === "completed"
        ? "draft"
        : (["running", "scheduled"].includes(campaign?.status) ? "paused" : campaign?.status);
      importBatch.message = ["running", "scheduled"].includes(campaign?.status)
        ? `${importBatch.records.length} recipients imported from ${file.name}. Campaign paused for review before sending continues.`
        : `${importBatch.records.length} recipients imported from ${file.name}.`;
      const missing = missingLabels(importBatch);
      if (missing.length > 0) {
        throw new Error(`Map the required CSV fields before attaching this file: ${missing.join(", ")}.`);
      }
      const rowIssues = requiredMappedRowIssues(importBatch);
      if (rowIssues.missingRows > 0 || rowIssues.invalidEmails > 0) {
        throw new Error(csvRowIssueMessage(rowIssues));
      }
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
        designReviewedAt: "",
        designReviewRecipientId: "",
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

["campaignName", "campaignStart", "campaignEnd", "campaignRandomUnit", "campaignRandomMin", "campaignRandomMax", "campaignEmailSubject", "campaignSmtp", "campaignIncludeVerificationLink"].forEach((id) => {
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

async function reviewCampaignDesign(campaignId) {
  persistCampaignEmailFromEditors(campaignId);
  const campaign = store.findCampaign(campaignId);
  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const recipient = firstPreviewRecipient(campaign);
  if (!recipient) {
    throw new Error("Upload recipient CSV data before reviewing the certificate design.");
  }

  const preview = await window.CertificateIssuerPreview.open(campaignId, recipient.id, setCampaignLaneStatus);
  if (!preview) {
    throw new Error("Preview could not be generated.");
  }

  store.markCampaignDesignReviewed(
    campaignId,
    preview.designReviewedAt || preview.generatedAt || new Date().toISOString(),
    recipient.id
  );
  return preview;
}

function firstPreviewRecipient(campaign) {
  const queue = Array.isArray(campaign?.recipientQueue) ? campaign.recipientQueue : [];
  return queue.find((recipient) => !["sent", "failed", "skipped"].includes(recipient.status || "queued")) || queue[0] || null;
}

function updateRecipientFromInput(input) {
  const campaignId = input.dataset.id;
  const recipientId = input.dataset.recipientId;
  const field = input.dataset.recipientEdit;
  const value = input.value.trim();
  const campaign = store.findCampaign(campaignId);
  const recipient = (campaign?.recipientQueue || []).find((record) => record.id === recipientId);
  if (!campaign || !recipient) {
    throw new Error("Recipient not found.");
  }

  if (!["identifier", "displayName", "email"].includes(field)) {
    throw new Error("Recipient field is not editable.");
  }

  if (!value) {
    throw new Error(field === "email" ? "Recipient email is required." : "Recipient value is required.");
  }

  if (field === "email" && !isValidEmail(value)) {
    throw new Error("Enter a valid recipient email address.");
  }

  const currentValue = String(recipient[field === "displayName" ? "displayName" : field] || "").trim();
  if (currentValue === value) return;

  const hasDeliveryProgress = ["rendered", "sent", "failed", "skipped"].includes(recipient.status || "queued")
    || Boolean(recipient.renderedAt || recipient.sentAt || recipient.failedAt || recipient.skippedAt || recipient.certificatePath);
  if (hasDeliveryProgress && !window.confirm("Editing this recipient resets their certificate and delivery progress. Continue?")) {
    throw new Error("Recipient edit cancelled.");
  }

  if (["running", "scheduled"].includes(campaign.status)
    && !window.confirm("Editing recipients pauses this active campaign for review before sending continues. Continue?")) {
    throw new Error("Recipient edit cancelled.");
  }

  store.updateRecipientFields(campaignId, recipientId, { [field]: value });
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

  const status = activeScheduleStatus(campaign.status, windowStartAt);

  const updated = store.updateCampaignSchedule(campaignId, {
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

  return {
    campaign: updated,
    message: scheduleSaveMessage(campaign, updated)
  };
}

function activeScheduleStatus(currentStatus, windowStartAt) {
  if (!["running", "scheduled"].includes(currentStatus)) {
    return currentStatus;
  }

  const startDate = windowStartAt ? new Date(windowStartAt) : null;
  return startDate && !Number.isNaN(startDate.getTime()) && startDate.getTime() > Date.now() ? "scheduled" : "running";
}

function startCampaignMessage(beforeStart, started) {
  if (!started) return "Campaign start request completed.";

  if (started.status === "scheduled") {
    return `Campaign armed. Sending will start at ${shortTime(started.windowStartAt || started.scheduledAt)}.`;
  }

  const plannedStart = parseDate(beforeStart?.windowStartAt || beforeStart?.scheduledAt);
  const plannedEnd = parseDate(beforeStart?.windowEndAt);
  if (plannedEnd && plannedEnd.getTime() <= Date.now() && !started.windowEndAt) {
    return "Campaign started. The previous delivery window had ended, so the end time was cleared and sending can continue until complete.";
  }

  if (plannedStart && plannedStart.getTime() <= Date.now()) {
    return "Campaign started. The planned start time has already passed, so due recipients can be processed now.";
  }

  return "Campaign started. Queue worker will process due recipients.";
}

function scheduleSaveMessage(beforeSave, updated) {
  if (!updated) return "Campaign schedule updated.";
  if (beforeSave.status === "draft") {
    return "Schedule saved. Campaign is still a draft; use Start when you are ready to activate sending.";
  }
  if (beforeSave.status === "paused") {
    return "Schedule saved. Campaign remains paused until you start it.";
  }
  if (updated.status === "scheduled") {
    return `Schedule saved. Sending will start at ${shortTime(updated.windowStartAt || updated.scheduledAt)}.`;
  }

  const plannedStart = parseDate(updated.windowStartAt || updated.scheduledAt);
  if (["running", "scheduled"].includes(beforeSave.status) && plannedStart && plannedStart.getTime() <= Date.now()) {
    return "Schedule saved. The planned start time has already passed, so the campaign is due now.";
  }

  return "Campaign schedule updated.";
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function persistCampaignEmailFromEditors(campaignId, options = {}) {
  const card = document.querySelector(`.campaign-card [data-id="${cssEscape(campaignId)}"]`)?.closest(".campaign-card") || campaignList;
  syncEmailEditors(card);

  const subjectInput = card.querySelector(`[data-email-subject="${cssEscape(campaignId)}"]`);
  const bodyInput = card.querySelector(`[data-email-body="${cssEscape(campaignId)}"]`);
  const verificationInput = card.querySelector(`[data-email-verification-link="${cssEscape(campaignId)}"]`);
  if (!subjectInput && !bodyInput && !verificationInput) return store.findCampaign(campaignId);

  const campaign = store.findCampaign(campaignId);
  if (!campaign) return null;

  const subject = (subjectInput?.value || "").trim() || "Your certificate is ready";
  const body = (bodyInput?.value || "").trim() || defaultEmailBody();
  const includeVerificationLink = verificationInput ? verificationInput.checked : Boolean(campaign.includeVerificationLink);
  const changed = subject !== (campaign.emailSubject || "Your certificate is ready")
    || body !== (campaign.emailBodyHtml || defaultEmailBody())
    || includeVerificationLink !== Boolean(campaign.includeVerificationLink);

  if (!changed && !options.force) return campaign;

  return store.updateCampaign(campaignId, {
    emailSubject: subject,
    emailBodyHtml: body,
    includeVerificationLink,
    attachPdf: true
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
    includeVerificationLink: Boolean(source.includeVerificationLink),
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
  return '<p>Hello {{name_en}},</p><p>Your certificate is attached as a PDF.</p>';
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
      campaignTemplateLayout: applyWizardTemplateFieldMapping(buildCampaignTemplateLayout(lastCampaignTemplateUpload, campaignTemplateFit.value))
    };
  }

  if (!campaignTemplate.value) {
    throw new Error("Select a saved template or upload a template image for this campaign.");
  }

  const template = store.findTemplate(campaignTemplate.value);
  const mappedLayout = template?.layout ? applyWizardTemplateFieldMapping(template.layout) : null;
  return {
    templateId: campaignTemplate.value,
    templateSource: "saved_template",
    templateFileName: "",
    campaignTemplateName: template?.name || "",
    campaignTemplateLayout: mappedLayout
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

function normalizeAssetPath(value) {
  const path = String(value || "").trim().replaceAll("\\", "/");
  return ["", "undefined", "null", "false", "#"].includes(path.toLowerCase()) ? "" : path;
}

function browserAssetUrl(path) {
  const cleanPath = normalizeAssetPath(path);
  if (!cleanPath) return "";
  if (/^(blob:|data:|https?:\/\/|\/asset\.php\?)/i.test(cleanPath)) return cleanPath;
  if (/^storage\/uploads\/(backgrounds|images)\//i.test(cleanPath)) {
    return `/asset.php?path=${encodeURIComponent(cleanPath)}`;
  }
  return cleanPath;
}

function imageFitToCss(fit) {
  if (fit === "cover") return "cover";
  if (fit === "stretch") return "100% 100%";
  return "contain";
}

function fontCssFamily(fontValue) {
  const fontMap = {
    dejavusans: "DejaVu Sans",
    dejavuserif: "DejaVu Serif",
    dejavusansmono: "DejaVu Sans Mono",
    freesans: "FreeSans, Arial",
    freeserif: "FreeSerif, Times New Roman",
    freemono: "FreeMono, Courier New",
    lateef: "Lateef, serif",
    xbriyaz: "XB Riyaz, serif",
    kfgqpcuthmantahanaskh: "KFGQPC Uthman Taha Naskh, serif",
    arial: "Arial",
    arial_narrow: "Arial Narrow, Arial",
    tahoma: "Tahoma",
    times_new_roman: "Times New Roman",
    calibri: "Calibri",
    segoe_ui: "Segoe UI",
    verdana: "Verdana",
    georgia: "Georgia",
    trebuchet_ms: "Trebuchet MS",
    courier_new: "Courier New",
    noto_sans: "Noto Sans, Arial",
    noto_serif: "Noto Serif, Times New Roman",
    noto_sans_arabic: "Noto Sans Arabic, Tahoma",
    noto_naskh_arabic: "Noto Naskh Arabic, serif",
    noto_kufi_arabic: "Noto Kufi Arabic, Tahoma",
    traditional_arabic: "Traditional Arabic, serif",
    arabic_typesetting: "Arabic Typesetting, serif",
    sakkal_majalla: "Sakkal Majalla, serif",
    simplified_arabic: "Simplified Arabic, serif",
    bukra_slanted: "Bukra Slanted",
    bukra_book_slanted: "Bukra Book Slanted",
    bukra_light_slanted: "Bukra Light Slanted",
    bukra_extralight_slanted: "Bukra ExtraLight Slanted",
    bukra_thin_slanted: "Bukra Thin Slanted"
  };
  const normalized = String(fontValue || "dejavusans").trim().toLowerCase();
  return fontMap[normalized] || "DejaVu Sans";
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
  wizardPreviewSampleIndex = -1;
  setCsvStatus("No CSV selected", "status locked");
  campaignCsvFileName.textContent = "Upload a recipient CSV for this campaign.";
  campaignCsvRows.textContent = "0";
  campaignCsvLabels.textContent = "0";
  campaignCsvMapping.innerHTML = `
    <tr><td>Email address</td><td>Select after upload</td><td><span class="pill failed">Required</span></td></tr>
    <tr><td>Unique identifier</td><td>Select after upload</td><td><span class="pill failed">Required</span></td></tr>
    <tr><td>Recipient name</td><td>Select after upload</td><td><span class="pill failed">Required</span></td></tr>
    <tr><td>Arabic name</td><td>Optional</td><td><span class="pill queued">Optional</span></td></tr>
  `;
  campaignCsvPreview.innerHTML = '<thead><tr><th>Preview</th><th>Status</th></tr></thead><tbody><tr><td>Select a CSV to preview the first rows.</td><td><span class="pill queued">Waiting</span></td></tr></tbody>';
}

async function importCampaignCsv(file) {
  campaignCsvFileName.textContent = file.name;
  setCsvStatus("Reading CSV", "status pending");

  const { headers, records } = await parseCampaignCsvFile(file);
  const fieldMap = inferFieldMap(headers);

  lastCampaignImport = { fileName: file.name, headers, records, fieldMap };
  chooseWizardPreviewSample();
  campaignCsvRows.textContent = String(records.length);
  campaignCsvLabels.textContent = String(headers.length);
  renderMapping(headers, records, fieldMap);
  renderPreview(headers, records, fieldMap);

  if (records.length === 0) {
    setCsvStatus("No recipient rows", "status failed");
  } else {
    updateCsvMappingStatus(lastCampaignImport);
  }

  renderWizardTemplatePreview();
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
  importBatch.fieldMap = mapForHeaders(importBatch.headers, campaign.csvFieldMap || null);
  const missing = missingLabels(importBatch);
  if (missing.length > 0) {
    throw new Error(`Map the required CSV fields before saving: ${missing.join(", ")}.`);
  }
  const rowIssues = requiredMappedRowIssues(importBatch);
  if (rowIssues.missingRows > 0 || rowIssues.invalidEmails > 0) {
    throw new Error(csvRowIssueMessage(rowIssues));
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

function renderMapping(headers, records, fieldMap = {}) {
  const normalizedMap = normalizeFieldMap(fieldMap);
  campaignCsvMapping.innerHTML = csvCoreFields.map((field) => `
    <tr>
      <td>
        <strong>${escapeHtml(field.label)}</strong>
        <small>${escapeHtml(field.role)}${field.required ? " - required" : " - optional"}</small>
      </td>
      <td>
        <select data-csv-field-map="${escapeHtml(field.key)}">
          <option value="">${field.required ? "Select CSV column" : "Not used"}</option>
          ${headers.map((header) => `
            <option value="${escapeAttribute(header)}" ${normalizedMap[field.key] === header ? "selected" : ""}>${escapeHtml(header)}</option>
          `).join("")}
        </select>
      </td>
      <td>${pillFor(mappingValidationFor(field, records, normalizedMap))}</td>
    </tr>
  `).join("");
}

function renderPreview(headers, records, fieldMap = {}) {
  const rowsToShow = records.slice(0, 8);
  const normalizedMap = normalizeFieldMap(fieldMap);
  campaignCsvPreview.innerHTML = `
    <thead>
      <tr>${headers.slice(0, 8).map((header) => `<th>${escapeHtml(header)}</th>`).join("")}<th>Status</th></tr>
    </thead>
    <tbody>
      ${rowsToShow.map((record, rowIndex) => `
        <tr>
          ${headers.slice(0, 8).map((header) => `
            <td${header.endsWith("_ar") ? " dir=\"rtl\"" : ""}>
              <input class="table-input" data-csv-preview-row="${rowIndex}" data-csv-preview-header="${escapeAttribute(header)}" value="${escapeAttribute(record[header] || "")}">
            </td>
          `).join("")}
          <td data-row-status>${pillFor(rowStatus(record, normalizedMap))}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
}

function mappingValidationFor(field, records, fieldMap) {
  const source = fieldMap[field.key] || "";
  if (!source) return field.required ? "Select field" : "Optional";

  const blankRows = records.filter((record) => mappedValue(record, fieldMap, field.key) === "").length;
  if (blankRows > 0 && field.required) return `${blankRows} blank`;

  if (field.key === "email") {
    const invalidRows = records.filter((record) => {
      const email = mappedValue(record, fieldMap, "email");
      return email !== "" && !isValidEmail(email);
    }).length;
    if (invalidRows > 0) return `${invalidRows} invalid`;
  }

  return "Mapped";
}

function validationFor(header, records) {
  if (csvCoreFields.some((field) => field.key === header && field.required)) return "Required";
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

function rowStatus(record, fieldMap = {}) {
  const missing = requiredMappedFields.filter((field) => mappedValue(record, fieldMap, field) === "");
  if (missing.length > 0) return `Missing ${missing.map(fieldLabel).join(", ")}`;

  const email = mappedValue(record, fieldMap, "email");
  if (!isValidEmail(email)) return "Invalid email";

  return "Accepted";
}

function missingLabels(importBatch) {
  const fieldMap = normalizeFieldMap(importBatch?.fieldMap || {});
  return requiredMappedFields
    .filter((field) => !fieldMap[field])
    .map(fieldLabel);
}

function requiredMappedRowIssues(importBatch) {
  const records = Array.isArray(importBatch?.records) ? importBatch.records : [];
  const fieldMap = normalizeFieldMap(importBatch?.fieldMap || {});
  const missingRows = records.filter((record) => requiredMappedFields.some((field) => mappedValue(record, fieldMap, field) === "")).length;
  const invalidEmails = records.filter((record) => {
    const email = mappedValue(record, fieldMap, "email");
    return email !== "" && !isValidEmail(email);
  }).length;

  return { missingRows, invalidEmails };
}

function csvRowIssueMessage(rowIssues) {
  if (rowIssues.missingRows > 0) {
    return `${rowIssues.missingRows} recipient row${rowIssues.missingRows === 1 ? "" : "s"} are missing required mapped values.`;
  }

  return `${rowIssues.invalidEmails} recipient row${rowIssues.invalidEmails === 1 ? " has" : "s have"} an invalid email address.`;
}

function updateCsvMappingStatus(importBatch) {
  const missing = missingLabels(importBatch);
  const rowIssues = requiredMappedRowIssues(importBatch);

  if (missing.length > 0) {
    setCsvStatus(`Map ${missing.join(", ")}`, "status warning");
  } else if (rowIssues.missingRows > 0) {
    setCsvStatus(`${rowIssues.missingRows} rows need mapped values`, "status warning");
  } else if (rowIssues.invalidEmails > 0) {
    setCsvStatus(`${rowIssues.invalidEmails} invalid email addresses`, "status warning");
  } else {
    setCsvStatus("CSV mapping ready for this campaign", "status ready");
  }
}

function mappedValue(record, fieldMap, field) {
  const source = normalizeFieldMap(fieldMap)[field] || "";
  return String(source ? (record[source] ?? "") : "").trim();
}

function fieldLabel(field) {
  return csvCoreFields.find((config) => config.key === field)?.label || field;
}

function mapForHeaders(headers, preferredMap = null) {
  const preferred = normalizeFieldMap(preferredMap || {});
  const available = new Set(headers);
  const reusable = Object.fromEntries(
    Object.entries(preferred).map(([field, source]) => [field, available.has(source) ? source : ""])
  );
  const inferred = inferFieldMap(headers);

  return normalizeFieldMap({ ...inferred, ...Object.fromEntries(Object.entries(reusable).filter(([, source]) => source)) });
}

function inferFieldMap(headers) {
  const used = new Set();
  const map = {};

  csvCoreFields.forEach((field) => {
    const aliases = csvFieldAliases[field.key] || [field.key];
    const match = headers.find((header) => {
      if (used.has(header)) return false;
      const normalized = normalizeHeaderKey(header);
      return aliases.includes(normalized);
    }) || "";
    map[field.key] = match;
    if (match) used.add(match);
  });

  return normalizeFieldMap(map);
}

function normalizeFieldMap(fieldMap = {}) {
  return Object.fromEntries(csvCoreFields.map((field) => [field.key, String(fieldMap[field.key] || "").trim()]));
}

function normalizeHeaderKey(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function pillFor(validation) {
  const className = validation === "Required" || validation === "Accepted" || validation === "Mapped"
    ? "pill sent"
    : (validation === "Optional" || validation === "Formula check" || validation === "RTL" || validation === "Date" ? "pill queued" : "pill failed");
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
