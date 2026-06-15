<?php

declare(strict_types=1);

require __DIR__ . '/../public/platform.php';

$once = in_array('--once', $argv, true);
$sleepSeconds = 10;

foreach ($argv as $argument) {
    if (str_starts_with($argument, '--sleep=')) {
        $sleepSeconds = max(1, (int) substr($argument, 8));
    }
}

do {
    $before = app_state();
    $after = app_dispatch_due_campaigns();
    $processed = app_worker_processed_count($before, $after);

    echo sprintf("[%s] processed=%d\n", app_now(), $processed);

    if ($once) {
        break;
    }

    sleep($processed > 0 ? 1 : $sleepSeconds);
} while (true);

function app_worker_processed_count(array $before, array $after): int
{
    $beforeSent = 0;
    $afterSent = 0;
    $beforeFailed = 0;
    $afterFailed = 0;

    foreach ($before['campaigns'] ?? [] as $campaign) {
        $beforeSent += (int) ($campaign['sent'] ?? 0);
        $beforeFailed += (int) ($campaign['failed'] ?? 0);
    }

    foreach ($after['campaigns'] ?? [] as $campaign) {
        $afterSent += (int) ($campaign['sent'] ?? 0);
        $afterFailed += (int) ($campaign['failed'] ?? 0);
    }

    return max(0, ($afterSent + $afterFailed) - ($beforeSent + $beforeFailed));
}
