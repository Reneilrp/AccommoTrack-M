<!DOCTYPE html>
<html>
<head>
    <title>Reset Password Code</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 20px; }
        .code { font-size: 32px; font-weight: bold; color: #16a34a; text-align: center; letter-spacing: 5px; margin: 20px 0; }
        .footer { text-align: center; font-size: 12px; color: #888; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Reset Your Password</h2>
        </div>
        <p>Hello,</p>
        <p>You received this email because we received a request for a password reset for your account.</p>
        <p>Your password reset code is:</p>
        
        <div class="code">{{ $code }}</div>
        
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request a password reset, no further action is required.</p>
        
        <div class="footer">
            &copy; {{ date('Y') }} AccommoTrack. All rights reserved.
        </div>
    </div>
</body>
</html>
