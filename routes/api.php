<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post("/auth/magic-link", [AuthController::class, "requestMagicLink"]);

Route::post("/auth/verify/{token}", [AuthController::class, "verifyMagicLink"]);

Route::middleware("auth:sanctum")->group(function () {
    Route::get("/user", fn(Request $request) => $request->user());

    Route::post("/logout", function (Request $request) {
        $request->user()->currentAccessToken()->delete();
        return response()->json(["message" => "Logout riuscito."], 200);
    });
});
