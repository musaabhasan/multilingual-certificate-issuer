<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

$user = app_current_user();
$next = (string) ($_GET['next'] ?? $_POST['next'] ?? '/');
if (!str_starts_with($next, '/') || str_starts_with($next, '//')) {
    $next = '/';
}

if ($user === null) {
    header('Location: /login.php?next=' . rawurlencode($_SERVER['REQUEST_URI'] ?? '/'));
    exit;
}

if (!app_mfa_required($user)) {
    header('Location: ' . $next);
    exit;
}

$error = '';
$message = '';
$recoveryCodes = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (!app_csrf_token_is_valid($_POST['csrf_token'] ?? '')) {
            throw new RuntimeException('Invalid CSRF token.');
        }

        app_enforce_rate_limit('mfa', app_client_ip() . ':' . (string) $user['id'], 12, 900);
        $intent = (string) ($_POST['intent'] ?? '');
        $code = (string) ($_POST['code'] ?? '');

        if ($intent === 'confirm-enrollment') {
            $result = app_mfa_confirm_enrollment((string) $user['id'], $code);
            app_mfa_mark_verified($result['user'], 'enrollment');
            $user = $result['user'];
            $recoveryCodes = $result['recoveryCodes'];
            $message = 'MFA is enabled. Store these recovery codes before continuing.';
        } elseif ($intent === 'verify') {
            $result = app_mfa_verify_challenge((string) $user['id'], $code);
            app_mfa_mark_verified($result['user'], (string) $result['method']);
            header('Location: ' . $next);
            exit;
        } elseif ($intent === 'regenerate-recovery') {
            if (!app_mfa_session_verified($user)) {
                throw new RuntimeException('Verify MFA before regenerating recovery codes.');
            }
            $recoveryCodes = app_mfa_regenerate_recovery_codes((string) $user['id'], $code);
            $user = app_find_user((string) $user['id']) ?? $user;
            $message = 'Recovery codes regenerated. Store these new codes before leaving this page.';
        } else {
            throw new RuntimeException('Unknown MFA action.');
        }
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
        $user = app_find_user((string) ($user['id'] ?? '')) ?? $user;
    }
}

$enrollment = null;
if (!app_mfa_enabled($user) && $recoveryCodes === []) {
    $enrollment = app_mfa_start_enrollment((string) $user['id']);
    $user = $enrollment['user'];
}

$isVerified = app_mfa_session_verified($user);
$isEnabled = app_mfa_enabled($user);
$remainingRecoveryCodes = app_mfa_recovery_remaining($user);

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
    <title>Administrator MFA - Certificate Issuer</title>
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
        <a href="/mfa.php" aria-current="page">MFA</a>
        <a href="/admin.php">Admin</a>
        <a href="/logout.php">Logout</a>
    </nav>
</header>

<main class="shell narrow">
    <section class="page-title compact">
        <div>
            <p class="eyebrow">Account security</p>
            <h1>Administrator MFA</h1>
            <p>Administrator accounts must enroll an authenticator app before accessing platform management tools.</p>
        </div>
        <div class="actions">
            <span class="status <?= $isEnabled ? 'ready' : 'warning' ?>"><?= $isEnabled ? 'Enabled' : 'Enrollment required' ?></span>
        </div>
    </section>

    <?php if ($error !== ''): ?>
        <div class="alert failed"><?= e($error) ?></div>
    <?php endif; ?>
    <?php if ($message !== ''): ?>
        <div class="alert ready"><?= e($message) ?></div>
    <?php endif; ?>

    <?php if ($recoveryCodes !== []): ?>
        <section class="panel">
            <div class="panel-header">
                <h2>Recovery codes</h2>
                <span class="status ready"><?= count($recoveryCodes) ?> codes</span>
            </div>
            <p>Each code can be used once if the authenticator app is unavailable.</p>
            <div class="recovery-grid" aria-label="Recovery codes">
                <?php foreach ($recoveryCodes as $code): ?>
                    <code><?= e($code) ?></code>
                <?php endforeach; ?>
            </div>
            <div class="action-row mfa-actions">
                <a class="button primary" href="<?= e($next) ?>">Continue</a>
                <a class="button" href="/mfa.php?next=<?= e(rawurlencode($next)) ?>">Back to MFA</a>
            </div>
        </section>
    <?php elseif (!$isEnabled && $enrollment !== null): ?>
        <section class="panel">
            <div class="panel-header">
                <h2>Enroll authenticator app</h2>
                <span class="status warning">Required</span>
            </div>
            <p>Add this account to an authenticator app, then enter the current 6-digit code to confirm enrollment.</p>

            <div class="mfa-setup-grid">
                <div>
                    <span class="metric-label">Manual setup key</span>
                    <code class="secret-box"><?= e((string) $enrollment['secret']) ?></code>
                </div>
                <div>
                    <span class="metric-label">Authenticator URI</span>
                    <a class="button" href="<?= e((string) $enrollment['uri']) ?>">Open setup link</a>
                </div>
            </div>

            <form method="post" class="auth-form mfa-form">
                <input type="hidden" name="csrf_token" value="<?= e(app_csrf_token()) ?>">
                <input type="hidden" name="intent" value="confirm-enrollment">
                <input type="hidden" name="next" value="<?= e($next) ?>">
                <label>Current authenticator code <input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" required></label>
                <button class="primary" type="submit">Confirm and enable MFA</button>
            </form>
        </section>
    <?php elseif (!$isVerified): ?>
        <section class="panel">
            <div class="panel-header">
                <h2>Verify administrator access</h2>
                <span class="status locked">MFA required</span>
            </div>
            <p>Enter a current authenticator code, or use one unused recovery code.</p>
            <form method="post" class="auth-form mfa-form">
                <input type="hidden" name="csrf_token" value="<?= e(app_csrf_token()) ?>">
                <input type="hidden" name="intent" value="verify">
                <input type="hidden" name="next" value="<?= e($next) ?>">
                <label>Authenticator or recovery code <input name="code" type="text" autocomplete="one-time-code" required></label>
                <button class="primary" type="submit">Verify and continue</button>
            </form>
        </section>
    <?php else: ?>
        <section class="workspace">
            <article class="panel span-2">
                <div class="panel-header">
                    <h2>MFA is active</h2>
                    <span class="status ready"><?= $remainingRecoveryCodes ?> recovery codes left</span>
                </div>
                <p>This administrator account is protected with an authenticator app. Recovery codes remain valid until used or regenerated.</p>
                <div class="action-row mfa-actions">
                    <a class="button primary" href="<?= e($next) ?>">Continue</a>
                    <a class="button" href="/admin.php">Admin panel</a>
                </div>
            </article>

            <article class="panel">
                <div class="panel-header">
                    <h2>Regenerate recovery codes</h2>
                    <span class="status warning">Replaces old codes</span>
                </div>
                <form method="post" class="auth-form">
                    <input type="hidden" name="csrf_token" value="<?= e(app_csrf_token()) ?>">
                    <input type="hidden" name="intent" value="regenerate-recovery">
                    <input type="hidden" name="next" value="<?= e($next) ?>">
                    <label>Current authenticator code <input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" required></label>
                    <button type="submit">Regenerate codes</button>
                </form>
            </article>
        </section>
    <?php endif; ?>
</main>
</body>
</html>
