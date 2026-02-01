<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $property_id
 * @property int $booking_id
 * @property int $tenant_id
 * @property int $rating
 * @property int|null $cleanliness_rating
 * @property int|null $location_rating
 * @property int|null $value_rating
 * @property int|null $communication_rating
 * @property string|null $comment
 * @property bool $is_published
 * @property string|null $landlord_response
 * @property \Illuminate\Support\Carbon|null $landlord_response_date
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Booking $booking
 * @property-read mixed $reviewer_name
 * @property-read mixed $time_ago
 * @property-read \App\Models\Property $property
 * @property-read \App\Models\User $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereBookingId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereCleanlinessRating($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereComment($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereCommunicationRating($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereIsPublished($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereLandlordResponse($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereLandlordResponseDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereLocationRating($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review wherePropertyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereRating($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Review whereValueRating($value)
 * @mixin \Eloquent
 */
class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'booking_id',
        'tenant_id',
        'rating',
        'cleanliness_rating',
        'location_rating',
        'value_rating',
        'communication_rating',
        'comment',
        'is_published',
        'landlord_response',
        'landlord_response_date',
    ];

    protected $casts = [
        'rating' => 'integer',
        'cleanliness_rating' => 'integer',
        'location_rating' => 'integer',
        'value_rating' => 'integer',
        'communication_rating' => 'integer',
        'is_published' => 'boolean',
        'landlord_response_date' => 'datetime',
    ];

    /**
     * Get the property that was reviewed
     */
    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Get the booking associated with this review
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Get the tenant who wrote the review
     */
    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    /**
     * Get the reviewer's display name
     */
    public function getReviewerNameAttribute()
    {
        if ($this->tenant) {
            $firstName = $this->tenant->first_name ?? '';
            $lastName = $this->tenant->last_name ?? '';
            
            // Return first name and last initial for privacy
            if ($firstName && $lastName) {
                return $firstName . ' ' . strtoupper(substr($lastName, 0, 1)) . '.';
            }
            return $firstName ?: 'Anonymous';
        }
        return 'Anonymous';
    }

    /**
     * Get human-readable time ago
     */
    public function getTimeAgoAttribute()
    {
        return $this->created_at->diffForHumans();
    }
}
