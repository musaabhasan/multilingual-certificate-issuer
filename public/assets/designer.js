const canvas = document.querySelector("#canvas");
const output = document.querySelector("#layoutOutput");
const addCsvField = document.querySelector("#addCsvField");
const addStaticText = document.querySelector("#addStaticText");
const addImage = document.querySelector("#addImage");
const addVerificationQr = document.querySelector("#addVerificationQr");
const exportLayout = document.querySelector("#exportLayout");
const applyField = document.querySelector("#applyField");
const duplicateItem = document.querySelector("#duplicateItem");
const deleteItem = document.querySelector("#deleteItem");
const itemList = document.querySelector("#itemList");
const itemCount = document.querySelector("#itemCount");
const templateSelect = document.querySelector("#templateSelect");
const templateName = document.querySelector("#templateName");
const templateStatus = document.querySelector("#templateStatus");
const newTemplate = document.querySelector("#newTemplate");
const loadTemplate = document.querySelector("#loadTemplate");
const saveTemplate = document.querySelector("#saveTemplate");
const saveTemplateCopy = document.querySelector("#saveTemplateCopy");
const templateSaveStatus = document.querySelector("#templateSaveStatus");
const backgroundFile = document.querySelector("#backgroundFile");
const backgroundPath = document.querySelector("#backgroundPath");
const backgroundFit = document.querySelector("#backgroundFit");
const clearBackground = document.querySelector("#clearBackground");
const backgroundUploadStatus = document.querySelector("#backgroundUploadStatus");
const fieldLabel = document.querySelector("#fieldLabel");
const fieldSource = document.querySelector("#fieldSource");
const fieldText = document.querySelector("#fieldText");
const itemImageFile = document.querySelector("#itemImageFile");
const itemImagePath = document.querySelector("#itemImagePath");
const itemImageFit = document.querySelector("#itemImageFit");
const itemUploadStatus = document.querySelector("#itemUploadStatus");
const fieldDirection = document.querySelector("#fieldDirection");
const fieldAlign = document.querySelector("#fieldAlign");
const fieldSize = document.querySelector("#fieldSize");
const fieldFont = document.querySelector("#fieldFont");
const fieldColor = document.querySelector("#fieldColor");
const fieldX = document.querySelector("#fieldX");
const fieldY = document.querySelector("#fieldY");
const fieldWidth = document.querySelector("#fieldWidth");
const fieldHeight = document.querySelector("#fieldHeight");

