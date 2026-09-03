package com.example.useraddressapi.db;

import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class UserRepository {

    private static final String TABLE = "users";
    private final InMemoryStore store;

    public UserRepository(InMemoryStore store) {
        this.store = store;
    }

    public Map<String, Object> save(Map<String, Object> user) {
        return store.save(TABLE, user);
    }

    public Optional<Map<String, Object>> findById(String id) {
        return store.findById(TABLE, id);
    }

    public Optional<Map<String, Object>> findByEmail(String email) {
        return store.findByField(TABLE, "email", email).stream().findFirst();
    }

    public List<Map<String, Object>> findAll() {
        return store.findAll(TABLE);
    }

    public Optional<Map<String, Object>> update(String id, Map<String, Object> updates) {
        return store.update(TABLE, id, updates);
    }

    public boolean delete(String id) {
        return store.delete(TABLE, id);
    }

    public long count() {
        return store.count(TABLE);
    }

    public void clear() {
        store.clearTable(TABLE);
    }
}
