<?php

namespace App\Http\Requests;

use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Validator;

class StoreRoomRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
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
        $normalizedPropertyType = $this->normalizePropertyTypeToken($property?->property_type);
        $isApartment = $normalizedPropertyType === 'apartment';

        $propertySex = $property ? strtolower($property->sex_restriction) : 'mixed';
        $allowedGenders = ['male', 'female'];
        if (! in_array($normalizedPropertyType, ['dormitory', 'boardinghouse', 'bedspacer'], true)) {
            $allowedGenders[] = 'mixed';
        }

        if (in_array($propertySex, ['female', 'girls'])) {
            $allowedGenders = ['female'];
        } elseif (in_array($propertySex, ['male', 'boys'])) {
            $allowedGenders = ['male'];
        }

        $genderRule = 'nullable|in:'.implode(',', $allowedGenders);

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
                },
            ],
            'sex_restriction' => $genderRule,
            'floor' => [
                'required',
                'integer',
                'min:1',
                function ($attribute, $value, $fail) use ($property) {
                    if (! $property) {
                        return;
                    }

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
            'billing_policy' => 'required|string|in:monthly,monthly_with_daily,daily',
            'monthly_rate' => 'nullable|required_if:billing_policy,monthly,monthly_with_daily|numeric|min:0',
            'daily_rate' => 'nullable|required_if:billing_policy,daily,monthly_with_daily|numeric|min:0',
            'min_stay_days' => 'nullable|integer|min:1',
            'capacity' => 'required|integer|min:1',
            'pricing_model' => 'required|in:full_room,per_bed',
            'status' => 'sometimes|in:available,occupied,maintenance',
            'require_1month_advance' => 'sometimes|boolean',
            'description' => 'nullable|string',
            'rules' => 'nullable|array',
            'rules.*' => 'string',
            'amenities' => 'nullable|array',
            'amenities.*' => 'string',
            'duration_pricing' => 'nullable|array',
            'duration_pricing.3' => 'nullable|array',
            'duration_pricing.6' => 'nullable|array',
            'duration_pricing.9' => 'nullable|array',
            'duration_pricing.12' => 'nullable|array',
            'duration_pricing.3.discount_type' => 'required_with:duration_pricing.3|in:percent,fixed',
            'duration_pricing.6.discount_type' => 'required_with:duration_pricing.6|in:percent,fixed',
            'duration_pricing.9.discount_type' => 'required_with:duration_pricing.9|in:percent,fixed',
            'duration_pricing.12.discount_type' => 'required_with:duration_pricing.12|in:percent,fixed',
            'duration_pricing.3.discount_value' => 'required_with:duration_pricing.3|numeric|gt:0',
            'duration_pricing.6.discount_value' => 'required_with:duration_pricing.6|numeric|gt:0',
            'duration_pricing.9.discount_value' => 'required_with:duration_pricing.9|numeric|gt:0',
            'duration_pricing.12.discount_value' => 'required_with:duration_pricing.12|numeric|gt:0',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg|max:10240',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('duration_pricing')) {
            return;
        }

        $decoded = $this->decodeDurationPricing($this->input('duration_pricing'));
        if ($decoded !== null) {
            $this->merge(['duration_pricing' => $decoded]);
        }
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $pricing = $this->input('duration_pricing');
            if (! is_array($pricing)) {
                return;
            }

            $allowedTerms = ['3', '6', '9', '12'];

            foreach (array_keys($pricing) as $termKey) {
                if (! in_array((string) $termKey, $allowedTerms, true)) {
                    $validator->errors()->add(
                        "duration_pricing.{$termKey}",
                        'Only 3, 6, 9, and 12-month terms are supported for long-term promos.'
                    );
                }
            }

            foreach ($allowedTerms as $term) {
                $entry = $pricing[$term] ?? null;
                if (! is_array($entry)) {
                    continue;
                }

                $discountType = strtolower((string) ($entry['discount_type'] ?? ''));
                $discountValue = $entry['discount_value'] ?? null;

                if ($discountType === 'percent' && is_numeric($discountValue) && (float) $discountValue > 100) {
                    $validator->errors()->add(
                        "duration_pricing.{$term}.discount_value",
                        'Percentage discounts cannot exceed 100.'
                    );
                }
            }
        });
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, mixed>
     */
    public function messages(): array
    {
        $propertyId = $this->input('property_id');
        $property = Property::find($propertyId);
        $propertySex = $property ? strtolower($property->sex_restriction) : 'mixed';

        if (in_array($propertySex, ['female', 'girls'])) {
            $message = 'This property is restricted to females only. All rooms must also be female-only.';
        } elseif (in_array($propertySex, ['male', 'boys'])) {
            $message = 'This property is restricted to males only. All rooms must also be male-only.';
        } else {
            $message = 'The selected sex restriction is invalid.';
        }

        return [
            'sex_restriction.in' => $message,
        ];
    }

    private function normalizePropertyTypeToken(?string $propertyType): string
    {
        return strtolower(str_replace([' ', '_', '-'], '', (string) $propertyType));
    }

    private function decodeDurationPricing(mixed $value): ?array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value)) {
            return null;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : null;
    }
}
