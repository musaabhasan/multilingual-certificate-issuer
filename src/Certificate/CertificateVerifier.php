<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use PDO;

final class CertificateVerifier
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function issueToken(int $certificateJobId): string
    {
        $token = bin2hex(random_bytes(24));
        $statement = $this->db->prepare(
            'UPDATE certificate_jobs
             SET verification_token_hash = :token_hash, updated_at = UTC_TIMESTAMP()
             WHERE id = :id'
        );
        $statement->execute([
            'id' => $certificateJobId,
            'token_hash' => hash('sha256', $token),
        ]);

        return $token;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function verify(string $certificateNumber, string $token): ?array
    {
        $statement = $this->db->prepare(
            'SELECT cj.id, cj.certificate_number, cj.pdf_sha256, cj.rendered_at,
                    r.name_en, r.name_ar, r.unique_identifier,
                    t.name_en AS template_name_en, t.name_ar AS template_name_ar
             FROM certificate_jobs cj
             INNER JOIN recipients r ON r.id = cj.recipient_id
             INNER JOIN certificate_templates t ON t.id = cj.template_id
             WHERE cj.certificate_number = :certificate_number
               AND cj.verification_token_hash = :token_hash
               AND cj.status = "rendered"
             LIMIT 1'
        );
        $statement->execute([
            'certificate_number' => $certificateNumber,
            'token_hash' => hash('sha256', $token),
        ]);

        $record = $statement->fetch();
        if ($record === false) {
            return null;
        }

        $this->recordLookup((int) $record['id'], true);
        return $record;
    }

    public function revoke(int $certificateJobId, string $reason, ?int $revokedBy = null): void
    {
        $statement = $this->db->prepare(
            'UPDATE certificate_jobs
             SET status = "revoked",
                 revocation_reason = :reason,
                 revoked_by = :revoked_by,
                 revoked_at = UTC_TIMESTAMP(),
                 updated_at = UTC_TIMESTAMP()
             WHERE id = :id
               AND status = "rendered"'
        );
        $statement->execute([
            'id' => $certificateJobId,
            'reason' => $reason,
            'revoked_by' => $revokedBy,
        ]);
    }

    public function recordLookup(int $certificateJobId, bool $success): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO certificate_verification_events (certificate_job_id, success, created_at)
             VALUES (:certificate_job_id, :success, UTC_TIMESTAMP())'
        );
        $statement->execute([
            'certificate_job_id' => $certificateJobId,
            'success' => $success ? 1 : 0,
        ]);
    }
}
