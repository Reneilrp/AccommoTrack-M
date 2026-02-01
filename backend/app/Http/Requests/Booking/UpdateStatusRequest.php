<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStatusRequest extends FormRequest
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
            'status' => 'required|in:pending,confirmed,cancelled,completed,partial-completed',
            'cancellation_reason' => 'required_if:status,cancelled|nullable|string|max:500',
            'refund_amount' => 'nullable|numeric|min:0',
            'should_refund' => 'nullable|boolean'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'status.required' => 'Booking status is required.',
            'status.in' => 'Invalid booking status.',
            'cancellation_reason.required_if' => 'Please provide a cancellation reason.',
            'refund_amount.numeric' => 'Refund amount must be a number.',
            'refund_amount.min' => 'Refund amount cannot be negative.',
        ];
    }
}
