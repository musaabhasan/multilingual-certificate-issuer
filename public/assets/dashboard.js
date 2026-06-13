const dashboardStore = window.CertificateIssuerStore;

function renderDashboard() {
  dashboardStore.syncDeliveryProgress();
  const summary = dashboardStore.summary();
  document.querySelector("#dashboardTemplates").textContent = String(summary.templates);
  document.querySelector("#dashboardApprovedTemplates").textContent = `${summary.approvedTemplates} approved`;
  document.querySelector("#dashboardCampaigns").textContent = String(summary.campaigns);
  document.querySelector("#dashboardActiveCampaigns").textContent = `${summary.activeCampaigns} active`;
  document.querySelector("#dashboardQueued").textContent = String(summary.queued);
  document.querySelector("#dashboardFailed").textContent = String(summary.failed);

  const campaigns = dashboardStore.campaigns()
    .filter((campaign) => ["scheduled", "running", "paused"].includes(campaign.status))
    .slice(0, 5);

  document.querySelector("#dashboardCampaignList").innerHTML = campaigns.map((campaign) => {
    const template = dashboardStore.campaignTemplate(campaign);
    const pending = Math.max(Number(campaign.recipients || 0) - Number(campaign.sent || 0) - Number(campaign.failed || 0), 0);

    return `
      <div class="mini-list-row">
        <div>
          <strong>${escapeHtml(campaign.name)}</strong>
          <span>${escapeHtml(template?.name || "No template")} · ${pending} pending · ${Number(campaign.sent || 0)} sent</span>
        </div>
        <span class="${dashboardStore.statusClass(campaign.status)}">${dashboardStore.statusLabel(campaign.status)}</span>
      </div>
    `;
  }).join("") || "<p>No active campaigns yet.</p>";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderDashboard();
