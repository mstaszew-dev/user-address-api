package com.example.useraddressapi.db;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
public class InMemoryStore {

    private final Map<String, ConcurrentHashMap<String, Map<String, Object>>> tables
            = new ConcurrentHashMap<>();

    private ConcurrentHashMap<String, Map<String, Object>> table(String name) {
        return tables.computeIfAbsent(name, k -> new ConcurrentHashMap<>());
    }

    public Map<String, Object> save(String tableName, Map<String, Object> record) {
        Map<String, Object> copy = new LinkedHashMap<>(record);
        if (!copy.containsKey("id") || copy.get("id") == null) {
            copy.put("id", UUID.randomUUID().toString());
        }
        table(tableName).put((String) copy.get("id"), copy);
        return copy;
    }

    public Optional<Map<String, Object>> findById(String tableName, String id) {
        return Optional.ofNullable(table(tableName).get(id));
    }

    public List<Map<String, Object>> findAll(String tableName) {
        return new ArrayList<>(table(tableName).values());
    }

    public List<Map<String, Object>> findByField(String tableName, String field, Object value) {
        return table(tableName).values().stream()
                .filter(r -> value.equals(r.get(field)))
                .collect(Collectors.toList());
    }

    public Optional<Map<String, Object>> update(String tableName, String id,
                                                  Map<String, Object> updates) {
        return Optional.ofNullable(table(tableName).computeIfPresent(id, (key, existing) -> {
            Map<String, Object> updated = new LinkedHashMap<>(existing);
            updates.forEach((k, v) -> {
                if (!"id".equals(k)) updated.put(k, v);
            });
            return updated;
        }));
    }

    public boolean delete(String tableName, String id) {
        return table(tableName).remove(id) != null;
    }

    public long deleteByField(String tableName, String field, Object value) {
        ConcurrentHashMap<String, Map<String, Object>> t = table(tableName);
        List<String> toDelete = t.entrySet().stream()
                .filter(e -> value.equals(e.getValue().get(field)))
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
        toDelete.forEach(t::remove);
        return toDelete.size();
    }

    public long count(String tableName) {
        return table(tableName).size();
    }

    public void clearTable(String tableName) {
        tables.remove(tableName);
    }

    public void clearAll() {
        tables.clear();
    }
}
