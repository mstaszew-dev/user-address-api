package com.example.useraddressapi.service;

import com.example.useraddressapi.db.AddressRepository;
import com.example.useraddressapi.db.UserRepository;
import com.example.useraddressapi.dto.UserDto;
import com.example.useraddressapi.dto.UserUpdateDto;
import com.example.useraddressapi.exception.DuplicateResourceException;
import com.example.useraddressapi.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final AddressRepository addressRepository;

    public UserService(UserRepository userRepository, AddressRepository addressRepository) {
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public UserDto getUserById(String id) {
        return userRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    public UserDto updateUser(String id, UserUpdateDto dto) {
        Map<String, Object> existing = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        if (dto.email() != null && !dto.email().equals(existing.get("email"))) {
            if (userRepository.findByEmail(dto.email()).isPresent()) {
                throw new DuplicateResourceException("Email already in use: " + dto.email());
            }
        }

        Map<String, Object> updates = new LinkedHashMap<>();
        if (dto.firstName() != null) updates.put("firstName", dto.firstName());
        if (dto.lastName() != null) updates.put("lastName", dto.lastName());
        if (dto.email() != null) updates.put("email", dto.email());
        if (dto.role() != null) updates.put("role", dto.role());

        return userRepository.update(id, updates)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    public void deleteUser(String id) {
        if (!userRepository.delete(id)) {
            throw new ResourceNotFoundException("User", id);
        }
        addressRepository.deleteByUserId(id);
    }

    private UserDto toDto(Map<String, Object> map) {
        return new UserDto(
                (String) map.get("id"),
                (String) map.get("firstName"),
                (String) map.get("lastName"),
                (String) map.get("email"),
                (String) map.get("role"),
                (String) map.get("createdAt")
        );
    }
}
