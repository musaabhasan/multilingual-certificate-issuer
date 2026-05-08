<?php

declare(strict_types=1);

namespace CertificateIssuer\Queue;

use CertificateIssuer\Mail\CertificateMailer;
use CertificateIssuer\Mail\SmtpProfile;
use DateTimeImmutable;
use DateTimeZone;
use PDO;
use Throwable;

final class DistributionWorker
{
    public function __construct(
        private readonly PDO $db,
        private readonly CertificateMailer $mailer,
        private readonly int $throttleSeconds,
        private readonly int $staleProcessingMinutes = 30
    ) {
    }

    public function runOnce(): int
    {
        $this->requeueStaleProcessingItems($this->staleProcessingMinutes);

        $item = $this->claimNextItem();
        if ($item === null) {
            return 0;
        }

        try {
            $profile = $this->smtpProfile((int) $item['smtp_profile_id']);
            $this->mailer->send(
                $profile,
                (string) $item['recipient_email'],
                (string) $item['recipient_name'],
                (string) $item['subject'],
                (string) $item['html_body'],
                (string) $item['pdf_path']
            );
            $this->markSent((int) $item['id']);
            sleep($this->throttleSeconds);
            return 1;
        } catch (Throwable $exception) {
            $this->markFailed((int) $item['id'], $exception->getMessage());
            return 1;
        }
    }

    public function requeueStaleProcessingItems(int $olderThanMinutes = 30): int
    {
        $cutoff = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
            ->modify(sprintf('-%d minutes', max(1, $olderThanMinutes)))
            ->format('Y-m-d H:i:s');

        $statement = $this->db->prepare(
            "UPDATE mail_queue
             SET status = CASE WHEN attempts >= 4 THEN 'failed' ELSE 'pending' END,
                 attempts = attempts + 1,
                 next_attempt_at = UTC_TIMESTAMP(),
                 last_error = 'Worker heartbeat expired before delivery completion.',
                 updated_at = UTC_TIMESTAMP()
             WHERE status = 'processing'
               AND updated_at < :cutoff"
        );
        $statement->execute(['cutoff' => $cutoff]);

        return $statement->rowCount();
    }

    private function claimNextItem(): ?array
    {
        $this->db->beginTransaction();

        try {
            $item = $this->nextItemForUpdate();
            if ($item === null) {
                $this->db->commit();
                return null;
            }

            $this->markProcessing((int) $item['id']);
            $this->db->commit();
            return $item;
        } catch (Throwable $exception) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $exception;
        }
    }

    private function nextItemForUpdate(): ?array
    {
        $statement = $this->db->query(
            "SELECT *
             FROM mail_queue
             WHERE status = 'pending'
               AND scheduled_at <= UTC_TIMESTAMP()
               AND (next_attempt_at IS NULL OR next_attempt_at <= UTC_TIMESTAMP())
             ORDER BY scheduled_at ASC, id ASC
             LIMIT 1
             FOR UPDATE"
        );

        $item = $statement->fetch();
        return $item === false ? null : $item;
    }

    private function smtpProfile(int $id): SmtpProfile
    {
        $statement = $this->db->prepare('SELECT * FROM smtp_profiles WHERE id = :id AND active = 1');
        $statement->execute(['id' => $id]);
        $profile = $statement->fetch();
        if ($profile === false) {
            throw new \RuntimeException('Active SMTP profile was not found.');
        }

        return new SmtpProfile(
            host: (string) $profile['host'],
            port: (int) $profile['port'],
            username: (string) $profile['username'],
            encryptedPassword: (string) $profile['encrypted_password'],
            encryption: (string) $profile['encryption'],
            fromAddress: (string) $profile['from_address'],
            fromName: (string) $profile['from_name']
        );
    }

    private function markProcessing(int $id): void
    {
        $statement = $this->db->prepare("UPDATE mail_queue SET status = 'processing', updated_at = UTC_TIMESTAMP() WHERE id = :id");
        $statement->execute(['id' => $id]);
    }

    private function markSent(int $id): void
    {
        $statement = $this->db->prepare("UPDATE mail_queue SET status = 'sent', sent_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = :id");
        $statement->execute(['id' => $id]);
    }

    private function markFailed(int $id, string $message): void
    {
        $nextAttempt = (new DateTimeImmutable('+15 minutes'))->format('Y-m-d H:i:s');
        $statement = $this->db->prepare(
            "UPDATE mail_queue
             SET status = CASE WHEN attempts >= 4 THEN 'failed' ELSE 'pending' END,
                 attempts = attempts + 1,
                 next_attempt_at = :next_attempt_at,
                 last_error = :last_error,
                 updated_at = UTC_TIMESTAMP()
             WHERE id = :id"
        );
        $statement->execute([
            'id' => $id,
            'next_attempt_at' => $nextAttempt,
            'last_error' => mb_substr($message, 0, 1000),
        ]);
    }
}