const fontOptions = [
  { value: "dejavusans", label: "DejaVu Sans", css: "DejaVu Sans" },
  { value: "dejavuserif", label: "DejaVu Serif", css: "DejaVu Serif" },
  { value: "dejavusansmono", label: "DejaVu Sans Mono", css: "DejaVu Sans Mono" },
  { value: "freesans", label: "FreeSans", css: "FreeSans, Arial" },
  { value: "freeserif", label: "FreeSerif", css: "FreeSerif, Times New Roman" },
  { value: "freemono", label: "FreeMono", css: "FreeMono, Courier New" },
  { value: "lateef", label: "Lateef Arabic", css: "Lateef, serif" },
  { value: "xbriyaz", label: "XB Riyaz Arabic", css: "XB Riyaz, serif" },
  { value: "kfgqpcuthmantahanaskh", label: "Uthman Taha Naskh", css: "KFGQPC Uthman Taha Naskh, serif" },
  { value: "arial", label: "Arial", css: "Arial" },
  { value: "arial_narrow", label: "Arial Narrow", css: "Arial Narrow, Arial" },
  { value: "tahoma", label: "Tahoma", css: "Tahoma" },
  { value: "times_new_roman", label: "Times New Roman", css: "Times New Roman" },
  { value: "calibri", label: "Calibri", css: "Calibri" },
  { value: "segoe_ui", label: "Segoe UI", css: "Segoe UI" },
  { value: "verdana", label: "Verdana", css: "Verdana" },
  { value: "georgia", label: "Georgia", css: "Georgia" },
  { value: "trebuchet_ms", label: "Trebuchet MS", css: "Trebuchet MS" },
  { value: "courier_new", label: "Courier New", css: "Courier New" },
  { value: "noto_sans", label: "Noto Sans", css: "Noto Sans, Arial" },
  { value: "noto_serif", label: "Noto Serif", css: "Noto Serif, Times New Roman" },
  { value: "noto_sans_arabic", label: "Noto Sans Arabic", css: "Noto Sans Arabic, Tahoma" },
  { value: "noto_naskh_arabic", label: "Noto Naskh Arabic", css: "Noto Naskh Arabic, serif" },
  { value: "noto_kufi_arabic", label: "Noto Kufi Arabic", css: "Noto Kufi Arabic, Tahoma" },
  { value: "traditional_arabic", label: "Traditional Arabic", css: "Traditional Arabic, serif" },
  { value: "arabic_typesetting", label: "Arabic Typesetting", css: "Arabic Typesetting, serif" },
  { value: "sakkal_majalla", label: "Sakkal Majalla", css: "Sakkal Majalla, serif" },
  { value: "simplified_arabic", label: "Simplified Arabic", css: "Simplified Arabic, serif" },
  { value: "bukra_slanted", label: "Bukra Slanted", css: "Bukra Slanted" },
  { value: "bukra_book_slanted", label: "Bukra Book Slanted", css: "Bukra Book Slanted" },
  { value: "bukra_light_slanted", label: "Bukra Light Slanted", css: "Bukra Light Slanted" },
  { value: "bukra_extralight_slanted", label: "Bukra ExtraLight Slanted", css: "Bukra ExtraLight Slanted" },
  { value: "bukra_thin_slanted", label: "Bukra Thin Slanted", css: "Bukra Thin Slanted" },
  { value: "bukra_hairline_slanted", label: "Bukra Hairline Slanted", css: "Bukra Hairline Slanted" },
  { value: "bukra_medium_slanted", label: "Bukra Medium Slanted", css: "Bukra Medium Slanted" },
  { value: "bukra_semibold_slanted", label: "Bukra SemiBold Slanted", css: "Bukra SemiBold Slanted" },
  { value: "bukra_bold_slanted", label: "Bukra Bold Slanted", css: "Bukra Bold Slanted" },
  { value: "bukra_extrabold_slanted", label: "Bukra ExtraBold Slanted", css: "Bukra ExtraBold Slanted" }
];

const defaultCsvSources = [
  "unique_identifier",
  "email",
  "name_en",
  "name_ar",
  "program_en",
  "program_ar",
  "certificate_title_en",
  "certificate_title_ar",
  "issue_date",
  "organization_en",
  "organization_ar"
];

let counter = 1;
let active = null;
let selected = null;
let offset = { x: 0, y: 0 };
let backgroundPreviewUrl = "";
let currentTemplateId = null;
let templateDirty = false;
let suppressTemplateDirty = false;

function applyBackgroundPreview() {
  const imageUrl = backgroundPreviewUrl || browserAssetUrl(backgroundPath.value);
  canvas.classList.toggle("has-background", Boolean(imageUrl));
  canvas.style.setProperty("--certificate-background-image", imageUrl ? `url("${imageUrl}")` : "none");
  canvas.dataset.backgroundFit = backgroundFit.value;
}

function addCsvTextItem(settings = {}) {
  const source = settings.source || firstCsvSource();
  return addItem({
    type: "csv_text",
    label: settings.label || labelFromSource(source),
    source,
    text: settings.text || "",
    width: settings.width || 190,
    height: settings.height || 38,
    ...settings
  });
}

function addStaticTextItem(settings = {}) {
  return addItem({
    type: "static_text",
    label: settings.label || "Static text",
    text: settings.text || "Certificate text",
    width: settings.width || 190,
    height: settings.height || 38,
    ...settings
  });
}

function addImageItem(settings = {}) {
  return addItem({
    type: "image",
    label: settings.label || "Image",
    src: settings.src || "",
    fit: settings.fit || "contain",
    width: settings.width || 110,
    height: settings.height || 80,
    ...settings
  });
}

