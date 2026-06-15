const queueStore = window.CertificateIssuerStore;
const queueCampaignList = document.querySelector("#queueCampaignList");
const queueWorkerStatus = document.querySelector("#queueWorkerStatus");
const processDueQueue = document.querySelector("#processDueQueue");
const refreshQueue = document.querySelector("#refreshQueue");
const toggleAutoQueue = document.querySelector("#toggleAutoQueue");
const queueSearch = document.querySelector("#queueSearch");
const queueStatusFilter = document.querySelector("#queueStatusFilter");
const queueReadinessFilter = document.querySelector("#queueReadinessFilter");
let queueRefreshInFlight = false;
let queueActionInFlight = false;
let queueWorkerInFlight = false;
let queueTickInFlight = false;
let autoQueueEnabled = true;
const queueRecipientFilters = new Map();

function renderQueue() {
  const summary = queueStore.summary();
  const allCampaigns = queueStore.campaigns();
  const campaigns = filteredQueueCampaigns(allCampaigns);
  const deliverableCampaigns = allCampaigns.filter((campaign) => ["scheduled", "running"].includes(campaign.status) && !isWindowExpired(campaign) && queueStore.campaignReadiness(campaign).ready);
  const expiredCampaigns = campaigns.filter((campaign) => ["scheduled", "running"].includes(campaign.status) && isWindowExpired(campaign));
  const activePlans = allCampaigns
    .filter((campaign) => ["scheduled", "running"].includes(campaign.status))
    .map((campaign) => queueStore.deliveryPlan(campaign));
  const slowestSpacing = activePlans.reduce((max, plan) => Math.max(max, plan.calculatedSpacingSeconds), 0);

  document.querySelector("#queuePending").textContent = String(summary.queued);
  document.querySelector("#queueSent").textContent = String(summary.sent);
  document.querySelector("#queueFailed").textContent = String(summary.failed);
  document.querySelector("#queueSpacing").textContent = queueStore.formatDuration(slowestSpacing);
  queueWorkerStatus.textContent = expiredCampaigns.length > 0
    ? `${deliverableCampaigns.length} active lanes, ${expiredCampaigns.length} ended windows`
    : `${deliverableCampaigns.length} active lanes, ${campaigns.length} shown`;
  queueWorkerStatus.className = expiredCampaigns.length > 0 ? "status warning" : "status ready";
  renderSmtpProfile();

  queueCampaignList.innerHTML = campaigns.length > 0
    ? campaigns.map((campaign) => renderCampaignQueue(campaign)).join("")
    : '<div class="empty-state">No queue lanes match the current filters.</div>';
}

function setQueueStatus(text, state = "ready") {
  queueWorkerStatus.textContent = text;
  queueWorkerStatus.className = `status ${state}`;
}

function renderAutoQueueButton() {
  toggleAutoQueue.textContent = autoQueueEnabled ? "Auto queue on" : "Auto queue off";
  toggleAutoQueue.className = autoQueueEnabled ? "primary" : "";
}

function renderSmtpProfile() {
  const smtp = queueStore.settings().smtp || {};
  if (smtp.deliveryMode === "graph") {
    document.querySelector("#smtpMode").textContent = "Microsoft Graph sending";
    document.querySelector("#smtpHost").textContent = smtp.graphTenantId ? `Tenant: ${smtp.graphTenantId}` : "Tenant not configured";
    document.querySelector("#smtpEncryption").textContent = "HTTPS";
    document.querySelector("#smtpCredential").textContent = smtp.hasGraphClientSecret ? "Encrypted client secret saved" : "No client secret saved";
    document.querySelector("#smtpFrom").textContent = smtp.graphSender || "Not configured";
    return;
  }

  document.querySelector("#smtpMode").textContent = smtp.deliveryMode === "smtp" ? "SMTP sending" : "Render and log locally";
  document.querySelector("#smtpHost").textContent = smtp.host ? `${smtp.host}:${smtp.port || 587}` : "Not configured";
  document.querySelector("#smtpEncryption").textContent = (smtp.encryption || "tls").toUpperCase();
  document.querySelector("#smtpCredential").textContent = smtp.hasPassword ? "Encrypted password saved" : "No password saved";
  document.querySelector("#smtpFrom").textContent = smtp.fromAddress || "Not configured";
}

