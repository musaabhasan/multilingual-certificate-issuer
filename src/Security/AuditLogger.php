<?php

declare(strict_types=1);

namespace CertificateIssuer\Security;

use PDO;

final class AuditLogger
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function record(?int $actorId, string $action, string $entityType, ?int $entityId = null, array $metadata = []): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata_json, created_at)
             VALUES (:actor_id, :action, :entity_type, :entity_id, :metadata_json, UTC_TIMESTAMP())'
        );

        $statement->execute([
            'actor_id' => $actorId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'metadata_json' => json_encode($metadata, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
        ]);
    }
}
