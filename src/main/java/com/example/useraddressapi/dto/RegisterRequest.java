package com.example.useraddressapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank @Size(max = 50) String firstName,
    @NotBlank @Size(max = 50) String lastName,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 6) String password
) {}
