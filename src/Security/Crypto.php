<?php

declare(strict_types=1);

namespace CertificateIssuer\Security;

use CertificateIssuer\Support\Env;
use RuntimeException;

final class Crypto
{
    public static function encrypt(string $plainText): string
    {
        $key = self::key();
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $cipherText = sodium_crypto_secretbox($plainText, $nonce, $key);

        return 'sodium:' . base64_encode($nonce . $cipherText);
    }

    public static function decrypt(string $encoded): string
    {
        if (!str_starts_with($encoded, 'sodium:')) {
            throw new RuntimeException('Unsupported encrypted value format.');
        }

        $payload = base64_decode(substr($encoded, 7), true);
        if ($payload === false || strlen($payload) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
            throw new RuntimeException('Invalid encrypted value payload.');
        }

        $nonce = substr($payload, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $cipherText = substr($payload, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $plainText = sodium_crypto_secretbox_open($cipherText, $nonce, self::key());

        if ($plainText === false) {
            throw new RuntimeException('Encrypted value could not be decrypted.');
        }

        return $plainText;
    }

    private static function key(): string
    {
        $configured = Env::get('APP_KEY');
        if ($configured === null || $configured === '' || str_contains($configured, 'generate-32-byte')) {
            throw new RuntimeException('APP_KEY must be configured with a 32-byte base64 sodium key.');
        }

        $value = str_starts_with($configured, 'base64:') ? substr($configured, 7) : $configured;
        $key = base64_decode($value, true);

        if ($key === false || strlen($key) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) {
            throw new RuntimeException('APP_KEY must decode to exactly 32 bytes.');
        }

        return $key;
    }
}
