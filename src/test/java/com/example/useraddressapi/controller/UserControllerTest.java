package com.example.useraddressapi.controller;

import com.example.useraddressapi.db.InMemoryStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private InMemoryStore store;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        store.clearAll();
    }

    private String registerAndGetToken(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Test\",\"lastName\":\"User\",\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").path("token").asText();
    }

    @Test
    void testGetAllUsers_returns200WithList() throws Exception {
        String token = registerAndGetToken("alice@test.com");

        mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void testGetUserById_returns200WithUser() throws Exception {
        String token = registerAndGetToken("alice@test.com");
        MvcResult result = mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        String userId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").get(0).path("id").asText();

        mockMvc.perform(get("/api/users/" + userId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(userId));
    }

    @Test
    void testGetUserById_returns404WhenNotFound() throws Exception {
        String token = registerAndGetToken("alice@test.com");

        mockMvc.perform(get("/api/users/nonexistent").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testUpdateUser_returns200WithUpdatedUser() throws Exception {
        String token = registerAndGetToken("alice@test.com");
        MvcResult result = mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        String userId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").get(0).path("id").asText();

        mockMvc.perform(put("/api/users/" + userId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Alice\",\"lastName\":\"Updated\",\"email\":\"alice@test.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.firstName").value("Alice"))
                .andExpect(jsonPath("$.data.lastName").value("Updated"));
    }

    @Test
    void testUpdateUser_returns400OnInvalidRole() throws Exception {
        String token = registerAndGetToken("alice@test.com");
        MvcResult result = mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        String userId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").get(0).path("id").asText();

        mockMvc.perform(put("/api/users/" + userId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"LORD\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testDeleteUser_returns204() throws Exception {
        String token = registerAndGetToken("alice@test.com");
        MvcResult result = mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        String userId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").get(0).path("id").asText();

        mockMvc.perform(delete("/api/users/" + userId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void testGetAllUsers_returns401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized());
    }
}
