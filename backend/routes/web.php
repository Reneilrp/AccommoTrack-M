<?php

use Illuminate\Support\Facades\Route;

Route::get('/login', fn() => response()->
json(['message' => 'Login route placeholder']))->name('login');
