<?php

namespace App\Http\Requests\Room;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomRequest extends FormRequest
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
            'room_number' => 'sometimes|string|max:50',
            'room_type' => 'sometimes|in:single,double,quad,bedSpacer',
            'floor' => 'sometimes|integer|min:1',
            'monthly_rate' => 'sometimes|numeric|min:0',
            'daily_rate' => 'nullable|numeric|min:0',
            'billing_policy' => 'nullable|string|in:monthly,monthly_with_daily,daily',
            'min_stay_days' => 'nullable|integer|min:1',
            'capacity' => 'sometimes|integer|min:1',
            'pricing_model' => 'sometimes|in:full_room,per_bed',
            'status' => 'sometimes|in:available,occupied,maintenance',
            'current_tenant_id' => 'nullable|exists:users,id',
            'description' => 'nullable|string|max:1000',
            'amenities' => 'nullable|array',
            'amenities.*' => 'string|max:100',
            'addons' => 'nullable',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg|max:10240',
            'remove_images' => 'nullable|array',
            'remove_images.*' => 'integer|exists:room_images,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'room_type.in' => 'Invalid room type.',
            'floor.min' => 'Floor must be at least 1.',
            'monthly_rate.numeric' => 'Monthly rate must be a number.',
            'monthly_rate.min' => 'Monthly rate cannot be negative.',
            'daily_rate.numeric' => 'Daily rate must be a number.',
            'daily_rate.min' => 'Daily rate cannot be negative.',
            'capacity.min' => 'Capacity must be at least 1.',
            'images.max' => 'You can upload a maximum of 10 images.',
            'images.*.image' => 'Each file must be an image.',
            'images.*.mimes' => 'Images must be JPEG, PNG, or JPG format.',
            'images.*.max' => 'Each image cannot exceed 10MB.',
            'remove_images.*.exists' => 'One or more images to remove do not exist.',
        ];
    }
}