function renderCampaignQueue(campaign) {
  const template = queueStore.campaignTemplate(campaign);
  const plan = queueStore.deliveryPlan(campaign);
  const recipients = Number(campaign.recipients || 0);
  const counts = queueStore.campaignCounts(campaign);
  const readiness = queueStore.campaignReadiness(campaign);
  const sent = counts.sent;
  const failed = counts.failed;
  const skipped = counts.skipped;
  const pending = counts.pending;
  const progress = recipients > 0 ? Math.round(((sent + failed + skipped) / recipients) * 100) : 0;
  const expired = isWindowExpired(campaign, plan);
  const planClass = !expired && plan.fitsMinimumWindow ? "status ready" : "status warning";
  const planLabel = plan.continuesUntilComplete
    ? "Open delivery window continues until complete."
    : expired
    ? "Delivery window ended. Restart the window or extend the end time to continue sending."
    : (plan.fitsMinimumWindow ? "Buffer fits delivery window" : "Window too short for minimum buffer");
  const events = (campaign.deliveryEvents || []).slice(-4).reverse();
  const recipientFilter = queueRecipientFilters.get(campaign.id) || "";
  const allRecipients = campaign.recipientQueue || [];
  const matchingRecipients = filterRecipients(allRecipients, recipientFilter);
  const recipientRows = matchingRecipients.slice(0, 25);
  const hiddenRecipientCount = Math.max(0, matchingRecipients.length - recipientRows.length);
  const randomUnit = queueStore.normalizeDelayUnit(campaign.randomDelayUnit);
  const randomMinAmount = queueStore.delaySecondsToAmount(campaign.randomDelayMinSeconds, randomUnit);
  const randomMaxAmount = queueStore.delaySecondsToAmount(campaign.randomDelayMaxSeconds, randomUnit);
  const startDisabled = !readiness.ready ? disabledTitle(readiness.blockingMessage) : "";
  const sendDisabled = !readiness.ready ? disabledTitle(readiness.blockingMessage) : "";

  return `
    <article class="campaign-card">
      <div class="panel-header">
        <div>
          <h3>${escapeHtml(campaign.name)}</h3>
          <p>${escapeHtml(template?.name || "No template")}</p>
        </div>
        <div class="campaign-header-actions">
          <span class="${queueStore.statusClass(campaign.status)}">${queueStore.statusLabel(campaign.status)}</span>
          <span class="${readinessStatusClass(readiness)}">${escapeHtml(readinessLabel(readiness))}</span>
        </div>
      </div>
      <div class="progress-bar" aria-label="Campaign progress"><span style="width: ${progress}%"></span></div>
      <dl class="detail-list compact-details">
        <div><dt>CSV file</dt><dd>${escapeHtml(campaign.importFileName || "No CSV attached")}</dd></div>
        <div><dt>Labels</dt><dd>${escapeHtml((campaign.labels || []).slice(0, 4).join(", ") || "None")}${(campaign.labels || []).length > 4 ? ` +${(campaign.labels || []).length - 4}` : ""}</dd></div>
        <div><dt>Pending</dt><dd>${pending}</dd></div>
        <div><dt>Sent</dt><dd>${sent}</dd></div>
        <div><dt>Failed</dt><dd>${failed}</dd></div>
        <div><dt>Skipped</dt><dd>${skipped}</dd></div>
        <div><dt>Next send</dt><dd>${escapeHtml(nextSendLabel(campaign, plan))}</dd></div>
        <div><dt>Window</dt><dd>${escapeHtml(windowLabel(campaign))}</dd></div>
        <div><dt>Avg spacing</dt><dd>${queueStore.formatDuration(plan.calculatedSpacingSeconds)}</dd></div>
        <div><dt>Random buffer</dt><dd>${queueStore.formatDuration(plan.randomMin)}-${queueStore.formatDuration(plan.randomMax)}</dd></div>
        <div><dt>SMTP</dt><dd>${escapeHtml(campaign.smtpProfile || "Institution SMTP")}</dd></div>
        <div><dt>Subject</dt><dd>${escapeHtml(campaign.emailSubject || "Your certificate is ready")}</dd></div>
        <div><dt>Attachment</dt><dd><span class="pill sent">certificate.pdf</span></dd></div>
      </dl>
      <span class="${planClass}">${escapeHtml(planLabel)}</span>
      <div class="readiness-panel compact-readiness">
        <div>
          <strong>Queue readiness</strong>
          <span class="${readinessStatusClass(readiness)}">${escapeHtml(readinessLabel(readiness))}</span>
        </div>
        ${readinessListMarkup(readiness, 5)}
      </div>
      <div class="campaign-assets">
        <h4>Schedule and buffer</h4>
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
      <div class="email-preview">
        <strong>Email body</strong>
        <pre>${escapeHtml(campaign.emailBodyHtml || "<p>Your certificate is attached as a PDF.</p>")}</pre>
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
          <thead><tr><th>#</th><th>Recipient</th><th>Email</th><th>Status</th><th>Sent at</th><th>Actions</th></tr></thead>
          <tbody>
            ${recipientRows.map((recipient) => `
              <tr>
                <td>${Number(recipient.sequence || 0)}</td>
                <td>${escapeHtml(recipient.displayName)}</td>
                <td>${escapeHtml(recipient.email || "-")}</td>
                <td><span class="${queueStore.recipientStatusClass(recipient.status)}">${queueStore.recipientStatusLabel(recipient.status)}</span></td>
                <td>${escapeHtml(shortTime(recipient.sentAt) || "-")}</td>
                <td>${recipientActionsMarkup(campaign.id, recipient)}</td>
              </tr>
            `).join("") || "<tr><td colspan=\"6\">No recipient CSV attached yet.</td></tr>"}
          </tbody>
        </table>
      </div>
      ${hiddenRecipientCount > 0 ? `<p class="subtle-note">Showing first ${recipientRows.length} matching recipients. Use the recipient filter to narrow larger lists.</p>` : ""}
      <div class="event-list">
        ${events.map((event) => `<div><strong>${escapeHtml(shortTime(event.at))}</strong><span>${escapeHtml(event.message)}</span></div>`).join("") || "<div><span>No sends recorded yet.</span></div>"}
      </div>
      <div class="action-row">
        <button type="button" data-action="running" data-id="${escapeHtml(campaign.id)}" ${startDisabled}>${expired && pending > 0 ? "Restart window" : "Start"}</button>
        <button type="button" data-action="paused" data-id="${escapeHtml(campaign.id)}">Stop sending</button>
        <button type="button" data-action="send-one" data-id="${escapeHtml(campaign.id)}" ${sendDisabled}>Send one now</button>
        <button type="button" data-action="restart-campaign" data-id="${escapeHtml(campaign.id)}">Restart campaign</button>
        <button type="button" data-action="reuse-campaign" data-id="${escapeHtml(campaign.id)}">Reuse with recipients</button>
        <button type="button" data-action="completed" data-id="${escapeHtml(campaign.id)}" ${pending > 0 ? "disabled title=\"All recipients must be sent, failed, or skipped before closing.\"" : ""}>Close campaign</button>
        <button type="button" class="danger" data-action="delete-campaign" data-id="${escapeHtml(campaign.id)}">Delete</button>
      </div>
    </article>
  `;
}

