<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create("users", function (Blueprint $table) {
            $table->id();
            $table->string("name");
            $table->string("email")->unique();
            $table->timestamp("email_verified_at")->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create("magic_links", function (Blueprint $table) {
            $table->id();
            $table->foreignId("user_id")->constrained()->onDelete("cascade");
            $table->string("token", 60)->unique();
            $table->timestamp("expires_at");
            $table->timestamps();
        });

        Schema::create("personal_access_tokens", function (Blueprint $table) {
            $table->id();
            $table->morphs("tokenable"); // Collega il token a qualsiasi modello (User, in questo caso)
            $table->string("name");
            $table->string("token", 64)->unique();
            $table->text("abilities")->nullable();
            $table->timestamp("last_used_at")->nullable();
            $table->timestamp("expires_at")->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("users");
        Schema::dropIfExists("magic_links");
        Schema::dropIfExists("personal_access_tokens");
    }
};
