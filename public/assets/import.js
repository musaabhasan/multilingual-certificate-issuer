const csvFile = document.querySelector("#csvFile");
const fileName = document.querySelector("#fileName");
const rowCount = document.querySelector("#rowCount");
const labelCount = document.querySelector("#labelCount");
const importStatus = document.querySelector("#importStatus");
const mappingStatus = document.querySelector("#mappingStatus");
const mappingBody = document.querySelector("#mappingBody");
const previewTable = document.querySelector("#previewTable");
const importCampaign = document.querySelector("#importCampaign");
const saveImportToCampaign = document.querySelector("#saveImportToCampaign");
const campaignImportStatus = document.querySelector("#campaignImportStatus");
const store = window.CertificateIssuerStore;
let lastImportBatch = null;

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

function setStatus(element, text, className) {
  element.textContent = text;
  element.className = className;
}

function renderCampaignOptions() {
  const campaigns = store.campaigns();
  importCampaign.innerHTML = campaigns.map((campaign) => (
    `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.name)} (${store.statusLabel(campaign.status)})</option>`
  )).join("");

  if (campaigns.length === 0) {
    saveImportToCampaign.disabled = true;
    setStatus(campaignImportStatus, "Create a campaign first", "status warning");
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

function normalizeHeader(header, index) {
  const cleaned = header.replace(/^\uFEFF/, "").trim();
  return cleaned || `unnamed_label_${index + 1}`;
}

function buildRecords(rows) {
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

function validationFor(header, records) {
  if (requiredLabels.includes(header)) {
    return "Required";
  }

  if (header === "name_ar" || header.endsWith("_ar")) {
    return "RTL";
  }

  if (header === "issue_date" || header.endsWith("_date")) {
    return "Date";
  }

  if (header.startsWith("label_") || header.startsWith("custom_label_")) {
    return "Custom label";
  }

  if (records.some((record) => /^[=+\-@]/.test(record[header] || ""))) {
    return "Formula check";
  }

  return "Accepted";
}

function roleFor(header) {
  if (labelRoles[header]) {
    return labelRoles[header];
  }

  if (header.startsWith("label_") || header.startsWith("custom_label_")) {
    return "Certificate label";
  }

  if (header.startsWith("value_") || header.startsWith("custom_value_")) {
    return "Certificate value";
  }

  return "Custom data";
}

function pillFor(validation) {
  const className = validation === "Required" || validation === "Accepted" ? "pill sent" : "pill queued";
  return `<span class="${className}">${escapeHtml(validation)}</span>`;
}

function renderMapping(headers, records) {
  mappingBody.innerHTML = headers.map((header) => `
    <tr>
      <td><code>${escapeHtml(header)}</code></td>
      <td>${escapeHtml(roleFor(header))}</td>
      <td>${pillFor(validationFor(header, records))}</td>
    </tr>
  `).join("");
}

function renderPreview(headers, records) {
  const rowsToShow = records.slice(0, 25);
  previewTable.innerHTML = `
    <thead>
      <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}<th>Status</th></tr>
    </thead>
    <tbody>
      ${rowsToShow.map((record) => `
        <tr>
          ${headers.map((header) => `<td${header.endsWith("_ar") ? " dir=\"rtl\"" : ""}>${escapeHtml(record[header])}</td>`).join("")}
          <td>${pillFor(rowStatus(record))}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
}

function rowStatus(record) {
  return requiredLabels.every((header) => (record[header] || "").trim() !== "") ? "Accepted" : "Missing data";
}

function missingLabels(headers) {
  return requiredLabels.filter((header) => !headers.includes(header));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function importFile(file) {
  fileName.textContent = file.name;
  setStatus(importStatus, "Reading", "pill queued");

  const text = await file.text();
  const parsed = parseCsv(text);
  const { headers, records } = buildRecords(parsed);
  const missing = missingLabels(headers);

  rowCount.textContent = String(records.length);
  labelCount.textContent = String(headers.length);
  renderMapping(headers, records);
  renderPreview(headers, records);
  lastImportBatch = { fileName: file.name, headers, records };
  saveImportToCampaign.disabled = false;

  if (records.length === 0) {
    setStatus(importStatus, "No rows", "pill failed");
    setStatus(mappingStatus, "No recipients", "status warning");
  } else if (missing.length > 0) {
    setStatus(importStatus, "Review", "pill failed");
    setStatus(mappingStatus, `Missing ${missing.length}`, "status warning");
  } else {
    setStatus(importStatus, "Ready", "pill sent");
    setStatus(mappingStatus, `${headers.length} labels`, "status ready");
  }
}

csvFile.addEventListener("change", async () => {
  const file = csvFile.files && csvFile.files[0];
  if (!file) return;

  try {
    await importFile(file);
  } catch (error) {
    rowCount.textContent = "0";
    labelCount.textContent = "0";
    mappingBody.innerHTML = `<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`;
    previewTable.innerHTML = "<thead><tr><th>Status</th></tr></thead><tbody><tr><td>CSV could not be imported.</td></tr></tbody>";
    setStatus(importStatus, "Error", "pill failed");
    setStatus(mappingStatus, "Import failed", "status warning");
  }
});

saveImportToCampaign.addEventListener("click", () => {
  if (!lastImportBatch || !importCampaign.value) return;

  const updated = store.attachImportToCampaign(importCampaign.value, lastImportBatch);
  if (!updated) {
    setStatus(campaignImportStatus, "Campaign not found", "status warning");
    return;
  }

  setStatus(campaignImportStatus, `${lastImportBatch.records.length} recipients attached`, "status ready");
  renderCampaignOptions();
  importCampaign.value = updated.id;
});

renderCampaignOptions();
