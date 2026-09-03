package com.example.useraddressapi.db;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class UserRepositoryTest {

    private InMemoryStore store;
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        store = new InMemoryStore();
        store.clearAll();
        userRepository = new UserRepository(store);
    }

    @Test
    void testSave_generatesIdAndStoresUser() {
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("name", "Alice");
        user.put("email", "alice@test.com");

        Map<String, Object> saved = userRepository.save(user);

        assertNotNull(saved.get("id"));
        assertEquals("Alice", saved.get("name"));
        assertEquals("alice@test.com", saved.get("email"));
    }

    @Test
    void testFindById_returnsUser() {
        Map<String, Object> saved = userRepository.save(Map.of("name", "Alice", "email", "a@test.com"));

        Optional<Map<String, Object>> found = userRepository.findById((String) saved.get("id"));

        assertTrue(found.isPresent());
        assertEquals("Alice", found.get().get("name"));
    }

    @Test
    void testFindById_returnsEmptyForMissingId() {
        assertFalse(userRepository.findById("nonexistent").isPresent());
    }

    @Test
    void testFindByEmail_returnsUser() {
        userRepository.save(Map.of("name", "Alice", "email", "alice@test.com"));

        Optional<Map<String, Object>> found = userRepository.findByEmail("alice@test.com");

        assertTrue(found.isPresent());
        assertEquals("Alice", found.get().get("name"));
    }

    @Test
    void testFindByEmail_returnsEmptyForMissingEmail() {
        assertFalse(userRepository.findByEmail("nobody@test.com").isPresent());
    }

    @Test
    void testFindAll_returnsAllUsers() {
        userRepository.save(Map.of("name", "Alice", "email", "a@test.com"));
        userRepository.save(Map.of("name", "Bob", "email", "b@test.com"));

        List<Map<String, Object>> all = userRepository.findAll();

        assertEquals(2, all.size());
    }

    @Test
    void testUpdate_updatesFieldsButNotId() {
        Map<String, Object> saved = userRepository.save(Map.of("name", "Alice", "email", "a@test.com"));
        String id = (String) saved.get("id");

        Map<String, Object> updates = new LinkedHashMap<>();
        updates.put("name", "Alice Updated");

        Optional<Map<String, Object>> updated = userRepository.update(id, updates);

        assertTrue(updated.isPresent());
        assertEquals("Alice Updated", updated.get().get("name"));
        assertEquals(id, updated.get().get("id"));
    }

    @Test
    void testDelete_removesUser() {
        Map<String, Object> saved = userRepository.save(Map.of("name", "Alice", "email", "a@test.com"));

        boolean deleted = userRepository.delete((String) saved.get("id"));

        assertTrue(deleted);
        assertEquals(0, userRepository.count());
    }

    @Test
    void testCount_returnsCorrectCount() {
        assertEquals(0, userRepository.count());

        userRepository.save(Map.of("name", "Alice", "email", "a@test.com"));
        userRepository.save(Map.of("name", "Bob", "email", "b@test.com"));

        assertEquals(2, userRepository.count());
    }

    @Test
    void testFindByEmail_returnsEmptyForDuplicatedUsersListEmpty() {
        assertFalse(userRepository.findByEmail("missing@test.com").isPresent());
    }

    @Test
    void testUpdate_returnsEmptyForMissingId() {
        Optional<Map<String, Object>> updated = userRepository.update("missing", Map.of("name", "X"));

        assertFalse(updated.isPresent());
    }

    @Test
    void testDelete_returnsFalseForMissingId() {
        assertFalse(userRepository.delete("missing"));
    }

    @Test
    void testClear_removesAllUsers() {
        userRepository.save(Map.of("name", "Alice", "email", "a@test.com"));
        userRepository.save(Map.of("name", "Bob", "email", "b@test.com"));

        userRepository.clear();

        assertEquals(0, userRepository.count());
    }

    @Test
    void testSaveIfEmailFree_savesWhenEmailIsNew() {
        Map<String, Object> user = new HashMap<>();
        user.put("firstName", "Alice");
        user.put("lastName", "Smith");
        user.put("email", "new@test.com");

        Optional<Map<String, Object>> saved = userRepository.saveIfEmailFree("new@test.com", user);

        assertTrue(saved.isPresent());
        assertEquals("new@test.com", saved.get().get("email"));
    }

    @Test
    void testSaveIfEmailFree_returnsEmptyWhenEmailTaken() {
        userRepository.save(Map.of("email", "taken@test.com", "name", "Existing"));

        Map<String, Object> user = new HashMap<>();
        user.put("email", "taken@test.com");

        Optional<Map<String, Object>> saved = userRepository.saveIfEmailFree("taken@test.com", user);

        assertTrue(saved.isEmpty());
        assertEquals(1, userRepository.findAll().size());
    }
}