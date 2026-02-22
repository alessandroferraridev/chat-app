<?php

namespace App\Events;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $conversationId,
        public int $messageId,
        public int $senderUserId,
        public string $text,
        public string $time,
        public array $participantIds,
    ) {
    }

    public static function fromMessage(Conversation $conversation, Message $message): self
    {
        return new self(
            conversationId: (int) $conversation->id,
            messageId: (int) $message->id,
            senderUserId: (int) $message->sender_user_id,
            text: $message->body,
            time: $message->created_at->format("H:i"),
            participantIds: $conversation->participants()->pluck("users.id")->map(fn ($id) => (int) $id)->all(),
        );
    }

    public function broadcastOn(): array
    {
        $channels = [new Channel("conversation.{$this->conversationId}")];

        foreach ($this->participantIds as $userId) {
            $channels[] = new Channel("user.{$userId}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return "chat.message.sent";
    }

    public function broadcastWith(): array
    {
        return [
            "conversation_id" => $this->conversationId,
            "message" => [
                "id" => $this->messageId,
                "sender_user_id" => $this->senderUserId,
                "text" => $this->text,
                "time" => $this->time,
            ],
        ];
    }
}
