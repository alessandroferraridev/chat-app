<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get("/", fn() => Auth::check() ? redirect()->route("chat") : Inertia::render("login"))->name("login");

Route::get(
  "/auth/verify/{token}",
  fn(string $token) => Inertia::render("verify", [
    "token" => $token,
  ]),
)->name("auth.verify");

Route::post("/auth/verify/{token}", [AuthController::class, "verifyMagicLink"])->name("auth.verify.submit");

Route::middleware("auth")->group(function () {
  Route::get("/chat", fn() => Inertia::render("chat"))->name("chat");
  Route::prefix("/api/chat")->group(function () {
    Route::get("/conversations", [ChatController::class, "listConversations"]);
    Route::post("/conversations", [ChatController::class, "createConversation"]);
    Route::get("/conversations/{conversation}/messages", [ChatController::class, "listMessages"]);
    Route::post("/conversations/{conversation}/messages", [ChatController::class, "sendMessage"]);
  });
  Route::post("/logout", [AuthController::class, "logout"])->name("logout");
});
