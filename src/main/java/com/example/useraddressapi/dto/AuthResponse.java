package com.example.useraddressapi.dto;

public record AuthResponse(
    String token,
    String userId,
    String email,
    String firstName,
    String lastName,
    String role
) {}
