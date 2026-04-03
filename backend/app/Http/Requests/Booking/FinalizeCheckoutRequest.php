<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class FinalizeCheckoutRequest extends FormRequest
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
            'move_out_date' => 'nullable|date|before_or_equal:today',
            'note' => 'nullable|string|max:500',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'move_out_date.date' => 'Move-out date must be a valid date.',
            'move_out_date.before_or_equal' => 'Move-out date cannot be in the future.',
            'note.max' => 'Checkout note cannot exceed 500 characters.',
        ];
    }
}