async function refreshQueueState() {
  if (queueRefreshInFlight || queueActionInFlight || queueWorkerInFlight) return;
  queueRefreshInFlight = true;

  try {
    await queueStore.refreshState();
    renderQueue();
  } finally {
    queueRefreshInFlight = false;
  }
}

async function processDueRecipients() {
  if (queueActionInFlight || queueWorkerInFlight) return;
  queueActionInFlight = true;
  processDueQueue.disabled = true;
  setQueueStatus("Processing one due recipient per active campaign", "pending");

  try {
    const processed = await dispatchDueQueue();
    renderQueue();
    setQueueStatus(processed > 0 ? `Processed ${processed} due recipient${processed === 1 ? "" : "s"}` : "No due recipients right now", "ready");
  } catch (error) {
    setQueueStatus(error.message, "warning");
  } finally {
    queueActionInFlight = false;
    processDueQueue.disabled = false;
  }
}

async function runAutoQueue() {
  if (!autoQueueEnabled || queueActionInFlight || queueRefreshInFlight || queueWorkerInFlight) return;
  if (!hasAutoQueueWork()) return;

  queueWorkerInFlight = true;
  setQueueStatus("Auto queue checking due recipients", "pending");

  try {
    const processed = await dispatchDueQueue();
    renderQueue();
    if (processed > 0) {
      setQueueStatus(`Auto queue processed ${processed} recipient${processed === 1 ? "" : "s"}`, "ready");
    }
  } catch (error) {
    setQueueStatus(error.message, "warning");
  } finally {
    queueWorkerInFlight = false;
  }
}

