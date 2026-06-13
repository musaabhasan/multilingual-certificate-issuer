<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

$error = '';
$setupRequired = !app_users_exist();
$next = (string) ($_GET['next'] ?? '/');
if (!str_starts_with($next, '/')) {
    $next = '/';
}

if (app_current_user() !== null && !$setupRequired) {
    header('Location: ' . $next);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if ($setupRequired) {
            app_enforce_rate_limit('setup', app_client_ip(), 5, 900);
            $password = (string) ($_POST['password'] ?? '');
            $confirm = (string) ($_POST['confirm_password'] ?? '');
            if ($password !== $confirm) {
                throw new RuntimeException('Password confirmation does not match.');
            }

            $user = app_create_user(
                (string) ($_POST['name'] ?? ''),
                (string) ($_POST['email'] ?? ''),
                $password,
                'administrator'
            );
            session_regenerate_id(true);
            $_SESSION['user_id'] = (string) $user['id'];
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            $_SESSION['last_activity'] = time();
            app_audit('auth.setup_completed', 'user', (string) $user['id']);
            header('Location: /admin.php');
            exit;
        }

        $email = (string) ($_POST['email'] ?? '');
        app_enforce_rate_limit('login', app_client_ip() . ':' . strtolower(trim($email)), 8, 900);
        app_login($email, (string) ($_POST['password'] ?? ''));
        header('Location: ' . $next);
        exit;
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
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
    <title><?= $setupRequired ? 'Set Up Administrator' : 'Sign In' ?> - Certificate Issuer</title>
    <link rel="stylesheet" href="/assets/app.css">
</head>
<body>
<main class="auth-shell">
    <section class="auth-card">
        <p class="eyebrow">Certificate Issuer</p>
        <h1><?= $setupRequired ? 'Create administrator account' : 'Sign in' ?></h1>
        <p><?= $setupRequired ? 'Create the first administrator before using the platform.' : 'Use your platform username and password to manage templates, campaigns, queue, and SMTP settings.' ?></p>

        <?php if ($error !== ''): ?>
            <div class="alert failed"><?= e($error) ?></div>
        <?php endif; ?>

        <form method="post" class="auth-form">
            <?php if ($setupRequired): ?>
                <label>Name <input name="name" type="text" required autocomplete="name"></label>
            <?php endif; ?>
            <label>Email <input name="email" type="email" required autocomplete="username"></label>
            <label>Password <input name="password" type="password" required autocomplete="<?= $setupRequired ? 'new-password' : 'current-password' ?>"></label>
            <?php if ($setupRequired): ?>
                <label>Confirm password <input name="confirm_password" type="password" required autocomplete="new-password"></label>
                <p class="form-note">Password policy: at least 14 characters with uppercase, lowercase, number, and symbol.</p>
            <?php endif; ?>
            <button class="primary" type="submit"><?= $setupRequired ? 'Create admin and sign in' : 'Sign in' ?></button>
        </form>
    </section>
</main>
</body>
</html>