function addVerificationQrItem(settings = {}) {
  return addItem({
    type: "verification_qr",
    label: settings.label || "Verification QR",
    fit: "contain",
    width: settings.width || 82,
    height: settings.height || 82,
    ...settings
  });
}

function addItem(settings = {}) {
  const item = document.createElement("div");
  const type = settings.type || "csv_text";
  item.className = `design-item ${isVisualItem(type) ? "image-item" : "text-box"}`;
  item.dataset.type = type;
  item.dataset.key = settings.key || `${type}_${counter}`;
  item.dataset.label = settings.label || `Item ${counter}`;
  item.dataset.source = settings.source || "";
  item.dataset.text = settings.text || settings.label || "";
  item.dataset.src = settings.src || "";
  item.dataset.fit = settings.fit || "contain";
  item.dataset.direction = settings.direction || "ltr";
  item.dataset.align = settings.align || "center";
  item.dataset.font = normalizeFont(settings.font || "dejavusans");
  item.dataset.fontSize = settings.fontSize || "20";
  item.dataset.color = settings.color || "#111827";
  item.dataset.previewUrl = settings.previewUrl || "";
  item.style.left = `${settings.left ?? 44 + counter * 12}px`;
  item.style.top = `${settings.top ?? 64 + counter * 18}px`;
  item.style.width = `${settings.width || 180}px`;
  item.style.height = `${settings.height || 38}px`;
  item.addEventListener("pointerdown", startDrag);
  item.addEventListener("focus", () => selectItem(item));
  item.addEventListener("click", () => selectItem(item));

  if (!isVisualItem(type)) {
    item.contentEditable = "true";
    item.addEventListener("input", () => {
      if (item.dataset.type === "static_text") {
        item.dataset.text = item.textContent.trim();
      } else {
        item.dataset.label = item.textContent.trim();
      }
      syncSelectedPanel();
      renderItemList();
      exportJson();
    });
  }

  canvas.appendChild(item);
  applyItemStyles(item);
  selectItem(item);
  counter += 1;
  renderItemList();
  exportJson();
  return item;
}

function applyItemStyles(item) {
  const type = item.dataset.type;
  item.className = `design-item ${isVisualItem(type) ? "image-item" : "text-box"}${selected === item ? " selected" : ""}`;
  item.style.textAlign = item.dataset.align;
  item.style.direction = item.dataset.direction;
  item.style.fontSize = `${item.dataset.fontSize}px`;
  item.style.fontFamily = `${fontCssFamily(item.dataset.font)}, "DejaVu Sans", sans-serif`;
  item.style.color = item.dataset.color;

  if (type === "verification_qr") {
    item.textContent = "Verification QR";
    item.style.backgroundImage = "linear-gradient(90deg, #0f172a 10px, transparent 10px), linear-gradient(#0f172a 10px, transparent 10px)";
    item.style.backgroundSize = "22px 22px";
  } else if (type === "image") {
    const imageUrl = item.dataset.previewUrl || browserAssetUrl(item.dataset.src);
    item.textContent = imageUrl ? "" : "Image";
    item.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : "";
    item.style.backgroundSize = imageFitToCss(item.dataset.fit);
  } else if (type === "static_text") {
    item.textContent = item.dataset.text || item.dataset.label;
  } else {
    item.textContent = item.dataset.label || labelFromSource(item.dataset.source);
  }
}

function selectItem(item) {
  if (selected) {
    selected.classList.remove("selected");
  }
  selected = item;
  selected.classList.add("selected");
  syncSelectedPanel();
  renderItemList();
}

