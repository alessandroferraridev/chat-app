<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, HasApiTokens;

    protected $fillable = ["name", "email"];

    protected $hidden = ["remember_token"];

    public function magicLinks()
    {
        return $this->hasMany(MagicLink::class);
    }

    protected function casts(): array
    {
        return [
            "email_verified_at" => "datetime",
        ];
    }
}
