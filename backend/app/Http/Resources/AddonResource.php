<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AddonResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'name' => $this->name,
            'description' => $this->description,
            'price' => (float) $this->price,
            'price_type' => $this->price_type,
            'priceType' => $this->price_type,
            'priceTypeLabel' => $this->price_type_label,
            'addon_type' => $this->addon_type,
            'addonType' => $this->addon_type,
            'addonTypeLabel' => $this->addon_type_label,
            'stock' => $this->stock,
            'is_active' => (bool) $this->is_active,
            'isActive' => (bool) $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
