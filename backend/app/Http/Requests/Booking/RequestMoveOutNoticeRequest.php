<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class RequestMoveOutNoticeRequest extends FormRequest
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
            'move_out_date' => 'required|date|after_or_equal:today',
            'reason' => 'nullable|string|max:500',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'move_out_date.required' => 'Move-out date is required.',
            'move_out_date.date' => 'Move-out date must be a valid date.',
            'move_out_date.after_or_equal' => 'Move-out date must be today or later.',
        ];
    }
}
