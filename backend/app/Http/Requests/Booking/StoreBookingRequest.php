<?php

namespace App\Http\Requests\Booking;

use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookingRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('booking_mode')) {
            $this->merge([
                'booking_mode' => strtolower((string) $this->input('booking_mode')),
            ]);
        }
    }

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
        $roomId = $this->input('room_id');
        $billingPolicy = null;

        if ($roomId) {
            $billingPolicy = Room::query()->whereKey($roomId)->value('billing_policy');
        }

        $normalizedBillingPolicy = strtolower((string) $billingPolicy);
        $requestedContractMode = strtolower((string) $this->input('contract_mode', ''));

        if ($normalizedBillingPolicy === 'daily') {
            $resolvedContractMode = 'daily';
        } elseif ($normalizedBillingPolicy === 'monthly') {
            $resolvedContractMode = 'monthly';
        } else {
            $resolvedContractMode = in_array($requestedContractMode, ['daily', 'monthly'], true)
                ? $requestedContractMode
                : 'monthly';
        }

        $isDailyContract = $resolvedContractMode === 'daily';

        $endDateRules = [
            $isDailyContract ? 'required' : 'nullable',
            'date',
            'after:start_date',
            function ($attribute, $value, $fail) {
                if (! $value) {
                    return;
                }

                $startDate = $this->input('start_date');
                if ($startDate) {
                    $fourYearsLater = Carbon::parse($startDate)->addYears(4);
                    if (Carbon::parse($value)->gt($fourYearsLater)) {
                        $fail('The booking duration cannot exceed 4 years.');
                    }
                }
            },
        ];
        $minimumAdultDob = Carbon::today()->subYears(18)->toDateString();

        $rules = [
            'room_id' => 'required|exists:rooms,id',
            'booking_mode' => ['nullable', 'string', Rule::in(['normal', 'proxy'])],
            'booking_group_reference' => 'nullable|string|max:64',
            'bed_count' => 'nullable|integer|min:1',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => $endDateRules,
            'move_in_date' => [
                'nullable',
                'date',
                'after_or_equal:start_date',
                function ($attribute, $value, $fail) {
                    $startDate = $this->input('start_date');

                    if (! $value || ! $startDate) {
                        return;
                    }

                    if (Carbon::parse($value)->toDateString() !== Carbon::parse($startDate)->toDateString()) {
                        $fail('Move-in date must match the selected check-in date.');
                    }
                },
            ],
            'notes' => 'nullable|string|max:1000',
            'payment_plan' => 'nullable|string|in:full,monthly,promo_one_time',
            'contract_mode' => ['nullable', 'string', 'in:daily,monthly'],
            'receipt_image' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
            'occupants' => 'required_if:booking_mode,proxy|array|min:1',
            'occupants.*.full_name' => 'required_with:occupants|string|max:255',
            'occupants.*.date_of_birth' => ['required_with:occupants', 'date', 'before_or_equal:'.$minimumAdultDob],
            'occupants.*.gender' => 'required_with:occupants|string|in:male,female,other,prefer_not_to_say|max:32',
            'occupants.*.relationship_to_booker' => 'required_with:occupants|string|max:64',
            'occupants.*.phone' => 'nullable|string|max:32',
            'occupants.*.email' => 'nullable|email|max:255',
        ];

        if ($normalizedBillingPolicy === 'daily') {
            $rules['contract_mode'] = ['nullable', 'string', Rule::in(['daily'])];
        } elseif ($normalizedBillingPolicy === 'monthly') {
            $rules['contract_mode'] = ['nullable', 'string', Rule::in(['monthly'])];
        } elseif ($normalizedBillingPolicy === 'monthly_with_daily') {
            $rules['contract_mode'] = ['nullable', 'string', Rule::in(['daily', 'monthly'])];
        }

        $user = $this->user();
        if ($user && $user->role === 'tenant') {
            $rules['tenant_id'] = [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'tenant')),
            ];
            $rules['guest_name'] = 'nullable|string|max:255';
        } else {
            $rules['tenant_id'] = [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'tenant')),
                'required_without:guest_name',
            ];
            $rules['guest_name'] = 'nullable|string|max:255|required_without:tenant_id';
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'room_id.required' => 'Please select a room to book.',
            'room_id.exists' => 'The selected room does not exist.',
            'booking_mode.in' => 'Invalid booking mode. Allowed modes are normal or proxy.',
            'tenant_id.required_without' => 'Please select an existing tenant or enter a guest name.',
            'tenant_id.exists' => 'The selected tenant is invalid.',
            'guest_name.required_without' => 'Please enter a guest name when no tenant is selected.',
            'occupants.required_if' => 'Proxy booking requires at least one occupant entry.',
            'occupants.array' => 'Occupants payload must be a valid list.',
            'occupants.min' => 'Proxy booking requires at least one occupant.',
            'occupants.*.full_name.required_with' => 'Each occupant must include a full name.',
            'occupants.*.date_of_birth.required_with' => 'Each occupant must include a date of birth.',
            'occupants.*.date_of_birth.before_or_equal' => 'Each occupant must be at least 18 years old.',
            'occupants.*.gender.required_with' => 'Each occupant must include a gender.',
            'occupants.*.gender.in' => 'Each occupant gender must be one of: male, female, other, prefer_not_to_say.',
            'occupants.*.relationship_to_booker.required_with' => 'Each occupant must include relationship to booker.',
            'start_date.required' => 'Please select a check-in date.',
            'start_date.after_or_equal' => 'Check-in date must be today or later.',
            'move_in_date.after_or_equal' => 'Move-in date cannot be earlier than the selected check-in date.',
            'end_date.required' => 'Please select a check-out date for daily bookings.',
            'end_date.after' => 'Check-out date must be after check-in date.',
            'contract_mode.required' => 'Please choose a booking mode for this room.',
            'contract_mode.in' => 'Invalid booking mode selected for this room.',
        ];
    }
}
