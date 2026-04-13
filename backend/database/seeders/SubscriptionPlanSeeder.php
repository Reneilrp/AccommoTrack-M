<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'monthly_price_cents' => 0,
                'annual_price_cents' => 0,
                'currency' => 'PHP',
                'max_properties' => 1,
                'max_rooms_total' => 10,
                'features' => ['core_listing', 'basic_support'],
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Basic',
                'slug' => 'basic',
                'monthly_price_cents' => 49900,
                'annual_price_cents' => 499000,
                'currency' => 'PHP',
                'max_properties' => 3,
                'max_rooms_total' => 40,
                'features' => ['core_listing', 'priority_support', 'payment_reports'],
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Standard',
                'slug' => 'standard',
                'monthly_price_cents' => 149900,
                'annual_price_cents' => 1499000,
                'currency' => 'PHP',
                'max_properties' => 10,
                'max_rooms_total' => 200,
                'features' => ['core_listing', 'priority_support', 'analytics', 'payment_reports'],
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Premium',
                'slug' => 'premium',
                'monthly_price_cents' => 399900,
                'annual_price_cents' => 3999000,
                'currency' => 'PHP',
                'max_properties' => 30,
                'max_rooms_total' => 800,
                'features' => ['core_listing', 'priority_support', 'analytics', 'payment_reports', 'dedicated_support'],
                'is_active' => true,
                'sort_order' => 4,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan
            );
        }
    }
}
