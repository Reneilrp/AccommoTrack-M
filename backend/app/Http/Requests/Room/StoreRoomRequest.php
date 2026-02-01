<?php

namespace App\Http\Requests\Room;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoomRequest extends FormRequest
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
            'property_id' => 'required|exists:properties,id',
            'room_number' => 'required|string|max:50',
            'room_type' => 'required|in:single,double,quad,bedSpacer',
            'floor' => 'required|integer|min:1',
            'monthly_rate' => 'required_if:billing_policy,monthly,monthly_with_daily|numeric|min:0',
            'daily_rate' => 'required_if:billing_policy,daily,monthly_with_daily|numeric|min:0',
            'billing_policy' => 'nullable|string|in:monthly,monthly_with_daily,daily',
            'min_stay_days' => 'nullable|integer|min:1',
            'capacity' => 'required_if:room_type,bedSpacer|integer|min:1',
            'pricing_model' => 'sometimes|in:full_room,per_bed',
            'status' => 'sometimes|in:available,occupied,maintenance',
            'current_tenant_id' => 'nullable|exists:users,id',
            'description' => 'nullable|string|max:1000',
            'amenities' => 'nullable|array',
            'amenities.*' => 'string|max:100',
            'addons' => 'nullable',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg|max:10240'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'property_id.required' => 'Property is required.',
            'property_id.exists' => 'Selected property does not exist.',
            'room_number.required' => 'Room number is required.',
            'room_type.required' => 'Room type is required.',
            'room_type.in' => 'Invalid room type.',
            'floor.required' => 'Floor number is required.',
            'floor.min' => 'Floor must be at least 1.',
            'monthly_rate.required_if' => 'Monthly rate is required for monthly billing.',
            'daily_rate.required_if' => 'Daily rate is required for daily billing.',
            'capacity.required_if' => 'Capacity is required for bed spacer rooms.',
            'images.max' => 'You can upload a maximum of 10 images.',
            'images.*.image' => 'Each file must be an image.',
            'images.*.mimes' => 'Images must be JPEG, PNG, or JPG format.',
            'images.*.max' => 'Each image cannot exceed 10MB.',
        ];
    }
}
