<?php

namespace App\Exceptions;

use Exception;

class PendingVerificationException extends Exception
{
    public bool $otpResent;

    public ?int $retryAfterSeconds;

    public function __construct(
        string $message = 'Pending verification.',
        bool $otpResent = false,
        ?int $retryAfterSeconds = null,
        int $code = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->otpResent = $otpResent;
        $this->retryAfterSeconds = $retryAfterSeconds;
    }
}
