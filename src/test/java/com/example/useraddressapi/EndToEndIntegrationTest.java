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

    @Autowired
    private com.example.useraddressapi.db.UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        store.clearAll();
    }

    @Test
    void testFullFlow_userReadsAdminWritesCascadeDelete() throws Exception {
        // 1. Register user (public; role USER)
        MvcResult register = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"john@example.com\",\"password\":\"secret123\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String userToken = objectMapper.readTree(register.getResponse().getContentAsString())
                .path("data").path("token").asText();
        String userId = objectMapper.readTree(register.getResponse().getContentAsString())
                .path("data").path("userId").asText();

        // 2. Login as seeded admin (write access)
        java.util.Map<String, Object> admin = new java.util.LinkedHashMap<>();
        admin.put("firstName", "Admin");
        admin.put("lastName", "User");
        admin.put("email", "admin@example.com");
        admin.put("password", passwordEncoder.encode("admin123"));
        admin.put("role", "ADMIN");
        admin.put("createdAt", java.time.Instant.now().toString());
        userRepository.save(admin);

        MvcResult adminLogin = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@example.com\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String adminToken = objectMapper.readTree(adminLogin.getResponse().getContentAsString())
                .path("data").path("token").asText();

        // 3. USER cannot create an address
        mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"street\":\"1 No St\",\"city\":\"Springfield\",\"zipCode\":\"62704\",\"country\":\"US\"}"))
                .andExpect(status().isForbidden());

        // 4. ADMIN creates an address
        MvcResult created = mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"street\":\"123 Main St\",\"city\":\"Springfield\",\"state\":\"IL\",\"zipCode\":\"62704\",\"country\":\"US\",\"type\":\"HOME\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String addrId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();

        // 5. USER can read addresses
        mockMvc.perform(get("/api/addresses/user/" + userId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));

        // 6. USER cannot update or delete the address
        mockMvc.perform(put("/api/addresses/" + addrId)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"city\":\"Shelbyville\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/addresses/" + addrId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());

        // 7. ADMIN updates the address
        mockMvc.perform(put("/api/addresses/" + addrId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"city\":\"Shelbyville\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.city").value("Shelbyville"));

        // 8. ADMIN deletes the address
        mockMvc.perform(delete("/api/addresses/" + addrId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // 9. ADMIN deletes the user
        mockMvc.perform(delete("/api/users/" + userId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // Verify user gone for a remaining admin read
        mockMvc.perform(get("/api/users/" + userId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());

        // Only the admin user remains; all addresses are gone
        assertThat(store.count("users")).isEqualTo(1);
        assertThat(store.count("addresses")).isZero();
    }
}
