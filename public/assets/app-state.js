(function () {
  const storageKey = "certificateIssuerState";
  let cachedState = null;
  let cachedSettings = null;
  const delayUnits = Object.freeze({
    seconds: { label: "Seconds", multiplier: 1 },
    hundreds_seconds: { label: "Hundreds of seconds", multiplier: 100 },
    minutes: { label: "Minutes", multiplier: 60 },
    tens_minutes: { label: "Tens of minutes", multiplier: 600 },
    hours: { label: "Hours", multiplier: 3600 }
  });
  const terminalRecipientStatuses = Object.freeze(["sent", "failed", "skipped"]);

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
        randomDelayUnit: "seconds",
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
        randomDelayUnit: "seconds",
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
      skippedAt: record.skippedAt || "",
      certificatePath: record.certificatePath || "",
      verificationTokenHash: record.verificationTokenHash || "",
      verificationIssuedAt: record.verificationIssuedAt || "",
      verificationUrl: record.verificationUrl || "",
      data: { ...data }
    };
  }

  function buildRecipientQueue(records) {
    return (Array.isArray(records) ? records : []).map(normalizeRecipientQueueRecord);
  }

  function queueCounts(queue) {
    const sent = queue.filter((record) => record.status === "sent").length;
    const failed = queue.filter((record) => record.status === "failed").length;
    const skipped = queue.filter((record) => record.status === "skipped").length;
    const rendered = queue.filter((record) => ["rendered", "sent", "failed"].includes(record.status)).length;
    const pending = queue.filter((record) => !terminalRecipientStatuses.includes(record.status || "queued")).length;

    return {
      recipients: queue.length,
      rendered,
      sent,
      failed,
      skipped,
      pending
    };
  }

  function campaignCounts(campaign) {
    const queue = Array.isArray(campaign?.recipientQueue) ? campaign.recipientQueue : [];
    if (queue.length > 0) {
      return queueCounts(queue);
    }

    const recipients = Number(campaign?.recipients || 0);
    const sent = Number(campaign?.sent || 0);
    const failed = Number(campaign?.failed || 0);
    const skipped = Number(campaign?.skipped || 0);

    return {
      recipients,
      rendered: Number(campaign?.rendered || 0),
      sent,
      failed,
      skipped,
      pending: Math.max(recipients - sent - failed - skipped, 0)
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
    const randomUnit = normalizeDelayUnit(campaign.randomDelayUnit);
    const randomMin = Number(campaign.randomDelayMinSeconds ?? Math.max(30, Number(campaign.throttleSeconds || 60) - 15));
    const randomMax = Number(campaign.randomDelayMaxSeconds ?? Math.max(randomMin, Number(campaign.throttleSeconds || 60) + 15));

    return {
      ...campaign,
      recipients,
      rendered: counts?.rendered ?? Number(campaign.rendered || 0),
      sent: counts?.sent ?? Number(campaign.sent || 0),
      failed: counts?.failed ?? Number(campaign.failed || 0),
      skipped: counts?.skipped ?? Number(campaign.skipped || 0),
      throttleSeconds: Number(campaign.throttleSeconds || 60),
      windowStartAt: campaign.windowStartAt || campaign.scheduledAt || "",
      windowEndAt: campaign.windowEndAt || "",
      windowExpiredAt: campaign.windowExpiredAt || "",
      randomDelayUnit: randomUnit,
      randomDelayMinSeconds: randomMin,
      randomDelayMaxSeconds: Math.max(randomMin, randomMax),
      templateSource: campaign.templateSource || "saved_template",
      templateFileName: campaign.templateFileName || "",
      campaignTemplateName: campaign.campaignTemplateName || "",
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

  function reusableTemplates() {
    return templates().filter((template) => !template.campaignOwned);
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
      smtp: {
        deliveryMode: "log",
        profileName: "Institution SMTP",
        host: "",
        port: 587,
        encryption: "tls",
        username: "",
        fromAddress: "",
        fromName: "Certificate Issuer",
        hasPassword: false,
        graphTenantId: "",
        graphClientId: "",
        graphSender: "",
        hasGraphClientSecret: false
      }
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
      status: importBatch.status || campaign.status,
      labels: importBatch.headers,
      recipients: recipientQueue.length,
      rendered: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      importFileName: importBatch.fileName,
      importedAt: now(),
      completedAt: "",
      nextSendAfterAt: "",
      sampleRows: importBatch.records.slice(0, 5),
      recipientQueue,
      deliveryEvents: addDeliveryEvent(campaign, importBatch.message || `${recipientQueue.length} recipients imported from ${importBatch.fileName}.`)
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

  function deleteCampaign(id) {
    const state = getState();
    const campaign = state.campaigns.find((item) => item.id === id);
    if (!campaign) return null;

    state.campaigns = state.campaigns.filter((item) => item.id !== id);
    saveState(state);
    return campaign;
  }

  function updateCampaignSchedule(id, updates) {
    const campaign = findCampaign(id);
    if (!campaign) return null;

    return updateCampaign(id, {
      ...updates,
      deliveryEvents: addDeliveryEvent(campaign, "Campaign schedule and send buffer updated.")
    });
  }

  function retryRecipient(campaignId, recipientId) {
    return updateCampaignRecipient(campaignId, recipientId, "retry");
  }

  function skipRecipient(campaignId, recipientId) {
    return updateCampaignRecipient(campaignId, recipientId, "skip");
  }

  function removeRecipient(campaignId, recipientId) {
    return updateCampaignRecipient(campaignId, recipientId, "remove");
  }

  function updateCampaignRecipient(campaignId, recipientId, action) {
    const campaign = findCampaign(campaignId);
    if (!campaign) return null;

    let changedRecipient = null;
    let queue = Array.isArray(campaign.recipientQueue) ? campaign.recipientQueue : [];
    const currentStatus = (queue.find((record) => record.id === recipientId)?.status || "queued").toLowerCase();

    if (action === "remove") {
      changedRecipient = queue.find((record) => record.id === recipientId) || null;
      queue = queue.filter((record) => record.id !== recipientId);
    } else {
      queue = queue.map((record) => {
        if (record.id !== recipientId) return record;
        changedRecipient = record;
        if (action === "retry") return resetRecipientForSending(record);
        if (action === "skip") {
          return {
            ...record,
            status: "skipped",
            renderedAt: "",
            sentAt: "",
            failedAt: "",
            failedReason: "",
            skippedAt: now(),
            certificatePath: "",
            verificationTokenHash: "",
            verificationIssuedAt: "",
            verificationUrl: ""
          };
        }
        return record;
      });
    }

    if (!changedRecipient) return campaign;

    const counts = queueCounts(queue);
    const message = recipientActionMessage(action, changedRecipient, currentStatus);
    const nextStatus = counts.pending === 0 && queue.length > 0 && ["running", "scheduled"].includes(campaign.status)
      ? "paused"
      : campaign.status;

    return saveCampaign({
      ...campaign,
      ...counts,
      status: nextStatus,
      recipientQueue: queue,
      nextSendAfterAt: counts.pending === 0 ? "" : (campaign.nextSendAfterAt || ""),
      completedAt: nextStatus === "completed" ? now() : "",
      deliveryEvents: addDeliveryEvent(campaign, message)
    });
  }

  function restartCampaign(campaignId) {
    const campaign = findCampaign(campaignId);
    if (!campaign) return null;
    const queue = (campaign.recipientQueue || []).map(resetRecipientForSending);
    const counts = queueCounts(queue);
    const startAt = toDateTimeLocal(new Date());

    return saveCampaign({
      ...campaign,
      ...counts,
      status: "paused",
      scheduledAt: startAt,
      windowStartAt: startAt,
      windowEndAt: "",
      windowExpiredAt: "",
      nextSendAfterAt: "",
      completedAt: "",
      recipientQueue: queue,
      deliveryEvents: addDeliveryEvent(campaign, "Campaign queue reset. Start the campaign when the schedule and speed are ready.")
    });
  }

  function reuseCampaign(campaignId) {
    const source = findCampaign(campaignId);
    if (!source) return null;
    const copyName = nextCampaignCopyName(source.name || "Campaign");
    const queue = (source.recipientQueue || []).map(resetRecipientForSending);
    const counts = queueCounts(queue);

    return saveCampaign({
      ...source,
      ...counts,
      id: uniqueId("campaign", copyName),
      name: copyName,
      status: "draft",
      scheduledAt: "",
      windowStartAt: "",
      windowEndAt: "",
      windowExpiredAt: "",
      nextSendAfterAt: "",
      completedAt: "",
      recipientQueue: queue,
      deliveryEvents: [
        { at: now(), message: `Reusable campaign created from ${source.name || "campaign"}.` }
      ]
    });
  }

  function attachImportToCampaign(id, importBatch) {
    const campaign = findCampaign(id);
    if (!campaign) return null;

    return saveCampaign(withImportBatch(campaign, importBatch));
  }

  function deliveryPlan(campaign) {
    const normalized = normalizeCampaign(campaign);
    const counts = campaignCounts(normalized);
    const recipients = Math.max(Number(normalized.recipients || counts.recipients || 0), 0);
    const pendingRecipients = counts.pending;
    const start = parseLocalDateTime(normalized.windowStartAt || normalized.scheduledAt);
    const end = parseLocalDateTime(normalized.windowEndAt);
    const windowSeconds = start && end && end > start ? Math.floor((end - start) / 1000) : 0;
    const randomMin = Math.max(0, Number(normalized.randomDelayMinSeconds ?? normalized.throttleSeconds ?? 60));
    const randomMax = Math.max(randomMin, Number(normalized.randomDelayMaxSeconds ?? randomMin));
    const randomAverageSeconds = Math.max(0, Math.round((randomMin + randomMax) / 2));
    const spacingRecipients = pendingRecipients > 0 ? pendingRecipients : recipients;
    const calculatedSpacingSeconds = spacingRecipients > 1 && windowSeconds > 0
      ? Math.max(1, Math.floor(windowSeconds / (spacingRecipients - 1)))
      : randomAverageSeconds;
    const minimumWindowSeconds = spacingRecipients > 1 ? randomMin * (spacingRecipients - 1) : 0;
    const maximumWindowSeconds = spacingRecipients > 1 ? randomMax * (spacingRecipients - 1) : 0;
    const estimatedDurationSeconds = spacingRecipients > 1 ? randomAverageSeconds * (spacingRecipients - 1) : 0;

    return {
      recipients,
      pendingRecipients,
      start,
      end,
      windowSeconds,
      calculatedSpacingSeconds,
      randomMin,
      randomMax,
      randomAverageSeconds,
      minimumWindowSeconds,
      maximumWindowSeconds,
      estimatedDurationSeconds,
      continuesUntilComplete: !end,
      fitsMinimumWindow: !end || windowSeconds === 0 || minimumWindowSeconds <= windowSeconds
    };
  }

  function campaignReadiness(campaign) {
    const normalized = normalizeCampaign(campaign || {});
    const template = campaignTemplate(normalized);
    const counts = campaignCounts(normalized);
    const labels = (normalized.labels || []).map((label) => String(label || "").trim().toLowerCase());
    const smtp = settings().smtp || {};
    const deliveryMode = smtp.deliveryMode || "log";
    const checks = [];

    checks.push(readinessCheck(
      "template",
      "Certificate template",
      template ? "pass" : "fail",
      template ? (template.name || "Template selected.") : "Select or upload a certificate template."
    ));

    const elements = Array.isArray(template?.layout?.elements) ? template.layout.elements : [];
    checks.push(readinessCheck(
      "template_items",
      "Certificate fields",
      template && elements.length > 0 ? "pass" : "warn",
      template && elements.length > 0
        ? `${elements.length} certificate items are positioned.`
        : "The template has no positioned text, image, or QR items yet."
    ));

    checks.push(readinessCheck(
      "recipient_queue",
      "Recipient CSV",
      counts.recipients > 0 ? "pass" : "fail",
      counts.recipients > 0 ? `${counts.recipients} recipients imported.` : "Upload a CSV file for this campaign."
    ));
    checks.push(readinessCheck(
      "pending_recipients",
      "Queued recipients",
      counts.pending > 0 ? "pass" : "fail",
      counts.pending > 0 ? `${counts.pending} recipients are ready to send.` : "There are no queued recipients left to send."
    ));

    [
      ["unique_identifier", "Unique identifier", "warn"],
      ["email", "Email", "fail"],
      ["name_en", "English name", "warn"]
    ].forEach(([key, label, missingStatus]) => {
      const present = labels.includes(key);
      checks.push(readinessCheck(
        `label_${key}`,
        `${label} label`,
        present ? "pass" : missingStatus,
        present ? `${key} is mapped from the campaign CSV.` : `Add a ${key} column to the campaign CSV.`
      ));
    });

    const invalidEmails = (normalized.recipientQueue || [])
      .filter((recipient) => !terminalRecipientStatuses.includes(recipient.status || "queued"))
      .filter((recipient) => !isValidEmail(recipient.email || recipient.data?.email || ""))
      .length;
    checks.push(readinessCheck(
      "recipient_emails",
      "Recipient email addresses",
      invalidEmails === 0 ? "pass" : (deliveryMode === "log" ? "warn" : "fail"),
      invalidEmails === 0
        ? "Queued recipients have usable email addresses."
        : `${invalidEmails} queued recipients need a valid email address.`
    ));

    const emailBodyText = stripHtml(normalized.emailBodyHtml).trim();
    checks.push(readinessCheck(
      "email_subject",
      "Email subject",
      String(normalized.emailSubject || "").trim() ? "pass" : "fail",
      String(normalized.emailSubject || "").trim() ? "Subject is configured." : "Add a subject before sending."
    ));
    checks.push(readinessCheck(
      "email_body",
      "Email body",
      emailBodyText ? "pass" : "fail",
      emailBodyText ? "Body content is configured." : "Add email body content before sending."
    ));
    checks.push(readinessCheck(
      "verification_link",
      "Verification link",
      String(normalized.emailBodyHtml || "").includes("verification_url") ? "pass" : "warn",
      String(normalized.emailBodyHtml || "").includes("verification_url")
        ? "The message includes the certificate verification link."
        : "The sending engine will append a verification link, but it is better to place it in the message body."
    ));

    const plan = deliveryPlan(normalized);
    checks.push(readinessCheck(
      "send_buffer",
      "Send buffer",
      plan.randomMax >= plan.randomMin ? "pass" : "fail",
      plan.randomMax >= plan.randomMin ? "Random delay range is valid." : "Maximum random delay must be greater than or equal to the minimum."
    ));
    if (plan.start && plan.end) {
      checks.push(readinessCheck(
        "delivery_window",
        "Delivery window",
        plan.end > plan.start ? "pass" : "fail",
        plan.end > plan.start ? "End time is after the start time." : "End time must be after the start time, or leave it blank."
      ));
      checks.push(readinessCheck(
        "window_capacity",
        "Window capacity",
        plan.fitsMinimumWindow ? "pass" : "warn",
        plan.fitsMinimumWindow
          ? "The selected window can fit the minimum send buffer."
          : "The delivery window is shorter than the minimum buffer; leave the end time blank or extend the window."
      ));
    } else {
      checks.push(readinessCheck(
        "delivery_window",
        "Delivery window",
        "pass",
        plan.end ? "Start time will be set when the campaign starts." : "Open-ended delivery will continue until the queue is complete."
      ));
    }

    checks.push(...deliveryReadinessChecks(smtp));
    const summary = summarizeReadiness(checks);

    return {
      ready: summary.fail === 0,
      summary,
      checks,
      blockingMessage: readinessFailureMessage(checks)
    };
  }

  function readinessCheck(key, label, status, detail) {
    return {
      key,
      label,
      status: ["pass", "warn", "fail"].includes(status) ? status : "warn",
      detail
    };
  }

  function summarizeReadiness(checks) {
    return checks.reduce((summary, check) => {
      const status = ["pass", "warn", "fail"].includes(check.status) ? check.status : "warn";
      summary[status] += 1;
      return summary;
    }, { pass: 0, warn: 0, fail: 0 });
  }

  function readinessFailureMessage(checks) {
    const failures = checks.filter((check) => check.status === "fail").slice(0, 3).map((check) => check.label);
    return failures.length > 0 ? `Campaign is not ready to send: ${failures.join(", ")}.` : "";
  }

  function deliveryReadinessChecks(smtp) {
    const mode = smtp.deliveryMode || "log";
    if (mode === "graph") {
      return [
        readinessCheck("delivery_mode", "Delivery mode", "pass", "Microsoft Graph delivery is selected."),
        readinessCheck("graph_tenant", "Graph tenant", smtp.graphTenantId ? "pass" : "fail", smtp.graphTenantId ? "Tenant is configured." : "Set the tenant ID or tenant domain."),
        readinessCheck("graph_client", "Graph client ID", smtp.graphClientId ? "pass" : "fail", smtp.graphClientId ? "Client ID is configured." : "Set the application client ID."),
        readinessCheck("graph_secret", "Graph client secret", smtp.hasGraphClientSecret ? "pass" : "fail", smtp.hasGraphClientSecret ? "Encrypted client secret is saved." : "Set and save a client secret."),
        readinessCheck("graph_sender", "Graph sender mailbox", isValidEmail(smtp.graphSender || "") ? "pass" : "fail", isValidEmail(smtp.graphSender || "") ? "Sender mailbox is valid." : "Set a valid sender mailbox.")
      ];
    }

    if (mode === "smtp") {
      return [
        readinessCheck("delivery_mode", "Delivery mode", "pass", "SMTP delivery is selected."),
        readinessCheck("smtp_host", "SMTP host", smtp.host ? "pass" : "fail", smtp.host || "Set the SMTP host."),
        readinessCheck("smtp_username", "SMTP username", smtp.username ? "pass" : "fail", smtp.username ? "Username is configured." : "Set the SMTP username."),
        readinessCheck("smtp_password", "SMTP password", smtp.hasPassword ? "pass" : "fail", smtp.hasPassword ? "Encrypted password is saved." : "Set and save the SMTP password."),
        readinessCheck("smtp_from", "From address", isValidEmail(smtp.fromAddress || "") ? "pass" : "fail", isValidEmail(smtp.fromAddress || "") ? "Sender address is valid." : "Set a valid From address.")
      ];
    }

    return [
      readinessCheck("delivery_mode", "Delivery mode", "warn", "Local log mode is active. Certificates will render, but emails will not be delivered to recipients.")
    ];
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function stripHtml(value) {
    return String(value || "").replace(/<[^>]*>/g, " ");
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

  function delayUnitOptions() {
    return Object.entries(delayUnits).map(([value, config]) => ({ value, label: config.label, multiplier: config.multiplier }));
  }

  function normalizeDelayUnit(value) {
    return Object.prototype.hasOwnProperty.call(delayUnits, value) ? value : "seconds";
  }

  function delayUnitMultiplier(value) {
    return delayUnits[normalizeDelayUnit(value)].multiplier;
  }

  function delayAmountToSeconds(value, unit) {
    return Math.max(0, Math.round(Number(value || 0) * delayUnitMultiplier(unit)));
  }

  function delaySecondsToAmount(seconds, unit) {
    const amount = Math.max(0, Number(seconds || 0)) / delayUnitMultiplier(unit);
    return Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
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

  async function previewCampaignRecipientAsync(campaignId, recipientId) {
    const response = await serverRequestAsync("POST", "campaign-preview", { campaignId, recipientId });
    return response.preview || null;
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

  function resetRecipientForSending(record) {
    return {
      ...record,
      status: "queued",
      renderedAt: "",
      sentAt: "",
      failedAt: "",
      failedReason: "",
      skippedAt: "",
      certificatePath: "",
      verificationTokenHash: "",
      verificationIssuedAt: "",
      verificationUrl: ""
    };
  }

  function recipientActionMessage(action, recipient, previousStatus) {
    const name = recipient.displayName || recipient.email || recipient.identifier || "recipient";
    if (action === "remove") return `Removed ${name} from the campaign queue.`;
    if (action === "skip") return `Skipped ${name}; delivery will continue with the remaining recipients.`;
    if (previousStatus === "sent") return `Queued ${name} for resending.`;
    return `Queued ${name} for retry.`;
  }

  function nextCampaignCopyName(name) {
    const existingNames = new Set(campaigns().map((campaign) => String(campaign.name || "").toLowerCase()));
    let candidate = `${name} copy`;
    let count = 2;

    while (existingNames.has(candidate.toLowerCase())) {
      candidate = `${name} copy ${count}`;
      count += 1;
    }

    return candidate;
  }

  function campaignTemplate(campaign) {
    if (campaign && campaign.campaignTemplateLayout && typeof campaign.campaignTemplateLayout === "object") {
      return {
        id: campaign.templateId || "",
        name: campaign.campaignTemplateName || campaign.templateFileName || "Campaign template",
        status: "approved",
        campaignOwned: true,
        layout: campaign.campaignTemplateLayout
      };
    }

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
    if (status === "skipped") return "pill skipped";
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
    const totalSkipped = state.campaigns.reduce((sum, campaign) => sum + Number(campaign.skipped || 0), 0);

    return {
      templates: state.templates.filter((template) => !template.campaignOwned).length,
      approvedTemplates: state.templates.filter((template) => !template.campaignOwned && template.status === "approved").length,
      campaigns: state.campaigns.length,
      activeCampaigns: activeCampaigns.length,
      totalRecipients,
      queued: Math.max(totalRecipients - totalSent - totalFailed - totalSkipped, 0),
      sent: totalSent,
      failed: totalFailed,
      skipped: totalSkipped
    };
  }

  window.CertificateIssuerStore = {
    getState,
    refreshState,
    settings,
    templates,
    reusableTemplates,
    campaigns,
    findTemplate,
    findCampaign,
    saveTemplate,
    saveCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    updateCampaignSchedule,
    campaignCounts,
    attachImportToCampaign,
    retryRecipient,
    skipRecipient,
    removeRecipient,
    restartCampaign,
    reuseCampaign,
    buildRecipientQueue,
    deliveryPlan,
    campaignReadiness,
    formatDuration,
    delayUnitOptions,
    normalizeDelayUnit,
    delayAmountToSeconds,
    delaySecondsToAmount,
    startCampaign,
    updateCampaignStatusAsync,
    manualSendOne,
    manualSendOneAsync,
    previewCampaignRecipientAsync,
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
