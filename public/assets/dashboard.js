const dashboardStore = window.CertificateIssuerStore;

function renderDashboard() {
  const summary = dashboardStore.summary();
  const campaigns = dashboardStore.campaigns();
  const settings = dashboardStore.settings();
  document.querySelector("#dashboardTemplates").textContent = String(summary.templates);
  document.querySelector("#dashboardApprovedTemplates").textContent = `${summary.approvedTemplates} approved`;
  document.querySelector("#dashboardCampaigns").textContent = String(summary.campaigns);
  document.querySelector("#dashboardActiveCampaigns").textContent = `${summary.activeCampaigns} active`;
  document.querySelector("#dashboardQueued").textContent = String(summary.queued);
  document.querySelector("#dashboardFailed").textContent = String(summary.failed);
  renderWorkflow(summary, campaigns, settings);
  renderAttention(summary, campaigns, settings);

  const activeCampaigns = campaigns
    .filter((campaign) => ["scheduled", "running", "paused"].includes(campaign.status))
    .slice(0, 5);

  document.querySelector("#dashboardCampaignList").innerHTML = activeCampaigns.map((campaign) => {
    const template = dashboardStore.campaignTemplate(campaign);
    const pending = dashboardStore.campaignCounts(campaign).pending;
    const readiness = dashboardStore.campaignReadiness(campaign);

    return `
      <div class="mini-list-row">
        <div>
          <strong>${escapeHtml(campaign.name)}</strong>
          <span>${escapeHtml(template?.name || "No template")} - ${pending} pending - ${Number(campaign.sent || 0)} sent</span>
        </div>
        <div class="mini-status-stack">
          <span class="${dashboardStore.statusClass(campaign.status)}">${dashboardStore.statusLabel(campaign.status)}</span>
          <span class="${readinessStatusClass(readiness)}">${escapeHtml(readinessLabel(readiness))}</span>
        </div>
      </div>
    `;
  }).join("") || "<p>No active campaigns yet.</p>";

  const recentEvents = dashboardStore.campaigns()
    .flatMap((campaign) => (campaign.deliveryEvents || []).map((event) => ({ ...event, campaign })))
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
    .slice(0, 5);

  document.querySelector("#dashboardRecentEvents").innerHTML = recentEvents.map((event) => `
    <tr>
      <td><span class="${event.message.includes("failed") ? "pill failed" : "pill sent"}">${event.message.includes("failed") ? "Failed" : "Event"}</span></td>
      <td>${escapeHtml(event.campaign.name)}</td>
      <td>${escapeHtml(shortTime(event.at))}</td>
    </tr>
  `).join("") || "<tr><td colspan=\"3\">No queue events yet.</td></tr>";
}

function renderWorkflow(summary, campaigns, settings) {
  const hasDelivery = deliveryConfigured(settings.smtp || {});
  const hasTemplate = Number(summary.approvedTemplates || 0) > 0;
  const hasCampaign = campaigns.length > 0;
  const hasRecipients = campaigns.some((campaign) => Number(campaign.recipients || 0) > 0);
  const hasDeliveryProgress = Number(summary.sent || 0) > 0 || Number(summary.queued || 0) > 0;
  const steps = [
    ["Delivery settings", hasDelivery, "/admin.php"],
    ["Certificate template", hasTemplate, "/designer.html"],
    ["Campaign setup", hasCampaign, "/campaigns.html"],
    ["Recipient CSV", hasRecipients, "/campaigns.html"],
    ["Queue delivery", hasDeliveryProgress, "/queue.html"]
  ];

  document.querySelector("#dashboardWorkflow").innerHTML = steps.map(([label, done, href], index) => `
    <a class="workflow-row ${done ? "done" : "pending"}" href="${href}">
      <span>${index + 1}</span>
      <strong>${escapeHtml(label)}</strong>
      <em>${done ? "Ready" : "Pending"}</em>
    </a>
  `).join("");
}

function renderAttention(summary, campaigns, settings) {
  const items = [];
  const smtp = settings.smtp || {};
  const missingAssets = campaigns.filter((campaign) => (
    Number(campaign.recipients || 0) === 0 || !dashboardStore.campaignTemplate(campaign)
  ));
  const endedWindows = campaigns.filter((campaign) => {
    const counts = dashboardStore.campaignCounts(campaign);
    const end = campaign.windowEndAt ? new Date(campaign.windowEndAt) : null;
    return ["scheduled", "running"].includes(campaign.status)
      && end
      && !Number.isNaN(end.getTime())
      && end.getTime() < Date.now()
      && counts.pending > 0;
  });
  const blockedCampaigns = campaigns.filter((campaign) => !dashboardStore.campaignReadiness(campaign).ready);
  const reviewCampaigns = campaigns.filter((campaign) => {
    const readiness = dashboardStore.campaignReadiness(campaign);
    return readiness.ready && Number(readiness.summary.warn || 0) > 0;
  });

  if (!deliveryConfigured(smtp)) {
    items.push(["Delivery settings", "warning", "/admin.php"]);
  }
  if (blockedCampaigns.length > 0) {
    items.push([`${blockedCampaigns.length} campaigns blocked from sending`, "failed", "/campaigns.html"]);
  }
  if (reviewCampaigns.length > 0) {
    items.push([`${reviewCampaigns.length} campaigns need review`, "warning", "/campaigns.html"]);
  }
  if (Number(summary.failed || 0) > 0) {
    items.push([`${summary.failed} failed sends`, "failed", "/queue.html"]);
  }
  if (missingAssets.length > 0) {
    items.push([`${missingAssets.length} campaigns missing CSV or template`, "warning", "/campaigns.html"]);
  }
  if (endedWindows.length > 0) {
    items.push([`${endedWindows.length} ended delivery windows`, "warning", "/queue.html"]);
  }
  if (items.length === 0) {
    items.push(["No blocking items", "ready", "/campaigns.html"]);
  }

  document.querySelector("#dashboardAttention").innerHTML = items.map(([label, state, href]) => `
    <a class="attention-row" href="${href}">
      <span class="status ${state}">${escapeHtml(stateLabel(state))}</span>
      <strong>${escapeHtml(label)}</strong>
    </a>
  `).join("");
}

function deliveryConfigured(smtp) {
  if ((smtp.deliveryMode || "log") === "log") return true;
  if (smtp.deliveryMode === "graph") {
    return Boolean(smtp.graphTenantId && smtp.graphClientId && smtp.graphSender && smtp.hasGraphClientSecret);
  }
  return Boolean(smtp.host && smtp.username && smtp.fromAddress && smtp.hasPassword);
}

function stateLabel(state) {
  if (state === "failed") return "Fix";
  if (state === "warning") return "Review";
  return "Ready";
}

function readinessLabel(readiness) {
  if (readiness.ready && Number(readiness.summary.warn || 0) === 0) return "Ready";
  if (readiness.ready) return "Review";
  return "Blocked";
}

function readinessStatusClass(readiness) {
  if (!readiness.ready) return "status failed";
  if (Number(readiness.summary.warn || 0) > 0) return "status warning";
  return "status ready";
}

function shortTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
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

async function refreshDashboard() {
  await dashboardStore.refreshState();
  renderDashboard();
}

void refreshDashboard();
