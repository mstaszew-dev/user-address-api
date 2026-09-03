package com.example.useraddressapi.dto;

public record AddressUpdateDto(
    String street,
    String city,
    String state,
    String zipCode,
    String country,
    String type
) {}
