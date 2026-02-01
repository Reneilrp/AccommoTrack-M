<?php

namespace App\Http\Requests\Property;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePropertyRequest extends FormRequest
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
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'property_type' => 'sometimes|in:apartment,dormitory,boardingHouse,bedSpacer',
            'current_status' => 'nullable|in:active,inactive,pending,maintenance,draft',
            'is_draft' => 'sometimes|boolean',
            'street_address' => 'sometimes|string|max:500',
            'city' => 'sometimes|string|max:100',
            'province' => 'sometimes|string|max:100',
            'barangay' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'nearby_landmarks' => 'nullable|string|max:1000',
            'property_rules' => 'nullable|string|max:2000',
            'is_published' => 'sometimes|boolean',
            'is_available' => 'sometimes|boolean',
            'amenities' => 'nullable|array',
            'amenities.*' => 'nullable|string|max:100',
            'images' => 'nullable|array|max:10',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'credentials' => 'nullable|array',
            'credentials.*' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:10240',
            'remove_images' => 'nullable|array',
            'remove_images.*' => 'integer|exists:property_images,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'title.max' => 'Property title cannot exceed 255 characters.',
            'property_type.in' => 'Invalid property type.',
            'latitude.between' => 'Latitude must be between -90 and 90.',
            'longitude.between' => 'Longitude must be between -180 and 180.',
            'images.max' => 'You can upload a maximum of 10 images.',
            'images.*.image' => 'Each file must be an image.',
            'images.*.mimes' => 'Images must be JPEG, PNG, or JPG format.',
            'images.*.max' => 'Each image cannot exceed 10MB.',
            'remove_images.*.exists' => 'One or more images to remove do not exist.',
        ];
    }
}
