<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Inquiry;

class InquiryReply extends Mailable
{
    use Queueable, SerializesModels;

    public $inquiry;
    public $replyMessage;

    public function __construct(Inquiry $inquiry, $replyMessage)
    {
        $this->inquiry = $inquiry;
        $this->replyMessage = $replyMessage;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Re: Inquiry on AccommoTrack',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.inquiry-reply',
        );
    }
}
