package com.example.useraddressapi.db;

import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class AddressRepository {

    private static final String TABLE = "addresses";
    private final InMemoryStore store;

    public AddressRepository(InMemoryStore store) {
        this.store = store;
    }

    public Map<String, Object> save(Map<String, Object> address) {
        return store.save(TABLE, address);
    }

    public Optional<Map<String, Object>> findById(String id) {
        return store.findById(TABLE, id);
    }

    public List<Map<String, Object>> findByUserId(String userId) {
        return store.findByField(TABLE, "userId", userId);
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

    public long deleteByUserId(String userId) {
        return store.deleteByField(TABLE, "userId", userId);
    }

    public void clear() {
        store.clearTable(TABLE);
    }
}
