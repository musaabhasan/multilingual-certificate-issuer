<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

$user = app_require_auth();
$isAdmin = ($user['role'] ?? '') === 'administrator';

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin - Certificate Issuer</title>
    <link rel="stylesheet" href="/assets/app.css">
</head>
<body>
<header class="topbar">
    <a class="brand" href="/">Certificate Issuer</a>
    <nav aria-label="Primary navigation">
        <a href="/campaigns.html">Campaigns</a>
        <a href="/designer.html">Designer</a>
        <a href="/queue.html">Queue</a>
        <a href="/verify.php">Verify</a>
        <a href="/mfa.php">MFA</a>
        <a href="/admin.php" aria-current="page">Admin</a>
        <a href="/logout.php">Logout</a>
    </nav>
</header>

<main class="shell">
    <section class="page-title compact">
        <div>
            <p class="eyebrow">Platform management</p>
            <h1>Admin panel</h1>
            <p>Manage platform access, certificate delivery, security settings, and audit activity.</p>
        </div>
        <div class="actions">
            <span class="status ready" data-current-user><?= e((string) ($user['name'] ?? $user['email'] ?? 'Signed in')) ?></span>
        </div>
    </section>

    <?php if (!$isAdmin): ?>
        <section class="panel">
            <span class="status warning">Administrator access required</span>
            <h2>Access denied</h2>
            <p>Your account can use the platform, but only administrators can change delivery settings or manage users.</p>
        </section>
    <?php else: ?>
        <section class="workspace admin-grid">
            <article class="panel span-2">
                <div class="panel-header">
                    <h2>Delivery and platform settings</h2>
                    <span id="settingsStatus" class="status locked">Loading</span>
                </div>
                <form id="settingsForm" class="form-grid">
                    <label>Platform name <input id="platformName" type="text" required></label>
                    <label class="wide-field">Public base URL <input id="publicBaseUrl" type="url" required></label>
                    <label>Session timeout minutes <input id="sessionTimeout" type="number" min="15" step="1"></label>
                    <label>Password rotation days <input id="passwordRotation" type="number" min="1" step="1"></label>
                    <label>Delivery mode
                        <select id="smtpDeliveryMode">
                            <option value="log">Render and log locally</option>
                            <option value="smtp">Send through SMTP</option>
                            <option value="graph">Send through Microsoft Graph</option>
                        </select>
                    </label>
                    <label>Profile name <input id="smtpProfileName" type="text"></label>
                    <label data-delivery-panel="smtp">SMTP host <input id="smtpHost" type="text" autocomplete="off"></label>
                    <label data-delivery-panel="smtp">SMTP port <input id="smtpPort" type="number" min="1" value="587"></label>
                    <label data-delivery-panel="smtp">Encryption
                        <select id="smtpEncryption">
                            <option value="tls">TLS</option>
                            <option value="ssl">SSL</option>
                        </select>
                    </label>
                    <label data-delivery-panel="smtp">SMTP username <input id="smtpUsername" type="text" autocomplete="off"></label>
                    <label data-delivery-panel="smtp">SMTP password <input id="smtpPassword" type="password" autocomplete="new-password" placeholder="Leave blank to keep current password"></label>
                    <label data-delivery-panel="smtp">From address <input id="smtpFromAddress" type="email"></label>
                    <label data-delivery-panel="smtp">From name <input id="smtpFromName" type="text"></label>
                    <label data-delivery-panel="graph">Graph tenant ID <input id="graphTenantId" type="text" autocomplete="off" placeholder="Tenant ID or domain"></label>
                    <label data-delivery-panel="graph">Graph client ID <input id="graphClientId" type="text" autocomplete="off"></label>
                    <label data-delivery-panel="graph">Graph client secret <input id="graphClientSecret" type="password" autocomplete="new-password" placeholder="Leave blank to keep current secret"></label>
                    <label data-delivery-panel="graph">Graph sender mailbox <input id="graphSender" type="email" autocomplete="off"></label>
                    <p class="form-note full-field" data-delivery-panel="graph">Microsoft Graph mode uses an Entra app registration with Microsoft Graph Mail.Send application permission and admin consent. It sends through the configured sender mailbox and attaches certificate PDFs.</p>
                    <button class="primary" type="submit">Save settings</button>
                </form>
                <div class="smtp-test-panel">
                    <div class="panel-header compact-header">
                        <h3>Delivery verification</h3>
                        <span id="smtpTestStatus" class="status locked">Not tested</span>
                    </div>
                    <div class="action-row">
                        <button id="smtpDiagnosticsButton" type="button">Run diagnostics</button>
                    </div>
                    <div id="smtpDiagnostics" class="diagnostics-list">
                        <p class="form-note">Run diagnostics to examine the current delivery mode, required fields, sender settings, provider authentication, and host connectivity.</p>
                    </div>
                    <form id="smtpTestForm" class="form-grid">
                        <label>Test recipient email <input id="smtpTestRecipient" type="email" required></label>
                        <label>Recipient name <input id="smtpTestRecipientName" type="text"></label>
                        <button type="submit">Send test email</button>
                    </form>
                    <p id="smtpTestResult" class="test-result" aria-live="polite"></p>
                </div>
            </article>

            <article class="panel">
                <div class="panel-header">
                    <h2>Users</h2>
                    <span id="usersStatus" class="status locked">Loading</span>
                </div>
                <div id="userList" class="mini-list"></div>
                <form id="userForm" class="stacked-controls">
                    <label>Name <input id="newUserName" type="text" required></label>
                    <label>Email <input id="newUserEmail" type="email" required></label>
                    <label>Role
                        <select id="newUserRole">
                            <option value="operator">Operator</option>
                            <option value="designer">Designer</option>
                            <option value="auditor">Auditor</option>
                            <option value="administrator">Administrator</option>
                        </select>
                    </label>
                    <label>Password <input id="newUserPassword" type="password" required autocomplete="new-password"></label>
                    <p class="form-note">Passwords must be at least 14 characters and include uppercase, lowercase, number, and symbol.</p>
                    <button type="submit">Create user</button>
                </form>
            </article>

            <article class="panel">
                <div class="panel-header">
                    <h2>Password</h2>
                    <span id="passwordStatus" class="status locked">Current account</span>
                </div>
                <form id="passwordForm" class="stacked-controls">
                    <label>Current password <input id="currentPassword" type="password" required autocomplete="current-password"></label>
                    <label>New password <input id="newPassword" type="password" required autocomplete="new-password"></label>
                    <button type="submit">Change password</button>
                </form>
            </article>

            <article class="panel">
                <div class="panel-header">
                    <h2>Account MFA</h2>
                    <span class="status ready">Enabled</span>
                </div>
                <p>Manage administrator MFA verification and recovery codes for your account.</p>
                <div class="action-row mfa-actions">
                    <a class="button" href="/mfa.php">Manage MFA</a>
                </div>
            </article>

            <article class="panel span-2">
                <div class="panel-header">
                    <h2>Audit log</h2>
                    <button id="refreshAudit" type="button">Refresh</button>
                </div>
                <div class="table-scroll">
                    <table class="data-table compact-preview">
                        <thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Metadata</th></tr></thead>
                        <tbody id="auditBody"><tr><td colspan="4">Loading audit events.</td></tr></tbody>
                    </table>
                </div>
            </article>
        </section>
    <?php endif; ?>
</main>
<?php if ($isAdmin): ?>
<script src="/assets/app-auth.js"></script>
<script src="/assets/admin.js"></script>
<?php endif; ?>
</body>
</html>
