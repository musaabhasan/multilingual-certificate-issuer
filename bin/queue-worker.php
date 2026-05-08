<?php

declare(strict_types=1);

use CertificateIssuer\Database\Connection;
use CertificateIssuer\Mail\CertificateMailer;
use CertificateIssuer\Queue\DistributionWorker;
use CertificateIssuer\Support\Env;

require __DIR__ . '/../vendor/autoload.php';

Env::load(__DIR__ . '/../.env');

$once = in_array('--once', $argv, true);
$throttle = (int) Env::get('QUEUE_THROTTLE_SECONDS', '60');
$staleProcessingMinutes = (int) Env::get('QUEUE_STALE_PROCESSING_MINUTES', '30');
$worker = new DistributionWorker(Connection::make(), new CertificateMailer(), $throttle, $staleProcessingMinutes);

do {
    $processed = $worker->runOnce();
    if ($once) {
        break;
    }
    if ($processed === 0) {
        sleep(10);
    }
} while (true);
