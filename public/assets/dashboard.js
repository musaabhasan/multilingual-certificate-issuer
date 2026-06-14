const dashboardStore = window.CertificateIssuerStore;

function renderDashboard() {
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
    const pending = dashboardStore.campaignCounts(campaign).pending;

    return `
      <div class="mini-list-row">
        <div>
          <strong>${escapeHtml(campaign.name)}</strong>
          <span>${escapeHtml(template?.name || "No template")} - ${pending} pending - ${Number(campaign.sent || 0)} sent</span>
        </div>
        <span class="${dashboardStore.statusClass(campaign.status)}">${dashboardStore.statusLabel(campaign.status)}</span>
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
