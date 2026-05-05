<?php

declare(strict_types=1);

namespace CertificateIssuer\Security;

use DateInterval;
use DateTimeImmutable;

final class PasswordPolicy
{
    public function __construct(private readonly int $rotationDays = 90)
    {
    }

    public function isRotationDue(?string $lastChangedAt): bool
    {
        if ($lastChangedAt === null || $lastChangedAt === '') {
            return true;
        }

        $lastChanged = new DateTimeImmutable($lastChangedAt);
        $deadline = $lastChanged->add(new DateInterval('P' . $this->rotationDays . 'D'));

        return $deadline <= new DateTimeImmutable('now');
    }

    public function validateStrength(string $password): array
    {
        $errors = [];
        if (strlen($password) < 14) {
            $errors[] = 'Password must be at least 14 characters.';
        }
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must include an uppercase letter.';
        }
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must include a lowercase letter.';
        }
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must include a number.';
        }
        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            $errors[] = 'Password must include a symbol.';
        }

        return $errors;
    }
}