async function queueTick() {
  if (queueTickInFlight || queueActionInFlight || queueRefreshInFlight || queueWorkerInFlight) return;
  queueTickInFlight = true;

  try {
    await refreshQueueState();
    await runAutoQueue();
  } finally {
    queueTickInFlight = false;
  }
}

async function dispatchDueQueue() {
  const before = queueStore.summary();
  await queueStore.dispatchDueCampaigns();
  const after = queueStore.summary();
  return Math.max(0, (Number(after.sent || 0) + Number(after.failed || 0)) - (Number(before.sent || 0) + Number(before.failed || 0)));
}

function hasAutoQueueWork() {
  return queueStore.campaigns().some((campaign) => {
    if (!["scheduled", "running"].includes(campaign.status)) return false;
    if (isWindowExpired(campaign)) return false;
    if (!queueStore.campaignReadiness(campaign).ready) return false;

    return queueStore.campaignCounts(campaign).pending > 0;
  });
}

queueCampaignList.addEventListener("click", async (event) => {
  const recipientButton = event.target.closest("button[data-recipient-action]");
  if (recipientButton) {
    queueActionInFlight = true;
    recipientButton.disabled = true;
    setQueueStatus(recipientButton.dataset.recipientAction === "preview" ? "Generating preview" : "Updating recipient", "pending");

    try {
      if (recipientButton.dataset.recipientAction === "preview") {
        await window.CertificateIssuerPreview.open(recipientButton.dataset.id, recipientButton.dataset.recipientId, setQueueStatus);
      } else {
        updateRecipientFromButton(recipientButton);
        renderQueue();
        setQueueStatus("Recipient queue updated", "ready");
      }
    } catch (error) {
      setQueueStatus(error.message, "warning");
    } finally {
      queueActionInFlight = false;
      recipientButton.disabled = false;
    }
    return;
  }

  const button = event.target.closest("button[data-action]");
  if (!button) return;

  queueActionInFlight = true;
  button.disabled = true;
  setQueueStatus("Updating campaign", "pending");

  try {
    if (button.dataset.action === "running") {
      await queueStore.updateCampaignStatusAsync(button.dataset.id, "running");
      renderQueue();
      setQueueStatus("Campaign started", "ready");
      window.setTimeout(() => { void runAutoQueue(); }, 0);
    } else if (button.dataset.action === "send-one") {
      await queueStore.manualSendOneAsync(button.dataset.id);
      renderQueue();
      setQueueStatus("One due recipient processed", "ready");
    } else if (button.dataset.action === "completed") {
      await queueStore.completeCampaignAsync(button.dataset.id);
      renderQueue();
      setQueueStatus("Campaign closed", "ready");
    } else if (button.dataset.action === "save-schedule") {
      saveCampaignSchedule(button.dataset.id);
      renderQueue();
      setQueueStatus("Campaign schedule updated", "ready");
    } else if (button.dataset.action === "restart-campaign") {
      if (!window.confirm("Restarting resets all recipients to queued and pauses this campaign. Continue?")) {
        setQueueStatus("Restart cancelled", "locked");
        return;
      }
      queueStore.restartCampaign(button.dataset.id);
      renderQueue();
      setQueueStatus("Campaign queue reset. Start it when ready.", "ready");
    } else if (button.dataset.action === "reuse-campaign") {
      const copy = queueStore.reuseCampaign(button.dataset.id);
      renderQueue();
      setQueueStatus(`Reusable campaign created: ${copy?.name || "campaign"}`, "ready");
    } else if (button.dataset.action === "delete-campaign") {
      const campaign = queueStore.findCampaign(button.dataset.id);
      if (!window.confirm(`Delete ${campaign?.name || "this campaign"}? This removes the campaign queue and events.`)) {
        setQueueStatus("Delete cancelled", "locked");
        return;
      }
      queueStore.deleteCampaign(button.dataset.id);
      renderQueue();
      setQueueStatus("Campaign deleted", "ready");
    } else if (button.dataset.action === "filter-recipients") {
      const value = document.querySelector(`[data-recipient-filter-input="${cssEscape(button.dataset.id)}"]`)?.value.trim() || "";
      if (value) {
        queueRecipientFilters.set(button.dataset.id, value);
      } else {
        queueRecipientFilters.delete(button.dataset.id);
      }
      renderQueue();
      setQueueStatus("Recipient list filtered", "ready");
    } else if (button.dataset.action === "clear-recipient-filter") {
      queueRecipientFilters.delete(button.dataset.id);
      renderQueue();
      setQueueStatus("Recipient filter cleared", "ready");
    } else {
      await queueStore.updateCampaignStatusAsync(button.dataset.id, button.dataset.action);
      renderQueue();
      setQueueStatus("Campaign updated", "ready");
    }
  } catch (error) {
    setQueueStatus(error.message, "warning");
  } finally {
    queueActionInFlight = false;
    button.disabled = false;
  }
});

