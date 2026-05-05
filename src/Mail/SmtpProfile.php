<?php

declare(strict_types=1);

namespace CertificateIssuer\Mail;

use CertificateIssuer\Security\Crypto;

final class SmtpProfile
{
    public function __construct(
        public readonly string $host,
        public readonly int $port,
        public readonly string $username,
        private readonly string $encryptedPassword,
        public readonly string $encryption,
        public readonly string $fromAddress,
        public readonly string $fromName
    ) {
    }

    public function password(): string
    {
        return Crypto::decrypt($this->encryptedPassword);
    }

    public static function encryptedPassword(string $plainText): string
    {
        return Crypto::encrypt($plainText);
    }
}
