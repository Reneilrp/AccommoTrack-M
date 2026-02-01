<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $property_id
 * @property int $booking_id
 * @property int $tenant_id
 * @property int $landlord_id
 * @property string $title
 * @property string $description
 * @property string $priority
 * @property string $status
 * @property string|null $images
 * @property string|null $resolved_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Database\Factories\MaintenanceRequestFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereBookingId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereImages($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereLandlordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest wherePriority($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest wherePropertyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereResolvedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class MaintenanceRequest extends Model
{
    /** @use HasFactory<\Database\Factories\MaintenanceRequestFactory> */
    use HasFactory;
}
