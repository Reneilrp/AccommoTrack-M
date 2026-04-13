<!DOCTYPE html>
<html>
<head>
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 28px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { margin-bottom: 20px; }
        .button-wrap { text-align: center; margin: 24px 0; }
        .btn { display: inline-block; background: #16a34a; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; }
        .small { font-size: 12px; color: #6b7280; }
        .url-box { word-break: break-all; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; font-size: 12px; color: #374151; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Reset Your Password</h2>
        </div>

        <p>Hello {{ trim(($user->first_name ?? '').' '.($user->last_name ?? '')) ?: 'there' }},</p>

        <p>
            For account security, an AccommoTrack administrator initiated a password reset for your account.
            Use the secure link below to set a new password.
        </p>

        <div class="button-wrap">
            <a href="{{ $resetUrl }}" class="btn">Set New Password</a>
        </div>

        <p class="small">
            This secure link expires in 10 minutes. If it expires, request a new reset from the sign-in page.
        </p>

        <p class="small">If the button does not work, copy and open this URL:</p>
        <div class="url-box">{{ $resetUrl }}</div>

        <p class="small" style="margin-top: 24px;">
            If you did not expect this request, contact support immediately.
        </p>

        <p class="small">&copy; {{ date('Y') }} AccommoTrack. All rights reserved.</p>
    </div>
</body>
</html>
