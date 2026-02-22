<?php

use App\Http\Controllers\AuthController;
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
  Route::post("/logout", [AuthController::class, "logout"])->name("logout");
});
