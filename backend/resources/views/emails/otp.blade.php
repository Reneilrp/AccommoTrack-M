<x-mail::message>
# Your Account Verification Code

Thanks for signing up! Please use the following One-Time Password (OTP) to complete your registration.

Your OTP is: **{{ $otp }}**

This code will expire in 15 minutes.

If you did not request this, please ignore this email.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
