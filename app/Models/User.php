<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasFactory;

    protected $fillable = ["name", "email"];

    protected $hidden = ["remember_token"];

    public function magicLinks()
    {
        return $this->hasMany(MagicLink::class);
    }

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class, "chat_conversation_user")
            ->withTimestamps();
    }

    public function sentMessages(): HasMany
    {
        return $this->hasMany(Message::class, "sender_user_id");
    }

    protected function casts(): array
    {
        return [
            "email_verified_at" => "datetime",
        ];
    }
}
