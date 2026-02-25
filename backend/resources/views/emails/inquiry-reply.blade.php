<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .header { background-color: #059669; color: white; padding: 24px; text-align: center; }
        .content { padding: 32px; background-color: #ffffff; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        .original-message { margin-top: 24px; padding: 16px; background-color: #f1f5f9; border-radius: 8px; font-style: italic; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AccommoTrack</h1></div>
        <div class="content">
            <p>Hi {{ $inquiry->name }},</p>
            <p>{{ $replyMessage }}</p>
            <p>If you have any more questions, feel free to reply to this email or visit our platform.</p>
            <a href="{{ config('app.url') }}" class="btn">Visit AccommoTrack</a>
            <div class="original-message">
                <p style="margin-top: 0; font-weight: bold; font-size: 11px; text-transform: uppercase; color: #94a3b8;">Your original message:</p>
                "{{ $inquiry->message }}"
            </div>
        </div>
        <div class="footer">
            <p>&copy; {{ date('Y') }} AccommoTrack. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
