<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // More specific authorization will be handled in the controller,
        // ensuring the room belongs to the landlord.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $room = \App\Models\Room::find($this->route('room') ?? $this->route('id'));
        $isApartment = $room && $room->property && $room->property->property_type === 'apartment';

        $propertyGender = ($room && $room->property) ? strtolower($room->property->gender_restriction) : 'mixed';
        $allowedGenders = ['male', 'female'];
        if ($room && $room->property && ! in_array($room->property->property_type, ['dormitory', 'boardingHouse', 'bedSpacer'])) {
            $allowedGenders[] = 'mixed';
        }

        if (in_array($propertyGender, ['female', 'girls'])) {
            $allowedGenders = ['female'];
        } elseif (in_array($propertyGender, ['male', 'boys'])) {
            $allowedGenders = ['male'];
        }

        $genderRule = 'nullable|in:'.implode(',', $allowedGenders);

        return [
            'room_number' => 'sometimes|string|max:50',
            'room_type' => [
                'sometimes',
                'in:single,double,quad,bedSpacer',
                function ($attribute, $value, $fail) use ($isApartment) {
                    if ($isApartment && $value === 'bedSpacer') {
                        $fail('The room type for Apartment cannot be Bed Spacer. It must be Single, Double, or Quad Room.');
                    }
                },
            ],
            'gender_restriction' => $genderRule,
            'floor' => [
                'sometimes',
                'integer',
                'min:1',
                function ($attribute, $value, $fail) use ($room) {
                    if (! $room || ! $room->property) {
                        return;
                    }

                    $property = $room->property;
                    $floorLevel = $property->floor_level;
                    $totalFloors = $property->total_floors;

                    // Check if floor_level is a comma-separated list of numbers
                    $managedFloors = array_filter(explode(',', $floorLevel), 'is_numeric');

                    if (! empty($managedFloors)) {
                        if (! in_array($value, $managedFloors)) {
                            $fail('The selected floor is not one of the managed floors for this property ('.implode(', ', $managedFloors).').');
                        }
                    } elseif ($totalFloors > 0) {
                        if ($value > $totalFloors) {
                            $fail("The selected floor exceeds the total number of floors ($totalFloors) for this property.");
                        }
                    }
                },
            ],
            'monthly_rate' => 'sometimes|nullable|required_if:billing_policy,monthly,monthly_with_daily|numeric|min:0',
            'daily_rate' => 'sometimes|nullable|required_if:billing_policy,daily,monthly_with_daily|numeric|min:0',
            'billing_policy' => 'nullable|string|in:monthly,monthly_with_daily,daily',
            'min_stay_days' => 'nullable|integer|min:1',
            'capacity' => 'sometimes|integer|min:1',
            'pricing_model' => 'sometimes|in:full_room,per_bed',
            'status' => 'sometimes|in:available,occupied,maintenance',
            'require_1month_advance' => 'sometimes|boolean',
            'current_tenant_id' => 'nullable|exists:users,id',
            'description' => 'nullable|string',
            'rules' => 'nullable|array',
            'rules.*' => 'string',
            'amenities' => 'nullable|array',
            'amenities.*' => 'string',
            'images' => 'nullable|array',
            'images.*' => 'string|url', // Assuming URLs are sent for existing images
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, mixed>
     */
    public function messages(): array
    {
        $room = \App\Models\Room::find($this->route('room') ?? $this->route('id'));
        $propertyGender = ($room && $room->property) ? strtolower($room->property->gender_restriction) : 'mixed';

        if (in_array($propertyGender, ['female', 'girls'])) {
            $message = 'This property is restricted to females only. All rooms must also be female-only.';
        } elseif (in_array($propertyGender, ['male', 'boys'])) {
            $message = 'This property is restricted to males only. All rooms must also be male-only.';
        } else {
            $message = 'The selected gender restriction is invalid.';
        }

        return [
            'gender_restriction.in' => $message,
        ];
    }
}
