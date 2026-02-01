<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $property_id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property string $message
 * @property string $status
 * @property string|null $source
 * @property string|null $responded_at
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @method static \Database\Factories\InquiryFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry whereMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry wherePhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry wherePropertyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry whereRespondedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry whereSource($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Inquiry whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Inquiry extends Model
{
    /** @use HasFactory<\Database\Factories\InquiryFactory> */
    use HasFactory;
}
