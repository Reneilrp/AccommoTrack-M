<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class SettleDepositRequest extends FormRequest
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
            'damage_fee' => 'nullable|numeric|min:0',
            'cleaning_fee' => 'nullable|numeric|min:0',
            'other_fee' => 'nullable|numeric|min:0',
            'mark_refunded' => 'nullable|boolean',
            'refund_method' => 'required_if:mark_refunded,true|nullable|string|max:50',
            'refund_reference' => 'nullable|string|max:100',
            'note' => 'nullable|string|max:500',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'damage_fee.numeric' => 'Damage fee must be a valid amount.',
            'cleaning_fee.numeric' => 'Cleaning fee must be a valid amount.',
            'other_fee.numeric' => 'Other fee must be a valid amount.',
            'refund_method.required_if' => 'Refund method is required when marking as refunded.',
        ];
    }
}
