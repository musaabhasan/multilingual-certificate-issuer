<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

$certificateNumber = trim((string) ($_POST['certificate_number'] ?? $_GET['certificate_number'] ?? ''));
$token = trim((string) ($_POST['token'] ?? $_GET['token'] ?? ''));
$lookup = null;
$searched = false;
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' || ($certificateNumber !== '' && $token !== '')) {
    $searched = true;
    try {
        $lookup = app_verify_certificate_lookup($certificateNumber, $token);
    } catch (Throwable $exception) {
        $error = 'Verification request could not be processed.';
    }
}

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
    <title>Certificate Verification</title>
    <link rel="stylesheet" href="/assets/app.css">
</head>
<body>
<header class="topbar">
    <a class="brand" href="/">Certificate Issuer</a>
    <nav aria-label="Primary navigation">
        <a href="/campaigns.html">Campaigns</a>
        <a href="/designer.html">Designer</a>
        <a href="/queue.html">Queue</a>
        <a href="/verify.php" aria-current="page">Verify</a>
        <a href="/mfa.php">MFA</a>
        <a href="/admin.php">Admin</a>
    </nav>
</header>
<main class="shell narrow">
    <section class="page-title compact">
        <div>
            <p class="eyebrow">Credential verification</p>
            <h1>Verify a certificate</h1>
            <p>Scan the certificate QR code or enter the certificate number and verification token.</p>
        </div>
    </section>

    <form class="panel form-panel" method="post">
        <label>Certificate number <input name="certificate_number" autocomplete="off" required placeholder="CERT-2026-001" value="<?= e($certificateNumber) ?>"></label>
        <label>Verification token <input name="token" autocomplete="off" required placeholder="Token from verification link" value="<?= e($token) ?>"></label>
        <button class="primary" type="submit">Verify certificate</button>
        <p class="form-note">Recipient names, email addresses, and private certificate files are not exposed by the public verification result.</p>
    </form>

    <?php if ($searched && $lookup === null): ?>
        <section class="panel verification-result">
            <span class="status failed">Invalid</span>
            <h2>Certificate not verified</h2>
            <p><?= e($error !== '' ? $error : 'No issued certificate matched that number and token.') ?></p>
        </section>
    <?php elseif (is_array($lookup)): ?>
        <section class="panel verification-result">
            <span class="<?= $lookup['status'] === 'valid' ? 'status ready' : 'status failed' ?>"><?= e(ucfirst((string) $lookup['status'])) ?></span>
            <h2><?= $lookup['status'] === 'valid' ? 'Certificate verified' : 'Certificate not valid' ?></h2>
            <dl class="detail-list">
                <div><dt>Issuer</dt><dd><?= e((string) $lookup['issuer']) ?></dd></div>
                <div><dt>Campaign</dt><dd><?= e((string) $lookup['campaign']) ?></dd></div>
                <div><dt>Template</dt><dd><?= e((string) $lookup['template']) ?></dd></div>
                <div><dt>Identifier</dt><dd><?= e((string) $lookup['certificateNumber']) ?></dd></div>
                <div><dt>Issued at</dt><dd><?= e((string) ($lookup['sentAt'] ?: $lookup['renderedAt'])) ?></dd></div>
                <div><dt>Verified at</dt><dd><?= e((string) $lookup['verifiedAt']) ?></dd></div>
                <div><dt>PDF hash</dt><dd><code><?= e($lookup['pdfSha256'] !== '' ? 'sha256:' . (string) $lookup['pdfSha256'] : 'PDF hash unavailable') ?></code></dd></div>
            </dl>
        </section>
    <?php endif; ?>
</main>
</body>
</html>