processDueQueue.addEventListener("click", processDueRecipients);
refreshQueue.addEventListener("click", refreshQueueState);
toggleAutoQueue.addEventListener("click", () => {
  autoQueueEnabled = !autoQueueEnabled;
  renderAutoQueueButton();
  setQueueStatus(autoQueueEnabled ? "Auto queue enabled" : "Auto queue paused", autoQueueEnabled ? "ready" : "locked");
  if (autoQueueEnabled) {
    void runAutoQueue();
  }
});

[queueSearch, queueStatusFilter, queueReadinessFilter].forEach((control) => {
  control?.addEventListener("input", () => {
    renderQueue();
    setQueueStatus("Queue filters updated", "ready");
  });
});

function nextSendLabel(campaign, plan) {
  if (campaign.status === "completed") return "Done";
  if (campaign.status === "paused") return "Paused";
  if (isWindowExpired(campaign, plan)) return "Window ended";
  if (campaign.nextSendAfterAt) return shortTime(campaign.nextSendAfterAt);
  if (!plan.start || plan.recipients === 0) return "Not scheduled";
  if (queueStore.campaignCounts(campaign).pending <= 0) return "Done";
  if (plan.start.getTime() > Date.now()) return shortTime(plan.start.toISOString());
  if (plan.pendingRecipients > 0) return "Due now";

  const next = new Date(plan.start.getTime() + Number(campaign.sent || 0) * plan.calculatedSpacingSeconds * 1000);
  return shortTime(next.toISOString());
}

function windowLabel(campaign) {
  if (!campaign.windowStartAt && !campaign.windowEndAt) return "Not set";
  return `${campaign.windowStartAt || "?"} to ${campaign.windowEndAt || "completion"}`;
}

