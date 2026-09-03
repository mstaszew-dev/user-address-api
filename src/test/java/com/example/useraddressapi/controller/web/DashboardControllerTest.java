package com.example.useraddressapi.controller.web;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DashboardControllerTest {

    private final DashboardController controller = new DashboardController();

    @Test
    void home_redirectsToLogin() {
        assertEquals("redirect:/login", controller.home());
    }

    @Test
    void loginPage_returnsLoginView() {
        assertEquals("login", controller.loginPage());
    }

    @Test
    void dashboardPage_returnsDashboardView() {
        assertEquals("dashboard", controller.dashboard());
    }

    @Test
    void usersPage_returnsUsersView() {
        assertEquals("users", controller.usersPage());
    }

    @Test
    void aboutPage_returnsAboutView() {
        assertEquals("about", controller.aboutPage());
    }
}
