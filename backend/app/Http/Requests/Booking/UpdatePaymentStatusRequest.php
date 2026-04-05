<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePaymentStatusRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'payment_status' => 'required|in:unpaid,partial,paid,refunded',
            'payment_method' => 'nullable|in:paymongo,paymongo_gcash,gcash,cash,bank_transfer,paymaya',
            'payment_reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'payment_status.required' => 'Payment status is required.',
            'payment_status.in' => 'Invalid payment status. Allowed: unpaid, partial, paid, refunded.',
            'payment_method.in' => 'Invalid payment method. Allowed: paymongo, paymongo_gcash, gcash, cash, bank_transfer, paymaya.',
        ];
    }
}
