package com.example.useraddressapi.service;

import com.example.useraddressapi.db.UserRepository;
import com.example.useraddressapi.dto.AuthResponse;
import com.example.useraddressapi.dto.LoginRequest;
import com.example.useraddressapi.dto.RegisterRequest;
import com.example.useraddressapi.exception.AuthenticationFailedException;
import com.example.useraddressapi.exception.DuplicateResourceException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, JwtService jwtService,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse register(RegisterRequest request) {
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("firstName", request.firstName());
        user.put("lastName", request.lastName());
        user.put("email", request.email());
        user.put("password", passwordEncoder.encode(request.password()));
        user.put("role", "USER");
        user.put("createdAt", Instant.now().toString());

        Map<String, Object> saved = userRepository.saveIfEmailFree(request.email(), user)
                .orElseThrow(() -> new DuplicateResourceException(
                        "Email already registered: " + request.email()));
        String token = jwtService.generateToken(
                (String) saved.get("id"), request.email(), "USER");

        return new AuthResponse(token, (String) saved.get("id"),
                request.email(), request.firstName(), request.lastName());
    }

    public AuthResponse login(LoginRequest request) {
        Map<String, Object> user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new AuthenticationFailedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), (String) user.get("password"))) {
            throw new AuthenticationFailedException("Invalid email or password");
        }

        String token = jwtService.generateToken(
                (String) user.get("id"), request.email(), (String) user.get("role"));

        return new AuthResponse(token, (String) user.get("id"),
                (String) user.get("email"), (String) user.get("firstName"),
                (String) user.get("lastName"));
    }
}
