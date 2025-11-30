<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\MagicLink;
use App\Mail\MagicLinkMail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function requestMagicLink(Request $request)
    {
        $request->validate(["email" => "required|email"]);

        $email = $request->email;

        $user = User::firstOrCreate(
            ["email" => $email],
            ["name" => Str::before($email, "@")],
        );

        try {
            DB::beginTransaction();

            MagicLink::where("user_id", $user->id)->delete();

            $token = Str::random(60);

            MagicLink::create([
                "user_id" => $user->id,
                "token" => $token,
                "expires_at" => now()->addMinutes(15),
            ]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(
                ["message" => "Errore nella generazione del link."],
                500,
            );
        }

        $frontendUrl = config("app.frontend_url");
        if (!$frontendUrl) {
            throw new \Exception(
                "La variabile d'ambiente FRONTEND_URL non è impostata.",
            );
        }

        $url = $frontendUrl . "/auth/verify/{$token}";

        Mail::to($user->email)->send(new MagicLinkMail($url));

        return response()->json(
            [
                "message" =>
                    "Magic Link inviato. Controlla la tua email per accedere.",
            ],
            200,
        );
    }

    public function verifyMagicLink(string $token)
    {
        $magicLink = MagicLink::where("token", $token)
            ->where("expires_at", ">", now())
            ->first();

        if (!$magicLink) {
            throw ValidationException::withMessages([
                "token" =>
                    "Il link di accesso non è valido o è scaduto. Riprova a richiedere un nuovo link.",
            ]);
        }

        $user = $magicLink->user;

        $magicLink->delete();

        $authToken = $user->createToken("auth-token", ["chat"])->plainTextToken;

        return response()->json(
            [
                "token" => $authToken,
                "user" => [
                    "id" => $user->id,
                    "name" => $user->name,
                    "email" => $user->email,
                ],
                "message" => "Login riuscito. Benvenuto nella chat.",
            ],
            200,
        );
    }
}
