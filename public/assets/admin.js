const adminAuth = window.CertificateIssuerAuth;
const settingsForm = document.querySelector("#settingsForm");
const settingsStatus = document.querySelector("#settingsStatus");
const smtpTestForm = document.querySelector("#smtpTestForm");
const smtpTestStatus = document.querySelector("#smtpTestStatus");
const smtpTestResult = document.querySelector("#smtpTestResult");
const smtpDiagnosticsButton = document.querySelector("#smtpDiagnosticsButton");
const smtpDiagnostics = document.querySelector("#smtpDiagnostics");
const usersStatus = document.querySelector("#usersStatus");
const userList = document.querySelector("#userList");
const userForm = document.querySelector("#userForm");
const passwordForm = document.querySelector("#passwordForm");
const passwordStatus = document.querySelector("#passwordStatus");
const auditBody = document.querySelector("#auditBody");
const refreshAudit = document.querySelector("#refreshAudit");

function setStatus(element, text, state = "locked") {
  element.textContent = text;
  element.className = `status ${state}`;
}

async function loadSettings() {
  const { settings } = await adminAuth.api("GET", "settings");
  document.querySelector("#platformName").value = settings.platform?.name || "Certificate Issuer";
  document.querySelector("#publicBaseUrl").value = settings.platform?.publicBaseUrl || window.location.origin;
  document.querySelector("#sessionTimeout").value = settings.security?.sessionTimeoutMinutes || 120;
  document.querySelector("#passwordRotation").value = settings.security?.passwordRotationDays || 90;
  document.querySelector("#smtpDeliveryMode").value = settings.smtp?.deliveryMode || "log";
  document.querySelector("#smtpProfileName").value = settings.smtp?.profileName || "Institution SMTP";
  document.querySelector("#smtpHost").value = settings.smtp?.host || "";
  document.querySelector("#smtpPort").value = settings.smtp?.port || 587;
  document.querySelector("#smtpEncryption").value = settings.smtp?.encryption || "tls";
  document.querySelector("#smtpUsername").value = settings.smtp?.username || "";
  document.querySelector("#smtpPassword").placeholder = settings.smtp?.hasPassword ? "Password saved; leave blank to keep it" : "SMTP password";
  document.querySelector("#smtpFromAddress").value = settings.smtp?.fromAddress || "";
  document.querySelector("#smtpFromName").value = settings.smtp?.fromName || "Certificate Issuer";
  if (!document.querySelector("#smtpTestRecipient").value && adminAuth.user?.email) {
    document.querySelector("#smtpTestRecipient").value = adminAuth.user.email;
  }
  if (!document.querySelector("#smtpTestRecipientName").value && adminAuth.user?.name) {
    document.querySelector("#smtpTestRecipientName").value = adminAuth.user.name;
  }
  setStatus(settingsStatus, settings.smtp?.deliveryMode === "smtp" ? "SMTP mode" : "Local log mode", "ready");
}

function currentSettingsPayload() {
  return {
    platform: {
      name: document.querySelector("#platformName").value.trim(),
      publicBaseUrl: document.querySelector("#publicBaseUrl").value.trim()
    },
    security: {
      sessionTimeoutMinutes: Number(document.querySelector("#sessionTimeout").value || 120),
      passwordRotationDays: Number(document.querySelector("#passwordRotation").value || 90)
    },
    smtp: {
      deliveryMode: document.querySelector("#smtpDeliveryMode").value,
      profileName: document.querySelector("#smtpProfileName").value.trim(),
      host: document.querySelector("#smtpHost").value.trim(),
      port: Number(document.querySelector("#smtpPort").value || 587),
      encryption: document.querySelector("#smtpEncryption").value,
      username: document.querySelector("#smtpUsername").value.trim(),
      password: document.querySelector("#smtpPassword").value,
      fromAddress: document.querySelector("#smtpFromAddress").value.trim(),
      fromName: document.querySelector("#smtpFromName").value.trim()
    }
  };
}

