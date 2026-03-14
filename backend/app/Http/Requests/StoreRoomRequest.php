<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\Property;

class StoreRoomRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        // Check if the property exists and belongs to the authenticated user.
        $property = Property::where('id', $this->input('property_id'))
                            ->where('landlord_id', Auth::id())
                            ->first();

        return $property !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $propertyId = $this->input('property_id');
        $property = Property::find($propertyId);
        $isApartment = $property && $property->property_type === 'apartment';

        return [
            'property_id' => 'required|exists:properties,id',
            'room_number' => 'required|string|max:50',
            'room_type' => [
                'required',
                'in:single,double,quad,bedSpacer',
                function ($attribute, $value, $fail) use ($isApartment) {
                    if ($isApartment && $value === 'bedSpacer') {
                        $fail('The room type for Apartment cannot be Bed Spacer. It must be Single, Double, or Quad Room.');
                    }
                }
            ],
            'floor' => 'required|integer|min:1',
            'billing_policy' => 'required|string|in:monthly,monthly_with_daily,daily',
            'monthly_rate' => 'required_if:billing_policy,monthly,monthly_with_daily|numeric|min:0',
            'daily_rate' => 'required_if:billing_policy,daily,monthly_with_daily|numeric|min:0',
            'min_stay_days' => 'nullable|integer|min:1',
            'capacity' => 'required|integer|min:1',
            'pricing_model' => 'required|in:full_room,per_bed',
            'status' => 'sometimes|in:available,occupied,maintenance',
            'description' => 'nullable|string',
            'rules' => 'nullable|array',
            'rules.*' => 'string',
            'amenities' => 'nullable|array',
            'amenities.*' => 'string',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg|max:10240'
        ];
    }
}
