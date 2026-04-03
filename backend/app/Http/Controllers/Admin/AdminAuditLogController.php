<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'domain' => 'nullable|string|max:40',
            'event' => 'nullable|string|max:120',
            'actor_id' => 'nullable|integer',
            'booking_id' => 'nullable|integer',
            'invoice_id' => 'nullable|integer',
            'payment_transaction_id' => 'nullable|integer',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'per_page' => 'nullable|integer|min:1|max:200',
        ]);

        $perPage = (int) ($validated['per_page'] ?? 50);

        $query = AuditLog::query()
            ->when(isset($validated['domain']), fn ($q) => $q->where('domain', $validated['domain']))
            ->when(isset($validated['event']), fn ($q) => $q->where('event', $validated['event']))
            ->when(isset($validated['actor_id']), fn ($q) => $q->where('actor_id', $validated['actor_id']))
            ->when(isset($validated['booking_id']), fn ($q) => $q->where('booking_id', $validated['booking_id']))
            ->when(isset($validated['invoice_id']), fn ($q) => $q->where('invoice_id', $validated['invoice_id']))
            ->when(isset($validated['payment_transaction_id']), fn ($q) => $q->where('payment_transaction_id', $validated['payment_transaction_id']))
            ->when(isset($validated['from']), fn ($q) => $q->whereDate('created_at', '>=', $validated['from']))
            ->when(isset($validated['to']), fn ($q) => $q->whereDate('created_at', '<=', $validated['to']))
            ->orderByDesc('created_at');

        $logs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs,
            'message' => '',
        ]);
    }

    public function entityTimeline(Request $request)
    {
        $validated = $request->validate([
            'entity_type' => 'required|in:booking,invoice,payment,user',
            'entity_id' => 'required|integer',
            'order' => 'nullable|in:asc,desc',
        ]);

        $order = $validated['order'] ?? 'asc';

        $query = AuditLog::query();

        switch ($validated['entity_type']) {
            case 'booking':
                $query->where('booking_id', $validated['entity_id']);
                break;
            case 'invoice':
                $query->where('invoice_id', $validated['entity_id']);
                break;
            case 'payment':
                $query->where('payment_transaction_id', $validated['entity_id']);
                break;
            case 'user':
                $query->where(function ($nested) use ($validated) {
                    $nested->where('actor_id', $validated['entity_id'])
                        ->orWhere('tenant_id', $validated['entity_id'])
                        ->orWhere('landlord_id', $validated['entity_id']);
                });
                break;
        }

        $timeline = $query
            ->orderBy('created_at', $order)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $timeline,
            'message' => '',
        ]);
    }
}