async function saveSettings(event) {
  event.preventDefault();
  setStatus(settingsStatus, "Saving", "pending");

  const payload = currentSettingsPayload();

  try {
    await adminAuth.api("POST", "settings", payload);
    document.querySelector("#smtpPassword").value = "";
    await loadSettings();
    setStatus(settingsStatus, "Settings saved", "ready");
  } catch (error) {
    setStatus(settingsStatus, error.message, "warning");
  }
}

async function sendTestEmail(event) {
  event.preventDefault();
  setStatus(smtpTestStatus, "Sending", "pending");
  smtpTestResult.textContent = "";
  smtpTestResult.className = "test-result";

  try {
    const { test } = await adminAuth.api("POST", "settings-test-email", {
      recipientEmail: document.querySelector("#smtpTestRecipient").value.trim(),
      recipientName: document.querySelector("#smtpTestRecipientName").value.trim(),
      settings: currentSettingsPayload()
    });
    setStatus(smtpTestStatus, "Test sent", "ready");
    smtpTestResult.textContent = `Sent to ${test.recipientEmail} through ${test.host}:${test.port} at ${shortDate(test.sentAt)}.`;
    smtpTestResult.className = "test-result ready";
    await loadAudit();
  } catch (error) {
    setStatus(smtpTestStatus, "Test failed", "warning");
    smtpTestResult.textContent = error.message;
    smtpTestResult.className = "test-result warning";
    await showSmtpDiagnosticsAfterFailure();
  }
}

async function showSmtpDiagnosticsAfterFailure() {
  try {
    const { diagnostics } = await adminAuth.api("POST", "settings-smtp-diagnostics", {
      settings: currentSettingsPayload()
    });
    renderSmtpDiagnostics(diagnostics);
  } catch (diagnosticError) {
    smtpDiagnostics.innerHTML = `<p class="test-result warning">${escapeHtml(diagnosticError.message)}</p>`;
  }
}

async function runSmtpDiagnostics() {
  setStatus(smtpTestStatus, "Checking", "pending");
  smtpDiagnostics.innerHTML = "<p class=\"form-note\">Checking SMTP configuration and host connectivity.</p>";

  try {
    const { diagnostics } = await adminAuth.api("POST", "settings-smtp-diagnostics", {
      settings: currentSettingsPayload()
    });
    renderSmtpDiagnostics(diagnostics);
    setStatus(smtpTestStatus, diagnostics.canSend ? "Ready to send" : "Review findings", diagnostics.canSend ? "ready" : "warning");
    await loadAudit();
  } catch (error) {
    setStatus(smtpTestStatus, "Diagnostics failed", "warning");
    smtpDiagnostics.innerHTML = `<p class="test-result warning">${escapeHtml(error.message)}</p>`;
  }
}

function renderSmtpDiagnostics(diagnostics) {
  const summary = diagnostics.summary || {};
  const checks = Array.isArray(diagnostics.checks) ? diagnostics.checks : [];
  smtpDiagnostics.innerHTML = `
    <div class="diagnostics-summary">
      <div><span>Mode</span><strong>${escapeHtml(summary.deliveryMode || "unknown")}</strong></div>
      <div><span>Host</span><strong>${escapeHtml(summary.host ? `${summary.host}:${summary.port || ""}` : "Not configured")}</strong></div>
      <div><span>Encryption</span><strong>${escapeHtml(summary.encryption || "-")}</strong></div>
      <div><span>From</span><strong>${escapeHtml(summary.fromAddress || "Not configured")}</strong></div>
      <div><span>Password</span><strong>${summary.hasPassword ? "Saved" : "Missing"}</strong></div>
      <div><span>Checked</span><strong>${escapeHtml(shortDate(diagnostics.generatedAt))}</strong></div>
    </div>
    <div class="diagnostic-checks">
      ${checks.map((check) => `
        <div class="diagnostic-row ${escapeHtml(check.status)}">
          <span class="status ${smtpDiagnosticStatusClass(check.status)}">${escapeHtml(smtpDiagnosticStatusLabel(check.status))}</span>
          <div>
            <strong>${escapeHtml(check.label)}</strong>
            <p>${escapeHtml(check.detail)}</p>
          </div>
        </div>
      `).join("") || "<p class=\"form-note\">No diagnostics returned.</p>"}
    </div>
  `;
}

