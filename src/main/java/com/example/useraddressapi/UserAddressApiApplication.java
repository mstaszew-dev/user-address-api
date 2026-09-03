package com.example.useraddressapi;

import com.example.useraddressapi.db.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@SpringBootApplication
public class UserAddressApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserAddressApiApplication.class, args);
    }

    @Bean
    CommandLineRunner seedData(UserRepository userRepository, PasswordEncoder encoder) {
        return args -> {
            if (userRepository.findByEmail("admin@example.com").isEmpty()) {
                Map<String, Object> admin = new LinkedHashMap<>();
                admin.put("firstName", "Admin");
                admin.put("lastName", "User");
                admin.put("email", "admin@example.com");
                admin.put("password", encoder.encode(adminPassword()));
                admin.put("role", "ADMIN");
                admin.put("createdAt", Instant.now().toString());
                userRepository.save(admin);
                System.out.println(">> Seeded admin user: admin@example.com");
            }
        };
    }

    private static String adminPassword() {
        String password = System.getenv("ADMIN_PASSWORD");
        return (password == null || password.isBlank()) ? "admin123" : password;
    }
}