function syncSelectedPanel() {
  if (!selected) return;
  const rect = selectedRectPx(selected);
  fieldLabel.value = selected.dataset.label || "";
  setSourceValue(selected.dataset.source || "");
  fieldText.value = selected.dataset.text || "";
  itemImagePath.value = selected.dataset.src || "";
  itemImageFit.value = selected.dataset.fit || "contain";
  fieldDirection.value = selected.dataset.direction || "ltr";
  fieldAlign.value = selected.dataset.align || "center";
  fieldFont.value = normalizeFont(selected.dataset.font || "dejavusans");
  fieldSize.value = selected.dataset.fontSize || "20";
  fieldColor.value = selected.dataset.color || "#111827";
  fieldX.value = Math.round(rect.left);
  fieldY.value = Math.round(rect.top);
  fieldWidth.value = Math.round(rect.width);
  fieldHeight.value = Math.round(rect.height);
}

function startDrag(event) {
  active = event.currentTarget;
  selectItem(active);
  const rect = active.getBoundingClientRect();
  offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  active.setPointerCapture(event.pointerId);
}

function drag(event) {
  if (!active) return;
  const canvasRect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(event.clientX - canvasRect.left - offset.x, canvasRect.width - active.offsetWidth));
  const y = Math.max(0, Math.min(event.clientY - canvasRect.top - offset.y, canvasRect.height - active.offsetHeight));
  active.style.left = `${x}px`;
  active.style.top = `${y}px`;
  syncSelectedPanel();
  exportJson();
}

function stopDrag() {
  active = null;
}

function applySelectedItem() {
  if (!selected) return;
  selected.dataset.label = fieldLabel.value.trim() || selected.dataset.label;
  selected.dataset.source = fieldSource.value.trim();
  selected.dataset.text = fieldText.value.trim();
  selected.dataset.src = itemImagePath.value.trim();
  selected.dataset.fit = itemImageFit.value;
  selected.dataset.direction = fieldDirection.value;
  selected.dataset.align = fieldAlign.value;
  selected.dataset.font = normalizeFont(fieldFont.value || "dejavusans");
  selected.dataset.fontSize = fieldSize.value || "20";
  selected.dataset.color = fieldColor.value;
  selected.style.left = `${Math.max(0, Number(fieldX.value || 0))}px`;
  selected.style.top = `${Math.max(0, Number(fieldY.value || 0))}px`;
  selected.style.width = `${Math.max(8, Number(fieldWidth.value || 8))}px`;
  selected.style.height = `${Math.max(8, Number(fieldHeight.value || 8))}px`;
  applyItemStyles(selected);
  renderItemList();
  exportJson();
}

function duplicateSelectedItem() {
  if (!selected) return;
  const rect = selectedRectPx(selected);
  addItem({
    ...selected.dataset,
    key: "",
    label: `${selected.dataset.label || "Item"} copy`,
    left: rect.left + 16,
    top: rect.top + 16,
    width: rect.width,
    height: rect.height
  });
}

function deleteSelectedItem() {
  if (!selected) return;
  selected.remove();
  selected = canvas.querySelector(".design-item");
  if (selected) {
    selectItem(selected);
  }
  renderItemList();
  exportJson();
}

function renderItemList() {
  const items = [...canvas.querySelectorAll(".design-item")];
  itemCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
  itemList.innerHTML = items.map((item) => {
    const activeClass = item === selected ? " active" : "";
    return `
      <button class="item-row${activeClass}" type="button" data-key="${escapeHtml(item.dataset.key)}">
        <span>${escapeHtml(item.dataset.label || item.dataset.key)}</span>
        <small>${escapeHtml(itemTypeLabel(item.dataset.type))}${item.dataset.source ? ` - ${escapeHtml(item.dataset.source)}` : ""}</small>
      </button>
    `;
  }).join("");
}

