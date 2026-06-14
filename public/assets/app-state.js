(function () {
  const storageKey = "certificateIssuerState";
  let cachedState = null;
  let cachedSettings = null;

  const seedState = {
    templates: [
      {
        id: "template-cybersecurity",
        name: "Cybersecurity Awareness Certificate",
        status: "approved",
        updatedAt: "2026-05-05T08:00:00.000Z",
        layout: {
          page: { width: 297, height: 210, orientation: "landscape" },
          background: "storage/uploads/backgrounds/cybersecurity-certificate.png",
          backgroundFit: "cover",
          elements: [
            field("recipient_name_en", "Recipient Name", "name_en", 87, 80, "ltr", 22),
            field("recipient_name_ar", "اسم المستلم", "name_ar", 88, 98, "rtl", 24, "bukra_book_slanted"),
            field("program_en", "Program", "program_en", 92, 122, "ltr", 16),
            verificationQr(251, 164)
          ]
        }
      },
      {
        id: "template-digital-transformation",
        name: "Digital Transformation Certificate",
        status: "draft",
        updatedAt: "2026-05-06T09:00:00.000Z",
        layout: {
          page: { width: 297, height: 210, orientation: "landscape" },
          background: "storage/uploads/backgrounds/digital-transformation.png",
          backgroundFit: "contain",
          elements: [
            field("recipient_name_en", "Recipient Name", "name_en", 86, 82, "ltr", 22),
            field("recipient_name_ar", "اسم المستلم", "name_ar", 86, 101, "rtl", 24, "bukra_book_slanted"),
            field("issue_date", "Issue Date", "issue_date", 122, 148, "ltr", 13),
            verificationQr(251, 164)
          ]
        }
      }
    ],
    campaigns: [
      {
        id: "campaign-cybersecurity-may",
        name: "Cybersecurity Awareness May 2026",
        templateId: "template-cybersecurity",
        status: "running",
        scheduledAt: "2026-05-08T18:00",
        windowStartAt: "2026-05-08T18:00",
        windowEndAt: "2026-05-08T22:00",
        randomDelayMinSeconds: 45,
        randomDelayMaxSeconds: 75,
        throttleSeconds: 60,
        smtpProfile: "Institution SMTP",
        emailSubject: "Your certificate for {{program_en}}",
        emailBodyHtml: "<p>Hello {{name_en}},</p><p>Your certificate is attached as a PDF.</p>",
        attachPdf: true,
        recipients: 240,
        rendered: 240,
        sent: 172,
        failed: 3,
        labels: ["unique_identifier", "email", "name_en", "name_ar", "program_en", "program_ar", "issue_date"],
        deliveryEvents: [
          { at: "2026-05-08T18:00:00.000Z", message: "Campaign delivery started." },
          { at: "2026-05-08T18:01:00.000Z", message: "Certificate email 1 sent." }
        ],
        updatedAt: "2026-05-08T18:14:00.000Z"
      },
      {
        id: "campaign-digital-june",
        name: "Digital Transformation June 2026",
        templateId: "template-digital-transformation",
        status: "scheduled",
        scheduledAt: "2026-06-20T09:00",
        windowStartAt: "2026-06-20T09:00",
        windowEndAt: "2026-06-20T12:00",
        randomDelayMinSeconds: 70,
        randomDelayMaxSeconds: 100,
        throttleSeconds: 45,
        smtpProfile: "Institution SMTP",
        emailSubject: "Your digital transformation certificate",
        emailBodyHtml: "<p>Hello {{name_en}},</p><p>Please find your certificate PDF attached.</p>",
        attachPdf: true,
        recipients: 125,
        rendered: 0,
        sent: 0,
        failed: 0,
        labels: ["unique_identifier", "email", "name_en", "name_ar", "issue_date"],
        deliveryEvents: [],
        updatedAt: "2026-06-01T10:00:00.000Z"
      }
    ]
  };

  function field(key, label, source, x, y, direction, fontSize, font = "dejavusans") {
    return {
      key,
      label,
      source,
      x,
      y,
      width: 120,
      height: 14,
      font,
      fontSize,
      align: "center",
      direction,
      color: "#111827"
    };
  }

  function verificationQr(x, y) {
    return {
      type: "verification_qr",
      key: "verification_qr",
      label: "Verification QR",
      x,
      y,
      width: 28,
      height: 28,
      fit: "contain"
    };
  }

  function loadState() {
    if (cachedState) {
      return clone(cachedState);
    }

    try {
      const response = serverRequest("GET", "state");
      const serverState = migrateState(response.state || seedState);
      const localState = readLocalState();
      if (localState && shouldImportLocalState(serverState, localState)) {
        cachedState = migrateState(localState);
        cachedSettings = response.settings || null;
        saveState(cachedState);
        return clone(cachedState);
      }
      cachedState = serverState;
      cachedSettings = response.settings || null;
      return clone(cachedState);
    } catch (error) {
      console.warn("Server campaign state could not be loaded", error);
    }

    try {
      const parsed = readLocalState();
      if (parsed && Array.isArray(parsed.templates) && Array.isArray(parsed.campaigns)) {
        const migrated = migrateState(parsed);
        saveState(migrated);
        return migrated;
      }
    } catch (error) {
      console.warn("Campaign state could not be loaded", error);
    }

    saveState(seedState);
    return JSON.parse(JSON.stringify(seedState));
  }

  function saveState(state) {
    const normalized = migrateState(state);
    try {
      const response = serverRequest("POST", "state", normalized);
      cachedState = migrateState(response.state || normalized);
      cachedSettings = response.settings || cachedSettings;
      return;
    } catch (error) {
      console.warn("Server campaign state could not be saved", error);
    }

    cachedState = clone(normalized);
    localStorage.setItem(storageKey, JSON.stringify(normalized));
  }

  function readLocalState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "null");
      return parsed && Array.isArray(parsed.templates) && Array.isArray(parsed.campaigns) ? parsed : null;
    } catch (error) {
      console.warn("Local campaign state could not be loaded", error);
      return null;
    }
  }

  function shouldImportLocalState(serverState, localState) {
    const serverCampaigns = serverState.campaigns?.length || 0;
    const localCampaigns = localState.campaigns?.length || 0;
    const serverTemplates = serverState.templates?.length || 0;
    const localTemplates = localState.templates?.length || 0;
    return (serverCampaigns === 0 && localCampaigns > 0) || localTemplates > serverTemplates;
  }

  function serverRequest(method, action, payload = {}) {
    if (!window.CertificateIssuerAuth) {
      throw new Error("Authentication client is unavailable.");
    }
    return window.CertificateIssuerAuth.syncApi(method, action, payload);
  }

  async function serverRequestAsync(method, action, payload = {}) {
    if (!window.CertificateIssuerAuth) {
      throw new Error("Authentication client is unavailable.");
    }
    return window.CertificateIssuerAuth.api(method, action, payload);
  }

  function applyServerState(response) {
    if (response.state) {
      cachedState = migrateState(response.state);
      localStorage.setItem(storageKey, JSON.stringify(cachedState));
    }
    if (response.settings) {
      cachedSettings = response.settings;
    }
    return clone(cachedState || seedState);
  }

  async function refreshState() {
    try {
      return applyServerState(await serverRequestAsync("GET", "state"));
    } catch (error) {
      console.warn("Server campaign state could not be refreshed", error);
      return getState();
    }
  }

  async function serverStateAction(action, payload = {}) {
    return applyServerState(await serverRequestAsync("POST", action, payload));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function slug(value) {
    return value.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "item";
  }

  function now() {
    return new Date().toISOString();
  }

  function uniqueId(prefix, name) {
    return `${prefix}-${slug(name)}-${Date.now().toString(36)}`;
  }

  function recipientDisplayName(record) {
    return record.name_en || record.name_ar || record.full_name || record.name || record.email || record.unique_identifier || "Recipient";
  }

  function normalizeRecipientQueueRecord(record, index) {
    const data = record.data && typeof record.data === "object" ? record.data : record;
    const status = ["queued", "rendered", "sent", "failed", "skipped"].includes(record.status) ? record.status : "queued";
    const identifier = data.unique_identifier || data.certificate_id || data.id || data.email || `recipient-${index + 1}`;

    return {
      id: record.id || `recipient-${index + 1}-${slug(String(identifier))}`,
      sequence: Number(record.sequence || index + 1),
      identifier: String(identifier),
      email: data.email || record.email || "",
      nameEn: data.name_en || data.name || record.nameEn || "",
      nameAr: data.name_ar || record.nameAr || "",
      displayName: record.displayName || recipientDisplayName(data),
      status,
      renderedAt: record.renderedAt || "",
      sentAt: record.sentAt || "",
      failedAt: record.failedAt || "",
      failedReason: record.failedReason || "",
      certificatePath: record.certificatePath || "",
      data: { ...data }
    };
  }

  function buildRecipientQueue(records) {
    return (Array.isArray(records) ? records : []).map(normalizeRecipientQueueRecord);
  }

  function queueCounts(queue) {
    const sent = queue.filter((record) => record.status === "sent").length;
    const failed = queue.filter((record) => record.status === "failed").length;
    const rendered = queue.filter((record) => ["rendered", "sent", "failed"].includes(record.status)).length;

    return {
      recipients: queue.length,
      rendered,
      sent,
      failed,
      pending: Math.max(queue.length - sent - failed, 0)
    };
  }

  function getState() {
    return loadState();
  }

  function migrateState(state) {
    return {
      templates: state.templates || [],
      campaigns: (state.campaigns || []).map(normalizeCampaign)
    };
  }

  function normalizeCampaign(campaign) {
    const recipientQueue = Array.isArray(campaign.recipientQueue)
      ? campaign.recipientQueue.map(normalizeRecipientQueueRecord)
      : buildRecipientQueue(campaign.recipientRecords || []);
    const counts = recipientQueue.length > 0 ? queueCounts(recipientQueue) : null;
    const recipients = counts?.recipients ?? Number(campaign.recipients || 0);
    const randomMin = Number(campaign.randomDelayMinSeconds ?? Math.max(30, Number(campaign.throttleSeconds || 60) - 15));
    const randomMax = Number(campaign.randomDelayMaxSeconds ?? Math.max(randomMin, Number(campaign.throttleSeconds || 60) + 15));

    return {
      ...campaign,
      recipients,
      rendered: counts?.rendered ?? Number(campaign.rendered || 0),
      sent: counts?.sent ?? Number(campaign.sent || 0),
      failed: counts?.failed ?? Number(campaign.failed || 0),
      throttleSeconds: Number(campaign.throttleSeconds || 60),
      windowStartAt: campaign.windowStartAt || campaign.scheduledAt || "",
      windowEndAt: campaign.windowEndAt || "",
      randomDelayMinSeconds: randomMin,
      randomDelayMaxSeconds: Math.max(randomMin, randomMax),
      emailSubject: campaign.emailSubject || "Your certificate is ready",
      emailBodyHtml: campaign.emailBodyHtml || "<p>Hello {{name_en}},</p><p>Your certificate is attached as a PDF.</p><p>Verification link: <a href=\"{{verification_url}}\">{{verification_url}}</a></p>",
      attachPdf: true,
      recipientQueue,
      deliveryEvents: Array.isArray(campaign.deliveryEvents) ? campaign.deliveryEvents.slice(-80) : []
    };
  }

  function templates() {
    return getState().templates;
  }

  function campaigns() {
    return getState().campaigns;
  }

  function settings() {
    if (cachedSettings) {
      return clone(cachedSettings);
    }

    try {
      const response = serverRequest("GET", "settings");
      cachedSettings = response.settings || null;
    } catch (error) {
      console.warn("Settings could not be loaded", error);
    }

    return clone(cachedSettings || {
      platform: { name: "Certificate Issuer", publicBaseUrl: window.location.origin },
      smtp: { deliveryMode: "log", profileName: "Institution SMTP", host: "", port: 587, encryption: "tls", username: "", fromAddress: "", fromName: "Certificate Issuer", hasPassword: false }
    });
  }

  function findTemplate(id) {
    return templates().find((template) => template.id === id) || null;
  }

  function findCampaign(id) {
    return campaigns().find((campaign) => campaign.id === id) || null;
  }

  function saveTemplate(template) {
    const state = getState();
    const existingIndex = state.templates.findIndex((item) => item.id === template.id);
    const next = {
      ...template,
      id: template.id || uniqueId("template", template.name),
      updatedAt: now()
    };

    if (existingIndex >= 0) {
      state.templates[existingIndex] = next;
    } else {
      state.templates.push(next);
    }

    saveState(state);
    return next;
  }

  function saveCampaign(campaign) {
    const state = getState();
    const existingIndex = state.campaigns.findIndex((item) => item.id === campaign.id);
    const normalized = normalizeCampaign(campaign);
    const next = {
      ...normalized,
      id: campaign.id || uniqueId("campaign", campaign.name),
      updatedAt: now()
    };

    if (existingIndex >= 0) {
      state.campaigns[existingIndex] = next;
    } else {
      state.campaigns.push(next);
    }

    saveState(state);
    return next;
  }

  function withImportBatch(campaign, importBatch) {
    if (!importBatch) return campaign;
    const recipientQueue = buildRecipientQueue(importBatch.records);

    return {
      ...campaign,
      labels: importBatch.headers,
      recipients: recipientQueue.length,
      rendered: 0,
      sent: 0,
      failed: 0,
      importFileName: importBatch.fileName,
      importedAt: now(),
      sampleRows: importBatch.records.slice(0, 5),
      recipientQueue,
      deliveryEvents: addDeliveryEvent(campaign, `${recipientQueue.length} recipients imported from ${importBatch.fileName}.`)
    };
  }

  function createCampaign(campaign, importBatch = null) {
    return saveCampaign(withImportBatch(campaign, importBatch));
  }

  function updateCampaign(id, updates) {
    const campaign = findCampaign(id);
    if (!campaign) return null;
    return saveCampaign({ ...campaign, ...updates });
  }

  function attachImportToCampaign(id, importBatch) {
    const campaign = findCampaign(id);
    if (!campaign) return null;

    return saveCampaign(withImportBatch(campaign, importBatch));
  }

  function deliveryPlan(campaign) {
    const normalized = normalizeCampaign(campaign);
    const recipients = Math.max(Number(normalized.recipients || 0) - Number(normalized.failed || 0), 0);
    const start = parseLocalDateTime(normalized.windowStartAt || normalized.scheduledAt);
    const end = parseLocalDateTime(normalized.windowEndAt);
    const windowSeconds = start && end && end > start ? Math.floor((end - start) / 1000) : 0;
    const calculatedSpacingSeconds = recipients > 1 && windowSeconds > 0
      ? Math.max(1, Math.floor(windowSeconds / (recipients - 1)))
      : Number(normalized.throttleSeconds || normalized.randomDelayMinSeconds || 60);
    const randomMin = Math.max(0, Number(normalized.randomDelayMinSeconds || calculatedSpacingSeconds));
    const randomMax = Math.max(randomMin, Number(normalized.randomDelayMaxSeconds || calculatedSpacingSeconds));
    const minimumWindowSeconds = recipients > 1 ? randomMin * (recipients - 1) : 0;
    const maximumWindowSeconds = recipients > 1 ? randomMax * (recipients - 1) : 0;

    return {
      recipients,
      start,
      end,
      windowSeconds,
      calculatedSpacingSeconds,
      randomMin,
      randomMax,
      minimumWindowSeconds,
      maximumWindowSeconds,
      fitsMinimumWindow: windowSeconds === 0 || minimumWindowSeconds <= windowSeconds
    };
  }

  function parseLocalDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDuration(seconds) {
    const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
  }

  function startCampaign(id) {
    const campaign = findCampaign(id);
    if (!campaign) return null;
    const updates = { status: "running" };

    if (!campaign.windowStartAt) {
      const current = new Date();
      updates.windowStartAt = toDateTimeLocal(current);
      updates.scheduledAt = updates.windowStartAt;
    }

    return updateCampaign(id, updates);
  }

  async function updateCampaignStatusAsync(id, status) {
    const state = await serverStateAction("campaign-status", { id, status });
    return state.campaigns.find((campaign) => campaign.id === id) || null;
  }

  function manualSendOne(id) {
    try {
      const state = applyServerState(serverRequest("POST", "send-one", { id }));
      return state.campaigns.find((campaign) => campaign.id === id) || null;
    } catch (error) {
      console.warn("Server send failed", error);
      return findCampaign(id);
    }
  }

  async function manualSendOneAsync(id) {
    const state = await serverStateAction("send-one", { id });
    return state.campaigns.find((campaign) => campaign.id === id) || null;
  }

  function completeCampaign(id) {
    try {
      const state = applyServerState(serverRequest("POST", "complete-campaign", { id }));
      return state.campaigns.find((campaign) => campaign.id === id) || null;
    } catch (error) {
      console.warn("Server campaign completion failed", error);
      return findCampaign(id);
    }
  }

  async function completeCampaignAsync(id) {
    const state = await serverStateAction("complete-campaign", { id });
    return state.campaigns.find((campaign) => campaign.id === id) || null;
  }

  function syncDeliveryProgress(referenceDate = new Date()) {
    void referenceDate;
    return getState();
  }

  async function dispatchDueCampaigns() {
    const role = window.CertificateIssuerAuth?.user?.role || "";
    if (!["administrator", "operator"].includes(role)) {
      return getState();
    }

    return serverStateAction("dispatch-due", {});
  }

  function addDeliveryEvent(campaign, message, date = new Date()) {
    return [
      ...(Array.isArray(campaign.deliveryEvents) ? campaign.deliveryEvents : []),
      { at: date.toISOString(), message }
    ].slice(-80);
  }

  function toDateTimeLocal(date) {
    return date.toISOString();
  }

  function campaignTemplate(campaign) {
    return findTemplate(campaign.templateId);
  }

  function statusLabel(status) {
    const labels = {
      draft: "Draft",
      scheduled: "Scheduled",
      running: "Running",
      paused: "Paused",
      completed: "Completed"
    };
    return labels[status] || status;
  }

  function recipientStatusLabel(status) {
    const labels = {
      queued: "Queued",
      rendered: "Rendered",
      sent: "Sent",
      failed: "Failed",
      skipped: "Skipped"
    };
    return labels[status] || status || "Queued";
  }

  function recipientStatusClass(status) {
    if (status === "sent") return "pill sent";
    if (status === "failed") return "pill failed";
    return "pill queued";
  }

  function statusClass(status) {
    if (status === "running" || status === "completed") return "status ready";
    if (status === "paused") return "status warning";
    return "status locked";
  }

  function summary() {
    const state = getState();
    const activeCampaigns = state.campaigns.filter((campaign) => ["scheduled", "running", "paused"].includes(campaign.status));
    const totalRecipients = state.campaigns.reduce((sum, campaign) => sum + Number(campaign.recipients || 0), 0);
    const totalSent = state.campaigns.reduce((sum, campaign) => sum + Number(campaign.sent || 0), 0);
    const totalFailed = state.campaigns.reduce((sum, campaign) => sum + Number(campaign.failed || 0), 0);

    return {
      templates: state.templates.length,
      approvedTemplates: state.templates.filter((template) => template.status === "approved").length,
      campaigns: state.campaigns.length,
      activeCampaigns: activeCampaigns.length,
      totalRecipients,
      queued: Math.max(totalRecipients - totalSent - totalFailed, 0),
      sent: totalSent,
      failed: totalFailed
    };
  }

  window.CertificateIssuerStore = {
    getState,
    refreshState,
    settings,
    templates,
    campaigns,
    findTemplate,
    findCampaign,
    saveTemplate,
    saveCampaign,
    createCampaign,
    updateCampaign,
    attachImportToCampaign,
    buildRecipientQueue,
    deliveryPlan,
    formatDuration,
    startCampaign,
    updateCampaignStatusAsync,
    manualSendOne,
    manualSendOneAsync,
    completeCampaign,
    completeCampaignAsync,
    syncDeliveryProgress,
    dispatchDueCampaigns,
    campaignTemplate,
    statusLabel,
    statusClass,
    recipientStatusLabel,
    recipientStatusClass,
    summary
  };
})();
