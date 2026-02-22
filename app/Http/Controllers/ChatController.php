<?php

namespace App\Http\Controllers;

use App\Events\ConversationCreated;
use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    private const PER_PAGE = 50;

    public function listConversations(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            "per_page" => ["nullable", "integer", "min:1", "max:50"],
        ]);
        $perPage = $validated["per_page"] ?? self::PER_PAGE;

        $paginator = Conversation::query()
            ->whereHas("participants", fn ($query) => $query->whereKey($user->id))
            ->with([
                "messages" => fn ($query) => $query->latest("id")->limit(1),
                "participants:id,email",
            ])
            ->latest("updated_at")
            ->paginate($perPage);

        $data = $paginator->getCollection()->map(function (Conversation $conversation) use ($user) {
            $latestMessage = $conversation->messages->first();
            $otherParticipants = $conversation->participants->where("id", "!=", $user->id)->values();
            $primaryOtherParticipant = $otherParticipants->first();
            $recipientEmail = strtolower($primaryOtherParticipant?->email ?? $user->email);
            $title = explode("@", $recipientEmail)[0] ?? "Conversazione";

            return [
                "id" => $conversation->id,
                "title" => $title,
                "email" => $recipientEmail,
                "preview" => $latestMessage?->body ?? "Nuova conversazione avviata",
                "updated_at" => $conversation->updated_at->toISOString(),
            ];
        });

        return response()->json([
            "data" => $data,
            "current_page" => $paginator->currentPage(),
            "last_page" => $paginator->lastPage(),
            "per_page" => $paginator->perPage(),
        ]);
    }

    public function createConversation(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            "email" => ["required", "email", "max:255"],
        ]);

        $email = strtolower(trim($validated["email"]));
        $recipient = User::query()->whereRaw("LOWER(email) = ?", [$email])->first();

        if (!$recipient) {
            return response()->json([
                "message" => "Utente non trovato.",
                "errors" => ["email" => ["Nessun utente registrato con questa email."]],
            ], 422);
        }

        if ((int) $recipient->id === (int) $user->id) {
            return response()->json([
                "message" => "Operazione non valida.",
                "errors" => ["email" => ["Non puoi creare una chat con te stesso."]],
            ], 422);
        }

        $conversation = Conversation::query()
            ->whereHas("participants", fn ($query) => $query->whereKey($user->id))
            ->whereHas("participants", fn ($query) => $query->whereKey($recipient->id))
            ->whereDoesntHave("participants", fn ($query) => $query->whereNotIn("users.id", [$user->id, $recipient->id]))
            ->first();

        if (!$conversation) {
            $conversation = DB::transaction(function () use ($user, $recipient) {
                $createdConversation = new Conversation();
                $createdConversation->save();
                $createdConversation->participants()->attach([$user->id, $recipient->id]);

                return $createdConversation;
            });

            broadcast(ConversationCreated::fromConversation($conversation));
        }

        return response()->json([
            "data" => [
                "id" => $conversation->id,
                "title" => explode("@", $email)[0],
                "email" => $email,
                "preview" => "Nuova conversazione avviata",
                "updated_at" => $conversation->updated_at->toISOString(),
            ],
        ], 201);
    }

    public function listMessages(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request, $conversation);

        $validated = $request->validate([
            "before_id" => ["nullable", "integer"],
            "limit" => ["nullable", "integer", "min:1", "max:50"],
        ]);

        $limit = $validated["limit"] ?? self::PER_PAGE;

        $query = $conversation->messages()->orderByDesc("id");

        if (!empty($validated["before_id"])) {
            $query->where("id", "<", $validated["before_id"]);
        }

        $messages = $query->limit($limit + 1)->get();
        $hasMore = $messages->count() > $limit;
        $window = $messages->take($limit)->reverse()->values();
        $nextBeforeId = $hasMore ? $window->first()?->id : null;

        return response()->json([
            "data" => $window->map(function ($message) use ($request) {
                return [
                    "id" => $message->id,
                    "author" => (int) $message->sender_user_id === (int) $request->user()->id ? "me" : "other",
                    "text" => $message->body,
                    "time" => $message->created_at->format("H:i"),
                ];
            }),
            "has_more" => $hasMore,
            "next_before_id" => $nextBeforeId,
            "limit" => $limit,
        ]);
    }

    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeConversation($request, $conversation);

        $validated = $request->validate([
            "text" => ["required", "string", "max:5000"],
        ]);

        $message = $conversation->messages()->create([
            "sender_user_id" => $request->user()->id,
            "body" => trim($validated["text"]),
        ]);

        $conversation->touch();
        broadcast(MessageSent::fromMessage($conversation, $message));

        return response()->json([
            "data" => [
                "id" => $message->id,
                "author" => "me",
                "text" => $message->body,
                "time" => $message->created_at->format("H:i"),
            ],
        ], 201);
    }

    private function authorizeConversation(Request $request, Conversation $conversation): void
    {
        $userId = (int) $request->user()->id;
        abort_unless(
            $conversation->participants()->whereKey($userId)->exists(),
            404,
        );
    }
}
