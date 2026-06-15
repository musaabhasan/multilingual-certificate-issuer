<?php

declare(strict_types=1);

namespace CertificateIssuer\Security;

use CertificateIssuer\Support\Env;
use RuntimeException;

final class Crypto
{
    private const KEY_BYTES = 32;
    private const PORTABLE_NONCE_BYTES = 16;
    private const PORTABLE_MAC_BYTES = 32;

    public static function encrypt(string $plainText): string
    {
        $key = self::key();

        if (self::sodiumAvailable()) {
            $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
            $cipherText = sodium_crypto_secretbox($plainText, $nonce, $key);

            return 'sodium:' . base64_encode($nonce . $cipherText);
        }

        return 'hmac-sha256:' . self::encryptPortable($plainText, $key);
    }

    public static function decrypt(string $encoded): string
    {
        if (str_starts_with($encoded, 'hmac-sha256:')) {
            return self::decryptPortable(substr($encoded, 12), self::key());
        }

        if (str_starts_with($encoded, 'sodium:')) {
            if (!self::sodiumAvailable()) {
                throw new RuntimeException('Encrypted value requires the PHP Sodium extension. Enable Sodium or re-save this credential.');
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

        throw new RuntimeException('Unsupported encrypted value format.');
    }

    private static function sodiumAvailable(): bool
    {
        return extension_loaded('sodium')
            && defined('SODIUM_CRYPTO_SECRETBOX_NONCEBYTES')
            && defined('SODIUM_CRYPTO_SECRETBOX_KEYBYTES')
            && function_exists('sodium_crypto_secretbox')
            && function_exists('sodium_crypto_secretbox_open');
    }

    private static function encryptPortable(string $plainText, string $key): string
    {
        $nonce = random_bytes(self::PORTABLE_NONCE_BYTES);
        $cipherText = self::xorWithKeyStream($plainText, $key, $nonce);
        $mac = hash_hmac('sha256', 'mac|' . $nonce . $cipherText, $key, true);

        return base64_encode($nonce . $mac . $cipherText);
    }

    private static function decryptPortable(string $encoded, string $key): string
    {
        $payload = base64_decode($encoded, true);
        if ($payload === false || strlen($payload) < self::PORTABLE_NONCE_BYTES + self::PORTABLE_MAC_BYTES) {
            throw new RuntimeException('Invalid encrypted value payload.');
        }

        $nonce = substr($payload, 0, self::PORTABLE_NONCE_BYTES);
        $mac = substr($payload, self::PORTABLE_NONCE_BYTES, self::PORTABLE_MAC_BYTES);
        $cipherText = substr($payload, self::PORTABLE_NONCE_BYTES + self::PORTABLE_MAC_BYTES);
        $expectedMac = hash_hmac('sha256', 'mac|' . $nonce . $cipherText, $key, true);

        if (!hash_equals($expectedMac, $mac)) {
            throw new RuntimeException('Encrypted value could not be authenticated.');
        }

        return self::xorWithKeyStream($cipherText, $key, $nonce);
    }

    private static function xorWithKeyStream(string $input, string $key, string $nonce): string
    {
        $output = '';
        $offset = 0;
        $counter = 0;
        $length = strlen($input);

        while ($offset < $length) {
            $block = hash_hmac('sha256', 'enc|' . $nonce . pack('N', $counter), $key, true);
            $chunk = substr($input, $offset, strlen($block));
            $output .= $chunk ^ substr($block, 0, strlen($chunk));
            $offset += strlen($chunk);
            $counter += 1;
        }

        return $output;
    }

    private static function key(): string
    {
        $configured = Env::get('APP_KEY');
        if ($configured === null || $configured === '' || str_contains($configured, 'generate-32-byte')) {
            throw new RuntimeException('APP_KEY must be configured with a 32-byte base64 sodium key.');
        }

        $value = str_starts_with($configured, 'base64:') ? substr($configured, 7) : $configured;
        $key = base64_decode($value, true);

        if ($key === false || strlen($key) !== self::KEY_BYTES) {
            throw new RuntimeException('APP_KEY must decode to exactly 32 bytes.');
        }

        return $key;
    }
}
