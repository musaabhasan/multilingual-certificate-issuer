<?php

declare(strict_types=1);

use CertificateIssuer\Certificate\CertificateRenderer;
use CertificateIssuer\Certificate\TemplateLayout;
use CertificateIssuer\Mail\EmailTemplateRenderer;
use CertificateIssuer\Security\PasswordPolicy;
use CertificateIssuer\Support\Env;
use Endroid\QrCode\Color\Color;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use PHPMailer\PHPMailer\PHPMailer;
use RobThree\Auth\TwoFactorAuth;

require_once dirname(__DIR__) . '/vendor/autoload.php';

Env::load(dirname(__DIR__) . '/.env');
date_default_timezone_set(Env::get('APP_TIMEZONE', 'UTC') ?: 'UTC');

if (PHP_SAPI !== 'cli') {
    app_send_security_headers();
}

if (PHP_SAPI !== 'cli' && session_status() !== PHP_SESSION_ACTIVE) {
    session_name('certificate_issuer_session');
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => app_is_https() || app_env_bool('APP_FORCE_HTTPS', false),
    ]);
    session_start();
}

chdir(dirname(__DIR__));

function app_env_bool(string $key, bool $default): bool
{
    $value = Env::get($key);
    if ($value === null || $value === '') {
        return $default;
    }

    return in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
}

function app_is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }

    return strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

function app_send_security_headers(): void
{
    if (headers_sent()) {
        return;
    }

    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
}

function app_storage_path(string $path = ''): string
{
    $base = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'app';
    if (!is_dir($base)) {
        mkdir($base, 0750, true);
    }

    return $path === '' ? $base : $base . DIRECTORY_SEPARATOR . $path;
}

function app_now(): string
{
    return gmdate('c');
}

function app_json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    exit;
}

function app_read_json(string $path, array $default): array
{
    if (!is_file($path)) {
        return $default;
    }

    $json = file_get_contents($path);
    if ($json === false || trim($json) === '') {
        return $default;
    }

    $decoded = json_decode($json, true);
    return is_array($decoded) ? $decoded : $default;
}

function app_write_json(string $path, array $data): void
{
    $directory = dirname($path);
    if (!is_dir($directory)) {
        mkdir($directory, 0750, true);
    }

    $tmp = $path . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    rename($tmp, $path);
    @chmod($path, 0640);
}

function app_slug(string $value): string
{
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $value) ?? ''));
    $slug = trim($slug, '-');
    return $slug !== '' ? substr($slug, 0, 64) : 'item';
}

function app_seed_state(): array
{
    return [
        'templates' => [
            [
                'id' => 'template-cybersecurity',
                'name' => 'Cybersecurity Awareness Certificate',
                'status' => 'approved',
                'updatedAt' => '2026-05-05T08:00:00.000Z',
                'layout' => [
                    'page' => ['width' => 297, 'height' => 210, 'orientation' => 'landscape'],
                    'background' => 'storage/uploads/backgrounds/cybersecurity-certificate.png',
                    'backgroundFit' => 'cover',
                    'elements' => [
                        app_seed_field('recipient_name_en', 'Recipient Name', 'name_en', 87, 80, 'ltr', 22),
                        app_seed_field('recipient_name_ar', 'اسم المستلم', 'name_ar', 88, 98, 'rtl', 24, 'bukra_book_slanted'),
                        app_seed_field('program_en', 'Program', 'program_en', 92, 122, 'ltr', 16),
                        app_seed_verification_qr(251, 164),
                    ],
                ],
            ],
            [
                'id' => 'template-digital-transformation',
                'name' => 'Digital Transformation Certificate',
                'status' => 'draft',
                'updatedAt' => '2026-05-06T09:00:00.000Z',
                'layout' => [
                    'page' => ['width' => 297, 'height' => 210, 'orientation' => 'landscape'],
                    'background' => 'storage/uploads/backgrounds/digital-transformation.png',
                    'backgroundFit' => 'contain',
                    'elements' => [
                        app_seed_field('recipient_name_en', 'Recipient Name', 'name_en', 86, 82, 'ltr', 22),
                        app_seed_field('recipient_name_ar', 'اسم المستلم', 'name_ar', 86, 101, 'rtl', 24, 'bukra_book_slanted'),
                        app_seed_field('issue_date', 'Issue Date', 'issue_date', 122, 148, 'ltr', 13),
                        app_seed_verification_qr(251, 164),
                    ],
                ],
            ],
        ],
        'campaigns' => [],
    ];
}

function app_seed_field(string $key, string $label, string $source, float $x, float $y, string $direction, int $fontSize, string $font = 'dejavusans'): array
{
    return [
        'type' => 'csv_text',
        'key' => $key,
        'label' => $label,
        'source' => $source,
        'x' => $x,
        'y' => $y,
        'width' => 120,
        'height' => 14,
        'font' => $font,
        'fontSize' => $fontSize,
        'align' => 'center',
        'direction' => $direction,
        'color' => '#111827',
    ];
}

function app_seed_verification_qr(float $x, float $y): array
{
    return [
        'type' => 'verification_qr',
        'key' => 'verification_qr',
        'label' => 'Verification QR',
        'x' => $x,
        'y' => $y,
        'width' => 28,
        'height' => 28,
        'fit' => 'contain',
    ];
}

function app_state(): array
{
    $state = app_read_json(app_storage_path('state.json'), app_seed_state());
    return [
        'templates' => is_array($state['templates'] ?? null) ? $state['templates'] : [],
        'campaigns' => is_array($state['campaigns'] ?? null) ? $state['campaigns'] : [],
    ];
}

function app_save_state(array $state): void
{
    app_write_json(app_storage_path('state.json'), app_validate_state($state));
}

function app_validate_state(array $state): array
{
    $templates = is_array($state['templates'] ?? null) ? array_values($state['templates']) : [];
    $campaigns = is_array($state['campaigns'] ?? null) ? array_values($state['campaigns']) : [];

    if (count($templates) > 300) {
        throw new RuntimeException('Template limit exceeded.');
    }

    if (count($campaigns) > 200) {
        throw new RuntimeException('Campaign limit exceeded.');
    }

    foreach ($templates as $template) {
        if (!is_array($template) || trim((string) ($template['id'] ?? '')) === '' || trim((string) ($template['name'] ?? '')) === '') {
            throw new RuntimeException('Each template requires an id and name.');
        }

        $elements = $template['layout']['elements'] ?? [];
        if (is_array($elements) && count($elements) > 200) {
            throw new RuntimeException('Template item limit exceeded.');
        }
    }

    foreach ($campaigns as $campaign) {
        if (!is_array($campaign) || trim((string) ($campaign['id'] ?? '')) === '' || trim((string) ($campaign['name'] ?? '')) === '') {
            throw new RuntimeException('Each campaign requires an id and name.');
        }

        $queue = is_array($campaign['recipientQueue'] ?? null) ? $campaign['recipientQueue'] : [];
        if (count($queue) > 10000) {
            throw new RuntimeException('Recipient limit exceeded for one campaign.');
        }

        foreach ($queue as $recipient) {
            if (!is_array($recipient)) {
                throw new RuntimeException('Recipient queue records must be objects.');
            }

            $recipientData = is_array($recipient['data'] ?? null) ? $recipient['data'] : [];
            $email = trim((string) ($recipient['email'] ?? ($recipientData['email'] ?? '')));
            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new RuntimeException('Recipient email is invalid.');
            }
        }
    }

    return ['templates' => $templates, 'campaigns' => $campaigns];
}

function app_default_settings(): array
{
    return [
        'platform' => [
            'name' => 'Certificate Issuer',
            'publicBaseUrl' => 'http://127.0.0.1:8080',
        ],
        'smtp' => [
            'profileName' => 'Institution SMTP',
            'deliveryMode' => 'log',
            'host' => '',
            'port' => 587,
            'encryption' => 'tls',
            'username' => '',
            'encryptedPassword' => '',
            'fromAddress' => '',
            'fromName' => 'Certificate Issuer',
            'graphTenantId' => '',
            'graphClientId' => '',
            'encryptedGraphClientSecret' => '',
            'graphSender' => '',
        ],
        'security' => [
            'sessionTimeoutMinutes' => 120,
            'passwordRotationDays' => 90,
        ],
    ];
}

function app_settings(): array
{
    return array_replace_recursive(app_default_settings(), app_read_json(app_storage_path('settings.json'), []));
}

function app_public_settings(): array
{
    $settings = app_settings();
    $settings['smtp']['hasPassword'] = ($settings['smtp']['encryptedPassword'] ?? '') !== '';
    $settings['smtp']['hasGraphClientSecret'] = ($settings['smtp']['encryptedGraphClientSecret'] ?? '') !== '';
    unset($settings['smtp']['encryptedPassword']);
    unset($settings['smtp']['encryptedGraphClientSecret']);
    return $settings;
}

