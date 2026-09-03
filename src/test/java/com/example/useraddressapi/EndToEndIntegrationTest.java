package com.example.useraddressapi;

import com.example.useraddressapi.db.InMemoryStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class EndToEndIntegrationTest {

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

    @Test
    void testFullFlow_registerLoginCrudCascadeDelete() throws Exception {
        // 1. Register user
        MvcResult register = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"John Doe\",\"email\":\"john@example.com\",\"password\":\"secret123\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String token = objectMapper.readTree(register.getResponse().getContentAsString())
                .path("data").path("token").asText();
        assertThat(token).isNotBlank();

        // 2. Login with same credentials
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"john@example.com\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode loginData = objectMapper.readTree(login.getResponse().getContentAsString()).path("data");
        String userId = loginData.path("userId").asText();
        String loginToken = loginData.path("token").asText();
        assertThat(loginToken).isNotBlank();

        // 3. Create address
        MvcResult created = mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + loginToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"street\":\"123 Main St\",\"city\":\"Springfield\",\"state\":\"IL\",\"zipCode\":\"62704\",\"country\":\"US\",\"type\":\"HOME\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String addrId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();

        // 4. List addresses
        mockMvc.perform(get("/api/addresses/user/" + userId)
                        .header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(1));

        // 5. Update address
        mockMvc.perform(put("/api/addresses/" + addrId)
                        .header("Authorization", "Bearer " + loginToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"city\":\"Shelbyville\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.city").value("Shelbyville"));

        // 6. Delete address
        mockMvc.perform(delete("/api/addresses/" + addrId)
                        .header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isOk());

        // Re-create an address to verify cascade delete with user deletion
        MvcResult created2 = mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + loginToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"street\":\"999 Pine Rd\",\"city\":\"Ogdenville\",\"state\":\"UT\",\"zipCode\":\"84401\",\"country\":\"US\",\"type\":\"WORK\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String addrId2 = objectMapper.readTree(created2.getResponse().getContentAsString())
                .path("data").path("id").asText();

        // 7. Delete user -> cascades address deletion
        mockMvc.perform(delete("/api/users/" + userId)
                        .header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify user gone
        mockMvc.perform(get("/api/users/" + userId)
                        .header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isNotFound());

        // Verify address was cascade-deleted (GET returns 404)
        mockMvc.perform(get("/api/addresses/" + addrId2)
                        .header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isNotFound());

        // Store should be empty at the end
        assertThat(store.count("users")).isZero();
        assertThat(store.count("addresses")).isZero();
    }
}
