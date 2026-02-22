<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $conversationId,
        public array $participantIds,
    ) {
    }

    public static function fromConversation(Conversation $conversation): self
    {
        return new self(
            conversationId: (int) $conversation->id,
            participantIds: $conversation->participants()->pluck("users.id")->map(fn ($id) => (int) $id)->all(),
        );
    }

    public function broadcastOn(): array
    {
        return collect($this->participantIds)
            ->map(fn (int $userId) => new Channel("user.{$userId}"))
            ->all();
    }

    public function broadcastAs(): string
    {
        return "chat.conversation.created";
    }

    public function broadcastWith(): array
    {
        return [
            "conversation_id" => $this->conversationId,
        ];
    }
}
