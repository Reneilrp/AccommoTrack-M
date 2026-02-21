<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Property;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    /**
     * Get all published reviews for a property (Public)
     */
    public function getPropertyReviews($propertyId)
    {
        try {
            $property = Property::findOrFail($propertyId);
            
            $reviews = Review::where('property_id', $propertyId)
                ->where('is_published', true)
                ->with(['tenant:id,first_name,last_name,profile_image'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($review) {
                    return [
                        'id' => $review->id,
                        'rating' => $review->rating,
                        'cleanliness_rating' => $review->cleanliness_rating,
                        'location_rating' => $review->location_rating,
                        'value_rating' => $review->value_rating,
                        'communication_rating' => $review->communication_rating,
                        'comment' => $review->comment,
                        'reviewer_name' => $review->reviewer_name,
                        'reviewer_image' => $review->tenant?->profile_image,
                        'time_ago' => $review->time_ago,
                        'created_at' => $review->created_at->toISOString(),
                        'landlord_response' => $review->landlord_response,
                        'landlord_response_date' => $review->landlord_response_date?->toISOString(),
                    ];
                });

            // Calculate average ratings
            $totalReviews = $reviews->count();
            $avgRating = $totalReviews > 0 ? round($reviews->avg('rating'), 1) : null;
            $avgCleanliness = $totalReviews > 0 ? round($reviews->avg('cleanliness_rating'), 1) : null;
            $avgLocation = $totalReviews > 0 ? round($reviews->avg('location_rating'), 1) : null;
            $avgValue = $totalReviews > 0 ? round($reviews->avg('value_rating'), 1) : null;
            $avgCommunication = $totalReviews > 0 ? round($reviews->avg('communication_rating'), 1) : null;

            // Rating distribution
            $ratingDistribution = [];
            for ($i = 5; $i >= 1; $i--) {
                $count = $reviews->where('rating', $i)->count();
                $ratingDistribution[$i] = [
                    'count' => $count,
                    'percentage' => $totalReviews > 0 ? round(($count / $totalReviews) * 100) : 0,
                ];
            }

            return response()->json([
                'reviews' => $reviews->values(),
                'summary' => [
                    'total_reviews' => $totalReviews,
                    'average_rating' => $avgRating,
                    'average_cleanliness' => $avgCleanliness,
                    'average_location' => $avgLocation,
                    'average_value' => $avgValue,
                    'average_communication' => $avgCommunication,
                    'rating_distribution' => $ratingDistribution,
                ],
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Property not found'], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch reviews',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a review for a completed booking (Tenant)
     */
    public function store(Request $request)
    {
        $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'rating' => 'required|integer|min:1|max:5',
            'cleanliness_rating' => 'nullable|integer|min:1|max:5',
            'location_rating' => 'nullable|integer|min:1|max:5',
            'value_rating' => 'nullable|integer|min:1|max:5',
            'communication_rating' => 'nullable|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        try {
            $user = Auth::user();
            $booking = Booking::with('property')->findOrFail($request->booking_id);

            // Verify the user is the tenant of this booking
            if ($booking->tenant_id !== $user->id) {
                return response()->json(['message' => 'You can only review your own bookings'], 403);
            }

            // Check if booking is completed
            if ($booking->status !== 'completed') {
                return response()->json(['message' => 'You can only review completed bookings'], 400);
            }

            // Check if already reviewed
            $existingReview = Review::where('booking_id', $booking->id)->first();
            if ($existingReview) {
                return response()->json(['message' => 'You have already reviewed this booking'], 400);
            }

            $review = Review::create([
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $user->id,
                'rating' => $request->rating,
                'cleanliness_rating' => $request->cleanliness_rating,
                'location_rating' => $request->location_rating,
                'value_rating' => $request->value_rating,
                'communication_rating' => $request->communication_rating,
                'comment' => $request->comment,
                'is_published' => true,
            ]);

            return response()->json([
                'message' => 'Review submitted successfully',
                'review' => $review,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to submit review',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Landlord responds to a review
     */
    public function respond(Request $request, $reviewId)
    {
        $request->validate([
            'response' => 'required|string|max:500',
        ]);

        try {
            $user = Auth::user();
            $review = Review::with('property')->findOrFail($reviewId);

            // Verify user is the property owner
            if ($review->property->landlord_id !== $user->id) {
                return response()->json(['message' => 'You can only respond to reviews on your properties'], 403);
            }

            $review->update([
                'landlord_response' => $request->response,
                'landlord_response_date' => now(),
            ]);

            return response()->json([
                'message' => 'Response added successfully',
                'review' => $review,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to add response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get reviews for landlord's properties (Landlord Dashboard)
     */
    public function getLandlordReviews(Request $request)
    {
        try {
            $user = Auth::user();
            
            $query = Review::whereHas('property', function ($q) use ($user) {
                $q->where('landlord_id', $user->id);
            });

            if ($request->has('property_id')) {
                $query->where('property_id', $request->property_id);
            }

            $reviews = $query->with([
                'tenant:id,first_name,last_name,profile_image',
                'property:id,title',
                'booking:id,start_date,end_date'
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($review) {
                return [
                    'id' => $review->id,
                    'property_id' => $review->property_id,
                    'property_title' => $review->property?->title,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'reviewer_name' => $review->reviewer_name,
                    'reviewer_image' => $review->tenant?->profile_image,
                    'time_ago' => $review->time_ago,
                    'created_at' => $review->created_at->toISOString(),
                    'landlord_response' => $review->landlord_response,
                    'landlord_response_date' => $review->landlord_response_date?->toISOString(),
                    'booking_dates' => $review->booking 
                        ? $review->booking->start_date . ' - ' . $review->booking->end_date 
                        : null,
                ];
            });

            return response()->json($reviews, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch reviews',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get tenant's own reviews
     */
    public function getTenantReviews(Request $request)
    {
        try {
            $user = Auth::user();
            
            $reviews = Review::where('tenant_id', $user->id)
                ->with(['property:id,title,street_address,city'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($review) {
                    return [
                        'id' => $review->id,
                        'property_id' => $review->property_id,
                        'property_title' => $review->property?->title,
                        'property_location' => $review->property 
                            ? ($review->property->city ?? $review->property->street_address)
                            : null,
                        'rating' => $review->rating,
                        'comment' => $review->comment,
                        'time_ago' => $review->time_ago,
                        'created_at' => $review->created_at->toISOString(),
                        'landlord_response' => $review->landlord_response,
                    ];
                });

            return response()->json($reviews, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch reviews',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
