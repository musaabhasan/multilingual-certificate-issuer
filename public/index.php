<?php

declare(strict_types=1);

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
        <a href="/designer.html">Designer</a>
        <a href="/import.html">Import</a>
        <a href="/queue.html">Queue</a>
        <a href="/verify.php">Verify</a>
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
            <strong>12</strong>
            <span class="metric-note positive">4 approved</span>
        </article>
        <article class="metric">
            <span class="metric-label">Queued mail</span>
            <strong>248</strong>
            <span class="metric-note">60 sec throttle</span>
        </article>
        <article class="metric">
            <span class="metric-label">Rendered PDFs</span>
            <strong>1,420</strong>
            <span class="metric-note positive">PDF/A ready</span>
        </article>
        <article class="metric">
            <span class="metric-label">Failed sends</span>
            <strong>3</strong>
            <span class="metric-note warning">Needs review</span>
        </article>
    </section>

    <section class="workspace">
        <article class="panel span-2">
            <div class="panel-header">
                <div>
                    <h2>Issuance workflow</h2>
                    <p>Current batch: Cybersecurity Awareness May 2026</p>
                </div>
                <span class="status ready">Ready to schedule</span>
            </div>
            <ol class="stepper">
                <li class="done"><span>1</span><div><strong>Template approved</strong><p>Arabic and English fields aligned on A4 landscape.</p></div></li>
                <li class="done"><span>2</span><div><strong>CSV validated</strong><p>Unique identifiers, emails, names, and issue dates passed checks.</p></div></li>
                <li class="active"><span>3</span><div><strong>PDF generation</strong><p>Rendering queue is producing private certificate files.</p></div></li>
                <li><span>4</span><div><strong>SMTP distribution</strong><p>Delivery starts after approval and schedule confirmation.</p></div></li>
            </ol>
        </article>

        <article class="panel">
            <div class="panel-header">
                <h2>Security posture</h2>
                <span class="status locked">MFA enforced</span>
            </div>
            <ul class="check-list">
                <li>SMTP credentials encrypted</li>
                <li>Generated PDFs stored privately</li>
                <li>Admin action audit enabled</li>
                <li>Password rotation policy active</li>
            </ul>
        </article>

        <article class="panel">
            <div class="panel-header">
                <h2>Recent queue events</h2>
                <a href="/queue.html">View all</a>
            </div>
            <table class="compact-table">
                <thead><tr><th>Status</th><th>Recipient</th><th>Time</th></tr></thead>
                <tbody>
                <tr><td><span class="pill sent">Sent</span></td><td>aisha@example.edu</td><td>09:12</td></tr>
                <tr><td><span class="pill queued">Queued</span></td><td>omar@example.edu</td><td>09:13</td></tr>
                <tr><td><span class="pill failed">Retry</span></td><td>fatima@example.edu</td><td>09:14</td></tr>
                </tbody>
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
</body>
</html>
