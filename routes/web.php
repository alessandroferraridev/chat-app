<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get("/", fn() => Inertia::render("login"))->name("login");

Route::get(
  "/auth/verify/{token}",
  fn(string $token) => Inertia::render("verify", [
    "token" => $token,
  ]),
)->name("auth.verify");