function smtpDiagnosticStatusClass(status) {
  if (status === "pass") return "ready";
  if (status === "fail") return "failed";
  return "warning";
}

function smtpDiagnosticStatusLabel(status) {
  if (status === "pass") return "Pass";
  if (status === "fail") return "Fail";
  return "Review";
}

async function loadUsers() {
  const { users } = await adminAuth.api("GET", "users");
  userList.innerHTML = users.map((user) => `
    <div class="mini-list-row">
      <div>
        <strong>${escapeHtml(user.name)}</strong>
        <span>${escapeHtml(user.email)} | ${escapeHtml(user.role)}${user.lastLoginAt ? ` | Last login ${escapeHtml(shortDate(user.lastLoginAt))}` : ""}</span>
      </div>
      <span class="status ${user.role === "administrator" && !user.mfa?.enabled ? "warning" : "ready"}">${escapeHtml(userStatusLabel(user))}</span>
    </div>
  `).join("") || "<p>No users found.</p>";
  setStatus(usersStatus, `${users.length} users`, "ready");
}

function userStatusLabel(user) {
  if (user.lockedAt) return "Locked";
  if (user.role === "administrator") {
    return user.mfa?.enabled ? "MFA enabled" : "MFA pending";
  }
  return "Active";
}

async function createUser(event) {
  event.preventDefault();
  setStatus(usersStatus, "Creating", "pending");

  try {
    await adminAuth.api("POST", "users", {
      name: document.querySelector("#newUserName").value.trim(),
      email: document.querySelector("#newUserEmail").value.trim(),
      role: document.querySelector("#newUserRole").value,
      password: document.querySelector("#newUserPassword").value
    });
    userForm.reset();
    await loadUsers();
    await loadAudit();
    setStatus(usersStatus, "User created", "ready");
  } catch (error) {
    setStatus(usersStatus, error.message, "warning");
  }
}

async function changePassword(event) {
  event.preventDefault();
  setStatus(passwordStatus, "Changing", "pending");

  try {
    await adminAuth.api("POST", "password", {
      currentPassword: document.querySelector("#currentPassword").value,
      newPassword: document.querySelector("#newPassword").value
    });
    passwordForm.reset();
    setStatus(passwordStatus, "Password changed", "ready");
    await loadAudit();
  } catch (error) {
    setStatus(passwordStatus, error.message, "warning");
  }
}

async function loadAudit() {
  const { events } = await adminAuth.api("GET", "audit");
  auditBody.innerHTML = events.slice().reverse().map((event) => `
    <tr>
      <td>${escapeHtml(shortDate(event.at))}</td>
      <td>${escapeHtml(event.action)}</td>
      <td>${escapeHtml(event.entityType || "")}${event.entityId ? `:${escapeHtml(event.entityId)}` : ""}</td>
      <td><code>${escapeHtml(JSON.stringify(event.metadata || {}))}</code></td>
    </tr>
  `).join("") || "<tr><td colspan=\"4\">No audit events yet.</td></tr>";
}

function shortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleString([], {
    year: "numeric",
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

settingsForm.addEventListener("submit", saveSettings);
smtpTestForm.addEventListener("submit", sendTestEmail);
smtpDiagnosticsButton.addEventListener("click", runSmtpDiagnostics);
userForm.addEventListener("submit", createUser);
passwordForm.addEventListener("submit", changePassword);
refreshAudit.addEventListener("click", loadAudit);

Promise.all([loadSettings(), loadUsers(), loadAudit()]).catch((error) => {
  setStatus(settingsStatus, error.message, "warning");
});
