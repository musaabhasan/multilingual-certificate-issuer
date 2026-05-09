<?php

declare(strict_types=1);

namespace CertificateIssuer\Mail;

use RuntimeException;

final class SmtpDomainAlignmentAudit
{
    /**
     * @return array<string, mixed>
     */
    public function auditFile(string $path): array
    {
        if (!is_file($path)) {
            throw new RuntimeException("SMTP alignment input file not found: {$path}");
        }

        $payload = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($payload)) {
            throw new RuntimeException('SMTP alignment input must be a JSON object.');
        }

        return $this->audit($payload);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function audit(array $payload): array
    {
        $profiles = $payload['smtp_profiles'] ?? [];
        if (!is_array($profiles)) {
            throw new RuntimeException('SMTP alignment input must include smtp_profiles.');
        }

        $findings = [];
        $rows = [];
        foreach ($profiles as $index => $profile) {
            if (!is_array($profile)) {
                $findings[] = $this->finding('high', 'invalid_profile', "smtp_profiles[{$index}]", 'SMTP profile must be an object.');
                continue;
            }

            $profileFindings = $this->auditProfile($profile, $index);
            $findings = [...$findings, ...$profileFindings];
            $rows[] = [
                'profile_id' => $this->profileId($profile, $index),
                'from_domain' => $this->stringValue($profile, 'from_domain'),
                'approved_domain' => $this->stringValue($profile, 'approved_sending_domain'),
                'approval_status' => strtolower($this->stringValue($profile, 'sender_approval_status')),
                'finding_count' => count($profileFindings),
                'highest_severity' => $this->highestSeverity($profileFindings),
            ];
        }

        $summary = $this->summary($findings, count($profiles));

        return [
            'passed' => $summary['high'] === 0,
            'summary' => $summary,
            'profiles' => $rows,
            'findings' => $findings,
            'review_questions' => [
                'Does the From domain match an approved institutional sending domain?',
                'Are SPF, DKIM, and DMARC evidence current before certificates are sent?',
                'Will bounces and complaints suppress future sends before reputation is damaged?',
                'Is TLS required for the SMTP profile used by production certificate batches?',
                'Are throttle limits appropriate for the SMTP provider and recipient volume?',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $profile
     * @return list<array<string, mixed>>
     */
    private function auditProfile(array $profile, int $index): array
    {
        $target = $this->profileId($profile, $index);
        $findings = [];
        $fromDomain = strtolower($this->stringValue($profile, 'from_domain'));
        $approvedDomain = strtolower($this->stringValue($profile, 'approved_sending_domain'));

        if ($fromDomain === '' || $approvedDomain === '' || $fromDomain !== $approvedDomain) {
            $findings[] = $this->finding('high', 'from_domain_not_aligned', $target, 'From domain does not match the approved sending domain.');
        }

        if (!$this->boolValue($profile, 'spf_aligned')) {
            $findings[] = $this->finding('high', 'spf_not_aligned', $target, 'SPF alignment evidence is missing.');
        }

        if (!$this->boolValue($profile, 'dkim_configured') || $this->stringValue($profile, 'dkim_selector') === '') {
            $findings[] = $this->finding('high', 'dkim_not_configured', $target, 'DKIM selector or configuration evidence is missing.');
        }

        $dmarcPolicy = strtolower($this->stringValue($profile, 'dmarc_policy'));
        if (!in_array($dmarcPolicy, ['quarantine', 'reject'], true)) {
            $findings[] = $this->finding('medium', 'dmarc_policy_weak', $target, 'DMARC policy is not quarantine or reject.');
        }

        if (!$this->boolValue($profile, 'return_path_aligned')) {
            $findings[] = $this->finding('medium', 'return_path_not_aligned', $target, 'Return-path alignment evidence is missing.');
        }

        if (!$this->boolValue($profile, 'bounce_handler_enabled')) {
            $findings[] = $this->finding('medium', 'bounce_handler_missing', $target, 'Bounce handler is not enabled.');
        }

        if (!$this->boolValue($profile, 'complaint_handler_enabled')) {
            $findings[] = $this->finding('medium', 'complaint_handler_missing', $target, 'Complaint handler is not enabled.');
        }

        if (!$this->boolValue($profile, 'tls_required')) {
            $findings[] = $this->finding('high', 'tls_not_required', $target, 'SMTP profile does not require TLS.');
        }

        $approvalStatus = strtolower($this->stringValue($profile, 'sender_approval_status'));
        if (!in_array($approvalStatus, ['approved', 'approved_with_controls'], true)) {
            $findings[] = $this->finding('high', 'sender_not_approved', $target, 'Sender profile is not approved for certificate delivery.');
        }

        $perMinute = $this->intValue($profile, 'max_messages_per_minute');
        if ($perMinute <= 0 || $perMinute > 120) {
            $findings[] = $this->finding('medium', 'throttle_out_of_range', $target, 'SMTP throttle is missing or above the safe default range.');
        }

        return $findings;
    }

    /**
     * @param list<array<string, mixed>> $findings
     * @return array<string, int>
     */
    private function summary(array $findings, int $profileCount): array
    {
        $summary = [
            'profiles' => $profileCount,
            'high' => 0,
            'medium' => 0,
            'low' => 0,
        ];

        foreach ($findings as $finding) {
            $severity = is_string($finding['severity'] ?? null) ? $finding['severity'] : 'low';
            if (array_key_exists($severity, $summary)) {
                $summary[$severity]++;
            }
        }

        return $summary;
    }

    /**
     * @param list<array<string, mixed>> $findings
     */
    private function highestSeverity(array $findings): string
    {
        if ($findings === []) {
            return 'none';
        }

        $order = ['low' => 1, 'medium' => 2, 'high' => 3];
        usort($findings, static fn (array $left, array $right): int => ($order[$right['severity']] ?? 0) <=> ($order[$left['severity']] ?? 0));

        return $findings[0]['severity'];
    }

    /**
     * @return array<string, mixed>
     */
    private function finding(string $severity, string $state, string $target, string $message): array
    {
        return [
            'severity' => $severity,
            'state' => $state,
            'target' => $target,
            'message' => $message,
        ];
    }

    /**
     * @param array<string, mixed> $profile
     */
    private function profileId(array $profile, int $index): string
    {
        return $this->stringValue($profile, 'profile_id') ?: 'smtp-profile-' . ($index + 1);
    }

    /**
     * @param array<string, mixed> $value
     */
    private function stringValue(array $value, string $key): string
    {
        $raw = $value[$key] ?? '';
        return is_scalar($raw) ? trim((string) $raw) : '';
    }

    /**
     * @param array<string, mixed> $value
     */
    private function boolValue(array $value, string $key): bool
    {
        return filter_var($value[$key] ?? false, FILTER_VALIDATE_BOOL);
    }

    /**
     * @param array<string, mixed> $value
     */
    private function intValue(array $value, string $key): int
    {
        $raw = $value[$key] ?? 0;
        return is_numeric($raw) ? (int) $raw : 0;
    }
}
