<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt Verification | {{ config('app.name') }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 min-h-screen text-slate-900 flex flex-col items-center p-6">
    <div class="max-w-md w-full my-auto space-y-6">
        <!-- Logo -->
        <div class="text-center mb-8">
            <h1 class="text-2xl font-extrabold tracking-tight text-slate-800">
                Accommo<span class="text-indigo-600">Track</span>
            </h1>
            <p class="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest">Document Registry</p>
        </div>

        @if($success)
            <!-- Success Card -->
            <div class="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-500">
                <div class="bg-emerald-500 p-8 flex flex-col items-center">
                    <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md mb-4">
                        <i data-lucide="shield-check" class="text-white w-10 h-10"></i>
                    </div>
                    <h2 class="text-white text-xl font-bold">Verified Receipt</h2>
                    <p class="text-white/80 text-sm font-medium">Authenticity confirmed by system</p>
                </div>

                <div class="p-8 space-y-6">
                    <div class="grid grid-cols-1 gap-6">
                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Reference</p>
                            <p class="text-slate-800 font-bold font-mono">{{ $invoice->receipt_reference }}</p>
                            @if($invoice->billing_period_start && $invoice->billing_period_end)
                                <p class="text-[9px] text-emerald-600 font-bold uppercase mt-1">Covers: {{ $invoice->billing_period_start->format('M j') }} — {{ $invoice->billing_period_end->format('M j, Y') }}</p>
                            @endif
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                                <span class="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full uppercase">PAID</span>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date Issued</p>
                                <p class="text-slate-800 font-semibold text-sm">{{ \Carbon\Carbon::parse($invoice->paid_at)->format('M j, Y') }}</p>
                            </div>
                        </div>

                        <div class="h-px bg-slate-100 w-full"></div>

                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Associated Tenant</p>
                            <p class="text-slate-800 font-bold">{{ $maskedName }}</p>
                        </div>

                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Property</p>
                            <p class="text-slate-800 font-semibold">{{ $invoice->property->name ?? 'AccommoTrack Partner' }}</p>
                        </div>

                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Amount</p>
                            <p class="text-2xl font-extrabold text-slate-900 tracking-tighter">₱{{ number_format($invoice->amount_cents / 100, 2) }}</p>
                        </div>
                    </div>
                </div>
            </div>
        @else
            <!-- Error Card -->
            <div class="bg-white rounded-3xl shadow-xl shadow-red-200/50 border border-red-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div class="bg-red-500 p-8 flex flex-col items-center text-center">
                    <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md mb-4">
                        <i data-lucide="alert-triangle" class="text-white w-10 h-10"></i>
                    </div>
                    <h2 class="text-white text-xl font-bold">Unrecognized Receipt</h2>
                    <p class="text-white/80 text-sm mt-1 px-4">The reference <strong>"{{ $reference }}"</strong> was not found in our secure registry.</p>
                </div>
                <div class="p-8 text-center bg-red-50/50">
                    <p class="text-slate-600 text-sm font-medium leading-relaxed">
                        If you are a tenant and have a physical copy of this receipt, please report this discrepancy immediately using the form below.
                    </p>
                </div>
            </div>
        @endif

        @if(session('status'))
            <div class="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm font-bold text-center animate-bounce">
                {{ session('status') }}
            </div>
        @endif

        <!-- Dispute Form -->
        <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <i data-lucide="flag" class="text-slate-600 w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-800">Report an Issue</h3>
                    <p class="text-slate-500 text-xs">Is something wrong with this receipt?</p>
                </div>
            </div>

            <form action="{{ route('public.receipt.report') }}" method="POST" class="space-y-4">
                @csrf
                <input type="hidden" name="receipt_reference" value="{{ $reference }}">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Your Name</label>
                        <input type="text" name="reporter_name" required placeholder="Full Name" 
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Email Address</label>
                        <input type="email" name="reporter_email" required placeholder="contact@email.com"
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all">
                    </div>
                </div>

                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Describe the Concern</label>
                    <textarea name="message" required rows="3" placeholder="e.g., The amount shown doesn't match what I paid..."
                        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"></textarea>
                </div>

                <button type="submit" class="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95">
                    Submit Dispute Report
                </button>
            </form>
        </div>

        <div class="text-center text-slate-400 text-xs py-4">
            &copy; {{ date('Y') }} AccommoTrack Management System
        </div>
    </div>

    <script>
        lucide.createIcons();
    </script>
</body>
</html>