function app_normalize_settings(array $input, ?array $current = null, bool $strictDelivery = true): array
{
    $current ??= app_settings();
    $smtp = is_array($input['smtp'] ?? null) ? $input['smtp'] : [];
    $platform = is_array($input['platform'] ?? null) ? $input['platform'] : [];
    $security = is_array($input['security'] ?? null) ? $input['security'] : [];

    $current['platform']['name'] = trim((string) ($platform['name'] ?? $current['platform']['name']));
    $current['platform']['publicBaseUrl'] = trim((string) ($platform['publicBaseUrl'] ?? $current['platform']['publicBaseUrl']));
    if ($current['platform']['name'] === '') {
        throw new RuntimeException('Platform name is required.');
    }
    if (!filter_var($current['platform']['publicBaseUrl'], FILTER_VALIDATE_URL) || !preg_match('/^https?:\/\//', $current['platform']['publicBaseUrl'])) {
        throw new RuntimeException('Public base URL must be a valid HTTP or HTTPS URL.');
    }
    $current['security']['sessionTimeoutMinutes'] = min(1440, max(15, (int) ($security['sessionTimeoutMinutes'] ?? $current['security']['sessionTimeoutMinutes'])));
    $current['security']['passwordRotationDays'] = min(365, max(1, (int) ($security['passwordRotationDays'] ?? $current['security']['passwordRotationDays'])));

    $current['smtp']['profileName'] = trim((string) ($smtp['profileName'] ?? $current['smtp']['profileName']));
    $deliveryMode = (string) ($smtp['deliveryMode'] ?? $current['smtp']['deliveryMode'] ?? 'log');
    $current['smtp']['deliveryMode'] = in_array($deliveryMode, ['log', 'smtp', 'graph'], true) ? $deliveryMode : 'log';
    $current['smtp']['host'] = trim((string) ($smtp['host'] ?? $current['smtp']['host']));
    $current['smtp']['port'] = min(65535, max(1, (int) ($smtp['port'] ?? $current['smtp']['port'])));
    $encryption = (string) ($smtp['encryption'] ?? $current['smtp']['encryption'] ?? 'tls');
    $current['smtp']['encryption'] = in_array($encryption, ['tls', 'ssl'], true) ? $encryption : 'tls';
    $current['smtp']['username'] = trim((string) ($smtp['username'] ?? $current['smtp']['username']));
    $current['smtp']['fromAddress'] = trim((string) ($smtp['fromAddress'] ?? $current['smtp']['fromAddress']));
    $current['smtp']['fromName'] = trim((string) ($smtp['fromName'] ?? $current['smtp']['fromName']));
    $current['smtp']['graphTenantId'] = trim((string) ($smtp['graphTenantId'] ?? $current['smtp']['graphTenantId'] ?? ''));
    $current['smtp']['graphClientId'] = trim((string) ($smtp['graphClientId'] ?? $current['smtp']['graphClientId'] ?? ''));
    $current['smtp']['graphSender'] = strtolower(trim((string) ($smtp['graphSender'] ?? $current['smtp']['graphSender'] ?? '')));

    $plainPassword = (string) ($smtp['password'] ?? '');
    if ($plainPassword !== '') {
        $current['smtp']['encryptedPassword'] = app_encrypt_secret($plainPassword);
    }

    $plainGraphSecret = (string) ($smtp['graphClientSecret'] ?? '');
    if ($plainGraphSecret !== '') {
        $current['smtp']['encryptedGraphClientSecret'] = app_encrypt_secret($plainGraphSecret);
    }

    if ($current['smtp']['fromAddress'] !== '' && !filter_var($current['smtp']['fromAddress'], FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('SMTP from address is invalid.');
    }
    if ($current['smtp']['graphSender'] !== '' && !filter_var($current['smtp']['graphSender'], FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Microsoft Graph sender mailbox is invalid.');
    }

    if (!$strictDelivery) {
        return $current;
    }

    if ($current['smtp']['deliveryMode'] === 'smtp') {
        foreach (['host', 'username', 'fromAddress'] as $required) {
            if (($current['smtp'][$required] ?? '') === '') {
                throw new RuntimeException('SMTP mode requires host, username, and from address.');
            }
        }

        if (($current['smtp']['encryptedPassword'] ?? '') === '') {
            throw new RuntimeException('SMTP mode requires a password.');
        }
    } elseif ($current['smtp']['deliveryMode'] === 'graph') {
        foreach (['graphTenantId', 'graphClientId', 'graphSender'] as $required) {
            if (($current['smtp'][$required] ?? '') === '') {
                throw new RuntimeException('Microsoft Graph mode requires tenant ID, client ID, and sender mailbox.');
            }
        }

        if (($current['smtp']['encryptedGraphClientSecret'] ?? '') === '') {
            throw new RuntimeException('Microsoft Graph mode requires a client secret.');
        }
    }

    return $current;
}

function app_save_settings(array $input): array
{
    $current = app_normalize_settings($input);
    app_write_json(app_storage_path('settings.json'), $current);
    app_audit('settings.updated', 'settings', null, ['smtp_mode' => $current['smtp']['deliveryMode']]);
    return app_public_settings();
}

function app_users(): array
{
    return app_read_json(app_storage_path('users.json'), []);
}

function app_save_users(array $users): void
{
    app_write_json(app_storage_path('users.json'), array_values($users));
}

function app_users_exist(): bool
{
    return count(app_users()) > 0;
}

function app_sanitize_user(array $user): array
{
    unset($user['passwordHash']);
    $user['mfa'] = [
        'required' => app_mfa_required($user),
        'enabled' => app_mfa_enabled($user),
        'verified' => app_mfa_session_verified($user),
        'enabledAt' => (string) (app_user_mfa($user)['enabledAt'] ?? ''),
        'recoveryCodesRemaining' => app_mfa_recovery_remaining($user),
    ];
    return $user;
}

function app_current_user(): ?array
{
    $timeoutSeconds = max(15, (int) (app_settings()['security']['sessionTimeoutMinutes'] ?? 120)) * 60;
    $lastActivity = (int) ($_SESSION['last_activity'] ?? time());
    if (isset($_SESSION['user_id']) && time() - $lastActivity > $timeoutSeconds) {
        app_clear_auth_session();
        return null;
    }
    $_SESSION['last_activity'] = time();

    $userId = $_SESSION['user_id'] ?? null;
    if (!is_string($userId) || $userId === '') {
        return null;
    }

    foreach (app_users() as $user) {
        if (($user['id'] ?? '') === $userId && empty($user['lockedAt'])) {
            return $user;
        }
    }

    return null;
}

function app_require_auth(bool $json = false): array
{
    $user = app_current_user();
    if ($user !== null) {
        if (app_mfa_action_required($user)) {
            if ($json) {
                app_json_response([
                    'error' => 'Administrator MFA is required.',
                    'mfaRequired' => true,
                    'mfaEnrollmentRequired' => !app_mfa_enabled($user),
                ], 428);
            }

            $next = rawurlencode($_SERVER['REQUEST_URI'] ?? '/');
            header('Location: /mfa.php?next=' . $next);
            exit;
        }

        return $user;
    }

    if ($json) {
        app_json_response(['error' => 'Authentication required.'], 401);
    }

    $next = rawurlencode($_SERVER['REQUEST_URI'] ?? '/');
    header('Location: /login.php?next=' . $next);
    exit;
}

function app_require_write_access(array $user, bool $json = true): void
{
    if (!in_array(($user['role'] ?? ''), ['administrator', 'designer', 'operator'], true)) {
        if ($json) {
            app_json_response(['error' => 'Write access required.'], 403);
        }

        throw new RuntimeException('Write access required.');
    }
}

function app_require_delivery_access(array $user, bool $json = true): void
{
    if (!in_array(($user['role'] ?? ''), ['administrator', 'operator'], true)) {
        if ($json) {
            app_json_response(['error' => 'Delivery access required.'], 403);
        }

        throw new RuntimeException('Delivery access required.');
    }
}

function app_csrf_token(): string
{
    if (empty($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function app_verify_csrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    if (!app_csrf_token_is_valid($provided)) {
        app_json_response(['error' => 'Invalid CSRF token.'], 419);
    }
}

function app_csrf_token_is_valid(mixed $provided): bool
{
    return is_string($provided) && hash_equals(app_csrf_token(), $provided);
}

function app_create_user(string $name, string $email, string $password, string $role = 'administrator'): array
{
    $name = trim($name);
    $email = strtolower(trim($email));
    $role = in_array($role, ['administrator', 'designer', 'operator', 'auditor'], true) ? $role : 'operator';

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('A valid name and email are required.');
    }

    $policy = new PasswordPolicy((int) app_settings()['security']['passwordRotationDays']);
    $errors = $policy->validateStrength($password);
    if ($errors !== []) {
        throw new RuntimeException(implode(' ', $errors));
    }

    $users = app_users();
    foreach ($users as $existing) {
        if (strtolower((string) ($existing['email'] ?? '')) === $email) {
            throw new RuntimeException('A user with this email already exists.');
        }
    }

    $user = [
        'id' => 'user-' . bin2hex(random_bytes(8)),
        'name' => $name,
        'email' => $email,
        'role' => $role,
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        'passwordChangedAt' => app_now(),
        'lastLoginAt' => '',
        'lockedAt' => '',
        'mfa' => [
            'secretEncrypted' => '',
            'enabledAt' => '',
            'pendingSecretEncrypted' => '',
            'pendingStartedAt' => '',
            'recoveryCodes' => [],
            'recoveryCodesUpdatedAt' => '',
        ],
        'createdAt' => app_now(),
        'updatedAt' => app_now(),
    ];

    $users[] = $user;
    app_save_users($users);
    app_audit('user.created', 'user', $user['id'], ['email' => $email, 'role' => $role]);
    return $user;
}

function app_login(string $email, string $password): array
{
    $users = app_users();
    foreach ($users as $index => $user) {
        if (strtolower((string) ($user['email'] ?? '')) !== strtolower(trim($email))) {
            continue;
        }

        if (!empty($user['lockedAt']) || !password_verify($password, (string) ($user['passwordHash'] ?? ''))) {
            break;
        }

        session_regenerate_id(true);
        unset($_SESSION['mfa_verified_user_id'], $_SESSION['mfa_verified_at']);
        $_SESSION['user_id'] = (string) $user['id'];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['last_activity'] = time();
        $users[$index]['lastLoginAt'] = app_now();
        $users[$index]['updatedAt'] = app_now();
        app_save_users($users);
        app_audit('auth.login', 'user', (string) $user['id'], ['email' => $user['email']]);
        return $users[$index];
    }

    app_audit('auth.failed', 'user', null, ['email' => strtolower(trim($email))]);
    throw new RuntimeException('Invalid email or password.');
}

function app_clear_auth_session(): void
{
    unset(
        $_SESSION['user_id'],
        $_SESSION['csrf_token'],
        $_SESSION['last_activity'],
        $_SESSION['mfa_verified_user_id'],
        $_SESSION['mfa_verified_at']
    );
}

function app_user_mfa(array $user): array
{
    return is_array($user['mfa'] ?? null) ? $user['mfa'] : [];
}

function app_mfa_required(array $user): bool
{
    return ($user['role'] ?? '') === 'administrator';
}

function app_mfa_enabled(array $user): bool
{
    $mfa = app_user_mfa($user);
    return app_mfa_required($user)
        && (string) ($mfa['enabledAt'] ?? '') !== ''
        && (string) ($mfa['secretEncrypted'] ?? '') !== '';
}

function app_mfa_session_verified(array $user): bool
{
    return app_mfa_enabled($user)
        && (string) ($_SESSION['mfa_verified_user_id'] ?? '') === (string) ($user['id'] ?? '')
        && !empty($_SESSION['mfa_verified_at']);
}

function app_mfa_action_required(array $user): bool
{
    return app_mfa_required($user) && (!app_mfa_enabled($user) || !app_mfa_session_verified($user));
}

function app_mfa_recovery_remaining(array $user): int
{
    $codes = app_user_mfa($user)['recoveryCodes'] ?? [];
    if (!is_array($codes)) {
        return 0;
    }

    return count(array_filter($codes, static fn (mixed $record): bool => is_array($record) && empty($record['usedAt'])));
}

function app_mfa_service(): TwoFactorAuth
{
    $issuer = (string) (app_settings()['platform']['name'] ?? 'Certificate Issuer');
    return new TwoFactorAuth($issuer !== '' ? $issuer : 'Certificate Issuer');
}

function app_mfa_label(array $user): string
{
    $email = (string) ($user['email'] ?? 'administrator');
    $issuer = (string) (app_settings()['platform']['name'] ?? 'Certificate Issuer');
    return ($issuer !== '' ? $issuer : 'Certificate Issuer') . ':' . $email;
}

function app_find_user(string $userId): ?array
{
    foreach (app_users() as $user) {
        if ((string) ($user['id'] ?? '') === $userId) {
            return $user;
        }
    }

    return null;
}

function app_update_user_record(string $userId, callable $callback): array
{
    $users = app_users();
    foreach ($users as $index => $user) {
        if ((string) ($user['id'] ?? '') !== $userId) {
            continue;
        }

        $updated = $callback($user);
        if (!is_array($updated)) {
            throw new RuntimeException('User update failed.');
        }

        $updated['updatedAt'] = app_now();
        $users[$index] = $updated;
        app_save_users($users);
        return $updated;
    }

    throw new RuntimeException('User not found.');
}

function app_mfa_start_enrollment(string $userId): array
{
    $secret = '';
    $user = app_update_user_record($userId, static function (array $user) use (&$secret): array {
        if (!app_mfa_required($user)) {
            throw new RuntimeException('MFA enrollment is only required for administrators.');
        }

        if (app_mfa_enabled($user)) {
            throw new RuntimeException('MFA is already enabled for this administrator.');
        }

        $mfa = app_user_mfa($user);
        $pendingStartedAt = strtotime((string) ($mfa['pendingStartedAt'] ?? '')) ?: 0;
        $secret = app_decrypt_secret((string) ($mfa['pendingSecretEncrypted'] ?? ''));
        if ($secret === '' || $pendingStartedAt < time() - 3600) {
            $secret = app_mfa_service()->createSecret(160);
            $mfa['pendingSecretEncrypted'] = app_encrypt_secret($secret);
            $mfa['pendingStartedAt'] = app_now();
        }

        $user['mfa'] = $mfa;
        return $user;
    });

    $uri = app_mfa_service()->getQRText(app_mfa_label($user), $secret);
    return [
        'secret' => $secret,
        'uri' => $uri,
        'qrDataUri' => app_qr_data_uri($uri),
        'user' => $user,
    ];
}

function app_qr_data_uri(string $text, int $size = 260, int $margin = 12): string
{
    if (!class_exists(QrCode::class) || !extension_loaded('gd')) {
        return '';
    }

    try {
        $qrCode = QrCode::create($text)
            ->setEncoding(new Encoding('UTF-8'))
            ->setErrorCorrectionLevel(ErrorCorrectionLevel::Medium)
            ->setSize(max(96, min(800, $size)))
            ->setMargin(max(0, min(40, $margin)))
            ->setRoundBlockSizeMode(RoundBlockSizeMode::Margin)
            ->setForegroundColor(new Color(15, 23, 42))
            ->setBackgroundColor(new Color(255, 255, 255));

        return (new PngWriter())->write($qrCode)->getDataUri();
    } catch (Throwable) {
        return '';
    }
}

function app_mfa_confirm_enrollment(string $userId, string $code): array
{
    $recoveryCodes = [];
    $updated = app_update_user_record($userId, static function (array $user) use ($code, &$recoveryCodes): array {
        if (!app_mfa_required($user)) {
            throw new RuntimeException('MFA enrollment is only required for administrators.');
        }

        $mfa = app_user_mfa($user);
        $secret = app_decrypt_secret((string) ($mfa['pendingSecretEncrypted'] ?? ''));
        if ($secret === '') {
            throw new RuntimeException('Start MFA enrollment before confirming it.');
        }

        if (!app_mfa_verify_totp($secret, $code)) {
            throw new RuntimeException('The authenticator code is invalid.');
        }

        $recoveryCodes = app_mfa_generate_recovery_codes();
        $user['mfa'] = [
            'secretEncrypted' => app_encrypt_secret($secret),
            'enabledAt' => app_now(),
            'pendingSecretEncrypted' => '',
            'pendingStartedAt' => '',
            'recoveryCodes' => app_mfa_hash_recovery_codes($recoveryCodes),
            'recoveryCodesUpdatedAt' => app_now(),
            'lastVerifiedAt' => app_now(),
        ];
        return $user;
    });

    app_audit('mfa.enabled', 'user', $userId);
    return ['user' => $updated, 'recoveryCodes' => $recoveryCodes];
}

function app_mfa_verify_challenge(string $userId, string $code): array
{
    $user = app_find_user($userId);
    if ($user === null || !app_mfa_enabled($user)) {
        throw new RuntimeException('MFA is not enabled for this administrator.');
    }

    $secret = app_decrypt_secret((string) (app_user_mfa($user)['secretEncrypted'] ?? ''));
    if ($secret !== '' && app_mfa_verify_totp($secret, $code)) {
        $updated = app_update_user_record($userId, static function (array $user): array {
            $mfa = app_user_mfa($user);
            $mfa['lastVerifiedAt'] = app_now();
            $user['mfa'] = $mfa;
            return $user;
        });
        return ['method' => 'totp', 'user' => $updated];
    }

    $normalized = app_mfa_normalize_recovery_code($code);
    if ($normalized === '') {
        throw new RuntimeException('The authenticator or recovery code is invalid.');
    }

    $matched = false;
    $updated = app_update_user_record($userId, static function (array $user) use ($normalized, &$matched): array {
        $mfa = app_user_mfa($user);
        $codes = is_array($mfa['recoveryCodes'] ?? null) ? $mfa['recoveryCodes'] : [];

        foreach ($codes as $index => $record) {
            if (!is_array($record) || !empty($record['usedAt'])) {
                continue;
            }

            if (password_verify($normalized, (string) ($record['hash'] ?? ''))) {
                $codes[$index]['usedAt'] = app_now();
                $matched = true;
                break;
            }
        }

        if (!$matched) {
            throw new RuntimeException('The authenticator or recovery code is invalid.');
        }

        $mfa['recoveryCodes'] = $codes;
        $mfa['lastVerifiedAt'] = app_now();
        $user['mfa'] = $mfa;
        return $user;
    });

    app_audit('mfa.recovery_used', 'user', $userId);
    return ['method' => 'recovery', 'user' => $updated];
}

function app_mfa_regenerate_recovery_codes(string $userId, string $code): array
{
    $user = app_find_user($userId);
    if ($user === null || !app_mfa_enabled($user)) {
        throw new RuntimeException('MFA is not enabled for this administrator.');
    }

    $secret = app_decrypt_secret((string) (app_user_mfa($user)['secretEncrypted'] ?? ''));
    if ($secret === '' || !app_mfa_verify_totp($secret, $code)) {
        throw new RuntimeException('Enter a current authenticator code to regenerate recovery codes.');
    }

    $recoveryCodes = app_mfa_generate_recovery_codes();
    app_update_user_record($userId, static function (array $user) use ($recoveryCodes): array {
        $mfa = app_user_mfa($user);
        $mfa['recoveryCodes'] = app_mfa_hash_recovery_codes($recoveryCodes);
        $mfa['recoveryCodesUpdatedAt'] = app_now();
        $user['mfa'] = $mfa;
        return $user;
    });

    app_audit('mfa.recovery_regenerated', 'user', $userId);
    return $recoveryCodes;
}

function app_mfa_verify_totp(string $secret, string $code): bool
{
    $digits = preg_replace('/\D+/', '', $code) ?? '';
    if (strlen($digits) !== 6) {
        return false;
    }

    return app_mfa_service()->verifyCode($secret, $digits, 1);
}

function app_mfa_generate_recovery_codes(int $count = 10): array
{
    $codes = [];
    for ($index = 0; $index < $count; $index++) {
        $codes[] = strtoupper(implode('-', str_split(bin2hex(random_bytes(6)), 4)));
    }

    return $codes;
}

function app_mfa_hash_recovery_codes(array $codes): array
{
    return array_map(static fn (string $code): array => [
        'hash' => password_hash(app_mfa_normalize_recovery_code($code), PASSWORD_DEFAULT),
        'createdAt' => app_now(),
        'usedAt' => '',
    ], $codes);
}

function app_mfa_normalize_recovery_code(string $code): string
{
    return strtoupper(preg_replace('/[^A-Za-z0-9]+/', '', $code) ?? '');
}

function app_mfa_mark_verified(array $user, string $method): void
{
    $_SESSION['mfa_verified_user_id'] = (string) ($user['id'] ?? '');
    $_SESSION['mfa_verified_at'] = time();
    $_SESSION['last_activity'] = time();
    app_audit('mfa.verified', 'user', (string) ($user['id'] ?? ''), ['method' => $method]);
}

function app_change_password(string $userId, string $currentPassword, string $newPassword): void
{
    $users = app_users();
    foreach ($users as $index => $user) {
        if (($user['id'] ?? '') !== $userId) {
            continue;
        }

        if (!password_verify($currentPassword, (string) ($user['passwordHash'] ?? ''))) {
            throw new RuntimeException('Current password is incorrect.');
        }

        $policy = new PasswordPolicy((int) app_settings()['security']['passwordRotationDays']);
        $errors = $policy->validateStrength($newPassword);
        if ($errors !== []) {
            throw new RuntimeException(implode(' ', $errors));
        }

        $users[$index]['passwordHash'] = password_hash($newPassword, PASSWORD_DEFAULT);
        $users[$index]['passwordChangedAt'] = app_now();
        $users[$index]['updatedAt'] = app_now();
        app_save_users($users);
        app_audit('user.password_changed', 'user', $userId);
        return;
    }

    throw new RuntimeException('User not found.');
}

function app_key_file(): string
{
    $path = app_storage_path('app-key.bin');
    if (!is_file($path)) {
        file_put_contents($path, random_bytes(SODIUM_CRYPTO_SECRETBOX_KEYBYTES), LOCK_EX);
        @chmod($path, 0600);
    }

    $key = file_get_contents($path);
    if ($key === false || strlen($key) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) {
        throw new RuntimeException('Local encryption key is invalid.');
    }

    return $key;
}

function app_encrypt_secret(string $plainText): string
{
    $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
    return 'local-sodium:' . base64_encode($nonce . sodium_crypto_secretbox($plainText, $nonce, app_key_file()));
}

function app_decrypt_secret(string $encoded): string
{
    if (!str_starts_with($encoded, 'local-sodium:')) {
        return '';
    }

    $payload = base64_decode(substr($encoded, 13), true);
    if ($payload === false || strlen($payload) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
        return '';
    }

    $nonce = substr($payload, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
    $cipherText = substr($payload, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
    $plainText = sodium_crypto_secretbox_open($cipherText, $nonce, app_key_file());
    return is_string($plainText) ? $plainText : '';
}

function app_audit(string $action, string $entityType, ?string $entityId = null, array $metadata = []): void
{
    $path = app_storage_path('audit.log');
    $entry = [
        'at' => app_now(),
        'actor' => $_SESSION['user_id'] ?? null,
        'action' => $action,
        'entityType' => $entityType,
        'entityId' => $entityId,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        'metadata' => $metadata,
    ];
    file_put_contents($path, json_encode($entry, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function app_recent_audit(int $limit = 30): array
{
    $path = app_storage_path('audit.log');
    if (!is_file($path)) {
        return [];
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return [];
    }

    return array_values(array_filter(array_map(static function (string $line): ?array {
        $decoded = json_decode($line, true);
        return is_array($decoded) ? $decoded : null;
    }, array_slice($lines, -$limit))));
}

function app_client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'cli');
}

function app_enforce_rate_limit(string $scope, string $key, int $limit, int $windowSeconds): void
{
    $safeScope = app_slug($scope);
    $path = app_storage_path('rate-limits' . DIRECTORY_SEPARATOR . $safeScope . '.json');
    $now = time();
    $bucketKey = hash('sha256', $key);
    $records = app_read_json($path, []);
    $timestamps = array_values(array_filter(
        is_array($records[$bucketKey] ?? null) ? $records[$bucketKey] : [],
        static fn (mixed $timestamp): bool => is_int($timestamp) && $timestamp > $now - $windowSeconds
    ));

    if (count($timestamps) >= $limit) {
        throw new RuntimeException('Too many attempts. Please wait before trying again.');
    }

    $timestamps[] = $now;
    $records[$bucketKey] = $timestamps;

    foreach ($records as $recordKey => $recordTimestamps) {
        if (!is_array($recordTimestamps)) {
            unset($records[$recordKey]);
            continue;
        }

        $records[$recordKey] = array_values(array_filter(
            $recordTimestamps,
            static fn (mixed $timestamp): bool => is_int($timestamp) && $timestamp > $now - $windowSeconds
        ));
        if ($records[$recordKey] === []) {
            unset($records[$recordKey]);
        }
    }

    app_write_json($path, $records);
}

function app_find_campaign(array $state, string $campaignId): ?array
{
    foreach ($state['campaigns'] as $index => $campaign) {
        if (($campaign['id'] ?? '') === $campaignId) {
            return ['index' => $index, 'campaign' => $campaign];
        }
    }

    return null;
}

function app_find_template(array $state, string $templateId): ?array
{
    foreach ($state['templates'] as $template) {
        if (($template['id'] ?? '') === $templateId) {
            return $template;
        }
    }

    return null;
}

function app_campaign_template(array $state, array $campaign): ?array
{
    $layout = $campaign['campaignTemplateLayout'] ?? null;
    if (is_array($layout)) {
        return [
            'id' => (string) ($campaign['templateId'] ?? ''),
            'name' => (string) ($campaign['campaignTemplateName'] ?? $campaign['templateFileName'] ?? 'Campaign template'),
            'status' => 'approved',
            'campaignOwned' => true,
            'layout' => $layout,
        ];
    }

    return app_find_template($state, (string) ($campaign['templateId'] ?? ''));
}

function app_recipient_status_counts(array $queue): array
{
    $sent = count(array_filter($queue, fn (array $record): bool => ($record['status'] ?? '') === 'sent'));
    $failed = count(array_filter($queue, fn (array $record): bool => ($record['status'] ?? '') === 'failed'));
    $skipped = count(array_filter($queue, fn (array $record): bool => ($record['status'] ?? '') === 'skipped'));
    $rendered = count(array_filter($queue, fn (array $record): bool => in_array(($record['status'] ?? ''), ['rendered', 'sent', 'failed'], true)));

    return [
        'recipients' => count($queue),
        'rendered' => $rendered,
        'sent' => $sent,
        'failed' => $failed,
        'skipped' => $skipped,
    ];
}

function app_pending_recipient_count(array $queue): int
{
    return count(array_filter(
        $queue,
        static fn (array $record): bool => !in_array(($record['status'] ?? 'queued'), ['sent', 'failed', 'skipped'], true)
    ));
}

function app_recommended_window_seconds(array $campaign, int $pendingRecipients): int
{
    if ($pendingRecipients <= 1) {
        return 300;
    }

    $maximum = max(1, (int) ($campaign['randomDelayMaxSeconds'] ?? $campaign['throttleSeconds'] ?? 60));
    return max(300, $maximum * ($pendingRecipients - 1) + 120);
}

function app_campaign_include_verification_link(array $campaign): bool
{
    return filter_var($campaign['includeVerificationLink'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

function app_campaign_email_body_template(array $campaign): string
{
    $bodyTemplate = trim((string) ($campaign['emailBodyHtml'] ?? ''));
    if ($bodyTemplate === '') {
        $bodyTemplate = '<p>Your certificate is attached as a PDF.</p>';
    }

    if (app_campaign_include_verification_link($campaign) && !str_contains($bodyTemplate, 'verification_url')) {
        $bodyTemplate .= '<p>Verification link: <a href="{{verification_url}}">{{verification_url}}</a></p>';
    }

    return $bodyTemplate;
}

function app_campaign_readiness(array $state, array $campaign): array
{
    $template = app_campaign_template($state, $campaign);
    $queue = is_array($campaign['recipientQueue'] ?? null) ? $campaign['recipientQueue'] : [];
    $counts = app_recipient_status_counts($queue);
    $pending = app_pending_recipient_count($queue);
    $labels = array_map(static fn (mixed $label): string => strtolower(trim((string) $label)), is_array($campaign['labels'] ?? null) ? $campaign['labels'] : []);
    $settings = app_settings();
    $checks = [];

    $checks[] = app_readiness_check(
        'template',
        'Certificate template',
        $template !== null ? 'pass' : 'fail',
        $template !== null ? (string) ($template['name'] ?? 'Template selected.') : 'Select or upload a certificate template.'
    );

    $elements = is_array($template['layout']['elements'] ?? null) ? $template['layout']['elements'] : [];
    $checks[] = app_readiness_check(
        'template_items',
        'Certificate fields',
        $template !== null && count($elements) > 0 ? 'pass' : 'warn',
        $template !== null && count($elements) > 0
            ? count($elements) . ' certificate items are positioned.'
            : 'The template has no positioned text, image, or QR items yet.'
    );
    $designReviewedAt = trim((string) ($campaign['designReviewedAt'] ?? ''));
    $checks[] = app_readiness_check(
        'design_review',
        'Certificate preview review',
        $designReviewedAt !== '' ? 'pass' : 'fail',
        $designReviewedAt !== ''
            ? 'A generated certificate preview was reviewed before sending.'
            : 'Generate and review a certificate preview before starting delivery.'
    );

    $checks[] = app_readiness_check(
        'recipient_queue',
        'Recipient CSV',
        $counts['recipients'] > 0 ? 'pass' : 'fail',
        $counts['recipients'] > 0 ? $counts['recipients'] . ' recipients imported.' : 'Upload a CSV file for this campaign.'
    );
    $checks[] = app_readiness_check(
        'pending_recipients',
        'Queued recipients',
        $pending > 0 ? 'pass' : 'fail',
        $pending > 0 ? $pending . ' recipients are ready to send.' : 'There are no queued recipients left to send.'
    );

    foreach (['unique_identifier' => 'Unique identifier', 'email' => 'Email', 'name_en' => 'English name'] as $required => $label) {
        $status = in_array($required, $labels, true) ? 'pass' : ($required === 'email' ? 'fail' : 'warn');
        $checks[] = app_readiness_check(
            'label_' . $required,
            $label . ' label',
            $status,
            $status === 'pass' ? $required . ' is mapped from the campaign CSV.' : 'Add a ' . $required . ' column to the campaign CSV.'
        );
    }

    $invalidEmails = 0;
    foreach ($queue as $recipient) {
        if (in_array(($recipient['status'] ?? 'queued'), ['sent', 'failed', 'skipped'], true)) {
            continue;
        }

        $data = is_array($recipient['data'] ?? null) ? $recipient['data'] : [];
        $email = trim((string) ($recipient['email'] ?? $data['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $invalidEmails += 1;
        }
    }
    $deliveryMode = (string) ($settings['smtp']['deliveryMode'] ?? 'log');
    $checks[] = app_readiness_check(
        'recipient_emails',
        'Recipient email addresses',
        $invalidEmails === 0 ? 'pass' : ($deliveryMode === 'log' ? 'warn' : 'fail'),
        $invalidEmails === 0
            ? 'Queued recipients have usable email addresses.'
            : $invalidEmails . ' queued recipients need a valid email address.'
    );

    $subject = trim((string) ($campaign['emailSubject'] ?? ''));
    $body = trim(strip_tags((string) ($campaign['emailBodyHtml'] ?? '')));
    $rawBody = (string) ($campaign['emailBodyHtml'] ?? '');
    $checks[] = app_readiness_check(
        'email_subject',
        'Email subject',
        $subject !== '' ? 'pass' : 'fail',
        $subject !== '' ? 'Subject is configured.' : 'Add a subject before sending.'
    );
    $checks[] = app_readiness_check(
        'email_body',
        'Email body',
        $body !== '' ? 'pass' : 'fail',
        $body !== '' ? 'Body content is configured.' : 'Add email body content before sending.'
    );
    $checks[] = app_readiness_check(
        'verification_link',
        'Verification link',
        'pass',
        app_campaign_include_verification_link($campaign)
            ? (str_contains($rawBody, 'verification_url')
                ? 'The message includes the certificate verification link.'
                : 'The sending engine will append the verification link after the configured body.')
            : (str_contains($rawBody, 'verification_url')
                ? 'The message body contains a manually inserted verification link.'
                : 'Verification link will not be included in the message body.')
    );

    $randomMin = max(0, (int) ($campaign['randomDelayMinSeconds'] ?? $campaign['throttleSeconds'] ?? 60));
    $randomMax = max(0, (int) ($campaign['randomDelayMaxSeconds'] ?? $randomMin));
    $startAt = app_time_or_null((string) ($campaign['windowStartAt'] ?? $campaign['scheduledAt'] ?? ''));
    $endAt = app_time_or_null((string) ($campaign['windowEndAt'] ?? ''));
    $checks[] = app_readiness_check(
        'send_buffer',
        'Send buffer',
        $randomMax >= $randomMin ? 'pass' : 'fail',
        $randomMax >= $randomMin ? 'Random delay range is valid.' : 'Maximum random delay must be greater than or equal to the minimum.'
    );
    if ($startAt !== null && $endAt !== null) {
        $checks[] = app_readiness_check(
            'delivery_window',
            'Delivery window',
            $endAt > $startAt ? 'pass' : 'fail',
            $endAt > $startAt ? 'End time is after the start time.' : 'End time must be after the start time, or leave it blank.'
        );

        $minimumWindow = $pending > 1 ? $randomMin * ($pending - 1) : 0;
        $windowSeconds = max(0, $endAt - $startAt);
        $checks[] = app_readiness_check(
            'window_capacity',
            'Window capacity',
            $minimumWindow <= $windowSeconds ? 'pass' : 'warn',
            $minimumWindow <= $windowSeconds
                ? 'The selected window can fit the minimum send buffer.'
                : 'The delivery window is shorter than the minimum buffer; leave the end time blank or extend the window.'
        );
    } else {
        $checks[] = app_readiness_check(
            'delivery_window',
            'Delivery window',
            'pass',
            $endAt === null ? 'Open-ended delivery will continue until the queue is complete.' : 'Start time will be set when the campaign starts.'
        );
    }

    $checks = array_merge($checks, app_campaign_delivery_readiness_checks($settings));
    $summary = app_readiness_summary($checks);

    return [
        'ready' => $summary['fail'] === 0,
        'summary' => $summary,
        'checks' => $checks,
    ];
}

function app_readiness_check(string $key, string $label, string $status, string $detail): array
{
    return [
        'key' => $key,
        'label' => $label,
        'status' => in_array($status, ['pass', 'warn', 'fail'], true) ? $status : 'warn',
        'detail' => $detail,
    ];
}

function app_readiness_summary(array $checks): array
{
    $summary = ['pass' => 0, 'warn' => 0, 'fail' => 0];
    foreach ($checks as $check) {
        $status = (string) ($check['status'] ?? 'warn');
        if (!array_key_exists($status, $summary)) {
            $status = 'warn';
        }
        $summary[$status] += 1;
    }

    return $summary;
}

function app_readiness_failure_message(array $readiness): string
{
    $failures = array_values(array_filter(
        $readiness['checks'] ?? [],
        static fn (array $check): bool => ($check['status'] ?? '') === 'fail'
    ));
    $details = array_map(
        static fn (array $check): string => (string) ($check['label'] ?? 'Readiness check'),
        array_slice($failures, 0, 3)
    );

    return 'Campaign is not ready to send: ' . implode(', ', $details) . '.';
}

function app_campaign_delivery_readiness_checks(array $settings): array
{
    $smtp = $settings['smtp'];
    $mode = (string) ($smtp['deliveryMode'] ?? 'log');
    if ($mode === 'graph') {
        return [
            app_readiness_check('delivery_mode', 'Delivery mode', 'pass', 'Microsoft Graph delivery is selected.'),
            app_readiness_check('graph_curl', 'Graph cURL support', extension_loaded('curl') ? 'pass' : 'fail', extension_loaded('curl') ? 'cURL is available.' : 'Enable the PHP cURL extension.'),
            app_readiness_check('graph_tenant', 'Graph tenant', trim((string) ($smtp['graphTenantId'] ?? '')) !== '' ? 'pass' : 'fail', trim((string) ($smtp['graphTenantId'] ?? '')) !== '' ? 'Tenant is configured.' : 'Set the tenant ID or tenant domain.'),
            app_readiness_check('graph_client', 'Graph client ID', trim((string) ($smtp['graphClientId'] ?? '')) !== '' ? 'pass' : 'fail', trim((string) ($smtp['graphClientId'] ?? '')) !== '' ? 'Client ID is configured.' : 'Set the application client ID.'),
            app_readiness_check('graph_secret', 'Graph client secret', trim((string) ($smtp['encryptedGraphClientSecret'] ?? '')) !== '' ? 'pass' : 'fail', trim((string) ($smtp['encryptedGraphClientSecret'] ?? '')) !== '' ? 'Encrypted client secret is saved.' : 'Set and save a client secret.'),
            app_readiness_check('graph_sender', 'Graph sender mailbox', filter_var((string) ($smtp['graphSender'] ?? ''), FILTER_VALIDATE_EMAIL) ? 'pass' : 'fail', filter_var((string) ($smtp['graphSender'] ?? ''), FILTER_VALIDATE_EMAIL) ? 'Sender mailbox is valid.' : 'Set a valid sender mailbox.'),
        ];
    }

    if ($mode === 'smtp') {
        return [
            app_readiness_check('delivery_mode', 'Delivery mode', 'pass', 'SMTP delivery is selected.'),
            app_readiness_check('phpmailer', 'PHPMailer library', class_exists(PHPMailer::class) ? 'pass' : 'fail', class_exists(PHPMailer::class) ? 'PHPMailer is available.' : 'Run composer install before SMTP delivery.'),
            app_readiness_check('openssl', 'OpenSSL support', extension_loaded('openssl') ? 'pass' : 'fail', extension_loaded('openssl') ? 'OpenSSL is available for encrypted SMTP.' : 'Enable the PHP OpenSSL extension.'),
            app_readiness_check('smtp_host', 'SMTP host', trim((string) ($smtp['host'] ?? '')) !== '' ? 'pass' : 'fail', trim((string) ($smtp['host'] ?? '')) !== '' ? (string) ($smtp['host'] ?? '') : 'Set the SMTP host.'),
            app_readiness_check('smtp_username', 'SMTP username', trim((string) ($smtp['username'] ?? '')) !== '' ? 'pass' : 'fail', trim((string) ($smtp['username'] ?? '')) !== '' ? 'Username is configured.' : 'Set the SMTP username.'),
            app_readiness_check('smtp_password', 'SMTP password', trim((string) ($smtp['encryptedPassword'] ?? '')) !== '' ? 'pass' : 'fail', trim((string) ($smtp['encryptedPassword'] ?? '')) !== '' ? 'Encrypted password is saved.' : 'Set and save the SMTP password.'),
            app_readiness_check('smtp_from', 'From address', filter_var((string) ($smtp['fromAddress'] ?? ''), FILTER_VALIDATE_EMAIL) ? 'pass' : 'fail', filter_var((string) ($smtp['fromAddress'] ?? ''), FILTER_VALIDATE_EMAIL) ? 'Sender address is valid.' : 'Set a valid From address.'),
        ];
    }

    return [
        app_readiness_check('delivery_mode', 'Delivery mode', 'warn', 'Local log mode is active. Certificates will render, but emails will not be delivered to recipients.'),
    ];
}

function app_update_campaign_status(string $campaignId, string $status): array
{
    return app_with_queue_lock(static fn (): array => app_update_campaign_status_locked($campaignId, $status));
}

function app_update_campaign_status_locked(string $campaignId, string $status): array
{
    $status = strtolower(trim($status));
    if (!in_array($status, ['draft', 'scheduled', 'running', 'paused'], true)) {
        throw new RuntimeException('Unsupported campaign status.');
    }

    $state = app_state();
    $found = app_find_campaign($state, $campaignId);
    if ($found === null) {
        throw new RuntimeException('Campaign not found.');
    }

    $campaign = $found['campaign'];
    $previousStatus = (string) ($campaign['status'] ?? 'draft');
    $campaign['status'] = $status;
    $eventMessage = null;

    if ($status === 'running') {
        $queue = is_array($campaign['recipientQueue'] ?? null) ? $campaign['recipientQueue'] : [];
        $pending = app_pending_recipient_count($queue);
        $now = time();
        $startAt = app_time_or_null((string) ($campaign['windowStartAt'] ?? $campaign['scheduledAt'] ?? ''));
        $endAt = app_time_or_null((string) ($campaign['windowEndAt'] ?? ''));

        if ($startAt === null) {
            $campaign['windowStartAt'] = app_now();
            $campaign['scheduledAt'] = $campaign['windowStartAt'];
            $campaign['nextSendAfterAt'] = '';
        } elseif ($startAt > $now) {
            $status = 'scheduled';
            $campaign['status'] = 'scheduled';
            $campaign['scheduledAt'] = $campaign['windowStartAt'] ?? gmdate('c', $startAt);
            $campaign['nextSendAfterAt'] = '';
            $eventMessage = 'Campaign scheduled for delivery at the selected start time.';
        }

        if ($pending > 0 && $endAt !== null && $endAt <= $now) {
            $status = 'running';
            $campaign['status'] = 'running';
            $campaign['windowStartAt'] = app_now();
            $campaign['scheduledAt'] = $campaign['windowStartAt'];
            $campaign['windowEndAt'] = '';
            $campaign['windowExpiredAt'] = '';
            $campaign['nextSendAfterAt'] = '';
            $eventMessage = 'Campaign restarted with an open delivery window because the previous window had ended.';
        }

        $readiness = app_campaign_readiness($state, $campaign);
        if (!$readiness['ready']) {
            throw new RuntimeException(app_readiness_failure_message($readiness));
        }
    }

    if ($status === 'running' && trim((string) ($campaign['windowStartAt'] ?? '')) === '') {
        $campaign['windowStartAt'] = app_now();
        $campaign['scheduledAt'] = $campaign['windowStartAt'];
    }

    $eventMessages = [
        'draft' => 'Campaign moved back to draft.',
        'scheduled' => 'Campaign scheduled for delivery.',
        'running' => 'Campaign started. Due recipients will be processed by the queue worker.',
        'paused' => 'Campaign paused.',
    ];

    if ($previousStatus !== $status || $eventMessage !== null) {
        $campaign['deliveryEvents'] = array_slice([
            ...(is_array($campaign['deliveryEvents'] ?? null) ? $campaign['deliveryEvents'] : []),
            ['at' => app_now(), 'message' => $eventMessage ?? $eventMessages[$status]],
        ], -80);
    }

    $campaign['updatedAt'] = app_now();
    $state['campaigns'][$found['index']] = $campaign;
    app_save_state($state);
    app_audit('campaign.status_updated', 'campaign', $campaignId, ['status' => $status, 'previous_status' => $previousStatus]);
    return app_state();
}

function app_with_queue_lock(callable $callback): mixed
{
    $lockPath = app_storage_path('queue.lock');
    $handle = fopen($lockPath, 'c');
    if ($handle === false) {
        throw new RuntimeException('Queue lock could not be opened.');
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            throw new RuntimeException('Queue lock could not be acquired.');
        }

        return $callback();
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function app_send_one(string $campaignId): array
{
    return app_with_queue_lock(static fn (): array => app_send_one_locked($campaignId));
}

function app_send_one_locked(string $campaignId): array
{
    $state = app_state();
    $found = app_find_campaign($state, $campaignId);
    if ($found === null) {
        throw new RuntimeException('Campaign not found.');
    }

    $campaign = $found['campaign'];
    $readiness = app_campaign_readiness($state, $campaign);
    if (!$readiness['ready']) {
        throw new RuntimeException(app_readiness_failure_message($readiness));
    }

    $template = app_campaign_template($state, $campaign);
    $queue = is_array($campaign['recipientQueue'] ?? null) ? $campaign['recipientQueue'] : [];
    foreach ($queue as $recipientIndex => $recipient) {
        if (in_array(($recipient['status'] ?? 'queued'), ['sent', 'failed', 'skipped'], true)) {
            continue;
        }

        try {
            $result = app_render_and_deliver($campaign, $template, $recipient);
            $auditAction = 'campaign.send_one';
        } catch (Throwable $exception) {
            $recipientName = (string) ($recipient['email'] ?? $recipient['displayName'] ?? $recipient['identifier'] ?? 'recipient');
            $result = [
                'recipient' => [
                    'status' => 'failed',
                    'renderedAt' => (string) ($recipient['renderedAt'] ?? ''),
                    'sentAt' => '',
                    'failedAt' => app_now(),
                    'failedReason' => $exception->getMessage(),
                    'certificatePath' => (string) ($recipient['certificatePath'] ?? ''),
                ],
                'message' => 'Certificate delivery failed for ' . $recipientName . ': ' . $exception->getMessage(),
            ];
            $auditAction = 'campaign.send_one_failed';
        }

        $queue[$recipientIndex] = array_replace($recipient, $result['recipient']);
        $campaign['recipientQueue'] = $queue;
        $campaign['status'] = app_all_recipients_terminal($queue) ? 'completed' : 'running';
        $campaign['completedAt'] = $campaign['status'] === 'completed' ? app_now() : ($campaign['completedAt'] ?? '');
        $campaign['nextSendAfterAt'] = $campaign['status'] === 'completed' ? '' : app_next_send_after($campaign, $queue);
        $campaign['deliveryEvents'] = array_slice([
            ...(is_array($campaign['deliveryEvents'] ?? null) ? $campaign['deliveryEvents'] : []),
            ['at' => app_now(), 'message' => $result['message']],
        ], -80);

        $counts = app_recipient_status_counts($queue);
        $campaign['recipients'] = $counts['recipients'];
        $campaign['rendered'] = $counts['rendered'];
        $campaign['sent'] = $counts['sent'];
        $campaign['failed'] = $counts['failed'];
        $campaign['skipped'] = $counts['skipped'];
        $campaign['updatedAt'] = app_now();
        $state['campaigns'][$found['index']] = $campaign;
        app_save_state($state);
        app_audit($auditAction, 'campaign', $campaignId, ['recipient' => $recipient['email'] ?? '', 'status' => $result['recipient']['status']]);
        return $state;
    }

    return $state;
}

function app_complete_campaign(string $campaignId): array
{
    return app_with_queue_lock(static fn (): array => app_complete_campaign_locked($campaignId));
}

function app_complete_campaign_locked(string $campaignId): array
{
    $state = app_state();
    $found = app_find_campaign($state, $campaignId);
    if ($found === null) {
        throw new RuntimeException('Campaign not found.');
    }

    $campaign = $found['campaign'];
    $queue = is_array($found['campaign']['recipientQueue'] ?? null) ? $found['campaign']['recipientQueue'] : [];
    if ($queue !== [] && !app_all_recipients_terminal($queue)) {
        throw new RuntimeException('Campaign still has queued recipients. Use the scheduled queue or send one certificate at a time.');
    }

    if ($queue === [] && (int) ($campaign['sent'] ?? 0) < (int) ($campaign['recipients'] ?? 0)) {
        throw new RuntimeException('Campaign cannot be completed until all recipients are sent, failed, or skipped.');
    }

    $campaign['status'] = 'completed';
    $campaign['completedAt'] = app_now();
    $campaign['updatedAt'] = app_now();
    $campaign['deliveryEvents'] = array_slice([
        ...(is_array($campaign['deliveryEvents'] ?? null) ? $campaign['deliveryEvents'] : []),
        ['at' => app_now(), 'message' => 'Campaign closed after all recipients reached terminal status.'],
    ], -80);
    $state['campaigns'][$found['index']] = $campaign;
    app_save_state($state);
    app_audit('campaign.completed', 'campaign', $campaignId);
    return app_state();
}

function app_dispatch_due_campaigns(): array
{
    return app_with_queue_lock(static fn (): array => app_dispatch_due_campaigns_locked());
}

function app_dispatch_due_campaigns_locked(): array
{
    $state = app_state();
    $changed = false;
    $now = time();

    foreach ($state['campaigns'] as $index => $campaign) {
        $status = (string) ($campaign['status'] ?? 'draft');
        if (!in_array($status, ['scheduled', 'running'], true)) {
            continue;
        }

        $startAt = app_time_or_null((string) ($campaign['windowStartAt'] ?? $campaign['scheduledAt'] ?? ''));
        $endAt = app_time_or_null((string) ($campaign['windowEndAt'] ?? ''));
        if ($startAt !== null && $now < $startAt) {
            continue;
        }

        if ($status === 'scheduled') {
            $campaign['status'] = 'running';
            $campaign['deliveryEvents'] = array_slice([
                ...(is_array($campaign['deliveryEvents'] ?? null) ? $campaign['deliveryEvents'] : []),
                ['at' => app_now(), 'message' => 'Campaign delivery window opened.'],
            ], -80);
            $campaign['updatedAt'] = app_now();
            $state['campaigns'][$index] = $campaign;
            $changed = true;
        }

        if ($endAt !== null && $now > $endAt) {
            $queue = is_array($campaign['recipientQueue'] ?? null) ? $campaign['recipientQueue'] : [];
            $pending = app_pending_recipient_count($queue);
            if ($pending > 0 && trim((string) ($campaign['windowExpiredAt'] ?? '')) === '') {
                $campaign['windowExpiredAt'] = app_now();
                $campaign['updatedAt'] = app_now();
                $campaign['deliveryEvents'] = array_slice([
                    ...(is_array($campaign['deliveryEvents'] ?? null) ? $campaign['deliveryEvents'] : []),
                    ['at' => app_now(), 'message' => 'Delivery window ended with queued recipients. Restart the window, clear the end time, or extend the campaign end time to continue scheduled sending.'],
                ], -80);
                $state['campaigns'][$index] = $campaign;
                $changed = true;
            }
            continue;
        }

        $nextSendAfter = app_time_or_null((string) ($campaign['nextSendAfterAt'] ?? ''));
        if ($nextSendAfter !== null && $now < $nextSendAfter) {
            continue;
        }

        if ($changed) {
            app_save_state($state);
            $changed = false;
        }

        $readiness = app_campaign_readiness($state, $campaign);
        if (!$readiness['ready']) {
            $campaign['status'] = 'paused';
            $campaign['updatedAt'] = app_now();
            $campaign['deliveryEvents'] = array_slice([
                ...(is_array($campaign['deliveryEvents'] ?? null) ? $campaign['deliveryEvents'] : []),
                ['at' => app_now(), 'message' => app_readiness_failure_message($readiness) . ' Campaign paused before sending.'],
            ], -80);
            $state['campaigns'][$index] = $campaign;
            $changed = true;
            app_audit('campaign.dispatch_blocked', 'campaign', (string) ($campaign['id'] ?? ''), ['failures' => $readiness['summary']['fail'] ?? 0]);
            continue;
        }

        $state = app_send_one_locked((string) ($campaign['id'] ?? ''));
    }

    if ($changed) {
        app_save_state($state);
    }

    return app_state();
}

function app_preview_campaign_recipient(string $campaignId, string $recipientId): array
{
    $state = app_state();
    $found = app_find_campaign($state, $campaignId);
    if ($found === null) {
        throw new RuntimeException('Campaign not found.');
    }

    $campaign = $found['campaign'];
    $template = app_campaign_template($state, $campaign);
    if ($template === null) {
        throw new RuntimeException('Campaign template not found.');
    }

    $recipient = null;
    foreach ((is_array($campaign['recipientQueue'] ?? null) ? $campaign['recipientQueue'] : []) as $queueRecord) {
        if (is_array($queueRecord) && (string) ($queueRecord['id'] ?? '') === $recipientId) {
            $recipient = $queueRecord;
            break;
        }
    }

    if ($recipient === null) {
        throw new RuntimeException('Recipient not found.');
    }

    $data = is_array($recipient['data'] ?? null) ? $recipient['data'] : [];
    $identifier = (string) ($recipient['identifier'] ?? $data['unique_identifier'] ?? $recipient['id'] ?? bin2hex(random_bytes(4)));
    $verificationUrl = rtrim((string) (app_settings()['platform']['publicBaseUrl'] ?? ''), '/') . '/verify.php?certificate_number=' . rawurlencode($identifier) . '&preview=1';
    $data['verification_token'] = 'preview';
    $data['verification_url'] = $verificationUrl;
    $data['certificate_number'] = $identifier;

    $previewDirectory = app_storage_path('previews');
    if (!is_dir($previewDirectory)) {
        mkdir($previewDirectory, 0750, true);
    }
    app_cleanup_preview_files($previewDirectory);

    $previewFile = app_slug($campaignId) . '-' . app_slug($identifier) . '-' . bin2hex(random_bytes(8)) . '.pdf';
    $pdfPath = $previewDirectory . DIRECTORY_SEPARATOR . $previewFile;
    $layout = new TemplateLayout(
        page: is_array($template['layout']['page'] ?? null) ? $template['layout']['page'] : ['width' => 297, 'height' => 210, 'orientation' => 'landscape'],
        background: isset($template['layout']['background']) ? (string) $template['layout']['background'] : null,
        backgroundFit: isset($template['layout']['backgroundFit']) ? (string) $template['layout']['backgroundFit'] : 'stretch',
        elements: is_array($template['layout']['elements'] ?? null) ? $template['layout']['elements'] : []
    );
    if (app_template_has_verification_qr($layout->elements)) {
        $data['verification_qr_data_uri'] = app_qr_data_uri($verificationUrl, 420, 10);
    }
    (new CertificateRenderer())->renderPdf($layout, array_map('strval', $data), $pdfPath);

    $renderer = new EmailTemplateRenderer();
    $bodyTemplate = app_campaign_email_body_template($campaign);
    $subject = $renderer->render((string) ($campaign['emailSubject'] ?? 'Your certificate is ready'), $data);
    $body = $renderer->render($bodyTemplate, $data, false);
    $recipientEmail = (string) ($recipient['email'] ?? $data['email'] ?? '');
    $recipientName = (string) ($recipient['displayName'] ?? $data['name_en'] ?? $data['name_ar'] ?? $recipientEmail);
    $reviewedAt = app_now();
    $campaign['designReviewedAt'] = $reviewedAt;
    $campaign['designReviewRecipientId'] = $recipientId;
    $campaign['updatedAt'] = $reviewedAt;
    $state['campaigns'][$found['index']] = $campaign;
    app_save_state($state);

    app_audit('campaign.preview_created', 'campaign', $campaignId, ['recipient' => $recipientEmail]);

    return [
        'campaignId' => $campaignId,
        'recipientId' => $recipientId,
        'recipientName' => $recipientName,
        'recipientEmail' => $recipientEmail,
        'subject' => $subject,
        'bodyHtml' => $body,
        'certificateUrl' => '/preview-certificate.php?file=' . rawurlencode($previewFile),
        'attachmentName' => 'certificate.pdf',
        'verificationUrl' => $verificationUrl,
        'generatedAt' => $reviewedAt,
        'designReviewedAt' => $reviewedAt,
    ];
}

function app_cleanup_preview_files(string $directory): void
{
    $files = glob($directory . DIRECTORY_SEPARATOR . '*.pdf');
    if ($files === false) {
        return;
    }

    $cutoff = time() - 86400;
    foreach ($files as $file) {
        if (is_file($file) && (filemtime($file) ?: 0) < $cutoff) {
            @unlink($file);
        }
    }
}

function app_render_and_deliver(array $campaign, array $template, array $recipient): array
{
    $data = is_array($recipient['data'] ?? null) ? $recipient['data'] : [];
    $identifier = (string) ($recipient['identifier'] ?? $data['unique_identifier'] ?? $recipient['id'] ?? bin2hex(random_bytes(4)));
    $verificationToken = bin2hex(random_bytes(32));
    $verificationUrl = rtrim((string) (app_settings()['platform']['publicBaseUrl'] ?? ''), '/') . '/verify.php?certificate_number=' . rawurlencode($identifier) . '&token=' . rawurlencode($verificationToken);
    $data['verification_token'] = $verificationToken;
    $data['verification_url'] = $verificationUrl;
    $data['certificate_number'] = $identifier;
    $campaignId = (string) ($campaign['id'] ?? 'campaign');
    $certificateDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'certificates' . DIRECTORY_SEPARATOR . app_slug($campaignId);
    if (!is_dir($certificateDir)) {
        mkdir($certificateDir, 0750, true);
    }

    $pdfPath = $certificateDir . DIRECTORY_SEPARATOR . app_slug($identifier) . '.pdf';
    $layout = new TemplateLayout(
        page: is_array($template['layout']['page'] ?? null) ? $template['layout']['page'] : ['width' => 297, 'height' => 210, 'orientation' => 'landscape'],
        background: isset($template['layout']['background']) ? (string) $template['layout']['background'] : null,
        backgroundFit: isset($template['layout']['backgroundFit']) ? (string) $template['layout']['backgroundFit'] : 'stretch',
        elements: is_array($template['layout']['elements'] ?? null) ? $template['layout']['elements'] : []
    );
    if (app_template_has_verification_qr($layout->elements)) {
        $data['verification_qr_data_uri'] = app_qr_data_uri($verificationUrl, 420, 10);
    }
    (new CertificateRenderer())->renderPdf($layout, array_map('strval', $data), $pdfPath);

    $settings = app_settings();
    $renderer = new EmailTemplateRenderer();
    $subject = $renderer->render((string) ($campaign['emailSubject'] ?? 'Your certificate is ready'), $data);
    $bodyTemplate = app_campaign_email_body_template($campaign);
    $body = $renderer->render($bodyTemplate, $data, false);
    $deliveryMode = (string) ($settings['smtp']['deliveryMode'] ?? 'log');
    $recipientEmail = (string) ($recipient['email'] ?? $data['email'] ?? '');
    $recipientName = (string) ($recipient['displayName'] ?? $data['name_en'] ?? $data['name_ar'] ?? $recipientEmail);

    if ($deliveryMode === 'smtp') {
        app_send_smtp($settings, $recipientEmail, $recipientName, $subject, $body, $pdfPath);
        $message = 'Certificate sent by SMTP to ' . ($recipientEmail !== '' ? $recipientEmail : $recipientName) . ' with certificate.pdf attached.';
    } elseif ($deliveryMode === 'graph') {
        app_send_graph($settings, $recipientEmail, $recipientName, $subject, $body, $pdfPath);
        $message = 'Certificate sent by Microsoft Graph to ' . ($recipientEmail !== '' ? $recipientEmail : $recipientName) . ' with certificate.pdf attached.';
    } else {
        $message = 'Certificate rendered and logged for ' . ($recipientEmail !== '' ? $recipientEmail : $recipientName) . ' with certificate.pdf attached.';
    }

    return [
        'recipient' => [
            'status' => 'sent',
            'renderedAt' => app_now(),
            'sentAt' => app_now(),
            'failedAt' => '',
            'failedReason' => '',
            'certificatePath' => str_replace('\\', '/', substr($pdfPath, strlen(dirname(__DIR__)) + 1)),
            'verificationTokenHash' => hash('sha256', $verificationToken),
            'verificationIssuedAt' => app_now(),
            'verificationUrl' => $verificationUrl,
        ],
        'message' => $message,
    ];
}

function app_template_has_verification_qr(array $elements): bool
{
    foreach ($elements as $element) {
        if (is_array($element) && (string) ($element['type'] ?? '') === 'verification_qr') {
            return true;
        }
    }

    return false;
}

function app_next_send_after(array $campaign, array $queue): string
{
    $pending = app_pending_recipient_count($queue);
    if ($pending <= 0) {
        return '';
    }

    $minimum = max(0, (int) ($campaign['randomDelayMinSeconds'] ?? $campaign['throttleSeconds'] ?? 60));
    $maximum = max($minimum, (int) ($campaign['randomDelayMaxSeconds'] ?? $minimum));
    $endAt = app_time_or_null((string) ($campaign['windowEndAt'] ?? ''));

    if ($endAt !== null) {
        $remainingSeconds = max(0, $endAt - time());
        $windowCap = max(0, (int) floor($remainingSeconds / ($pending + 1)));
        $maximum = min($maximum, $windowCap);
        $minimum = min($minimum, $maximum);
    }

    $delay = $maximum > 0 ? random_int($minimum, $maximum) : 0;
    return gmdate('c', time() + $delay);
}

function app_time_or_null(string $value): ?int
{
    $value = trim($value);
    if ($value === '') {
        return null;
    }

    $timestamp = strtotime($value);
    return $timestamp === false ? null : $timestamp;
}

function app_smtp_diagnostics(array $input, array $actor): array
{
    app_enforce_rate_limit('smtp-diagnostics', (string) ($actor['id'] ?? app_client_ip()) . ':' . app_client_ip(), 30, 3600);

    $generatedAt = app_now();
    try {
        $settings = app_normalize_settings(is_array($input['settings'] ?? null) ? $input['settings'] : [], app_settings(), false);
    } catch (Throwable $error) {
        app_audit('settings.smtp_diagnostics_failed', 'settings', null, [
            'error' => substr($error->getMessage(), 0, 180),
        ]);

        return [
            'generatedAt' => $generatedAt,
            'canSend' => false,
            'summary' => [
                'deliveryMode' => 'invalid',
                'host' => '',
                'port' => 0,
                'encryption' => '',
                'fromAddress' => '',
                'username' => '',
                'hasPassword' => false,
                'graphTenantId' => '',
                'graphClientId' => '',
                'graphSender' => '',
                'hasGraphClientSecret' => false,
            ],
            'checks' => [
                app_smtp_diagnostic_check('settings_validation', 'Settings validation', 'fail', $error->getMessage()),
            ],
        ];
    }

    $smtp = $settings['smtp'];
    $checks = app_smtp_diagnostic_checks($settings);
    $hasFailure = count(array_filter($checks, static fn (array $check): bool => ($check['status'] ?? '') === 'fail')) > 0;
    $deliveryMode = (string) ($smtp['deliveryMode'] ?? 'log');
    $canSend = !$hasFailure && in_array($deliveryMode, ['smtp', 'graph'], true);

    app_audit('settings.smtp_diagnostics_ran', 'settings', null, [
        'host' => (string) ($smtp['host'] ?? ''),
        'port' => (int) ($smtp['port'] ?? 587),
        'mode' => $deliveryMode,
        'can_send' => $canSend,
    ]);

    return [
        'generatedAt' => $generatedAt,
        'canSend' => $canSend,
        'summary' => [
            'deliveryMode' => $deliveryMode,
            'host' => (string) ($smtp['host'] ?? ''),
            'port' => (int) ($smtp['port'] ?? 587),
            'encryption' => strtoupper((string) ($smtp['encryption'] ?? 'tls')),
            'fromAddress' => (string) ($smtp['fromAddress'] ?? ''),
            'fromName' => (string) ($smtp['fromName'] ?? ''),
            'username' => (string) ($smtp['username'] ?? ''),
            'hasPassword' => (string) ($smtp['encryptedPassword'] ?? '') !== '',
            'graphTenantId' => (string) ($smtp['graphTenantId'] ?? ''),
            'graphClientId' => (string) ($smtp['graphClientId'] ?? ''),
            'graphSender' => (string) ($smtp['graphSender'] ?? ''),
            'hasGraphClientSecret' => (string) ($smtp['encryptedGraphClientSecret'] ?? '') !== '',
        ],
        'checks' => $checks,
    ];
}

/**
 * @return list<array{name:string,label:string,status:string,detail:string}>
 */
function app_smtp_diagnostic_checks(array $settings): array
{
    $smtp = $settings['smtp'];
    $mode = (string) ($smtp['deliveryMode'] ?? 'log');
    $host = trim((string) ($smtp['host'] ?? ''));
    $port = (int) ($smtp['port'] ?? 587);
    $encryption = (string) ($smtp['encryption'] ?? 'tls');
    $username = trim((string) ($smtp['username'] ?? ''));
    $fromAddress = trim((string) ($smtp['fromAddress'] ?? ''));
    $hasPassword = (string) ($smtp['encryptedPassword'] ?? '') !== '';
    $checks = [];

    $checks[] = app_smtp_diagnostic_check(
        'delivery_mode',
        'Delivery mode',
        in_array($mode, ['smtp', 'graph'], true) ? 'pass' : 'warn',
        match ($mode) {
            'smtp' => 'SMTP sending is enabled.',
            'graph' => 'Microsoft Graph sending is enabled.',
            default => 'Local log mode is active; messages are rendered and logged without contacting a mail provider.',
        }
    );

    if ($mode === 'graph') {
        return array_merge($checks, app_graph_diagnostic_checks($settings));
    }

    $checks[] = app_smtp_diagnostic_check(
        'phpmailer',
        'PHPMailer library',
        class_exists(PHPMailer::class) ? 'pass' : 'fail',
        class_exists(PHPMailer::class) ? 'PHPMailer is available for SMTP delivery.' : 'PHPMailer is missing; run composer install.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'openssl',
        'OpenSSL extension',
        extension_loaded('openssl') ? 'pass' : 'fail',
        extension_loaded('openssl') ? 'OpenSSL is loaded for TLS/SSL SMTP connections.' : 'OpenSSL is required for encrypted SMTP connections.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'host',
        'SMTP host',
        $host !== '' ? 'pass' : ($mode === 'smtp' ? 'fail' : 'warn'),
        $host !== '' ? $host : 'Set the SMTP hostname before enabling SMTP delivery.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'port',
        'SMTP port',
        $port >= 1 && $port <= 65535 ? 'pass' : 'fail',
        $port >= 1 && $port <= 65535 ? (string) $port : 'Port must be between 1 and 65535.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'encryption',
        'Encryption',
        in_array($encryption, ['tls', 'ssl'], true) ? 'pass' : 'fail',
        strtoupper($encryption)
    );

    if (($encryption === 'ssl' && $port !== 465) || ($encryption === 'tls' && !in_array($port, [25, 587, 2525], true))) {
        $checks[] = app_smtp_diagnostic_check(
            'port_encryption_pair',
            'Port and encryption',
            'warn',
            'Common ports are 587 or 2525 for TLS and 465 for SSL. Confirm this provider-specific combination.'
        );
    } else {
        $checks[] = app_smtp_diagnostic_check(
            'port_encryption_pair',
            'Port and encryption',
            'pass',
            'Port and encryption match common SMTP provider defaults.'
        );
    }

    $providerGuidance = app_smtp_provider_guidance_check($host);
    if ($providerGuidance !== null) {
        $checks[] = $providerGuidance;
    }

    $checks[] = app_smtp_diagnostic_check(
        'username',
        'SMTP username',
        $username !== '' ? 'pass' : ($mode === 'smtp' ? 'fail' : 'warn'),
        $username !== '' ? 'Username is configured.' : 'Set the SMTP username before enabling SMTP delivery.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'password',
        'SMTP password',
        $hasPassword ? 'pass' : ($mode === 'smtp' ? 'fail' : 'warn'),
        $hasPassword ? 'Encrypted password is saved or included in the current form.' : 'Set the SMTP password before enabling SMTP delivery.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'from_address',
        'From address',
        filter_var($fromAddress, FILTER_VALIDATE_EMAIL) ? 'pass' : ($mode === 'smtp' ? 'fail' : 'warn'),
        filter_var($fromAddress, FILTER_VALIDATE_EMAIL) ? $fromAddress : 'Set a valid sender email address.'
    );

    $alignment = app_smtp_sender_alignment_detail($username, $fromAddress);
    if ($alignment !== null) {
        $checks[] = $alignment;
    }

    if ($mode === 'smtp' && $host !== '' && $port >= 1 && $port <= 65535) {
        $checks[] = app_smtp_connectivity_check($host, $port, $encryption);
    }

    return $checks;
}

/**
 * @return list<array{name:string,label:string,status:string,detail:string}>
 */
function app_graph_diagnostic_checks(array $settings): array
{
    $smtp = $settings['smtp'];
    $tenantId = trim((string) ($smtp['graphTenantId'] ?? ''));
    $clientId = trim((string) ($smtp['graphClientId'] ?? ''));
    $sender = trim((string) ($smtp['graphSender'] ?? ''));
    $hasSecret = (string) ($smtp['encryptedGraphClientSecret'] ?? '') !== '';
    $checks = [];

    $checks[] = app_smtp_diagnostic_check(
        'graph_curl',
        'cURL extension',
        extension_loaded('curl') ? 'pass' : 'fail',
        extension_loaded('curl') ? 'cURL is loaded for Microsoft identity and Graph API requests.' : 'Enable the PHP cURL extension before using Microsoft Graph delivery.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'graph_tenant',
        'Graph tenant',
        $tenantId !== '' ? 'pass' : 'fail',
        $tenantId !== '' ? $tenantId : 'Set the Microsoft Entra tenant ID or tenant domain.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'graph_client',
        'Graph client ID',
        $clientId !== '' ? 'pass' : 'fail',
        $clientId !== '' ? 'Client ID is configured.' : 'Set the Microsoft Entra application client ID.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'graph_secret',
        'Graph client secret',
        $hasSecret ? 'pass' : 'fail',
        $hasSecret ? 'Encrypted client secret is saved or included in the current form.' : 'Set the Microsoft Entra application client secret.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'graph_sender',
        'Graph sender mailbox',
        filter_var($sender, FILTER_VALIDATE_EMAIL) ? 'pass' : 'fail',
        filter_var($sender, FILTER_VALIDATE_EMAIL) ? $sender : 'Set a valid licensed Exchange Online mailbox address.'
    );
    $checks[] = app_smtp_diagnostic_check(
        'graph_mail_send_permission',
        'Graph Mail.Send permission',
        'warn',
        'The app registration must have Microsoft Graph Mail.Send application permission with admin consent, and the sender mailbox must be allowed by tenant policy.'
    );

    $readyForTokenCheck = extension_loaded('curl')
        && $tenantId !== ''
        && $clientId !== ''
        && $hasSecret
        && filter_var($sender, FILTER_VALIDATE_EMAIL);

    if ($readyForTokenCheck) {
        try {
            app_graph_access_token($settings);
            $checks[] = app_smtp_diagnostic_check(
                'graph_token',
                'Graph OAuth token',
                'pass',
                'Microsoft identity accepted the tenant, client ID, and client secret.'
            );
        } catch (Throwable $error) {
            $checks[] = app_smtp_diagnostic_check(
                'graph_token',
                'Graph OAuth token',
                'fail',
                app_graph_public_error_message($error)
            );
        }
    }

    return $checks;
}

function app_smtp_provider_guidance_check(string $host): ?array
{
    $normalizedHost = strtolower($host);
    if (!str_contains($normalizedHost, 'office365.com') && !str_contains($normalizedHost, 'outlook.com')) {
        return null;
    }

    return app_smtp_diagnostic_check(
        'microsoft_365_smtp_auth',
        'Microsoft 365 SMTP AUTH',
        'warn',
        'For smtp.office365.com, authentication requires SMTP AUTH to be enabled for the tenant and this mailbox. If MFA, Conditional Access, or Security Defaults block password-based SMTP, use an allowed app password, OAuth-capable SMTP, Microsoft Graph mail, or an approved SMTP relay.'
    );
}

function app_smtp_diagnostic_check(string $name, string $label, string $status, string $detail): array
{
    return [
        'name' => $name,
        'label' => $label,
        'status' => in_array($status, ['pass', 'warn', 'fail'], true) ? $status : 'warn',
        'detail' => $detail,
    ];
}

function app_smtp_sender_alignment_detail(string $username, string $fromAddress): ?array
{
    if (!filter_var($username, FILTER_VALIDATE_EMAIL) || !filter_var($fromAddress, FILTER_VALIDATE_EMAIL)) {
        return null;
    }

    $usernameDomain = strtolower(substr(strrchr($username, '@') ?: '', 1));
    $fromDomain = strtolower(substr(strrchr($fromAddress, '@') ?: '', 1));
    if ($usernameDomain === '' || $fromDomain === '') {
        return null;
    }

    return app_smtp_diagnostic_check(
        'sender_alignment',
        'Sender alignment',
        $usernameDomain === $fromDomain ? 'pass' : 'warn',
        $usernameDomain === $fromDomain
            ? 'SMTP username and From address use the same domain.'
            : 'SMTP username and From address use different domains. Confirm this sender is allowed by your provider.'
    );
}

function app_smtp_connectivity_check(string $host, int $port, string $encryption): array
{
    $scheme = $encryption === 'ssl' ? 'ssl' : 'tcp';
    $target = $scheme . '://' . $host . ':' . $port;
    $errorNumber = 0;
    $errorMessage = '';
    $startedAt = microtime(true);
    $stream = @stream_socket_client($target, $errorNumber, $errorMessage, 8, STREAM_CLIENT_CONNECT);
    $elapsedMs = (int) round((microtime(true) - $startedAt) * 1000);

    if (is_resource($stream)) {
        fclose($stream);
        return app_smtp_diagnostic_check(
            'connectivity',
            'Network connectivity',
            'pass',
            'Connected to ' . $host . ':' . $port . ' in ' . $elapsedMs . ' ms. Send a test email to verify authentication and sender permissions.'
        );
    }

    return app_smtp_diagnostic_check(
        'connectivity',
        'Network connectivity',
        'fail',
        'Could not connect to ' . $host . ':' . $port . ($errorMessage !== '' ? ' (' . $errorMessage . ')' : '') . '.'
    );
}

function app_send_smtp_test_email(array $input, array $actor): array
{
    app_enforce_rate_limit('smtp-test-email', (string) ($actor['id'] ?? app_client_ip()) . ':' . app_client_ip(), 8, 3600);

    $recipientEmail = strtolower(trim((string) ($input['recipientEmail'] ?? '')));
    $recipientName = trim((string) ($input['recipientName'] ?? ''));
    if ($recipientName === '') {
        $recipientName = (string) ($actor['name'] ?? 'Delivery test recipient');
    }
    if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('A valid test recipient email is required.');
    }

    $settings = app_normalize_settings(is_array($input['settings'] ?? null) ? $input['settings'] : [], app_settings());
    $smtp = $settings['smtp'];
    $deliveryMode = (string) ($smtp['deliveryMode'] ?? 'log');
    if (!in_array($deliveryMode, ['smtp', 'graph'], true)) {
        throw new RuntimeException('Switch delivery mode to SMTP or Microsoft Graph before sending a test email.');
    }

    $platformName = htmlspecialchars((string) ($settings['platform']['name'] ?? 'Certificate Issuer'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $hostLabel = htmlspecialchars((string) ($smtp['host'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $fromAddress = htmlspecialchars((string) ($smtp['fromAddress'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $encryption = htmlspecialchars(strtoupper((string) ($smtp['encryption'] ?? 'tls')), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $graphSender = htmlspecialchars((string) ($smtp['graphSender'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $sentAt = app_now();
    $subject = 'Certificate Issuer delivery test';
    $body = '<p>This is a test email from ' . $platformName . '.</p>'
        . '<p>If you received this message, the configured delivery provider can send platform email successfully.</p>';

    if ($deliveryMode === 'smtp') {
        $body .= '<dl>'
            . '<dt>SMTP host</dt><dd>' . $hostLabel . ':' . (int) ($smtp['port'] ?? 587) . '</dd>'
            . '<dt>Encryption</dt><dd>' . $encryption . '</dd>'
            . '<dt>From</dt><dd>' . $fromAddress . '</dd>'
            . '<dt>Sent at</dt><dd>' . htmlspecialchars($sentAt, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</dd>'
            . '</dl>';
    } else {
        $body .= '<dl>'
            . '<dt>Microsoft Graph sender</dt><dd>' . $graphSender . '</dd>'
            . '<dt>Sent at</dt><dd>' . htmlspecialchars($sentAt, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</dd>'
            . '</dl>';
    }

    try {
        if ($deliveryMode === 'smtp') {
            app_send_smtp_message($settings, $recipientEmail, $recipientName, $subject, $body);
        } else {
            app_send_graph_message($settings, $recipientEmail, $recipientName, $subject, $body);
        }
    } catch (Throwable $error) {
        $publicError = $deliveryMode === 'smtp' ? app_smtp_public_error_message($error, $smtp) : app_graph_public_error_message($error);
        app_audit('settings.smtp_test_failed', 'settings', null, [
            'recipient_hash' => hash('sha256', $recipientEmail),
            'host' => (string) ($smtp['host'] ?? ''),
            'port' => (int) ($smtp['port'] ?? 587),
            'mode' => $deliveryMode,
            'sender' => $deliveryMode === 'graph' ? (string) ($smtp['graphSender'] ?? '') : (string) ($smtp['fromAddress'] ?? ''),
            'error' => substr($publicError, 0, 180),
        ]);
        throw new RuntimeException(($deliveryMode === 'smtp' ? 'SMTP' : 'Microsoft Graph') . ' test failed: ' . $publicError, 0, $error);
    }

    app_audit('settings.smtp_test_sent', 'settings', null, [
        'recipient_hash' => hash('sha256', $recipientEmail),
        'host' => (string) ($smtp['host'] ?? ''),
        'port' => (int) ($smtp['port'] ?? 587),
        'mode' => $deliveryMode,
        'sender' => $deliveryMode === 'graph' ? (string) ($smtp['graphSender'] ?? '') : (string) ($smtp['fromAddress'] ?? ''),
    ]);

    return [
        'recipientEmail' => $recipientEmail,
        'sentAt' => $sentAt,
        'transport' => $deliveryMode,
        'host' => (string) ($smtp['host'] ?? ''),
        'port' => (int) ($smtp['port'] ?? 587),
        'encryption' => (string) ($smtp['encryption'] ?? 'tls'),
        'sender' => $deliveryMode === 'graph' ? (string) ($smtp['graphSender'] ?? '') : (string) ($smtp['fromAddress'] ?? ''),
    ];
}

function app_smtp_public_error_message(Throwable $error, array $smtp): string
{
    $message = trim($error->getMessage());
    $host = strtolower((string) ($smtp['host'] ?? ''));
    $isAuthenticationFailure = stripos($message, 'authenticate') !== false
        || stripos($message, 'authentication') !== false
        || stripos($message, '5.7.') !== false;

    if ($isAuthenticationFailure) {
        $providerNote = '';
        if (str_contains($host, 'office365.com') || str_contains($host, 'outlook.com')) {
            $providerNote = ' For Microsoft 365, confirm Authenticated SMTP is enabled for the organization and mailbox, the username/password are for that mailbox, and MFA or Conditional Access is not blocking password-based SMTP. If password-based SMTP is blocked, use an allowed app password, OAuth-capable SMTP, Microsoft Graph mail, or an approved SMTP relay.';
        }

        return 'Authentication was rejected by the SMTP server.' . $providerNote . ($message !== '' ? ' Server response: ' . $message : '');
    }

    return $message !== '' ? $message : 'The SMTP server rejected the test message.';
}

function app_graph_public_error_message(Throwable $error): string
{
    $message = trim($error->getMessage());
    $normalized = strtolower($message);

    if (str_contains($normalized, 'invalid_client')
        || str_contains($normalized, 'invalid secret')
        || str_contains($normalized, 'aadsts7000215')
        || str_contains($normalized, 'authentication')) {
        return 'Microsoft Graph authentication was rejected. Confirm the tenant ID, client ID, current client secret, and that the application is using client credentials. Server response: ' . $message;
    }

    if (str_contains($normalized, 'authorization_requestdenied')
        || str_contains($normalized, 'mail.send')
        || str_contains($normalized, 'permission')
        || str_contains($normalized, 'privilege')
        || str_contains($normalized, 'access is denied')) {
        return 'Microsoft Graph rejected the send request. Confirm the app registration has Microsoft Graph Mail.Send application permission, admin consent was granted, and the sender mailbox is allowed by tenant policy. Server response: ' . $message;
    }

    return $message !== '' ? $message : 'Microsoft Graph rejected the request.';
}

function app_send_smtp(array $settings, string $recipientEmail, string $recipientName, string $subject, string $body, string $pdfPath): void
{
    app_send_smtp_message($settings, $recipientEmail, $recipientName, $subject, $body, $pdfPath);
}

function app_send_smtp_message(array $settings, string $recipientEmail, string $recipientName, string $subject, string $body, ?string $pdfPath = null): void
{
    $smtp = $settings['smtp'];
    foreach (['host', 'username', 'fromAddress'] as $required) {
        if (($smtp[$required] ?? '') === '') {
            throw new RuntimeException('SMTP is enabled but required settings are missing.');
        }
    }

    if (($smtp['encryptedPassword'] ?? '') === '') {
        throw new RuntimeException('SMTP is enabled but the password is missing.');
    }

    if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Recipient email is invalid.');
    }

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = (string) $smtp['host'];
    $mail->Port = (int) $smtp['port'];
    $mail->SMTPAuth = true;
    $mail->Username = (string) $smtp['username'];
    $mail->Password = app_decrypt_secret((string) ($smtp['encryptedPassword'] ?? ''));
    $mail->SMTPSecure = (string) $smtp['encryption'];
    $mail->Timeout = 20;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom((string) $smtp['fromAddress'], (string) $smtp['fromName']);
    $mail->addAddress($recipientEmail, $recipientName);
    $mail->Subject = $subject;
    $mail->isHTML(true);
    $mail->Body = $body;
    $mail->AltBody = strip_tags($body);
    if ($pdfPath !== null) {
        if (!is_file($pdfPath)) {
            throw new RuntimeException('Email attachment was not found.');
        }
        $mail->addAttachment($pdfPath, 'certificate.pdf', 'base64', 'application/pdf');
    }
    $mail->send();
}

function app_send_graph(array $settings, string $recipientEmail, string $recipientName, string $subject, string $body, string $pdfPath): void
{
    app_send_graph_message($settings, $recipientEmail, $recipientName, $subject, $body, $pdfPath);
}

function app_send_graph_message(array $settings, string $recipientEmail, string $recipientName, string $subject, string $body, ?string $pdfPath = null): void
{
    $smtp = $settings['smtp'];
    foreach (['graphTenantId', 'graphClientId', 'graphSender'] as $required) {
        if (($smtp[$required] ?? '') === '') {
            throw new RuntimeException('Microsoft Graph delivery is enabled but required settings are missing.');
        }
    }

    if (($smtp['encryptedGraphClientSecret'] ?? '') === '') {
        throw new RuntimeException('Microsoft Graph delivery is enabled but the client secret is missing.');
    }

    if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Recipient email is invalid.');
    }
    if (!filter_var((string) ($smtp['graphSender'] ?? ''), FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Microsoft Graph sender mailbox is invalid.');
    }

    $message = [
        'subject' => $subject,
        'body' => [
            'contentType' => 'HTML',
            'content' => $body,
        ],
        'toRecipients' => [
            [
                'emailAddress' => [
                    'address' => $recipientEmail,
                    'name' => $recipientName,
                ],
            ],
        ],
    ];

    if ($pdfPath !== null) {
        if (!is_file($pdfPath)) {
            throw new RuntimeException('Email attachment was not found.');
        }

        $fileSize = filesize($pdfPath);
        if ($fileSize === false) {
            throw new RuntimeException('Email attachment size could not be read.');
        }
        if ($fileSize > 3 * 1024 * 1024) {
            throw new RuntimeException('Microsoft Graph direct send supports certificate attachments up to 3 MB in this delivery path.');
        }

        $content = file_get_contents($pdfPath);
        if ($content === false) {
            throw new RuntimeException('Email attachment could not be read.');
        }

        $message['attachments'] = [
            [
                '@odata.type' => '#microsoft.graph.fileAttachment',
                'name' => 'certificate.pdf',
                'contentType' => 'application/pdf',
                'contentBytes' => base64_encode($content),
            ],
        ];
    }

    $sender = (string) $smtp['graphSender'];
    $token = app_graph_access_token($settings);
    app_graph_post_json(
        'https://graph.microsoft.com/v1.0/users/' . rawurlencode($sender) . '/sendMail',
        $token,
        [
            'message' => $message,
            'saveToSentItems' => true,
        ]
    );
}

function app_graph_access_token(array $settings): string
{
    if (!extension_loaded('curl')) {
        throw new RuntimeException('PHP cURL extension is required for Microsoft Graph delivery.');
    }

    $smtp = $settings['smtp'];
    $tenantId = trim((string) ($smtp['graphTenantId'] ?? ''));
    $clientId = trim((string) ($smtp['graphClientId'] ?? ''));
    $clientSecret = app_decrypt_secret((string) ($smtp['encryptedGraphClientSecret'] ?? ''));
    if ($tenantId === '' || $clientId === '' || $clientSecret === '') {
        throw new RuntimeException('Microsoft Graph tenant ID, client ID, and client secret are required.');
    }

    $response = app_curl_post_form(
        'https://login.microsoftonline.com/' . rawurlencode($tenantId) . '/oauth2/v2.0/token',
        [
            'client_id' => $clientId,
            'scope' => 'https://graph.microsoft.com/.default',
            'client_secret' => $clientSecret,
            'grant_type' => 'client_credentials',
        ]
    );
    if ($response['status'] < 200 || $response['status'] >= 300) {
        throw new RuntimeException(app_graph_response_error($response['body'], 'Microsoft identity rejected the token request.'));
    }

    $decoded = json_decode($response['body'], true);
    if (!is_array($decoded) || trim((string) ($decoded['access_token'] ?? '')) === '') {
        throw new RuntimeException('Microsoft identity returned an invalid token response.');
    }

    return (string) $decoded['access_token'];
}

/**
 * @return array{status:int,body:string}
 */
function app_curl_post_form(string $url, array $fields): array
{
    $curl = curl_init($url);
    if ($curl === false) {
        throw new RuntimeException('Unable to initialize HTTP client.');
    }

    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => http_build_query($fields, '', '&', PHP_QUERY_RFC3986),
    ]);

    $body = curl_exec($curl);
    if ($body === false) {
        $error = curl_error($curl);
        curl_close($curl);
        throw new RuntimeException('HTTP request failed: ' . $error);
    }

    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    return ['status' => $status, 'body' => (string) $body];
}

function app_graph_post_json(string $url, string $token, array $payload): void
{
    if (!extension_loaded('curl')) {
        throw new RuntimeException('PHP cURL extension is required for Microsoft Graph delivery.');
    }

    $body = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    $curl = curl_init($url);
    if ($curl === false) {
        throw new RuntimeException('Unable to initialize HTTP client.');
    }

    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => $body,
    ]);

    $responseBody = curl_exec($curl);
    if ($responseBody === false) {
        $error = curl_error($curl);
        curl_close($curl);
        throw new RuntimeException('HTTP request failed: ' . $error);
    }

    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if (!in_array($status, [200, 202, 204], true)) {
        throw new RuntimeException(app_graph_response_error((string) $responseBody, 'Microsoft Graph rejected the sendMail request.'));
    }
}

function app_graph_response_error(string $body, string $fallback): string
{
    $decoded = json_decode($body, true);
    $message = '';
    if (is_array($decoded)) {
        if (is_array($decoded['error'] ?? null)) {
            $message = trim((string) ($decoded['error']['message'] ?? $decoded['error']['code'] ?? ''));
        } elseif (is_string($decoded['error_description'] ?? null)) {
            $message = trim((string) $decoded['error_description']);
        } elseif (is_string($decoded['error'] ?? null)) {
            $message = trim((string) $decoded['error']);
        }
    }

    if ($message === '') {
        $message = trim(strip_tags($body));
    }

    if ($message === '') {
        return $fallback;
    }

    return $fallback . ' Server response: ' . substr($message, 0, 700);
}

function app_verify_certificate_lookup(string $certificateNumber, string $token): ?array
{
    $certificateNumber = trim($certificateNumber);
    $token = trim($token);
    if ($certificateNumber === '' || $token === '') {
        return null;
    }
    app_enforce_rate_limit('verify', app_client_ip() . ':' . strtolower($certificateNumber), 30, 3600);

    $state = app_state();
    $tokenHash = hash('sha256', $token);
    foreach ($state['campaigns'] as $campaign) {
        $queue = is_array($campaign['recipientQueue'] ?? null) ? $campaign['recipientQueue'] : [];
        foreach ($queue as $recipient) {
            $data = is_array($recipient['data'] ?? null) ? $recipient['data'] : [];
            $identifier = (string) ($recipient['identifier'] ?? $data['unique_identifier'] ?? '');
            if ($identifier !== $certificateNumber || (string) ($recipient['verificationTokenHash'] ?? '') !== $tokenHash) {
                continue;
            }

            $template = app_campaign_template($state, $campaign);
            $certificatePath = (string) ($recipient['certificatePath'] ?? '');
            $absolutePath = $certificatePath !== '' ? dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $certificatePath) : '';
            $pdfHash = is_file($absolutePath) ? (string) hash_file('sha256', $absolutePath) : '';
            $status = in_array(($recipient['status'] ?? ''), ['sent', 'rendered'], true) ? 'valid' : 'invalid';
            $settings = app_settings();

            app_audit($status === 'valid' ? 'certificate.verify_success' : 'certificate.verify_invalid_status', 'certificate', $certificateNumber);
            return [
                'status' => $status,
                'valid' => $status === 'valid',
                'certificateNumber' => $certificateNumber,
                'issuer' => (string) ($settings['platform']['name'] ?? 'Certificate Issuer'),
                'campaign' => (string) ($campaign['name'] ?? ''),
                'template' => (string) ($template['name'] ?? ''),
                'sentAt' => (string) ($recipient['sentAt'] ?? ''),
                'renderedAt' => (string) ($recipient['renderedAt'] ?? ''),
                'verificationIssuedAt' => (string) ($recipient['verificationIssuedAt'] ?? ''),
                'pdfSha256' => $pdfHash,
                'verifiedAt' => app_now(),
            ];
        }
    }

    app_audit('certificate.verify_failed', 'certificate', $certificateNumber);
    return null;
}

function app_all_recipients_terminal(array $queue): bool
{
    if ($queue === []) {
        return false;
    }

    foreach ($queue as $recipient) {
        if (!in_array(($recipient['status'] ?? 'queued'), ['sent', 'failed', 'skipped'], true)) {
            return false;
        }
    }

    return true;
}
