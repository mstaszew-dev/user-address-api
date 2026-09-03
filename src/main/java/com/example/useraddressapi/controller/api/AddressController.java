package com.example.useraddressapi.controller.api;

import com.example.useraddressapi.dto.AddressDto;
import com.example.useraddressapi.dto.AddressUpdateDto;
import com.example.useraddressapi.dto.ApiResponse;
import com.example.useraddressapi.service.AddressService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
public class AddressController {

    private final AddressService addressService;

    public AddressController(AddressService addressService) {
        this.addressService = addressService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<AddressDto>> createAddress(
            @Valid @RequestBody AddressDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Address created", addressService.createAddress(dto)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<AddressDto>>> getByUserId(
            @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(addressService.getAddressesByUserId(userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressDto>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(addressService.getAddressById(id)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressDto>> updateAddress(
            @PathVariable String id, @Valid @RequestBody AddressUpdateDto dto) {
        return ResponseEntity.ok(ApiResponse.ok("Address updated",
                addressService.updateAddress(id, dto)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAddress(@PathVariable String id) {
        addressService.deleteAddress(id);
        return ResponseEntity.noContent().build();
    }
}