function currentLayout() {
  const canvasRect = canvas.getBoundingClientRect();
  const elements = [...canvas.querySelectorAll(".design-item")].map((item) => {
    const rect = item.getBoundingClientRect();
    const element = {
      type: item.dataset.type || "csv_text",
      key: item.dataset.key,
      label: item.dataset.label || item.textContent.trim(),
      x: roundMm((rect.left - canvasRect.left) / canvasRect.width * 297),
      y: roundMm((rect.top - canvasRect.top) / canvasRect.height * 210),
      width: roundMm(rect.width / canvasRect.width * 297),
      height: roundMm(rect.height / canvasRect.height * 210)
    };

    if (element.type === "verification_qr") {
      element.fit = "contain";
    } else if (element.type === "image") {
      element.src = item.dataset.src;
      element.fit = item.dataset.fit || "contain";
    } else {
      element.source = item.dataset.source;
      element.text = item.dataset.text;
      element.font = item.dataset.font || "dejavusans";
      element.fontSize = Number(item.dataset.fontSize);
      element.align = item.dataset.align;
      element.direction = item.dataset.direction;
      element.color = item.dataset.color;
    }

    return element;
  });

  return {
    page: { width: 297, height: 210, orientation: "landscape" },
    background: backgroundPath.value.trim(),
    backgroundFit: backgroundFit.value,
    elements
  };
}

function exportJson() {
  output.value = JSON.stringify(currentLayout(), null, 2);
  markTemplateDirty();
}

