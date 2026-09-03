package com.example.useraddressapi.db;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class AddressRepositoryTest {

    private InMemoryStore store;
    private AddressRepository addressRepository;

    @BeforeEach
    void setUp() {
        store = new InMemoryStore();
        store.clearAll();
        addressRepository = new AddressRepository(store);
    }

    @Test
    void testSave_generatesIdAndStoresAddress() {
        Map<String, Object> address = new LinkedHashMap<>();
        address.put("userId", "user-123");
        address.put("street", "123 Main St");
        address.put("city", "Springfield");

        Map<String, Object> saved = addressRepository.save(address);

        assertNotNull(saved.get("id"));
        assertEquals("user-123", saved.get("userId"));
        assertEquals("123 Main St", saved.get("street"));
    }

    @Test
    void testFindById_returnsAddress() {
        Map<String, Object> saved = addressRepository.save(
                Map.of("userId", "user-123", "street", "123 Main St", "city", "Springfield"));

        Optional<Map<String, Object>> found = addressRepository.findById((String) saved.get("id"));

        assertTrue(found.isPresent());
        assertEquals("123 Main St", found.get().get("street"));
    }

    @Test
    void testFindById_returnsEmptyForMissingId() {
        assertFalse(addressRepository.findById("nonexistent").isPresent());
    }

    @Test
    void testFindByUserId_returnsAddressesForUser() {
        addressRepository.save(Map.of("userId", "user-1", "street", "123 Main St"));
        addressRepository.save(Map.of("userId", "user-1", "street", "456 Oak Ave"));
        addressRepository.save(Map.of("userId", "user-2", "street", "789 Pine Rd"));

        List<Map<String, Object>> results = addressRepository.findByUserId("user-1");

        assertEquals(2, results.size());
        assertTrue(results.stream().allMatch(a -> "user-1".equals(a.get("userId"))));
    }

    @Test
    void testFindAll_returnsAllAddresses() {
        addressRepository.save(Map.of("userId", "user-1", "street", "123 Main St"));
        addressRepository.save(Map.of("userId", "user-2", "street", "456 Oak Ave"));

        List<Map<String, Object>> all = addressRepository.findAll();

        assertEquals(2, all.size());
    }

    @Test
    void testUpdate_updatesFieldsButNotId() {
        Map<String, Object> saved = addressRepository.save(
                Map.of("userId", "user-1", "street", "123 Main St", "city", "Springfield"));
        String id = (String) saved.get("id");

        Map<String, Object> updates = new LinkedHashMap<>();
        updates.put("city", "Shelbyville");

        Optional<Map<String, Object>> updated = addressRepository.update(id, updates);

        assertTrue(updated.isPresent());
        assertEquals("Shelbyville", updated.get().get("city"));
        assertEquals(id, updated.get().get("id"));
    }

    @Test
    void testDelete_removesAddress() {
        Map<String, Object> saved = addressRepository.save(
                Map.of("userId", "user-1", "street", "123 Main St"));

        boolean deleted = addressRepository.delete((String) saved.get("id"));

        assertTrue(deleted);
        assertEquals(0, addressRepository.findAll().size());
    }

    @Test
    void testDeleteByUserId_removesAllAddressesForUser() {
        addressRepository.save(Map.of("userId", "user-1", "street", "123 Main St"));
        addressRepository.save(Map.of("userId", "user-1", "street", "456 Oak Ave"));
        addressRepository.save(Map.of("userId", "user-2", "street", "789 Pine Rd"));

        long deleted = addressRepository.deleteByUserId("user-1");

        assertEquals(2, deleted);
        assertEquals(1, addressRepository.findAll().size());
    }
}
