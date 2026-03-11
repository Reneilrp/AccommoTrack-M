<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
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

        return [
            'room_number' => 'sometimes|string|max:50',
            'room_type' => [
                'sometimes',
                'in:single,double,quad,bedSpacer',
                function ($attribute, $value, $fail) use ($isApartment) {
                    if ($isApartment && $value === 'bedSpacer') {
                        $fail('The room type for Apartment cannot be Bed Spacer. It must be Single, Double, or Quad Room.');
                    }
                }
            ],
            'floor' => 'sometimes|integer|min:1',
            'monthly_rate' => 'sometimes|required_if:billing_policy,monthly,monthly_with_daily|numeric|min:0',
            'daily_rate' => 'sometimes|required_if:billing_policy,daily,monthly_with_daily|numeric|min:0',
            'billing_policy' => 'nullable|string|in:monthly,monthly_with_daily,daily',
            'min_stay_days' => 'nullable|integer|min:1',
            'capacity' => 'sometimes|integer|min:1',
            'pricing_model' => 'sometimes|in:full_room,per_bed',
            'status' => 'sometimes|in:available,occupied,maintenance',
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
}
