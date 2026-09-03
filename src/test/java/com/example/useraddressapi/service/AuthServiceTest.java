package com.example.useraddressapi.service;

import com.example.useraddressapi.db.UserRepository;
import com.example.useraddressapi.dto.AuthResponse;
import com.example.useraddressapi.dto.LoginRequest;
import com.example.useraddressapi.dto.RegisterRequest;
import com.example.useraddressapi.exception.AuthenticationFailedException;
import com.example.useraddressapi.exception.DuplicateResourceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        lenient().when(jwtService.generateToken(anyString(), anyString(), anyString()))
                .thenReturn("mock-jwt-token");
        lenient().when(passwordEncoder.encode(anyString()))
                .thenReturn("encoded-password");
    }

    @Test
    void testRegister_createsUserAndReturnsToken() {
        when(userRepository.saveIfEmailFree(eq("test@test.com"), any())).thenAnswer(inv -> {
            java.util.Map<String, Object> user = inv.getArgument(1);
            user.put("id", "generated-id");
            return java.util.Optional.of(user);
        });

        RegisterRequest request = new RegisterRequest("Test", "User", "test@test.com", "password123");
        AuthResponse response = authService.register(request);

        assertNotNull(response.token());
        assertEquals("generated-id", response.userId());
        assertEquals("test@test.com", response.email());
        assertEquals("Test", response.firstName());
        assertEquals("User", response.lastName());
        verify(userRepository).saveIfEmailFree(eq("test@test.com"), any());
    }

    @Test
    void testRegister_throwsOnDuplicateEmail() {
        when(userRepository.saveIfEmailFree(eq("test@test.com"), any()))
                .thenReturn(java.util.Optional.empty());

        RegisterRequest request = new RegisterRequest("Test", "User", "test@test.com", "password123");

        assertThrows(DuplicateResourceException.class, () -> authService.register(request));
    }

    @Test
    void testLogin_returnsTokenForValidCredentials() {
        java.util.Map<String, Object> user = new java.util.LinkedHashMap<>();
        user.put("id", "user-1");
        user.put("email", "test@test.com");
        user.put("password", "encoded-password");
        user.put("firstName", "Test");
        user.put("lastName", "User");
        user.put("role", "USER");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "encoded-password")).thenReturn(true);

        LoginRequest request = new LoginRequest("test@test.com", "password123");
        AuthResponse response = authService.login(request);

        assertNotNull(response.token());
        assertEquals("user-1", response.userId());
    }

    @Test
    void testLogin_throwsOnInvalidEmail() {
        when(userRepository.findByEmail("nobody@test.com")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest("nobody@test.com", "password123");

        assertThrows(AuthenticationFailedException.class, () -> authService.login(request));
    }

    @Test
    void testLogin_throwsOnInvalidPassword() {
        java.util.Map<String, Object> user = new java.util.LinkedHashMap<>();
        user.put("id", "user-1");
        user.put("email", "test@test.com");
        user.put("password", "encoded-password");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "encoded-password")).thenReturn(false);

        LoginRequest request = new LoginRequest("test@test.com", "wrong-password");

        assertThrows(AuthenticationFailedException.class, () -> authService.login(request));
    }
}
