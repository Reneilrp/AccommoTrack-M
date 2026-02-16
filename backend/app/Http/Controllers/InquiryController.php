<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use Illuminate\Http\Request;

class InquiryController extends Controller
{
    /**
     * Store a new inquiry from a guest.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'message' => 'required|string|max:2000',
            'property_id' => 'nullable|exists:properties,id',
        ]);

        $inquiry = Inquiry::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'message' => $validated['message'],
            'property_id' => $validated['property_id'] ?? 0, // 0 or null for general inquiry
            'status' => 'pending',
            'source' => 'web_help',
        ]);

        return response()->json([
            'message' => 'Inquiry submitted successfully. We will contact you via email.',
            'inquiry' => $inquiry
        ], 201);
    }

    /**
     * Get all inquiries (Admin).
     */
    public function index()
    {
        $inquiries = Inquiry::orderBy('created_at', 'desc')->paginate(20);
        return response()->json($inquiries);
    }

    /**
     * Update inquiry status (Admin).
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,responded,archived',
        ]);

        $inquiry = Inquiry::findOrFail($id);
        $inquiry->update([
            'status' => $request->status,
            'responded_at' => $request->status === 'responded' ? now() : $inquiry->responded_at
        ]);

        return response()->json(['message' => 'Inquiry status updated', 'inquiry' => $inquiry]);
    }

    /**
     * Delete inquiry (Admin).
     */
    public function destroy($id)
    {
        $inquiry = Inquiry::findOrFail($id);
        $inquiry->delete();

        return response()->json(['message' => 'Inquiry deleted']);
    }
}
