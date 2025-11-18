<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeocodeController extends Controller
{
    public function reverse(Request $request)
    {
        $lat = $request->query('lat');
        $lon = $request->query('lon');
        
        if (!$lat || !$lon) {
            return response()->json(['error' => 'Missing lat or lon'], 400);
        }

        try {
            $url = "https://nominatim.openstreetmap.org/reverse?format=json&lat={$lat}&lon={$lon}&addressdetails=1";
            
            // Disable SSL verification only in local development
            $httpOptions = app()->environment('local') 
                ? ['verify' => false] 
                : [];
            
            $response = Http::withOptions($httpOptions)
                ->timeout(10)
                ->withHeaders([
                    'User-Agent' => 'AccommoTrack/1.0 (pheinz.magnun@gmail.com)'
                ])
                ->get($url);

            if ($response->failed()) {
                return response()->json([
                    'error' => 'Failed to fetch from Nominatim',
                    'status' => $response->status()
                ], 502);
            }

            return response()->json($response->json());
            
        } catch (\Exception $e) {
            Log::error('Geocode Exception: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Geocoding failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}