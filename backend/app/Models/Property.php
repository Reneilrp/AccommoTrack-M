<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $landlord_id
 * @property string $title
 * @property string|null $description
 * @property string $property_type
 * @property string $current_status
 * @property string $street_address
 * @property string $city
 * @property string $province
 * @property string|null $postal_code
 * @property string $country
 * @property string|null $barangay
 * @property numeric|null $latitude
 * @property numeric|null $longitude
 * @property string|null $nearby_landmarks
 * @property array<array-key, mixed>|null $property_rules
 * @property int $total_rooms
 * @property int $available_rooms
 * @property bool $is_published
 * @property bool $is_available
 * @property bool $is_eligible
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Addon> $addons
 * @property-read int|null $addons_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Amenity> $amenities
 * @property-read int|null $amenities_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Booking> $bookings
 * @property-read int|null $bookings_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PropertyCredential> $credentials
 * @property-read int|null $credentials_count
 * @property-read mixed $available_rooms_count
 * @property-read mixed $average_rating
 * @property-read mixed $full_address
 * @property-read mixed $image_url
 * @property-read mixed $maintenance_rooms_count
 * @property-read mixed $occupied_rooms_count
 * @property-read int|null $reviews_count
 * @property-read mixed $total_rooms_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PropertyImage> $images
 * @property-read int|null $images_count
 * @property-read \App\Models\User $landlord
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Review> $reviews
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Room> $rooms
 * @property-read int|null $rooms_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property available()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property forLandlord(int $landlordId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property inCity($city)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property ofType(string $type)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property priceRange(?float $minPrice = null, ?float $maxPrice = null)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property published()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property search(string $search)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereAvailableRooms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereBarangay($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereCity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereCountry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereCurrentStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereIsAvailable($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereIsEligible($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereIsPublished($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereLandlordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereLatitude($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereLongitude($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereNearbyLandmarks($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property wherePostalCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property wherePropertyRules($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property wherePropertyType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereProvince($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereStreetAddress($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereTotalRooms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Property whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Property extends Model
{
    use HasFactory;

    protected $fillable = [
        'landlord_id',

        // Basic Information
        'title',
        'description',
        'property_type',
        'current_status',

        // Location Details
        'street_address',
        'city',
        'province',
        'postal_code',
        'country',
        'barangay',

        // Property Coordinates
        'latitude',
        'longitude',
        'nearby_landmarks',

        // Property Rules
        'property_rules',

        // Property Specifications
        'number_of_bedrooms',
        'number_of_bathrooms',
        'floor_area',
        'floor_level',
        'max_occupants',

        // Room Management
        'total_rooms',
        'available_rooms',

        // Status
        'is_published',
        'is_available'
        ,'is_eligible'
    ];

    protected $casts = [
        'landlord_id' => 'integer',
        'number_of_bedrooms' => 'integer',
        'number_of_bathrooms' => 'integer',
        'floor_area' => 'decimal:2',
        'max_occupants' => 'integer',
        'total_rooms' => 'integer',
        'available_rooms' => 'integer',
        'price_per_month' => 'decimal:2',
        'security_deposit' => 'decimal:2',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'is_published' => 'boolean',
        'is_available' => 'boolean',
        'is_eligible' => 'boolean',
        'property_rules' => 'array',
    ];

    protected $appends = ['image_url'];

    /**
     * Relationship: Property belongs to a User (Landlord)
     */
    public function landlord()
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    /**
     * Relationship: Property has many Rooms
     */
    public function rooms()
    {
        return $this->hasMany(Room::class);
    }

    /**
     * Relationship: Property has many Bookings
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Relationship: Property has many Reviews
     */
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Get average rating for the property
     */
    public function getAverageRatingAttribute()
    {
        $avg = $this->reviews()->where('is_published', true)->avg('rating');
        return $avg ? round($avg, 1) : null;
    }

    /**
     * Get total reviews count
     */
    public function getReviewsCountAttribute()
    {
        return $this->reviews()->where('is_published', true)->count();
    }

    /**
     * Get the full address
     */
    public function getFullAddressAttribute()
    {
        $parts = array_filter([
            $this->street_address,
            $this->barangay,
            $this->city,
            $this->province,
            $this->postal_code
        ]);

        return implode(', ', $parts);
    }

    /**
     * Accessor: Get property rules as array
     */
    public function getPropertyRulesAttribute($value)
    {
        if (is_null($value)) {
            return [];
        }

        // If already an array, return it
        if (is_array($value)) {
            return $value;
        }

        // Try to decode JSON
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Mutator: Set property rules as JSON
     */
    public function setPropertyRulesAttribute($value)
    {
        if (is_null($value) || (is_array($value) && empty($value))) {
            $this->attributes['property_rules'] = null;
        } elseif (is_array($value)) {
            $this->attributes['property_rules'] = json_encode($value);
        } else {
            $this->attributes['property_rules'] = $value;
        }
    }

    /**
     * Accessor: Get total rooms count from database
     */
    public function getTotalRoomsCountAttribute()
    {
        return $this->rooms()->count();
    }

    /**
     * Accessor: Get available rooms count from database
     */
    public function getAvailableRoomsCountAttribute()
    {
        return $this->rooms()->where('status', 'available')->count();
    }

    /**
     * Accessor: Get occupied rooms count
     */
    public function getOccupiedRoomsCountAttribute()
    {
        return $this->rooms()->where('status', 'occupied')->count();
    }

    /**
     * Accessor: Get maintenance rooms count
     */
    public function getMaintenanceRoomsCountAttribute()
    {
        return $this->rooms()->where('status', 'maintenance')->count();
    }

    public function images()
    {
        return $this->hasMany(PropertyImage::class);
    }
    public function credentials()
    {
        return $this->hasMany(PropertyCredential::class);
    }
    public function getImageUrlAttribute()
    {
        $firstImage = $this->images()->first();
        return $firstImage ? asset('storage/' . $firstImage->image_path) : null;
    }
    /**
     * Relationship: Property has many amenities (many-to-many)
     */
    public function amenities()
    {
        return $this->belongsToMany(Amenity::class, 'property_amenities', 'property_id', 'amenity_id')
                    ->withTimestamps();
    }

    /**
     * Relationship: Property has many Addons
     */
    public function addons()
    {
        return $this->hasMany(Addon::class);
    }

    /**
     * Get active addons for this property
     */
    public function activeAddons()
    {
        return $this->addons()->where('is_active', true);
    }

    /**
     * Check if property is active
     */
    public function isActive()
    {
        return $this->current_status === 'active';
    }

    /**
     * Check if property is published
     */
    public function isPublished()
    {
        return $this->is_published === true;
    }

    /**
     * Check if property is available
     */
    public function isAvailable()
    {
        return $this->is_available === true && $this->available_rooms > 0;
    }

    /**
     * Check if property belongs to a specific landlord
     */
    public function belongsToLandlord($landlordId)
    {
        return $this->landlord_id == $landlordId;
    }

    /**
     * Scope: Get only active properties
     */
    public function scopeActive($query)
    {
        return $query->where('current_status', 'active');
    }

    /**
     * Scope: Filter by city
     */
    public function scopeInCity($query, $city)
    {
        return $query->where('city', $city);
    }

    /**
     * Update available rooms count based on actual room data
     */
    public function updateAvailableRooms()
    {
        $this->available_rooms = $this->rooms()->where('status', 'available')->count();
        $this->save();
    }

    /**
     * Update total rooms count based on actual room data
     */
    public function updateTotalRooms()
    {
        $this->total_rooms = $this->rooms()->count();
        $this->save();
    }

    // ====================================================================
    // QUERY SCOPES
    // ====================================================================

    /**
     * Scope: Filter by published status
     */
    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    /**
     * Scope: Filter by available status
     */
    public function scopeAvailable($query)
    {
        return $query->where('is_available', true);
    }

    /**
     * Scope: Filter by landlord
     */
    public function scopeForLandlord($query, int $landlordId)
    {
        return $query->where('landlord_id', $landlordId);
    }

    /**
     * Scope: Search by title, description, or address
     */
    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('title', 'like', "%{$search}%")
              ->orWhere('description', 'like', "%{$search}%")
              ->orWhere('street_address', 'like', "%{$search}%")
              ->orWhere('barangay', 'like', "%{$search}%")
              ->orWhere('city', 'like', "%{$search}%")
              ->orWhere('province', 'like', "%{$search}%");
        });
    }

    /**
     * Scope: Filter by property type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('property_type', $type);
    }

    /**
     * Scope: Filter by price range (based on room monthly rates)
     */
    public function scopePriceRange($query, ?float $minPrice = null, ?float $maxPrice = null)
    {
        return $query->whereHas('rooms', function ($q) use ($minPrice, $maxPrice) {
            $q->where('status', 'available');
            if ($minPrice !== null) {
                $q->where('monthly_rate', '>=', $minPrice);
            }
            if ($maxPrice !== null) {
                $q->where('monthly_rate', '<=', $maxPrice);
            }
        });
    }
}
