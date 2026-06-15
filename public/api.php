<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

$action = (string) ($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($action === 'session') {
        $user = app_current_user();
        app_json_response([
            'authenticated' => $user !== null,
            'setupRequired' => !app_users_exist(),
            'user' => $user !== null ? app_sanitize_user($user) : null,
            'mfaRequired' => $user !== null && app_mfa_action_required($user),
            'mfaEnrollmentRequired' => $user !== null && app_mfa_required($user) && !app_mfa_enabled($user),
            'mfaVerified' => $user !== null && app_mfa_session_verified($user),
            'csrf' => app_csrf_token(),
        ]);
    }

    $user = app_require_auth(true);

    if ($method !== 'GET') {
        app_verify_csrf();
    }

    if ($action === 'state' && $method === 'GET') {
        app_json_response([
            'state' => app_state(),
            'settings' => app_public_settings(),
            'user' => app_sanitize_user($user),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'state' && $method === 'POST') {
        app_require_write_access($user);
        $payload = app_json_payload();
        $state = app_save_client_state($payload);
        app_audit('state.saved', 'state');
        app_json_response([
            'state' => $state,
            'settings' => app_public_settings(),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'settings' && $method === 'GET') {
        app_json_response([
            'settings' => app_public_settings(),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'settings' && $method === 'POST') {
        app_require_admin($user);
        app_json_response([
            'settings' => app_save_settings(app_json_payload()),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'settings-test-email' && $method === 'POST') {
        app_require_admin($user);
        $payload = app_json_payload();
        app_release_session_lock();
        app_json_response([
            'test' => app_send_smtp_test_email($payload, $user),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'settings-smtp-diagnostics' && $method === 'POST') {
        app_require_admin($user);
        $payload = app_json_payload();
        app_release_session_lock();
        app_json_response([
            'diagnostics' => app_smtp_diagnostics($payload, $user),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'users' && $method === 'GET') {
        app_require_admin($user);
        app_json_response([
            'users' => array_map('app_sanitize_user', app_users()),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'users' && $method === 'POST') {
        app_require_admin($user);
        $payload = app_json_payload();
        $created = app_create_user(
            (string) ($payload['name'] ?? ''),
            (string) ($payload['email'] ?? ''),
            (string) ($payload['password'] ?? ''),
            (string) ($payload['role'] ?? 'operator')
        );
        app_json_response([
            'user' => app_sanitize_user($created),
            'users' => array_map('app_sanitize_user', app_users()),
            'csrf' => app_csrf_token(),
        ], 201);
    }

    if ($action === 'password' && $method === 'POST') {
        $payload = app_json_payload();
        app_change_password(
            (string) $user['id'],
            (string) ($payload['currentPassword'] ?? ''),
            (string) ($payload['newPassword'] ?? '')
        );
        app_json_response(['ok' => true, 'csrf' => app_csrf_token()]);
    }

    if ($action === 'send-one' && $method === 'POST') {
        app_require_delivery_access($user);
        $payload = app_json_payload();
        app_release_session_lock();
        $state = app_send_one((string) ($payload['id'] ?? ''));
        app_json_response([
            'state' => $state,
            'settings' => app_public_settings(),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'campaign-preview' && $method === 'POST') {
        app_require_write_access($user);
        $payload = app_json_payload();
        app_release_session_lock();
        app_json_response([
            'preview' => app_preview_campaign_recipient(
                (string) ($payload['campaignId'] ?? ''),
                (string) ($payload['recipientId'] ?? '')
            ),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'campaign-status' && $method === 'POST') {
        app_require_delivery_access($user);
        $payload = app_json_payload();
        $state = app_update_campaign_status(
            (string) ($payload['id'] ?? ''),
            (string) ($payload['status'] ?? '')
        );
        app_json_response([
            'state' => $state,
            'settings' => app_public_settings(),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'campaign-readiness' && $method === 'POST') {
        app_require_delivery_access($user);
        $payload = app_json_payload();
        $state = app_state();
        $found = app_find_campaign($state, (string) ($payload['id'] ?? ''));
        if ($found === null) {
            throw new RuntimeException('Campaign not found.');
        }

        app_json_response([
            'readiness' => app_campaign_readiness($state, $found['campaign']),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'complete-campaign' && $method === 'POST') {
        app_require_delivery_access($user);
        $payload = app_json_payload();
        $state = app_complete_campaign((string) ($payload['id'] ?? ''));
        app_json_response([
            'state' => $state,
            'settings' => app_public_settings(),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'dispatch-due' && $method === 'POST') {
        app_require_delivery_access($user);
        app_release_session_lock();
        $state = app_dispatch_due_campaigns();
        app_json_response([
            'state' => $state,
            'settings' => app_public_settings(),
            'csrf' => app_csrf_token(),
        ]);
    }

    if ($action === 'audit' && $method === 'GET') {
        app_require_admin($user);
        app_json_response([
            'events' => app_recent_audit(40),
            'csrf' => app_csrf_token(),
        ]);
    }

    app_json_response(['error' => 'Unknown API action.'], 404);
} catch (Throwable $error) {
    app_json_response(['error' => $error->getMessage()], 400);
}

function app_json_payload(): array
{
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > 10 * 1024 * 1024) {
        throw new RuntimeException('JSON request body is too large.');
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $payload = json_decode($raw, true);
    if (!is_array($payload)) {
        throw new RuntimeException('JSON request body is invalid.');
    }

    return $payload;
}

function app_require_admin(array $user): void
{
    if (($user['role'] ?? '') !== 'administrator') {
        app_json_response(['error' => 'Administrator access required.'], 403);
    }
}

function app_release_session_lock(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
}
