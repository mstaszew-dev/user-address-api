package com.example.useraddressapi.service;

import com.example.useraddressapi.db.AddressRepository;
import com.example.useraddressapi.db.UserRepository;
import com.example.useraddressapi.dto.UserDto;
import com.example.useraddressapi.dto.UserUpdateDto;
import com.example.useraddressapi.exception.DuplicateResourceException;
import com.example.useraddressapi.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AddressRepository addressRepository;

    @InjectMocks
    private UserService userService;

    private Map<String, Object> sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new LinkedHashMap<>();
        sampleUser.put("id", "user-1");
        sampleUser.put("firstName", "Alice");
        sampleUser.put("lastName", "Wonder");
        sampleUser.put("email", "alice@test.com");
        sampleUser.put("role", "USER");
        sampleUser.put("createdAt", "2024-01-01T00:00:00Z");
    }

    @Test
    void testGetAllUsers_returnsListOfUserDtos() {
        when(userRepository.findAll()).thenReturn(List.of(sampleUser));

        List<UserDto> users = userService.getAllUsers();

        assertEquals(1, users.size());
        assertEquals("Alice", users.get(0).firstName());
        assertEquals("Wonder", users.get(0).lastName());
    }

    @Test
    void testGetUserById_returnsUserDto() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(sampleUser));

        UserDto user = userService.getUserById("user-1");

        assertEquals("Alice", user.firstName());
        assertEquals("Wonder", user.lastName());
        assertEquals("alice@test.com", user.email());
    }

    @Test
    void testGetUserById_throwsWhenNotFound() {
        when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById("nonexistent"));
    }

    @Test
    void testUpdateUser_updatesNamesAndEmail() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(sampleUser));
        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());

        Map<String, Object> updated = new LinkedHashMap<>(sampleUser);
        updated.put("firstName", "Bob");
        updated.put("lastName", "Builder");
        updated.put("email", "new@test.com");
        when(userRepository.update(eq("user-1"), any())).thenReturn(Optional.of(updated));

        UserUpdateDto dto = new UserUpdateDto("Bob", "Builder", "new@test.com", null);
        UserDto result = userService.updateUser("user-1", dto);

        assertEquals("Bob", result.firstName());
        assertEquals("Builder", result.lastName());
        assertEquals("new@test.com", result.email());
    }

    @Test
    void testUpdateUser_updatesRoleOnly() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(sampleUser));

        Map<String, Object> updated = new LinkedHashMap<>(sampleUser);
        updated.put("role", "ADMIN");
        when(userRepository.update(eq("user-1"), any())).thenReturn(Optional.of(updated));

        UserUpdateDto dto = new UserUpdateDto(null, null, null, "ADMIN");
        UserDto result = userService.updateUser("user-1", dto);

        assertEquals("ADMIN", result.role());
    }

    @Test
    void testUpdateUser_emailSameAsExisting_skipsDuplicateCheck() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(sampleUser));

        Map<String, Object> updated = new LinkedHashMap<>(sampleUser);
        when(userRepository.update(eq("user-1"), any())).thenReturn(Optional.of(updated));

        UserUpdateDto dto = new UserUpdateDto("Alice", "Wonder", "alice@test.com", null);
        UserDto result = userService.updateUser("user-1", dto);

        assertEquals("alice@test.com", result.email());
        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void testUpdateUser_changesFirstNameAndLastNameSeparately() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(sampleUser));

        Map<String, Object> updated = new LinkedHashMap<>(sampleUser);
        updated.put("firstName", "Alicia");
        updated.put("lastName", "Wonder");
        when(userRepository.update(eq("user-1"), any())).thenReturn(Optional.of(updated));

        UserUpdateDto dto = new UserUpdateDto("Alicia", null, null, null);
        UserDto result = userService.updateUser("user-1", dto);

        assertEquals("Alicia", result.firstName());
        assertEquals("Wonder", result.lastName());
    }

    @Test
    void testUpdateUser_throwsWhenUpdateReturnsEmpty() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(sampleUser));
        when(userRepository.update(eq("user-1"), any())).thenReturn(Optional.empty());

        UserUpdateDto dto = new UserUpdateDto("Bob", null, null, null);

        assertThrows(ResourceNotFoundException.class, () -> userService.updateUser("user-1", dto));
    }

    @Test
    void testUpdateUser_throwsWhenUserNotFound() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());

        UserUpdateDto dto = new UserUpdateDto("Bob", null, null, null);

        assertThrows(ResourceNotFoundException.class, () -> userService.updateUser("missing", dto));
    }

    @Test
    void testUpdateUser_throwsOnDuplicateEmail() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(sampleUser));

        Map<String, Object> otherUser = new LinkedHashMap<>();
        otherUser.put("id", "user-2");
        otherUser.put("email", "taken@test.com");
        when(userRepository.findByEmail("taken@test.com")).thenReturn(Optional.of(otherUser));

        UserUpdateDto dto = new UserUpdateDto(null, null, "taken@test.com", null);

        assertThrows(DuplicateResourceException.class, () -> userService.updateUser("user-1", dto));
    }

    @Test
    void testDeleteUser_removesUserAndAddresses() {
        when(userRepository.delete("user-1")).thenReturn(true);
        when(addressRepository.deleteByUserId("user-1")).thenReturn(2L);

        userService.deleteUser("user-1");

        verify(userRepository).delete("user-1");
        verify(addressRepository).deleteByUserId("user-1");
    }

    @Test
    void testDeleteUser_throwsWhenNotFound() {
        when(userRepository.delete("nonexistent")).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> userService.deleteUser("nonexistent"));
    }
}
