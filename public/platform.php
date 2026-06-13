<?php

declare(strict_types=1);

use CertificateIssuer\Certificate\CertificateRenderer;
use CertificateIssuer\Certificate\TemplateLayout;
use CertificateIssuer\Mail\EmailTemplateRenderer;
use CertificateIssuer\Security\PasswordPolicy;
use PHPMailer\PHPMailer\PHPMailer;

require_once dirname(__DIR__) . '/vendor/autoload.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('certificate_issuer_session');
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    session_start();
}

chdir(dirname(__DIR__));

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
    app_write_json(app_storage_path('state.json'), [
        'templates' => is_array($state['templates'] ?? null) ? $state['templates'] : [],
        'campaigns' => is_array($state['campaigns'] ?? null) ? $state['campaigns'] : [],
    ]);
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
    unset($settings['smtp']['encryptedPassword']);
    return $settings;
}

function app_save_settings(array $input): array
{
    $current = app_settings();
    $smtp = is_array($input['smtp'] ?? null) ? $input['smtp'] : [];
    $platform = is_array($input['platform'] ?? null) ? $input['platform'] : [];
    $security = is_array($input['security'] ?? null) ? $input['security'] : [];

    $current['platform']['name'] = trim((string) ($platform['name'] ?? $current['platform']['name']));
    $current['platform']['publicBaseUrl'] = trim((string) ($platform['publicBaseUrl'] ?? $current['platform']['publicBaseUrl']));
    $current['security']['sessionTimeoutMinutes'] = max(15, (int) ($security['sessionTimeoutMinutes'] ?? $current['security']['sessionTimeoutMinutes']));
    $current['security']['passwordRotationDays'] = max(1, (int) ($security['passwordRotationDays'] ?? $current['security']['passwordRotationDays']));

    $current['smtp']['profileName'] = trim((string) ($smtp['profileName'] ?? $current['smtp']['profileName']));
    $current['smtp']['deliveryMode'] = in_array(($smtp['deliveryMode'] ?? 'log'), ['log', 'smtp'], true) ? $smtp['deliveryMode'] : 'log';
    $current['smtp']['host'] = trim((string) ($smtp['host'] ?? $current['smtp']['host']));
    $current['smtp']['port'] = max(1, (int) ($smtp['port'] ?? $current['smtp']['port']));
    $current['smtp']['encryption'] = in_array(($smtp['encryption'] ?? 'tls'), ['tls', 'ssl'], true) ? $smtp['encryption'] : 'tls';
    $current['smtp']['username'] = trim((string) ($smtp['username'] ?? $current['smtp']['username']));
    $current['smtp']['fromAddress'] = trim((string) ($smtp['fromAddress'] ?? $current['smtp']['fromAddress']));
    $current['smtp']['fromName'] = trim((string) ($smtp['fromName'] ?? $current['smtp']['fromName']));

    $plainPassword = (string) ($smtp['password'] ?? '');
    if ($plainPassword !== '') {
        $current['smtp']['encryptedPassword'] = app_encrypt_secret($plainPassword);
    }

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
    return $user;
}

