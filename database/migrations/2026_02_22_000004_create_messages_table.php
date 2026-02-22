<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create("messages", function (Blueprint $table) {
            $table->id();
            $table->foreignId("conversation_id")->constrained()->cascadeOnDelete();
            $table->foreignId("sender_user_id")->nullable()->constrained("users")->nullOnDelete();
            $table->string("sender_email");
            $table->text("body");
            $table->timestamps();

            $table->index(["conversation_id", "id"]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("messages");
    }
};
