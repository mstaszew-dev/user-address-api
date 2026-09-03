package com.example.useraddressapi.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class WebPageSecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void loginPageIsPubliclyAccessible() throws Exception {
        mockMvc.perform(get("/login")).andExpect(status().isOk());
    }

    @Test
    void aboutPageIsPubliclyAccessible() throws Exception {
        mockMvc.perform(get("/about")).andExpect(status().isOk());
    }

    @Test
    void dashboardShellIsPubliclyAccessibleSoClientGuardCanRun() throws Exception {
        mockMvc.perform(get("/dashboard")).andExpect(status().isOk());
    }

    @Test
    void usersShellIsPubliclyAccessibleSoClientGuardCanRun() throws Exception {
        mockMvc.perform(get("/users")).andExpect(status().isOk());
    }

    @Test
    void apiRemainsProtectedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void staticJsIsPubliclyAccessible() throws Exception {
        mockMvc.perform(get("/js/app.js")).andExpect(status().isOk());
    }
}