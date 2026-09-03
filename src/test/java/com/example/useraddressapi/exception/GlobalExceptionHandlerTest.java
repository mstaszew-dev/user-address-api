package com.example.useraddressapi.exception;

import com.example.useraddressapi.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleNotFound_returns404() {
        ResponseEntity<ApiResponse<Void>> res = handler.handleNotFound(new ResourceNotFoundException("User", "1"));

        assertEquals(HttpStatus.NOT_FOUND, res.getStatusCode());
        assertEquals("User not found with id: 1", res.getBody().message());
        assertFalse(res.getBody().success());
    }

    @Test
    void handleDuplicate_returns409() {
        ResponseEntity<ApiResponse<Void>> res = handler.handleDuplicate(
                new DuplicateResourceException("Email already in use"));

        assertEquals(HttpStatus.CONFLICT, res.getStatusCode());
        assertEquals("Email already in use", res.getBody().message());
    }

    @Test
    void handleIllegalArg_returns400() {
        ResponseEntity<ApiResponse<Void>> res = handler.handleIllegalArg(
                new IllegalArgumentException("Invalid input"));

        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        assertEquals("Invalid input", res.getBody().message());
    }

    @Test
    void handleGeneral_returns500WithGenericMessage() {
        ResponseEntity<ApiResponse<Void>> res = handler.handleGeneral(
                new RuntimeException("boom"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, res.getStatusCode());
        assertFalse(res.getBody().success());
        assertEquals("Internal server error", res.getBody().message());
    }

    @Test
    void handleValidation_joinsFieldErrors() {
        BeanPropertyBindingResult binding = new BeanPropertyBindingResult(new Object(), "obj");
        binding.addError(new FieldError("obj", "email", "must not be blank"));
        binding.addError(new FieldError("obj", "password", "must be at least 6 characters"));
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, binding);

        ResponseEntity<ApiResponse<Void>> res = handler.handleValidation(ex);

        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        assertTrue(res.getBody().message().contains("must not be blank"));
        assertTrue(res.getBody().message().contains("must be at least 6 characters"));
    }

    @Test
    void handleAccessDenied_returns403WithStableMessage() {
        ResponseEntity<ApiResponse<Void>> res = handler.handleAccessDenied(
                new org.springframework.security.access.AccessDeniedException("Denied"));

        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
        assertEquals("Admin role required for this operation", res.getBody().message());
        assertFalse(res.getBody().success());
    }

    @Test
    void handleNoResourceFound_returns404() {
        ResponseEntity<ApiResponse<Void>> res = handler.handleNoResourceFound(
                new org.springframework.web.servlet.resource.NoResourceFoundException(
                        org.springframework.http.HttpMethod.GET, "/api/unknown"));

        assertEquals(HttpStatus.NOT_FOUND, res.getStatusCode());
        assertFalse(res.getBody().success());
    }

    @Test
    void handleMethodNotSupported_returns405() {
        ResponseEntity<ApiResponse<Void>> res = handler.handleMethodNotSupported(
                new org.springframework.web.HttpRequestMethodNotSupportedException("DELETE"));

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, res.getStatusCode());
        assertFalse(res.getBody().success());
    }
}