function app_current_user(): ?array
{
    $timeoutSeconds = max(15, (int) (app_settings()['security']['sessionTimeoutMinutes'] ?? 120)) * 60;
    $lastActivity = (int) ($_SESSION['last_activity'] ?? time());
    if (isset($_SESSION['user_id']) && time() - $lastActivity > $timeoutSeconds) {
        unset($_SESSION['user_id'], $_SESSION['csrf_token'], $_SESSION['last_activity']);
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
        return $user;
    }

    if ($json) {
        app_json_response(['error' => 'Authentication required.'], 401);
    }

    $next = rawurlencode($_SERVER['REQUEST_URI'] ?? '/');
    header('Location: /login.php?next=' . $next);
    exit;
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
    if (!is_string($provided) || !hash_equals(app_csrf_token(), $provided)) {
        app_json_response(['error' => 'Invalid CSRF token.'], 419);
    }
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

function app_recipient_status_counts(array $queue): array
{
    $sent = count(array_filter($queue, fn (array $record): bool => ($record['status'] ?? '') === 'sent'));
    $failed = count(array_filter($queue, fn (array $record): bool => ($record['status'] ?? '') === 'failed'));
    $rendered = count(array_filter($queue, fn (array $record): bool => in_array(($record['status'] ?? ''), ['rendered', 'sent', 'failed'], true)));

    return [
        'recipients' => count($queue),
        'rendered' => $rendered,
        'sent' => $sent,
        'failed' => $failed,
    ];
}

function app_send_one(string $campaignId): array
{
    $state = app_state();
    $found = app_find_campaign($state, $campaignId);
    if ($found === null) {
        throw new RuntimeException('Campaign not found.');
    }

    $campaign = $found['campaign'];
    $template = app_find_template($state, (string) ($campaign['templateId'] ?? ''));
    if ($template === null) {
        throw new RuntimeException('Campaign template not found.');
    }

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
        $campaign['nextSendAfterAt'] = $campaign['status'] === 'completed' ? '' : app_next_send_after($campaign);
        $campaign['deliveryEvents'] = array_slice([
            ...(is_array($campaign['deliveryEvents'] ?? null) ? $campaign['deliveryEvents'] : []),
            ['at' => app_now(), 'message' => $result['message']],
        ], -80);

        $counts = app_recipient_status_counts($queue);
        $campaign['recipients'] = $counts['recipients'];
        $campaign['rendered'] = $counts['rendered'];
        $campaign['sent'] = $counts['sent'];
        $campaign['failed'] = $counts['failed'];
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
    $state = app_state();
    $found = app_find_campaign($state, $campaignId);
    if ($found === null) {
        throw new RuntimeException('Campaign not found.');
    }

    $queue = is_array($found['campaign']['recipientQueue'] ?? null) ? $found['campaign']['recipientQueue'] : [];
    if ($queue === []) {
        $campaign = $found['campaign'];
        $campaign['status'] = 'completed';
        $campaign['sent'] = (int) ($campaign['recipients'] ?? 0);
        $campaign['rendered'] = (int) ($campaign['recipients'] ?? 0);
        $campaign['completedAt'] = app_now();
        $campaign['updatedAt'] = app_now();
        $campaign['deliveryEvents'] = array_slice([
            ...(is_array($campaign['deliveryEvents'] ?? null) ? $campaign['deliveryEvents'] : []),
            ['at' => app_now(), 'message' => 'Campaign marked completed.'],
        ], -80);
        $state['campaigns'][$found['index']] = $campaign;
        app_save_state($state);
        return $state;
    }

    $limit = count($queue);
    for ($index = 0; $index < $limit; $index++) {
        $state = app_send_one($campaignId);
        $found = app_find_campaign($state, $campaignId);
        if ($found === null || app_all_recipients_terminal(is_array($found['campaign']['recipientQueue'] ?? null) ? $found['campaign']['recipientQueue'] : [])) {
            break;
        }
    }

    app_audit('campaign.completed', 'campaign', $campaignId);
    return app_state();
}

function app_dispatch_due_campaigns(): array
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

        $state = app_send_one((string) ($campaign['id'] ?? ''));
    }

    if ($changed) {
        app_save_state($state);
    }

    return app_state();
}

