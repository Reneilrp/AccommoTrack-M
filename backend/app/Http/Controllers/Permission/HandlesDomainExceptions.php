<?php

namespace App\Http\Controllers\Permission;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

trait HandlesDomainExceptions
{
    /**
     * Handle DomainException and return appropriate JSON response.
     * Supports both plain text and JSON-encoded error payloads.
     */
    protected function renderDomainException(\DomainException $e, int $statusCode = 422): JsonResponse
    {
        $message = $e->getMessage();
        $data = json_decode($message, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
            return response()->json(array_merge([
                'success' => false,
            ], $data), $statusCode);
        }

        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => ['general' => [$message]],
        ], $statusCode);
    }
}
