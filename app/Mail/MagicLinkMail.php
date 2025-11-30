<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MagicLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $url;

    public function __construct(string $url)
    {
        $this->url = $url;
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: "ChatApp | Magic Link");
    }

    public function content(): Content
    {
        return new Content(
            html: "<h1>Benvenuto in " .
                config("app.name") .
                "</h1><p>Clicca su questo link per accedere immediatamente: <a href='{$this->url}'>{$this->url}</a></p><p>Questo link scadrà tra 15 minuti.</p>",
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
