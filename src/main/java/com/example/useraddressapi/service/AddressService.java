package com.example.useraddressapi.service;

import com.example.useraddressapi.db.AddressRepository;
import com.example.useraddressapi.db.UserRepository;
import com.example.useraddressapi.dto.AddressDto;
import com.example.useraddressapi.dto.AddressUpdateDto;
import com.example.useraddressapi.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    public AddressService(AddressRepository addressRepository, UserRepository userRepository) {
        this.addressRepository = addressRepository;
        this.userRepository = userRepository;
    }

    public AddressDto createAddress(AddressDto dto) {
        userRepository.findById(dto.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User", dto.userId()));

        Map<String, Object> address = new LinkedHashMap<>();
        address.put("userId", dto.userId());
        address.put("street", dto.street());
        address.put("city", dto.city());
        address.put("state", dto.state());
        address.put("zipCode", dto.zipCode());
        address.put("country", dto.country());
        address.put("type", dto.type() != null ? dto.type() : "HOME");

        return toDto(addressRepository.save(address));
    }

    public List<AddressDto> getAddressesByUserId(String userId) {
        return addressRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public AddressDto getAddressById(String id) {
        return addressRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Address", id));
    }

    public AddressDto updateAddress(String id, AddressUpdateDto dto) {
        addressRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Address", id));

        Map<String, Object> updates = new LinkedHashMap<>();
        if (dto.street() != null) updates.put("street", dto.street());
        if (dto.city() != null) updates.put("city", dto.city());
        if (dto.state() != null) updates.put("state", dto.state());
        if (dto.zipCode() != null) updates.put("zipCode", dto.zipCode());
        if (dto.country() != null) updates.put("country", dto.country());
        if (dto.type() != null) updates.put("type", dto.type());

        return addressRepository.update(id, updates)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Address", id));
    }

    public void deleteAddress(String id) {
        if (!addressRepository.delete(id)) {
            throw new ResourceNotFoundException("Address", id);
        }
    }

    private AddressDto toDto(Map<String, Object> map) {
        return new AddressDto(
                (String) map.get("id"),
                (String) map.get("userId"),
                (String) map.get("street"),
                (String) map.get("city"),
                (String) map.get("state"),
                (String) map.get("zipCode"),
                (String) map.get("country"),
                (String) map.get("type")
        );
    }
}
