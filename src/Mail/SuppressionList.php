<?php

declare(strict_types=1);

namespace CertificateIssuer\Mail;

use InvalidArgumentException;
use PDO;

final class SuppressionList
{
    public function normalize(string $email): string
    {
        $normalized = strtolower(trim($email));
        if (!filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Invalid recipient email address.');
        }

        return $normalized;
    }

    public function emailHash(string $email): string
    {
        return hash('sha256', $this->normalize($email));
    }

    public function mask(string $email): string
    {
        $normalized = $this->normalize($email);
        [$local, $domain] = explode('@', $normalized, 2);
        $localPrefix = substr($local, 0, 1);
        $domainParts = explode('.', $domain);
        $domainPrefix = substr($domainParts[0], 0, 1);
        $suffix = count($domainParts) > 1 ? '.' . end($domainParts) : '';

        return $localPrefix . '***@' . $domainPrefix . '***' . $suffix;
    }

    public function matchesScope(?string $suppressionScope, ?string $deliveryScope): bool
    {
        if ($suppressionScope === null || $suppressionScope === '') {
            return true;
        }

        return $deliveryScope !== null && hash_equals($suppressionScope, $deliveryScope);
    }

    public function isSuppressed(PDO $pdo, string $email, ?string $scope = null): bool
    {
        $statement = $pdo->prepare(
            'SELECT scope FROM email_suppressions WHERE email_hash = :email_hash AND active = 1'
        );
        $statement->execute(['email_hash' => $this->emailHash($email)]);

        while (($row = $statement->fetch(PDO::FETCH_ASSOC)) !== false) {
            if ($this->matchesScope($row['scope'] ?? null, $scope)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function suppress(
        PDO $pdo,
        string $email,
        string $reason,
        string $source = 'manual',
        ?string $scope = null,
        ?int $actorId = null,
        ?string $notes = null,
        array $metadata = []
    ): string {
        $hash = $this->emailHash($email);
        $metadataJson = $metadata === [] ? null : json_encode($metadata, JSON_THROW_ON_ERROR);

        $statement = $pdo->prepare(
            'INSERT INTO email_suppressions
                (email_hash, email_mask, scope, reason, source, notes, suppressed_by, metadata_json)
             VALUES
                (:email_hash, :email_mask, :scope, :reason, :source, :notes, :suppressed_by, :metadata_json)'
        );
        $statement->execute([
            'email_hash' => $hash,
            'email_mask' => $this->mask($email),
            'scope' => $scope,
            'reason' => $reason,
            'source' => $source,
            'notes' => $notes,
            'suppressed_by' => $actorId,
            'metadata_json' => $metadataJson,
        ]);

        return $hash;
    }

    public function release(PDO $pdo, string $email, ?string $scope = null, ?int $actorId = null): int
    {
        $statement = $pdo->prepare(
            'UPDATE email_suppressions
             SET active = 0, released_by = :released_by, released_at = CURRENT_TIMESTAMP
             WHERE email_hash = :email_hash
               AND active = 1
               AND ((:scope_is_null = 1 AND scope IS NULL) OR scope = :scope)'
        );
        $statement->execute([
            'email_hash' => $this->emailHash($email),
            'scope' => $scope,
            'scope_is_null' => $scope === null ? 1 : 0,
            'released_by' => $actorId,
        ]);

        return $statement->rowCount();
    }
}
