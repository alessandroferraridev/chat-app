<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable("chat_conversation_user")) {
            Schema::create("chat_conversation_user", function (Blueprint $table) {
                $table->id();
                $table->foreignId("conversation_id")->constrained("chat_conversations")->cascadeOnDelete();
                $table->foreignId("user_id")->constrained("users")->cascadeOnDelete();
                $table->timestamps();

                $table->unique(["conversation_id", "user_id"]);
                $table->index(["user_id", "conversation_id"]);
            });
        }

        if (
            Schema::hasTable("chat_conversations") &&
            Schema::hasColumn("chat_conversations", "user_one_id") &&
            Schema::hasColumn("chat_conversations", "user_two_id")
        ) {
            DB::table("chat_conversations")
                ->select(["id", "user_one_id", "user_two_id", "created_at", "updated_at"])
                ->orderBy("id")
                ->get()
                ->each(function ($conversation) {
                    $timestampCreated = $conversation->created_at ?? now();
                    $timestampUpdated = $conversation->updated_at ?? now();

                    DB::table("chat_conversation_user")->upsert([
                        [
                            "conversation_id" => $conversation->id,
                            "user_id" => $conversation->user_one_id,
                            "created_at" => $timestampCreated,
                            "updated_at" => $timestampUpdated,
                        ],
                        [
                            "conversation_id" => $conversation->id,
                            "user_id" => $conversation->user_two_id,
                            "created_at" => $timestampCreated,
                            "updated_at" => $timestampUpdated,
                        ],
                    ], ["conversation_id", "user_id"], ["updated_at"]);
                });

            Schema::table("chat_conversations", function (Blueprint $table) {
                $table->dropUnique(["user_one_id", "user_two_id"]);
                $table->dropConstrainedForeignId("user_one_id");
                $table->dropConstrainedForeignId("user_two_id");
            });
        }

        if (!Schema::hasTable("chat_messages")) {
            Schema::create("chat_messages", function (Blueprint $table) {
                $table->id();
                $table->foreignId("conversation_id")->constrained("chat_conversations")->cascadeOnDelete();
                $table->foreignId("sender_user_id")->constrained("users")->cascadeOnDelete();
                $table->text("body");
                $table->timestamps();

                $table->index(["conversation_id", "id"]);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists("chat_messages");
        Schema::dropIfExists("chat_conversation_user");
    }
};
