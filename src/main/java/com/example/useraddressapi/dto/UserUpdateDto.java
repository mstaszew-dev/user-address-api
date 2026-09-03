package com.example.useraddressapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserUpdateDto(
    @Size(max = 50) String firstName,
    @Size(max = 50) String lastName,
    @Email String email,
    @Pattern(regexp = "USER|ADMIN") String role
) {}