async function uploadAsset(file, category) {
  const formData = new FormData();
  formData.append("asset", file);
  formData.append("category", category);

  const response = await fetch("/upload-asset.php", {
    method: "POST",
    headers: {
      "X-CSRF-Token": window.CertificateIssuerAuth?.csrfToken || ""
    },
    body: formData
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Upload failed.");
  }

  return payload;
}

function setUploadStatus(element, message, state = "locked") {
  if (!element) return;
  element.className = `status ${state}`;
  element.textContent = message;
}

function roundMm(value) {
  return Math.round(value * 10) / 10;
}

function renderTemplateSelect(selectedId = currentTemplateId) {
  const templates = reusableTemplates();
  const draftOption = selectedId ? "" : '<option value="">Unsaved draft</option>';
  templateSelect.innerHTML = templates.length > 0 ? draftOption + templates.map((template) => (
    `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)} (${escapeHtml(template.status)})</option>`
  )).join("") : '<option value="">Unsaved draft</option>';

  if (selectedId && templates.some((template) => template.id === selectedId)) {
    templateSelect.value = selectedId;
  }

  templateSelect.disabled = templates.length === 0;
  if (!selectedId && templates.length > 0) {
    templateSelect.value = "";
  }
}

function loadLayout(layout) {
  canvas.querySelectorAll(".design-item").forEach((item) => item.remove());
  selected = null;
  counter = 1;
  backgroundPath.value = layout.background || "";
  backgroundFit.value = layout.backgroundFit || "cover";

  if (backgroundPreviewUrl) {
    URL.revokeObjectURL(backgroundPreviewUrl);
  }
  backgroundPreviewUrl = "";
  backgroundFile.value = "";
  applyBackgroundPreview();

  const canvasRect = canvas.getBoundingClientRect();
  (layout.elements || []).forEach((element) => {
    const base = {
      key: element.key,
      label: element.label,
      left: (Number(element.x || 0) / 297) * canvasRect.width,
      top: (Number(element.y || 0) / 210) * canvasRect.height,
      width: (Number(element.width || 45) / 297) * canvasRect.width,
      height: (Number(element.height || 14) / 210) * canvasRect.height
    };

    if ((element.type || "csv_text") === "verification_qr") {
      addVerificationQrItem({ ...base, fit: element.fit || "contain" });
    } else if ((element.type || "csv_text") === "image") {
      addImageItem({ ...base, src: element.src || element.path || "", fit: element.fit || "contain" });
    } else if (element.type === "static_text") {
      addStaticTextItem({
        ...base,
        text: element.text || element.label || "",
        direction: element.direction,
        align: element.align,
        font: element.font || "dejavusans",
        fontSize: String(element.fontSize || 20),
        color: element.color || "#111827"
      });
    } else {
      addCsvTextItem({
        ...base,
        source: element.source || "",
        direction: element.direction,
        align: element.align,
        font: element.font || "dejavusans",
        fontSize: String(element.fontSize || 20),
        color: element.color || "#111827"
      });
    }
  });

  renderCsvSourceOptions();
  renderItemList();
  exportJson();
}

function loadSelectedTemplate(options = {}) {
  if (!options.skipConfirm && !confirmDiscardTemplateChanges()) {
    renderTemplateSelect(currentTemplateId);
    return;
  }

  const template = window.CertificateIssuerStore.findTemplate(templateSelect.value);
  if (!template) return;

  currentTemplateId = template.id;
  templateName.value = template.name;
  templateStatus.value = template.status;
  suppressTemplateDirty = true;
  loadLayout(template.layout);
  suppressTemplateDirty = false;
  templateDirty = false;
  setTemplateStatus("Template loaded", "status ready");
  syncTemplateActionState();
}

function saveCurrentTemplate(options = {}) {
  const name = templateName.value.trim() || "Untitled Certificate Template";
  const saveAsCopy = Boolean(options.asCopy);
  const saved = window.CertificateIssuerStore.saveTemplate({
    id: saveAsCopy ? "" : currentTemplateId,
    name: saveAsCopy ? nextTemplateCopyName(name) : name,
    status: templateStatus.value,
    layout: currentLayout()
  });

  currentTemplateId = saved.id;
  templateName.value = saved.name;
  renderTemplateSelect(saved.id);
  templateDirty = false;
  setTemplateStatus(saveAsCopy ? "Template copy saved" : "Template saved", "status ready");
  syncTemplateActionState();
}

function setTemplateStatus(text, className) {
  templateSaveStatus.textContent = text;
  templateSaveStatus.className = className;
}

function markTemplateDirty() {
  if (suppressTemplateDirty) return;
  templateDirty = true;
  setTemplateStatus(currentTemplateId ? "Unsaved changes" : "Unsaved draft", "status warning");
  syncTemplateActionState();
}

function confirmDiscardTemplateChanges() {
  return !templateDirty || window.confirm("Discard unsaved template changes?");
}

function syncTemplateActionState() {
  saveTemplate.disabled = Boolean(currentTemplateId) && !templateDirty;
  saveTemplateCopy.disabled = !currentTemplateId && !templateDirty;
}

function reusableTemplates() {
  return typeof window.CertificateIssuerStore.reusableTemplates === "function"
    ? window.CertificateIssuerStore.reusableTemplates()
    : window.CertificateIssuerStore.templates().filter((template) => !template.campaignOwned);
}

function newBlankTemplate(options = {}) {
  if (options.confirm !== false && !confirmDiscardTemplateChanges()) return;

  currentTemplateId = null;
  templateName.value = "New Certificate Template";
  templateStatus.value = "draft";
  renderTemplateSelect("");
  backgroundPath.value = "";
  backgroundFit.value = "cover";
  if (backgroundPreviewUrl) {
    URL.revokeObjectURL(backgroundPreviewUrl);
  }
  backgroundPreviewUrl = "";
  backgroundFile.value = "";
  canvas.querySelectorAll(".design-item").forEach((item) => item.remove());

  suppressTemplateDirty = true;
  applyBackgroundPreview();
  addCsvTextItem({ label: "Recipient Name", source: "name_en", direction: "ltr", align: "center", left: 170, top: 150, width: 190, height: 38 });
  addCsvTextItem({ label: "Arabic Recipient Name", source: "name_ar", direction: "rtl", align: "center", left: 170, top: 205, width: 190, height: 42, font: "bukra_book_slanted", fontSize: "24" });
  suppressTemplateDirty = false;
  exportJson();
  syncTemplateActionState();
}

function nextTemplateCopyName(name) {
  const existing = new Set(reusableTemplates().map((template) => String(template.name || "").toLowerCase()));
  let candidate = `${name} copy`;
  let count = 2;

  while (existing.has(candidate.toLowerCase())) {
    candidate = `${name} copy ${count}`;
    count += 1;
  }

  return candidate;
}

function renderFontOptions() {
  fieldFont.innerHTML = fontOptions.map((font) => (
    `<option value="${escapeHtml(font.value)}">${escapeHtml(font.label)}</option>`
  )).join("");
}

function renderCsvSourceOptions() {
  const sources = csvSources();
  fieldSource.innerHTML = sources.map((source) => (
    `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`
  )).join("");
}

function csvSources() {
  const campaignSources = window.CertificateIssuerStore.campaigns()
    .flatMap((campaign) => Array.isArray(campaign.labels) ? campaign.labels : []);
  const itemSources = [...canvas.querySelectorAll(".design-item")]
    .map((item) => item.dataset.source)
    .filter(Boolean);
  return [...new Set([...defaultCsvSources, ...campaignSources, ...itemSources])];
}

function setSourceValue(source) {
  if (source && ![...fieldSource.options].some((option) => option.value === source)) {
    fieldSource.appendChild(new Option(source, source));
  }
  fieldSource.value = source || firstCsvSource();
}

function firstCsvSource() {
  return csvSources()[0] || "name_en";
}

function labelFromSource(source) {
  return source
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "CSV field";
}

function itemTypeLabel(type) {
  if (type === "static_text") return "Text";
  if (type === "image") return "Image";
  if (type === "verification_qr") return "Verification QR";
  return "CSV field";
}

function isVisualItem(type) {
  return type === "image" || type === "verification_qr";
}

function selectedRectPx(item) {
  const canvasRect = canvas.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  return {
    left: itemRect.left - canvasRect.left,
    top: itemRect.top - canvasRect.top,
    width: itemRect.width,
    height: itemRect.height
  };
}

function imageFitToCss(fit) {
  if (fit === "cover") return "cover";
  if (fit === "stretch") return "100% 100%";
  return "contain";
}

function browserAssetUrl(path) {
  const cleanPath = String(path || "").trim();
  if (!cleanPath) return "";
  if (/^(blob:|data:|https?:\/\/|\/asset\.php\?)/i.test(cleanPath)) return cleanPath;
  if (/^storage\/uploads\/(backgrounds|images)\//i.test(cleanPath)) {
    return `/asset.php?path=${encodeURIComponent(cleanPath)}`;
  }
  return cleanPath;
}

function fontCssFamily(fontValue) {
  const css = fontOptions.find((font) => font.value === normalizeFont(fontValue))?.css || "DejaVu Sans";
  return css
    .split(",")
    .map((family) => family.trim())
    .filter(Boolean)
    .map((family) => {
      if (family === "serif" || family === "sans-serif" || family === "monospace" || family.startsWith("\"")) {
        return family;
      }

      return family.includes(" ") ? `"${family}"` : family;
    })
    .join(", ");
}

function normalizeFont(fontValue) {
  const aliases = {
    bukra_regular: "bukra_book_slanted",
    bukra_medium: "bukra_medium_slanted",
    bukra_semibold: "bukra_semibold_slanted",
    bukra_bold: "bukra_bold_slanted"
  };
  const normalized = aliases[fontValue] || fontValue;
  return fontOptions.some((font) => font.value === normalized) ? normalized : "dejavusans";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

addCsvField.addEventListener("click", () => addCsvTextItem({ left: 150, top: 150 }));
addStaticText.addEventListener("click", () => addStaticTextItem({ left: 150, top: 190, text: "Certificate text" }));
addImage.addEventListener("click", () => addImageItem({ left: 90, top: 60, label: "Image" }));
addVerificationQr.addEventListener("click", () => {
  const rect = canvas.getBoundingClientRect();
  addVerificationQrItem({
    left: Math.max(16, rect.width - 110),
    top: Math.max(16, rect.height - 110),
    label: "Verification QR"
  });
});
exportLayout.addEventListener("click", exportJson);
applyField.addEventListener("click", applySelectedItem);
duplicateItem.addEventListener("click", duplicateSelectedItem);
deleteItem.addEventListener("click", deleteSelectedItem);
newTemplate.addEventListener("click", () => newBlankTemplate());
loadTemplate.addEventListener("click", () => loadSelectedTemplate());
saveTemplate.addEventListener("click", () => saveCurrentTemplate());
saveTemplateCopy.addEventListener("click", () => saveCurrentTemplate({ asCopy: true }));
templateSelect.addEventListener("change", () => loadSelectedTemplate());
itemList.addEventListener("click", (event) => {
  const row = event.target.closest("[data-key]");
  if (!row) return;
  const item = [...canvas.querySelectorAll(".design-item")].find((candidate) => candidate.dataset.key === row.dataset.key);
  if (item) selectItem(item);
});
itemImageFile.addEventListener("change", async () => {
  if (!selected || selected.dataset.type !== "image") return;
  const file = itemImageFile.files && itemImageFile.files[0];
  if (!file) return;
  const target = selected;

  if (selected.dataset.previewUrl) {
    URL.revokeObjectURL(selected.dataset.previewUrl);
  }
  target.dataset.previewUrl = URL.createObjectURL(file);
  target.dataset.src = "";
  itemImagePath.value = "";
  setUploadStatus(itemUploadStatus, "Uploading image...", "pending");
  applyItemStyles(target);
  exportJson();

  try {
    const uploaded = await uploadAsset(file, "images");
    if (!document.body.contains(target)) return;
    target.dataset.src = uploaded.path;
    if (selected === target) {
      itemImagePath.value = uploaded.path;
    }
    setUploadStatus(itemUploadStatus, "Image uploaded", "sent");
    applyItemStyles(target);
    exportJson();
  } catch (error) {
    if (selected === target) {
      setUploadStatus(itemUploadStatus, error.message, "failed");
    }
  }
});
backgroundFile.addEventListener("change", async () => {
  const file = backgroundFile.files && backgroundFile.files[0];
  if (!file) return;

  if (backgroundPreviewUrl) {
    URL.revokeObjectURL(backgroundPreviewUrl);
  }

  backgroundPreviewUrl = URL.createObjectURL(file);
  backgroundPath.value = "";
  setUploadStatus(backgroundUploadStatus, "Uploading background...", "pending");
  applyBackgroundPreview();
  exportJson();

  try {
    const uploaded = await uploadAsset(file, "backgrounds");
    backgroundPath.value = uploaded.path;
    setUploadStatus(backgroundUploadStatus, "Background uploaded", "sent");
    exportJson();
  } catch (error) {
    setUploadStatus(backgroundUploadStatus, error.message, "failed");
  }
});
backgroundPath.addEventListener("input", () => {
  applyBackgroundPreview();
  exportJson();
});
backgroundFit.addEventListener("change", () => {
  applyBackgroundPreview();
  exportJson();
});
clearBackground.addEventListener("click", () => {
  if (backgroundPreviewUrl) {
    URL.revokeObjectURL(backgroundPreviewUrl);
  }

  backgroundPreviewUrl = "";
  backgroundFile.value = "";
  backgroundPath.value = "";
  setUploadStatus(backgroundUploadStatus, "No background uploaded");
  applyBackgroundPreview();
  exportJson();
});
canvas.addEventListener("pointermove", drag);
canvas.addEventListener("pointerup", stopDrag);
canvas.addEventListener("pointercancel", stopDrag);

applyBackgroundPreview();
renderFontOptions();
renderCsvSourceOptions();
renderTemplateSelect();
const requestedTemplateId = new URLSearchParams(window.location.search).get("template");
const requestedTemplate = requestedTemplateId ? window.CertificateIssuerStore.findTemplate(requestedTemplateId) : null;
if (requestedTemplate) {
  if (![...templateSelect.options].some((option) => option.value === requestedTemplateId)) {
    templateSelect.appendChild(new Option(`${requestedTemplate.name} (${requestedTemplate.status || "template"})`, requestedTemplate.id));
    templateSelect.disabled = false;
  }
  templateSelect.value = requestedTemplateId;
  loadSelectedTemplate({ skipConfirm: true });
} else {
  newBlankTemplate({ confirm: false });
}
syncTemplateActionState();
