package com.example.useraddressapi.db;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class InMemoryStoreTest {

    private InMemoryStore store;

    @BeforeEach
    void setUp() {
        store = new InMemoryStore();
        store.clearAll();
    }

    @Test
    void testSave_generatesIdAndStoresRecord() {
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("name", "Alice");

        Map<String, Object> saved = store.save("users", record);

        assertNotNull(saved.get("id"));
        assertEquals("Alice", saved.get("name"));
        assertEquals(1, store.count("users"));
    }

    @Test
    void testSave_preservesProvidedId() {
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("id", "custom-id-123");
        record.put("name", "Bob");

        Map<String, Object> saved = store.save("users", record);

        assertEquals("custom-id-123", saved.get("id"));
    }

    @Test
    void testSave_generatesIdWhenProvidedIdIsNull() {
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("id", null);
        record.put("name", "Carol");

        Map<String, Object> saved = store.save("users", record);

        assertNotNull(saved.get("id"));
    }

    @Test
    void testFindById_returnsRecord() {
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("name", "Alice");
        Map<String, Object> saved = store.save("users", record);

        Optional<Map<String, Object>> found = store.findById("users", (String) saved.get("id"));

        assertTrue(found.isPresent());
        assertEquals("Alice", found.get().get("name"));
    }

    @Test
    void testFindById_returnsEmptyForMissingId() {
        Optional<Map<String, Object>> found = store.findById("users", "nonexistent");

        assertFalse(found.isPresent());
    }

    @Test
    void testFindByField_returnsMatchingRecords() {
        Map<String, Object> r1 = new LinkedHashMap<>();
        r1.put("email", "a@test.com");
        r1.put("name", "Alice");
        store.save("users", r1);

        Map<String, Object> r2 = new LinkedHashMap<>();
        r2.put("email", "b@test.com");
        r2.put("name", "Bob");
        store.save("users", r2);

        List<Map<String, Object>> results = store.findByField("users", "email", "a@test.com");

        assertEquals(1, results.size());
        assertEquals("Alice", results.get(0).get("name"));
    }

    @Test
    void testFindAll_returnsAllRecords() {
        store.save("users", Map.of("name", "Alice"));
        store.save("users", Map.of("name", "Bob"));

        List<Map<String, Object>> all = store.findAll("users");

        assertEquals(2, all.size());
    }

    @Test
    void testUpdate_updatesFieldsButNotId() {
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("name", "Alice");
        Map<String, Object> saved = store.save("users", record);
        String id = (String) saved.get("id");

        Map<String, Object> updates = new LinkedHashMap<>();
        updates.put("name", "Alice Updated");
        updates.put("id", "should-not-change");

        Optional<Map<String, Object>> updated = store.update("users", id, updates);

        assertTrue(updated.isPresent());
        assertEquals("Alice Updated", updated.get().get("name"));
        assertEquals(id, updated.get().get("id"));
    }

    @Test
    void testUpdate_returnsEmptyForMissingId() {
        Optional<Map<String, Object>> result = store.update("users", "nonexistent", Map.of("name", "X"));

        assertFalse(result.isPresent());
    }

    @Test
    void testDelete_removesRecord() {
        Map<String, Object> saved = store.save("users", Map.of("name", "Alice"));
        String id = (String) saved.get("id");

        boolean deleted = store.delete("users", id);

        assertTrue(deleted);
        assertFalse(store.findById("users", id).isPresent());
        assertEquals(0, store.count("users"));
    }

    @Test
    void testDelete_returnsFalseForMissingId() {
        boolean deleted = store.delete("users", "nonexistent");

        assertFalse(deleted);
    }

    @Test
    void testDeleteByField_removesMatchingRecords() {
        store.save("users", Map.of("role", "ADMIN", "name", "Admin1"));
        store.save("users", Map.of("role", "ADMIN", "name", "Admin2"));
        store.save("users", Map.of("role", "USER", "name", "User1"));

        long deleted = store.deleteByField("users", "role", "ADMIN");

        assertEquals(2, deleted);
        assertEquals(1, store.count("users"));
    }

    @Test
    void testCount_returnsCorrectCount() {
        assertEquals(0, store.count("users"));

        store.save("users", Map.of("name", "Alice"));
        store.save("users", Map.of("name", "Bob"));

        assertEquals(2, store.count("users"));
    }

    @Test
    void testClearTable_removesOnlyOneTable() {
        store.save("users", Map.of("name", "Alice"));
        store.save("addresses", Map.of("city", "NYC"));

        store.clearTable("users");

        assertEquals(0, store.count("users"));
        assertEquals(1, store.count("addresses"));
    }

    @Test
    void testClearAll_removesEverything() {
        store.save("users", Map.of("name", "Alice"));
        store.save("addresses", Map.of("city", "NYC"));

        store.clearAll();

        assertEquals(0, store.count("users"));
        assertEquals(0, store.count("addresses"));
    }
}
