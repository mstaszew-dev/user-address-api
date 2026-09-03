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
class AddressControllerTest {

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
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    private String getCurrentUserId(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").get(0).path("id").asText();
    }

    @Test
    void testCreateAddress_returns201() throws Exception {
        String token = registerAndGetToken("user@test.com");
        String userId = getCurrentUserId(token);

        mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"street\":\"123 Main St\",\"city\":\"Springfield\",\"zipCode\":\"62704\",\"country\":\"US\",\"type\":\"HOME\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.street").value("123 Main St"));
    }

    @Test
    void testGetByUserId_returns200WithList() throws Exception {
        String token = registerAndGetToken("user@test.com");
        String userId = getCurrentUserId(token);

        mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"street\":\"123 Main St\",\"city\":\"Springfield\",\"zipCode\":\"62704\",\"country\":\"US\",\"type\":\"HOME\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/addresses/user/" + userId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].street").value("123 Main St"));
    }

    @Test
    void testGetById_returns200WithAddress() throws Exception {
        String token = registerAndGetToken("user@test.com");
        String userId = getCurrentUserId(token);

        MvcResult created = mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"street\":\"123 Main St\",\"city\":\"Springfield\",\"zipCode\":\"62704\",\"country\":\"US\",\"type\":\"HOME\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String addrId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();

        mockMvc.perform(get("/api/addresses/" + addrId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.city").value("Springfield"));
    }

    @Test
    void testUpdateAddress_returns200() throws Exception {
        String token = registerAndGetToken("user@test.com");
        String userId = getCurrentUserId(token);

        MvcResult created = mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"street\":\"123 Main St\",\"city\":\"Springfield\",\"zipCode\":\"62704\",\"country\":\"US\",\"type\":\"HOME\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String addrId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();

        mockMvc.perform(put("/api/addresses/" + addrId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"street\":\"456 Oak Ave\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.street").value("456 Oak Ave"));
    }

    @Test
    void testDeleteAddress_returns204() throws Exception {
        String token = registerAndGetToken("user@test.com");
        String userId = getCurrentUserId(token);

        MvcResult created = mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"street\":\"123 Main St\",\"city\":\"Springfield\",\"zipCode\":\"62704\",\"country\":\"US\",\"type\":\"HOME\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String addrId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();

        mockMvc.perform(delete("/api/addresses/" + addrId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void testCreateAddress_returns401WhenUnauthenticated() throws Exception {
        mockMvc.perform(post("/api/addresses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"u\",\"street\":\"s\",\"city\":\"c\",\"zipCode\":\"z\",\"country\":\"c\"}"))
                .andExpect(status().isUnauthorized());
    }
}