function filteredQueueCampaigns(campaigns) {
  const query = String(queueSearch?.value || "").trim().toLowerCase();
  const status = queueStatusFilter?.value || "all";
  const readinessFilter = queueReadinessFilter?.value || "all";

  return campaigns.filter((campaign) => {
    const readiness = queueStore.campaignReadiness(campaign);
    const statusMatch = status === "all"
      || campaign.status === status
      || (status === "active" && ["scheduled", "running", "paused"].includes(campaign.status));
    const readinessMatch = readinessFilter === "all"
      || (readinessFilter === "ready" && readiness.ready && Number(readiness.summary.warn || 0) === 0)
      || (readinessFilter === "review" && readiness.ready && Number(readiness.summary.warn || 0) > 0)
      || (readinessFilter === "blocked" && !readiness.ready);
    const template = queueStore.campaignTemplate(campaign);
    const recipientValues = (campaign.recipientQueue || []).slice(0, 30).flatMap((recipient) => [
      recipient.displayName,
      recipient.email,
      recipient.identifier
    ]);
    const haystack = [
      campaign.name,
      campaign.importFileName,
      campaign.emailSubject,
      template?.name,
      ...(campaign.labels || []),
      ...recipientValues
    ].join(" ").toLowerCase();

    return statusMatch && readinessMatch && (!query || haystack.includes(query));
  });
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

function readinessListMarkup(readiness, limit = 5) {
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
  const campaign = queueStore.findCampaign(campaignId);
  const recipient = (campaign?.recipientQueue || []).find((record) => record.id === recipientId);
  if (!campaign || !recipient) {
    throw new Error("Recipient not found.");
  }

  if (button.dataset.recipientAction === "remove") {
    if (!window.confirm(`Remove ${recipient.displayName || recipient.email || "this recipient"} from this campaign?`)) {
      throw new Error("Recipient removal cancelled.");
    }
    queueStore.removeRecipient(campaignId, recipientId);
    return;
  }

  if (button.dataset.recipientAction === "retry") {
    if (recipient.status === "sent" && !window.confirm(`Queue ${recipient.displayName || recipient.email || "this recipient"} for resending?`)) {
      throw new Error("Resend cancelled.");
    }
    queueStore.retryRecipient(campaignId, recipientId);
    return;
  }

  if (button.dataset.recipientAction === "skip") {
    queueStore.skipRecipient(campaignId, recipientId);
  }
}

function saveCampaignSchedule(campaignId) {
  const campaign = queueStore.findCampaign(campaignId);
  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const startValue = document.querySelector(`[data-schedule-start="${cssEscape(campaignId)}"]`)?.value || "";
  const endValue = document.querySelector(`[data-schedule-end="${cssEscape(campaignId)}"]`)?.value || "";
  const randomDelayUnit = queueStore.normalizeDelayUnit(document.querySelector(`[data-schedule-unit="${cssEscape(campaignId)}"]`)?.value || "seconds");
  const minValue = document.querySelector(`[data-schedule-min="${cssEscape(campaignId)}"]`)?.value || 0;
  const maxValue = document.querySelector(`[data-schedule-max="${cssEscape(campaignId)}"]`)?.value || 0;
  const randomDelayMinSeconds = queueStore.delayAmountToSeconds(minValue, randomDelayUnit);
  const randomDelayMaxSeconds = queueStore.delayAmountToSeconds(maxValue, randomDelayUnit);
  const windowStartAt = toIsoDateTime(startValue);
  const windowEndAt = toIsoDateTime(endValue);

  if (windowStartAt && windowEndAt && new Date(windowEndAt).getTime() <= new Date(windowStartAt).getTime()) {
    throw new Error("Send end must be after send start, or leave it blank to continue until complete.");
  }

  if (randomDelayMaxSeconds < randomDelayMinSeconds) {
    throw new Error("Random delay max must be greater than or equal to the minimum.");
  }

  const startDate = windowStartAt ? new Date(windowStartAt) : null;
  const status = startDate && startDate.getTime() > Date.now() && campaign.status !== "paused"
    ? "scheduled"
    : (campaign.status === "draft" ? "scheduled" : campaign.status);

  queueStore.updateCampaignSchedule(campaignId, {
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

function isWindowExpired(campaign, plan = queueStore.deliveryPlan(campaign)) {
  if (campaign.status === "completed" || campaign.status === "paused") return false;
  if (!plan.end) return false;

  return queueStore.campaignCounts(campaign).pending > 0 && Date.now() > plan.end.getTime();
}

function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function delayUnitOptionsMarkup(selectedUnit) {
  return queueStore.delayUnitOptions().map((unit) => {
    const selected = unit.value === selectedUnit ? " selected" : "";
    return `<option value="${escapeHtml(unit.value)}"${selected}>${escapeHtml(unit.label)}</option>`;
  }).join("");
}

function toIsoDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
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

setQueueStatus("Loading queue", "pending");
renderAutoQueueButton();
void queueTick();
setInterval(queueTick, 5000);
