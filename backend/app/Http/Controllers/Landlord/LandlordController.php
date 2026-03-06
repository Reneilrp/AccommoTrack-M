<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;

use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LandlordController extends Controller
{
    use ResolvesLandlordAccess;

    /**
     * Get PayMongo onboarding URL for landlord
     */
    public function getOnboardingUrl(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);
        } catch (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\Exception $e) {
            Log::error('PayMongo onboarding — context resolution failed', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Could not resolve landlord context: ' . $e->getMessage()], 500);
        }

        $secretKey = config('services.paymongo.secret_key');

        if (!$secretKey) {
            return response()->json([
                'message' => 'PayMongo is not configured on this server.'
            ], 503);
        }

        // Handle SSL verification settings
        $verifyEnv = config('services.paymongo.verify_ssl', true);
        if (is_string($verifyEnv) && file_exists($verifyEnv)) {
            $verify = $verifyEnv;
        } else {
            $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (is_null($verify)) $verify = true;
        }

        // Initialize Http request with headers
        $pendingRequest = Http::withHeaders([
            'Authorization' => 'Basic ' . base64_encode($secretKey . ':'),
            'Content-Type'  => 'application/json',
        ]);

        // Apply SSL verification options
        if ($verify === false) {
            $pendingRequest = $pendingRequest->withoutVerifying();
        } elseif (is_string($verify)) {
            $pendingRequest = $pendingRequest->withOptions(['verify' => $verify]);
        }

        try {
            $landlord = $context['user'];
            $businessName = trim(($landlord->first_name ?? '') . ' ' . ($landlord->last_name ?? ''));

            // Make the POST request to PayMongo
            /** @var \Illuminate\Http\Client\Response $response */
            $response = $pendingRequest->post('https://api.paymongo.com/v1/merchants/children', [
                'data' => [
                    'attributes' => [
                        'accepted_terms_and_conditions' => true,
                        'email'         => $landlord->email,
                        'country'       => 'PH',
                        'business_name' => $businessName ?: 'Landlord',
                    ]
                ]
            ]);

            $res = $response->json();

            Log::info('PayMongo onboarding response', [
                'status' => $response->status(),
                'body'   => $res,
            ]);

            // Handle failed response or missing data
            if ($response->failed() || !is_array($res) || empty($res['data']['id'])) {
                $errorDetail = 'Unknown error from PayMongo.';
                
                if (is_array($res) && isset($res['errors']) && is_array($res['errors']) && !empty($res['errors'])) {
                    $errorDetail = $res['errors'][0]['detail'] 
                        ?? $res['errors'][0]['code'] 
                        ?? $errorDetail;
                } elseif (is_array($res) && isset($res['message'])) {
                    $errorDetail = $res['message'];
                }

                Log::error('PayMongo onboarding failed', [
                    'response' => $res, 
                    'status'   => $response->status()
                ]);

                return response()->json([
                    'message' => 'PayMongo onboarding failed: ' . $errorDetail,
                    'paymongo_response' => $res,
                ], 422);
            }

            // Save the Child ID and update status on the landlord's user record
            $user = $context['user'];
            $user->update([
                'paymongo_child_id'            => $res['data']['id'],
                'paymongo_verification_status' => 'pending',
            ]);

            return response()->json([
                'onboarding_url' => $res['data']['attributes']['onboarding_url'] ?? null,
            ]);

        } catch (\Exception $e) {
            Log::error('PayMongo onboarding exception', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred during PayMongo onboarding.',
                'error'   => $e->getMessage()
            ], 500);
        }
    }
}
