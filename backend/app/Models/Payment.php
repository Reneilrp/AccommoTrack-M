<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int|null $room_id
 * @property int|null $booking_id
 * @property numeric $amount
 * @property \Illuminate\Support\Carbon|null $payment_date
 * @property \Illuminate\Support\Carbon $due_date
 * @property string $status
 * @property string|null $payment_method
 * @property string|null $reference_number
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property-read \App\Models\Booking|null $booking
 * @property-read \App\Models\Room|null $room
 * @property-read \App\Models\User $tenant
 * @method static \Database\Factories\PaymentFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereBookingId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereDueDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment wherePaymentDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment wherePaymentMethod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereReferenceNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Payment whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Payment extends Model
{
    /** @use HasFactory<\Database\Factories\PaymentFactory> */
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'room_id',
        'booking_id',
        'amount',
        'payment_date',
        'due_date',
        'status',
        'payment_method',
        'reference_number',
        'notes'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
        'due_date' => 'date',
    ];

    /**
     * Relationship: Payment belongs to Tenant (User)
     */
    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    /**
     * Relationship: Payment belongs to Room
     */
    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Relationship: Payment belongs to Booking
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
