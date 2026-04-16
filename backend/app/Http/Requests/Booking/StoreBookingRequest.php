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
        $minimumAdultDob = Carbon::today()->subYears(18)->toDateString();

        $rules = [
            'booking_mode' => ['nullable', 'string', Rule::in(['normal', 'proxy'])],
            'booking_group_reference' => 'nullable|string|max:64',
            'notes' => 'nullable|string|max:1000',
            'payment_plan' => 'nullable|string|in:full,monthly,promo_one_time',
            'receipt_image' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
        ];

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

        // Support array of items (cart checkout) or fallback to single checkout mapping
        $items = $this->input('items', []);

        if (empty($items)) {
            // Fallback to validating root level as a single item
            $roomId = $this->input('room_id');
            $billingPolicy = $roomId ? Room::query()->whereKey($roomId)->value('billing_policy') : null;
            $normalizedBillingPolicy = strtolower((string) $billingPolicy);
            $requestedContractMode = strtolower((string) $this->input('contract_mode', ''));
            $resolvedContractMode = in_array($requestedContractMode, ['daily', 'monthly'], true) ? $requestedContractMode : 'monthly';
            if ($normalizedBillingPolicy === 'daily') {
                $resolvedContractMode = 'daily';
            } elseif ($normalizedBillingPolicy === 'monthly') {
                $resolvedContractMode = 'monthly';
            }
            $isDailyContract = $resolvedContractMode === 'daily';

            $endDateRules = [
                $isDailyContract ? 'required' : 'nullable', 'date', 'after:start_date',
                function ($attribute, $value, $fail) use ($roomId, $resolvedContractMode) {
                    if (! $value) {
                        return;
                    }
                    $startDate = $this->input('start_date');
                    if ($startDate) {
                        if (Carbon::parse($value)->gt(Carbon::parse($startDate)->addYears(4))) {
                            $fail('The booking duration cannot exceed 4 years.');
                        }
                        if ($roomId) {
                            $room = Room::find($roomId);
                            if ($room && $room->min_stay_days) {
                                $minStay = (int) $room->min_stay_days;
                                if ($resolvedContractMode === 'monthly' && $minStay < 30) {
                                    $minStay = 30;
                                }
                                $requestedDays = Carbon::parse($startDate)->diffInDays(Carbon::parse($value));
                                if ($requestedDays < $minStay) {
                                    $fail("This room requires a minimum stay of {$minStay} days. Your requested stay is only {$requestedDays} days.");
                                }
                            }
                        }
                    }
                },
            ];

            $rules['room_id'] = 'required|exists:rooms,id';
            $rules['bed_count'] = 'nullable|integer|min:1';
            $rules['start_date'] = 'required|date|after_or_equal:today';
            $rules['end_date'] = $endDateRules;
            $rules['move_in_date'] = [
                'nullable', 'date', 'after_or_equal:start_date',
                function ($attribute, $value, $fail) {
                    $startDate = $this->input('start_date');
                    if ($value && $startDate && Carbon::parse($value)->toDateString() !== Carbon::parse($startDate)->toDateString()) {
                        $fail('Move-in date must match the selected check-in date.');
                    }
                },
            ];
            $rules['contract_mode'] = ['nullable', 'string', 'in:daily,monthly'];

            if ($normalizedBillingPolicy === 'daily') {
                $rules['contract_mode'] = ['nullable', 'string', Rule::in(['daily'])];
            } elseif ($normalizedBillingPolicy === 'monthly') {
                $rules['contract_mode'] = ['nullable', 'string', Rule::in(['monthly'])];
            } elseif ($normalizedBillingPolicy === 'monthly_with_daily') {
                $rules['contract_mode'] = ['nullable', 'string', Rule::in(['daily', 'monthly'])];
            }

            // Occupants logic for single
            $rules['occupants'] = 'required_if:booking_mode,proxy|array|min:1';
            $rules['occupants.*.first_name'] = 'required_with:occupants|string|max:120';
            $rules['occupants.*.middle_name'] = 'nullable|string|max:120';
            $rules['occupants.*.last_name'] = 'required_with:occupants|string|max:120';
            $rules['occupants.*.date_of_birth'] = ['required_with:occupants', 'date', 'before_or_equal:'.$minimumAdultDob];
            $rules['occupants.*.sex'] = 'required_with:occupants|string|in:male,female|max:32';
            $rules['occupants.*.relationship_to_booker'] = 'required_with:occupants|string|max:64';
            $rules['occupants.*.phone'] = 'nullable|string|max:32';
            $rules['occupants.*.email'] = 'nullable|email|max:255';

        } else {
            // Cart checkout mapping
            $rules['items'] = 'required|array|min:1';
            $rules['items.*.room_id'] = 'required|exists:rooms,id';
            $rules['items.*.bed_count'] = 'nullable|integer|min:1';
            $rules['items.*.start_date'] = 'required|date|after_or_equal:today';
            $rules['items.*.end_date'] = 'nullable|date|after:items.*.start_date';
            $rules['items.*.move_in_date'] = 'nullable|date|after_or_equal:items.*.start_date';
            $rules['items.*.contract_mode'] = ['nullable', 'string', 'in:daily,monthly'];

            // Occupants for Cart
            $rules['items.*.occupants'] = 'required_if:booking_mode,proxy|array|min:1';
            $rules['items.*.occupants.*.first_name'] = 'required_with:items.*.occupants|string|max:120';
            $rules['items.*.occupants.*.middle_name'] = 'nullable|string|max:120';
            $rules['items.*.occupants.*.last_name'] = 'required_with:items.*.occupants|string|max:120';
            $rules['items.*.occupants.*.date_of_birth'] = ['required_with:items.*.occupants', 'date', 'before_or_equal:'.$minimumAdultDob];
            $rules['items.*.occupants.*.sex'] = 'required_with:items.*.occupants|string|in:male,female|max:32';
            $rules['items.*.occupants.*.relationship_to_booker'] = 'required_with:items.*.occupants|string|max:64';
            $rules['items.*.occupants.*.phone'] = 'nullable|string|max:32';
            $rules['items.*.occupants.*.email'] = 'nullable|email|max:255';
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
            'occupants.*.first_name.required_with' => 'Each occupant must include a first name.',
            'occupants.*.last_name.required_with' => 'Each occupant must include a last name.',
            'occupants.*.date_of_birth.required_with' => 'Each occupant must include a date of birth.',
            'occupants.*.date_of_birth.before_or_equal' => 'Each occupant must be at least 18 years old.',
            'occupants.*.sex.required_with' => 'Each occupant must include a sex.',
            'occupants.*.sex.in' => 'Each occupant sex must be male or female.',
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
