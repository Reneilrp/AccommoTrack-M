<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
class AuditLogService
{
    public function log(string $domain, string $event, array $context = []): AuditLog
    {
        $request = request();

        $actor = $context['actor'] ?? auth()->user();
        if (! $actor instanceof User) {
            $actor = null;
        }

        $metadata = $context['metadata'] ?? null;
        if ($metadata !== null && ! is_array($metadata)) {
            $metadata = ['value' => (string) $metadata];
        }

        return AuditLog::create([
            'domain' => $domain,
            'event' => $event,
            'severity' => (string) ($context['severity'] ?? 'info'),
            'actor_id' => $actor?->id,
            'actor_role' => $actor?->role,
            'subject_type' => $context['subject_type'] ?? null,
            'subject_id' => $context['subject_id'] ?? null,
            'booking_id' => $context['booking_id'] ?? null,
            'invoice_id' => $context['invoice_id'] ?? null,
            'payment_transaction_id' => $context['payment_transaction_id'] ?? null,
            'property_id' => $context['property_id'] ?? null,
            'tenant_id' => $context['tenant_id'] ?? null,
            'landlord_id' => $context['landlord_id'] ?? null,
            'status_before' => $context['status_before'] ?? null,
            'status_after' => $context['status_after'] ?? null,
            'summary' => $context['summary'] ?? null,
            'metadata' => $metadata,
            'request_id' => $context['request_id'] ?? ($request?->header('X-Request-Id') ?: $request?->header('X-Correlation-Id')),
            'ip_address' => $context['ip_address'] ?? $request?->ip(),
            'user_agent' => $context['user_agent'] ?? $request?->userAgent(),
        ]);
    }

    public function paymentEvent(string $event, array $context = []): AuditLog
    {
        return $this->log('payment', $event, $context);
    }

    public function bookingEvent(string $event, array $context = []): AuditLog
    {
        return $this->log('booking', $event, $context);
    }

    public function invoiceEvent(string $event, array $context = []): AuditLog
    {
        return $this->log('invoice', $event, $context);
    }

    public function legalEvent(string $event, array $context = []): AuditLog
    {
        return $this->log('legal', $event, $context);
    }
}
