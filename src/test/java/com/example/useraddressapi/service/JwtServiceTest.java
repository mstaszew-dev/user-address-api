package com.example.useraddressapi.service;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    private static final String SECRET = "YourBase64EncodedSecretKeyAtLeast256BitsLongForHS256Algorithm1234567890";
    private static final long EXPIRATION_MS = 86400000L;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, EXPIRATION_MS);
    }

    @Test
    void testGenerateToken_returnsNonNullToken() {
        String token = jwtService.generateToken("user-123", "test@test.com", "USER");

        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    void testGetUserIdFromToken_returnsCorrectUserId() {
        String token = jwtService.generateToken("user-123", "test@test.com", "USER");

        String userId = jwtService.getUserIdFromToken(token);

        assertEquals("user-123", userId);
    }

    @Test
    void testValidateToken_returnsTrueForValidToken() {
        String token = jwtService.generateToken("user-123", "test@test.com", "USER");

        assertTrue(jwtService.validateToken(token));
    }

    @Test
    void testValidateToken_returnsFalseForInvalidToken() {
        assertFalse(jwtService.validateToken("invalid.token.here"));
    }

    @Test
    void testValidateToken_returnsFalseForExpiredToken() {
        JwtService expiredService = new JwtService(SECRET, -1L);
        String token = expiredService.generateToken("user-123", "test@test.com", "USER");

        assertFalse(jwtService.validateToken(token));
    }

    @Test
    void testParseClaims_containsEmailAndRole() {
        String token = jwtService.generateToken("user-123", "test@test.com", "ADMIN");

        Claims claims = jwtService.parseClaims(token);

        assertEquals("user-123", claims.getSubject());
        assertEquals("test@test.com", claims.get("email", String.class));
        assertEquals("ADMIN", claims.get("role", String.class));
    }
}
