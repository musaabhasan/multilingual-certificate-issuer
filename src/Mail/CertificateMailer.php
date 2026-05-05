<?php

declare(strict_types=1);

namespace CertificateIssuer\Mail;

use PHPMailer\PHPMailer\PHPMailer;
use RuntimeException;

final class CertificateMailer
{
    public function send(
        SmtpProfile $profile,
        string $recipientEmail,
        string $recipientName,
        string $subject,
        string $htmlBody,
        string $pdfPath
    ): void {
        if (!class_exists(PHPMailer::class)) {
            throw new RuntimeException('PHPMailer is not installed. Run composer install.');
        }

        if (!is_file($pdfPath)) {
            throw new RuntimeException('Certificate PDF does not exist: ' . $pdfPath);
        }

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $profile->host;
        $mail->Port = $profile->port;
        $mail->SMTPAuth = true;
        $mail->Username = $profile->username;
        $mail->Password = $profile->password();
        $mail->SMTPSecure = $profile->encryption;
        $mail->CharSet = 'UTF-8';
        $mail->setFrom($profile->fromAddress, $profile->fromName);
        $mail->addAddress($recipientEmail, $recipientName);
        $mail->Subject = $subject;
        $mail->isHTML(true);
        $mail->Body = $htmlBody;
        $mail->AltBody = strip_tags($htmlBody);
        $mail->addAttachment($pdfPath, 'certificate.pdf', 'base64', 'application/pdf');
        $mail->send();
    }
}
