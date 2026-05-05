<?php

declare(strict_types=1);

namespace CertificateIssuer\Queue;

use PDO;

final class DeliveryMetrics
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @return array<string, int>
     */
    public function summary(): array
    {
        $statement = $this->db->query(
            'SELECT status, COUNT(*) AS total
             FROM mail_queue
             GROUP BY status'
        );

        $summary = ['pending' => 0, 'processing' => 0, 'sent' => 0, 'failed' => 0];
        foreach ($statement->fetchAll() as $row) {
            $summary[(string) $row['status']] = (int) $row['total'];
        }

        return $summary;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function recentFailures(int $limit = 10): array
    {
        $statement = $this->db->prepare(
            'SELECT recipient_email, attempts, last_error, updated_at
             FROM mail_queue
             WHERE status = "failed"
             ORDER BY updated_at DESC
             LIMIT :limit'
        );
        $statement->bindValue('limit', max(1, min($limit, 100)), PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll();
    }
}
