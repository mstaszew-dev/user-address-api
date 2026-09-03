package com.example.useraddressapi.service;

import com.example.useraddressapi.db.AddressRepository;
import com.example.useraddressapi.db.UserRepository;
import com.example.useraddressapi.dto.AddressDto;
import com.example.useraddressapi.dto.AddressUpdateDto;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AddressServiceTest {

    @Mock
    private AddressRepository addressRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AddressService addressService;

    @BeforeEach
    void setUp() {
    }

    @Test
    void testCreateAddress_savesAndReturnsDto() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(Map.of("id", "user-1")));
        when(addressRepository.save(any())).thenAnswer(inv -> {
            Map<String, Object> addr = new LinkedHashMap<>(inv.getArgument(0));
            addr.put("id", "addr-1");
            return addr;
        });

        AddressDto dto = new AddressDto(null, "user-1", "123 Main St", "Springfield", "IL", "62704", "US", "HOME");
        AddressDto result = addressService.createAddress(dto);

        assertNotNull(result.id());
        assertEquals("123 Main St", result.street());
        assertEquals("user-1", result.userId());
    }

    @Test
    void testCreateAddress_throwsWhenUserNotFound() {
        when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

        AddressDto dto = new AddressDto(null, "nonexistent", "123 Main St", "Springfield", "IL", "62704", "US", "HOME");

        assertThrows(ResourceNotFoundException.class, () -> addressService.createAddress(dto));
    }

    @Test
    void testGetAddressesByUserId_returnsList() {
        Map<String, Object> addr1 = new LinkedHashMap<>();
        addr1.put("id", "addr-1");
        addr1.put("userId", "user-1");
        addr1.put("street", "123 Main St");
        addr1.put("city", "Springfield");
        addr1.put("state", "IL");
        addr1.put("zipCode", "62704");
        addr1.put("country", "US");
        addr1.put("type", "HOME");

        when(addressRepository.findByUserId("user-1")).thenReturn(List.of(addr1));

        List<AddressDto> result = addressService.getAddressesByUserId("user-1");

        assertEquals(1, result.size());
        assertEquals("123 Main St", result.get(0).street());
    }

    @Test
    void testGetAddressById_returnsDto() {
        Map<String, Object> addr = new LinkedHashMap<>();
        addr.put("id", "addr-1");
        addr.put("userId", "user-1");
        addr.put("street", "123 Main St");
        addr.put("city", "Springfield");
        addr.put("state", "IL");
        addr.put("zipCode", "62704");
        addr.put("country", "US");
        addr.put("type", "HOME");

        when(addressRepository.findById("addr-1")).thenReturn(Optional.of(addr));

        AddressDto result = addressService.getAddressById("addr-1");

        assertEquals("123 Main St", result.street());
    }

    @Test
    void testGetAddressById_throwsWhenNotFound() {
        when(addressRepository.findById("nonexistent")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> addressService.getAddressById("nonexistent"));
    }

    @Test
    void testUpdateAddress_updatesFields() {
        Map<String, Object> existing = new LinkedHashMap<>();
        existing.put("id", "addr-1");
        existing.put("userId", "user-1");
        existing.put("street", "123 Main St");

        when(addressRepository.findById("addr-1")).thenReturn(Optional.of(existing));

        Map<String, Object> updated = new LinkedHashMap<>(existing);
        updated.put("street", "456 Oak Ave");
        when(addressRepository.update(eq("addr-1"), any())).thenReturn(Optional.of(updated));

        AddressUpdateDto dto = new AddressUpdateDto("456 Oak Ave", null, null, null, null, null);
        AddressDto result = addressService.updateAddress("addr-1", dto);

        assertEquals("456 Oak Ave", result.street());
    }

    @Test
    void testDeleteAddress_removesRecord() {
        when(addressRepository.delete("addr-1")).thenReturn(true);

        addressService.deleteAddress("addr-1");

        verify(addressRepository).delete("addr-1");
    }

    @Test
    void testDeleteAddress_throwsWhenNotFound() {
        when(addressRepository.delete("nonexistent")).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> addressService.deleteAddress("nonexistent"));
    }
}