function app_render_and_deliver(array $campaign, array $template, array $recipient): array
{
    $data = is_array($recipient['data'] ?? null) ? $recipient['data'] : [];
    $identifier = (string) ($recipient['identifier'] ?? $data['unique_identifier'] ?? $recipient['id'] ?? bin2hex(random_bytes(4)));
    $verificationToken = bin2hex(random_bytes(16));
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
        elements: is_array($template['layout']['elements'] ?? null) ? $template['layout']['elements'] : []
    );
    (new CertificateRenderer())->renderPdf($layout, array_map('strval', $data), $pdfPath);

    $settings = app_settings();
    $renderer = new EmailTemplateRenderer();
    $subject = $renderer->render((string) ($campaign['emailSubject'] ?? 'Your certificate is ready'), $data);
    $bodyTemplate = (string) ($campaign['emailBodyHtml'] ?? '<p>Your certificate is attached as a PDF.</p>');
    if (!str_contains($bodyTemplate, 'verification_url')) {
        $bodyTemplate .= '<p>Verification link: <a href="{{verification_url}}">{{verification_url}}</a></p>';
    }
    $body = $renderer->render($bodyTemplate, $data, false);
    $deliveryMode = (string) ($settings['smtp']['deliveryMode'] ?? 'log');
    $recipientEmail = (string) ($recipient['email'] ?? $data['email'] ?? '');
    $recipientName = (string) ($recipient['displayName'] ?? $data['name_en'] ?? $data['name_ar'] ?? $recipientEmail);

    if ($deliveryMode === 'smtp') {
        app_send_smtp($settings, $recipientEmail, $recipientName, $subject, $body, $pdfPath);
        $message = 'Certificate sent by SMTP to ' . ($recipientEmail !== '' ? $recipientEmail : $recipientName) . ' with certificate.pdf attached.';
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

function app_next_send_after(array $campaign): string
{
    $minimum = max(0, (int) ($campaign['randomDelayMinSeconds'] ?? $campaign['throttleSeconds'] ?? 60));
    $maximum = max($minimum, (int) ($campaign['randomDelayMaxSeconds'] ?? $minimum));
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

function app_send_smtp(array $settings, string $recipientEmail, string $recipientName, string $subject, string $body, string $pdfPath): void
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
    $mail->CharSet = 'UTF-8';
    $mail->setFrom((string) $smtp['fromAddress'], (string) $smtp['fromName']);
    $mail->addAddress($recipientEmail, $recipientName);
    $mail->Subject = $subject;
    $mail->isHTML(true);
    $mail->Body = $body;
    $mail->AltBody = strip_tags($body);
    $mail->addAttachment($pdfPath, 'certificate.pdf', 'base64', 'application/pdf');
    $mail->send();
}

function app_verify_certificate_lookup(string $certificateNumber, string $token): ?array
{
    $certificateNumber = trim($certificateNumber);
    $token = trim($token);
    if ($certificateNumber === '' || $token === '') {
        return null;
    }

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

            $template = app_find_template($state, (string) ($campaign['templateId'] ?? ''));
            $certificatePath = (string) ($recipient['certificatePath'] ?? '');
            $absolutePath = $certificatePath !== '' ? dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $certificatePath) : '';
            $pdfHash = is_file($absolutePath) ? (string) hash_file('sha256', $absolutePath) : '';
            $status = in_array(($recipient['status'] ?? ''), ['sent', 'rendered'], true) ? 'valid' : 'invalid';

            app_audit($status === 'valid' ? 'certificate.verify_success' : 'certificate.verify_invalid_status', 'certificate', $certificateNumber);
            return [
                'status' => $status,
                'certificateNumber' => $certificateNumber,
                'recipient' => (string) ($recipient['displayName'] ?? $data['name_en'] ?? $data['name_ar'] ?? ''),
                'recipientArabic' => (string) ($data['name_ar'] ?? ''),
                'email' => (string) ($recipient['email'] ?? $data['email'] ?? ''),
                'campaign' => (string) ($campaign['name'] ?? ''),
                'template' => (string) ($template['name'] ?? ''),
                'sentAt' => (string) ($recipient['sentAt'] ?? ''),
                'renderedAt' => (string) ($recipient['renderedAt'] ?? ''),
                'pdfSha256' => $pdfHash,
                'certificatePath' => $certificatePath,
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
