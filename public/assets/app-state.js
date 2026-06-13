(function () {
  const storageKey = "certificateIssuerState";

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
            field("program_en", "Program", "program_en", 92, 122, "ltr", 16)
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
            field("issue_date", "Issue Date", "issue_date", 122, 148, "ltr", 13)
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

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "null");
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
    localStorage.setItem(storageKey, JSON.stringify(state));
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
      emailBodyHtml: campaign.emailBodyHtml || "<p>Hello {{name_en}},</p><p>Your certificate is attached as a PDF.</p>",
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

  function manualSendOne(id) {
    const campaign = findCampaign(id);
    if (!campaign) return null;
    const normalized = normalizeCampaign(campaign);
    const plan = deliveryPlan(campaign);
    const recipientQueue = normalized.recipientQueue.slice();
    const nextRecipient = recipientQueue.find((record) => !["sent", "failed", "skipped"].includes(record.status));
    let sent = Math.min(Number(normalized.sent || 0) + 1, plan.recipients);
    let message = `Certificate email ${sent} sent with certificate.pdf attached.`;

    if (nextRecipient) {
      nextRecipient.status = "sent";
      nextRecipient.renderedAt = nextRecipient.renderedAt || new Date().toISOString();
      nextRecipient.sentAt = new Date().toISOString();
      nextRecipient.certificatePath = nextRecipient.certificatePath || certificatePathFor(normalized, nextRecipient);
      const counts = queueCounts(recipientQueue);
      sent = counts.sent;
      message = `Certificate ${nextRecipient.sequence} sent to ${nextRecipient.email || nextRecipient.displayName} with certificate.pdf attached.`;
    }

    const status = sent >= plan.recipients && plan.recipients > 0 ? "completed" : "running";
    const counts = recipientQueue.length > 0 ? queueCounts(recipientQueue) : null;

    return saveCampaign({
      ...normalized,
      status,
      recipientQueue,
      rendered: counts?.rendered ?? normalized.rendered,
      sent: counts?.sent ?? sent,
      failed: counts?.failed ?? normalized.failed,
      completedAt: status === "completed" ? new Date().toISOString() : normalized.completedAt,
      deliveryEvents: addDeliveryEvent(normalized, message)
    });
  }

  function completeCampaign(id) {
    const campaign = findCampaign(id);
    if (!campaign) return null;
    const normalized = normalizeCampaign(campaign);
    const referenceDate = new Date();
    const recipientQueue = normalized.recipientQueue.slice();
    const events = normalized.deliveryEvents.slice();

    if (recipientQueue.length > 0) {
      for (const recipient of recipientQueue) {
        if (["sent", "failed", "skipped"].includes(recipient.status)) continue;
        recipient.status = "sent";
        recipient.renderedAt = recipient.renderedAt || referenceDate.toISOString();
        recipient.sentAt = referenceDate.toISOString();
        recipient.certificatePath = recipient.certificatePath || certificatePathFor(normalized, recipient);
        events.push({
          at: referenceDate.toISOString(),
          message: `Certificate ${recipient.sequence} marked sent to ${recipient.email || recipient.displayName}.`
        });
      }

      const counts = queueCounts(recipientQueue);
      return saveCampaign({
        ...normalized,
        status: "completed",
        recipientQueue,
        rendered: counts.rendered,
        sent: counts.sent,
        failed: counts.failed,
        completedAt: referenceDate.toISOString(),
        deliveryEvents: addDeliveryEvent({ ...normalized, deliveryEvents: events.slice(-79) }, "Campaign delivery completed.", referenceDate)
      });
    }

    return saveCampaign({
      ...normalized,
      status: "completed",
      sent: Number(normalized.recipients || 0),
      rendered: Number(normalized.recipients || 0),
      completedAt: referenceDate.toISOString(),
      deliveryEvents: addDeliveryEvent(normalized, "Campaign delivery completed.", referenceDate)
    });
  }

  function syncDeliveryProgress(referenceDate = new Date()) {
    const state = getState();
    let changed = false;

    state.campaigns = state.campaigns.map((campaign) => {
      const normalized = normalizeCampaign(campaign);
      if (!["scheduled", "running"].includes(normalized.status)) return normalized;
      let campaignChanged = false;

      const plan = deliveryPlan(normalized);
      if (!plan.start || plan.recipients === 0) return normalized;

      const referenceTime = referenceDate.getTime();
      const startTime = plan.start.getTime();
      const endTime = plan.end?.getTime();

      if (normalized.status === "scheduled" && referenceTime >= startTime) {
        normalized.status = "running";
        normalized.deliveryEvents = addDeliveryEvent(normalized, "Campaign delivery window opened.", referenceDate);
        changed = true;
        campaignChanged = true;
      }

      if (referenceTime < startTime || normalized.status !== "running") {
        return normalized;
      }

      const currentSent = Number(normalized.sent || 0);
      let dueSent;

      if (endTime && referenceTime >= endTime) {
        dueSent = plan.recipients;
      } else {
        const elapsedSeconds = Math.floor((referenceTime - startTime) / 1000);
        dueSent = Math.min(plan.recipients, Math.floor(elapsedSeconds / plan.calculatedSpacingSeconds) + 1);
      }

      if (dueSent > currentSent) {
        const events = normalized.deliveryEvents.slice();
        const recipientQueue = normalized.recipientQueue.slice();
        let sentIndex = currentSent + 1;

        if (recipientQueue.length > 0) {
          for (const recipient of recipientQueue) {
            if (sentIndex > dueSent) break;
            if (["sent", "failed", "skipped"].includes(recipient.status)) continue;

            recipient.status = "sent";
            recipient.renderedAt = recipient.renderedAt || referenceDate.toISOString();
            recipient.sentAt = referenceDate.toISOString();
            recipient.certificatePath = recipient.certificatePath || certificatePathFor(normalized, recipient);
            events.push({
              at: referenceDate.toISOString(),
              message: `Certificate ${recipient.sequence} sent to ${recipient.email || recipient.displayName} with certificate.pdf attached.`
            });
            sentIndex += 1;
          }

          const counts = queueCounts(recipientQueue);
          normalized.recipientQueue = recipientQueue;
          normalized.rendered = counts.rendered;
          normalized.sent = counts.sent;
          normalized.failed = counts.failed;
        } else {
          for (; sentIndex <= dueSent; sentIndex += 1) {
            events.push({
              at: referenceDate.toISOString(),
              message: `Certificate email ${sentIndex} sent with certificate.pdf attached.`
            });
          }
          normalized.sent = dueSent;
        }

        normalized.deliveryEvents = events.slice(-80);
        changed = true;
        campaignChanged = true;
      }

      if (normalized.sent >= plan.recipients && plan.recipients > 0) {
        normalized.status = "completed";
        normalized.completedAt = referenceDate.toISOString();
        normalized.deliveryEvents = addDeliveryEvent(normalized, "Campaign delivery completed.", referenceDate);
        changed = true;
        campaignChanged = true;
      }

      if (campaignChanged) {
        normalized.updatedAt = referenceDate.toISOString();
      }

      return normalized;
    });

    if (changed) {
      saveState(state);
    }

    return state;
  }

  function addDeliveryEvent(campaign, message, date = new Date()) {
    return [
      ...(Array.isArray(campaign.deliveryEvents) ? campaign.deliveryEvents : []),
      { at: date.toISOString(), message }
    ].slice(-80);
  }

  function certificatePathFor(campaign, recipient) {
    return `storage/certificates/${campaign.id}/${slug(recipient.identifier || recipient.email || recipient.id)}.pdf`;
  }

  function toDateTimeLocal(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
    manualSendOne,
    completeCampaign,
    syncDeliveryProgress,
    campaignTemplate,
    statusLabel,
    statusClass,
    recipientStatusLabel,
    recipientStatusClass,
    summary
  };
})();
