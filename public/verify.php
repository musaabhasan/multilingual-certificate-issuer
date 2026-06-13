<?php

declare(strict_types=1);

?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Certificate Verification</title>
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
        <a href="/verify.php" aria-current="page">Verify</a>
    </nav>
</header>
<main class="shell narrow">
    <section class="page-title compact">
        <div>
            <p class="eyebrow">Credential verification</p>
            <h1>Verify a certificate</h1>
            <p>Use the certificate number and verification token printed in the issued PDF or QR code.</p>
        </div>
    </section>

    <form class="panel form-panel" method="post">
        <label>Certificate number <input name="certificate_number" autocomplete="off" placeholder="CERT-2026-001"></label>
        <label>Verification token <input name="token" autocomplete="off" placeholder="Token from QR link"></label>
        <button class="primary" type="submit">Verify certificate</button>
    </form>

    <section class="panel verification-result">
        <span class="status ready">Demo result</span>
        <h2>Certificate metadata</h2>
        <dl class="detail-list">
            <div><dt>Recipient</dt><dd>Aisha Al Mansoori / <span dir="rtl">عائشة المنصوري</span></dd></div>
            <div><dt>Certificate</dt><dd>Cybersecurity Awareness</dd></div>
            <div><dt>Identifier</dt><dd>CERT-2026-001</dd></div>
            <div><dt>PDF hash</dt><dd><code>sha256: pending live lookup</code></dd></div>
        </dl>
    </section>
</main>
</body>
</html>
