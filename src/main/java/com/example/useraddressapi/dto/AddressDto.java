package com.example.useraddressapi.dto;

import jakarta.validation.constraints.NotBlank;

public record AddressDto(
    String id,
    @NotBlank String userId,
    @NotBlank String street,
    @NotBlank String city,
    String state,
    @NotBlank String zipCode,
    @NotBlank String country,
    String type
) {}
