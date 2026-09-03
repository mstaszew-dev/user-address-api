package com.example.useraddressapi.dto;

import jakarta.validation.constraints.Email;

public record UserUpdateDto(
    String name,
    @Email String email,
    String role
) {}
