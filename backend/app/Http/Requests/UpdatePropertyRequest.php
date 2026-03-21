<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePropertyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        // Authorization logic is handled in the controller/service layer.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        return [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'property_type' => 'sometimes|required|string|max:255',
            'gender_restriction' => 'nullable|in:boys,girls,mixed,male,female',
            'street_address' => 'sometimes|required|string',
            'city' => 'sometimes|required|string',
            'province' => 'sometimes|required|string',
            'barangay' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'nearby_landmarks' => 'nullable|string',
            'max_occupants' => 'nullable|integer|min:1',
            'number_of_bedrooms' => 'nullable|integer|min:0',
            'number_of_bathrooms' => 'nullable|integer|min:0',
            'floor_area' => 'nullable|numeric|min:0',
            'floor_level' => 'nullable|string|max:255',
            'total_floors' => 'nullable|integer|min:1',
            'property_rules' => 'nullable|string',
            'total_rooms' => 'nullable|integer',
            'current_status' => 'nullable|in:pending,maintenance,draft,active,inactive',
            'is_draft' => 'sometimes|boolean',
            'is_published' => 'sometimes|boolean',
            'is_available' => 'sometimes|boolean',
            'is_eligible' => 'sometimes|boolean',
            'amenities' => 'nullable|array',
            'amenities.*' => 'nullable|string',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
            'images' => 'nullable|array|max:10',
            'video' => 'nullable|mimes:mp4,mov,avi|max:102400',
            'credentials' => 'nullable|array',
            'credentials.*' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:10240',
            'accepted_payments' => 'nullable|array',
            'accepted_payments.*' => 'in:cash,online',
            'delete_video' => 'sometimes|boolean',
        ];
    }
}
