<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;
use Carbon\Carbon;

class StoreBookingRequest extends FormRequest
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
            'room_id' => 'required|exists:rooms,id',
            'guest_name' => 'nullable|string|max:255',
            'bed_count' => 'nullable|integer|min:1',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => [
                'required',
                'date',
                'after:start_date',
                function ($attribute, $value, $fail) {
                    $startDate = $this->input('start_date');
                    if ($startDate) {
                        $fourYearsLater = Carbon::parse($startDate)->addYears(4);
                        if (Carbon::parse($value)->gt($fourYearsLater)) {
                            $fail('The booking duration cannot exceed 4 years.');
                        }
                    }
                },
            ],
            'notes' => 'nullable|string|max:1000'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'room_id.required' => 'Please select a room to book.',
            'room_id.exists' => 'The selected room does not exist.',
            'start_date.required' => 'Please select a check-in date.',
            'start_date.after_or_equal' => 'Check-in date must be today or later.',
            'end_date.required' => 'Please select a check-out date.',
            'end_date.after' => 'Check-out date must be after check-in date.',
        ];
    }
}
