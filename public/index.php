<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

app_require_auth();

?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Certificate Issuer Dashboard</title>
    <link rel="stylesheet" href="/assets/app.css">
</head>
<body>
<header class="topbar">
    <a class="brand" href="/">Certificate Issuer</a>
    <nav aria-label="Primary navigation">
        <a href="/campaigns.html">Campaigns</a>
        <a href="/designer.html">Designer</a>
        <a href="/import.html">Import</a>
        <a href="/queue.html">Queue</a>
        <a href="/verify.php">Verify</a>
        <a href="/admin.php">Admin</a>
        <a href="/logout.php">Logout</a>
    </nav>
</header>

<main class="shell">
    <section class="page-title">
        <div>
            <p class="eyebrow">Credential operations</p>
            <h1>Issuance dashboard</h1>
            <p>Manage bilingual templates, recipient batches, PDF generation, and controlled SMTP distribution.</p>
        </div>
        <div class="actions">
            <a class="button primary" href="/designer.html">New template</a>
            <a class="button" href="/import.html">Import CSV</a>
        </div>
    </section>

    <section class="metric-grid" aria-label="Operational metrics">
        <article class="metric">
            <span class="metric-label">Templates</span>
            <strong id="dashboardTemplates">0</strong>
            <span id="dashboardApprovedTemplates" class="metric-note positive">0 approved</span>
        </article>
        <article class="metric">
            <span class="metric-label">Campaigns</span>
            <strong id="dashboardCampaigns">0</strong>
            <span id="dashboardActiveCampaigns" class="metric-note">0 active</span>
        </article>
        <article class="metric">
            <span class="metric-label">Queued mail</span>
            <strong id="dashboardQueued">0</strong>
            <span class="metric-note positive">Across campaigns</span>
        </article>
        <article class="metric">
            <span class="metric-label">Failed sends</span>
            <strong id="dashboardFailed">0</strong>
            <span class="metric-note warning">Needs review</span>
        </article>
    </section>

    <section class="workspace">
        <article class="panel span-2">
            <div class="panel-header">
                <div>
                    <h2>Active campaigns</h2>
                    <p>Separate template, import, schedule, and delivery state per campaign.</p>
                </div>
                <a href="/campaigns.html">Manage all</a>
            </div>
            <div id="dashboardCampaignList" class="mini-list"></div>
        </article>

        <article class="panel">
            <div class="panel-header">
                <h2>Security posture</h2>
                <span class="status ready">Login active</span>
            </div>
            <ul class="check-list">
                <li>Username and password required for management pages</li>
                <li>SMTP password encrypted at rest</li>
                <li>Uploads and API changes protected by CSRF tokens</li>
                <li>Admin action audit enabled</li>
            </ul>
        </article>

        <article class="panel">
            <div class="panel-header">
                <h2>Recent queue events</h2>
                <a href="/queue.html">View all</a>
            </div>
            <table class="compact-table">
                <thead><tr><th>Status</th><th>Recipient</th><th>Time</th></tr></thead>
                <tbody id="dashboardRecentEvents"><tr><td colspan="3">No queue events yet.</td></tr></tbody>
            </table>
        </article>

        <article class="panel span-2">
            <div class="panel-header">
                <h2>Certificate preview</h2>
                <a href="/designer.html">Edit layout</a>
            </div>
            <div class="certificate-preview" lang="ar" dir="rtl">
                <span>شهادة إنجاز</span>
                <strong>عائشة المنصوري</strong>
                <em dir="ltr">Aisha Al Mansoori</em>
                <small dir="ltr">Certificate ID: CERT-2026-001</small>
            </div>
        </article>
    </section>
</main>
<script src="/assets/app-auth.js"></script>
<script src="/assets/app-state.js"></script>
<script src="/assets/dashboard.js"></script>
</body>
</html>
