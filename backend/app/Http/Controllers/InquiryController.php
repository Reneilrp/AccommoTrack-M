<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\InquiryReply;

class InquiryController extends Controller
{
    /**
     * Store a new inquiry from a guest.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'message' => 'required|string|max:2000',
            'property_id' => 'nullable|exists:properties,id',
        ]);

        $inquiry = Inquiry::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'message' => $request->message,
            'property_id' => $request->property_id, 
            'status' => 'new',
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
        $inquiries = Inquiry::with('property')->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($inquiries);
    }

    /**
     * Update inquiry status (Admin).
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:new,contacted,converted,closed',
        ]);

        $inquiry = Inquiry::findOrFail($id);
        $inquiry->update([
            'status' => $request->status,
            'responded_at' => in_array($request->status, ['contacted', 'converted', 'closed']) ? now() : $inquiry->responded_at
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
    /**
     * Reply to an inquiry via email.
     */
    public function reply(Request $request, $id)
    {
        $request->validate(['message' => 'required|string|max:5000']);
        
        $inquiry = Inquiry::findOrFail($id);

        try {
            Mail::to($inquiry->email)->send(new InquiryReply($inquiry, $request->message));
            
            $inquiry->update([
                'status' => 'responded',
                'responded_at' => now()
            ]);

            return response()->json([
                'message' => 'Reply sent successfully!', 
                'inquiry' => $inquiry
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error sending email: ' . $e->getMessage()
            ], 500);
        }
    }
}

