# Spring Boot 3.x User & Address Management REST API — Implementation Plan

> **Purpose**: This document is a self-contained, step-by-step blueprint for building a Spring Boot 3.x REST API with JWT authentication, in-memory database simulation, CRUD operations for Users and Addresses, a dashboard-style web UI, and full test coverage following TDD. It is designed to be consumed by an LLM for autonomous execution.

---

## 0. Project Context & Execution Instructions

### 0.1 Project Location & GitHub Target

| Setting | Value |
|---|---|
| **Project root** | `~/zcodeprojects/user-address-api/` (create `zcodeprojects` dir if it doesn't exist) |
| **GitHub** | After thorough TDD, brainstorming, and verification — push to GitHub as a new repository |
| **Git workflow** | `git init` → implement with commits per phase → create GitHub repo → push |

### 0.2 Quality Bar — Reference Architecture

The following describes how a prior project (msrouter) was built. **This is the quality bar and methodology to follow** — especially the TDD discipline, the "one schema for types" principle, the review loops, and the verification rigor:

> **TDD, module by module.** Every piece followed red-green-refactor: write the spec first, watch it fail (module missing), implement minimal code, watch it pass. The order matters — build from the inside out (data layer → services → security → controllers → UI).
>
> **The interesting pieces from the reference project:**
> - *Quasi-SQL console*: free-form SQL over bound arrays via AlaSQL with parser-based guards (not regex). Rows sanitized before binding.
> - *Auth*: scrypt password hashing (async), HS256 JWTs, RBAC with admin/viewer roles enforced server-side (viewer gets 403 on every mutating route, covered by real-server integration tests).
> - *One schema for types*: central schema defines every request, response, and persisted shape once. Server and client validate with it — they can never drift.
> - *Review loops*: fresh-context review subagent before final verification. Every fix was test-first.
>
> **Verification loops.** High test counts, coverage gates (97%+ target), then browser-driven E2E through every flow: bad login, live data, CRUD operations, RBAC enforcement, session restore on reload.
>
> **CI discipline.** Reproduce failures locally before fixing. Catch latent issues (e.g. dependency resolution differences between local and CI) by simulating CI locally.

### 0.3 Key Principles for the Executing LLM

1. **TDD is non-negotiable.** Write the test FIRST → watch it fail → implement → watch it pass → refactor. Every single class.
2. **KISS.** No unnecessary abstractions. `Map<String, Object>` is the entity — no JPA, no Lombok (use Java records for DTOs).
3. **Bottom-up build order.** DB layer → DTOs/Exceptions → Services → Security → Controllers → UI. Each layer is tested before the next begins.
4. **Brainstorm before coding.** Before each phase, think about edge cases, validation rules, and security implications. Document decisions in comments.
5. **Clean commits.** One commit per phase with a meaningful message. Tag the final verified state before pushing.

---

## 1. Project Overview

| Aspect | Detail |
|---|---|
| **Framework** | Spring Boot 3.x (latest stable, e.g., 3.3.x) |
| **Language** | Java 17+ |
| **Build Tool** | Maven |
| **Auth** | JWT (JSON Web Token) via `jjwt` library |
| **Database** | In-memory `ConcurrentHashMap<String, Map<String, Object>>` — no SQL/NoSQL dependency |
| **Architecture** | 3-layer: Controller → Service → Repository (DB layer) |
| **UI** | Thymeleaf dashboard with Login, User Management, About pages |
| **Testing** | TDD — write tests FIRST, then implement. JUnit 5 + MockMvc + Mockito |
| **Principle** | KISS — minimal abstractions, no over-engineering |

### 1.1 Key Design Decision: Map-Based Entity Storage

Instead of JPA entities, each record is stored as a `Map<String, Object>`. This gives:
- Zero ORM overhead
- Trivial serialization to JSON (already a map)
- Easy migration to MongoDB (document = map) or SQL (map keys = columns)
- KISS-compliant — no entity annotations, no repository interfaces

**Storage structure:**
```
ConcurrentHashMap<String, Map<String, Object>>
  key   = UUID string (entity ID)
  value = { "id": "uuid", "email": "...", "password": "...", "name": "...", ... }
```

---

## 2. Project Structure

```
~/zcodeprojects/user-address-api/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/com/example/useraddressapi/
│   │   │   ├── UserAddressApiApplication.java
│   │   │   ├── config/
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   └── WebConfig.java
│   │   │   ├── controller/
│   │   │   │   ├── api/
│   │   │   │   │   ├── AuthController.java
│   │   │   │   │   ├── UserController.java
│   │   │   │   │   └── AddressController.java
│   │   │   │   └── web/
│   │   │   │       └── DashboardController.java
│   │   │   ├── service/
│   │   │   │   ├── AuthService.java
│   │   │   │   ├── JwtService.java
│   │   │   │   ├── UserService.java
│   │   │   │   └── AddressService.java
│   │   │   ├── db/
│   │   │   │   ├── InMemoryStore.java
│   │   │   │   ├── UserRepository.java
│   │   │   │   └── AddressRepository.java
│   │   │   ├── security/
│   │   │   │   ├── JwtAuthenticationFilter.java
│   │   │   │   └── JwtAuthenticationEntryPoint.java
│   │   │   ├── dto/
│   │   │   │   ├── LoginRequest.java
│   │   │   │   ├── RegisterRequest.java
│   │   │   │   ├── AuthResponse.java
│   │   │   │   ├── UserDto.java
│   │   │   │   ├── AddressDto.java
│   │   │   │   └── ApiResponse.java
│   │   │   └── exception/
│   │   │       ├── GlobalExceptionHandler.java
│   │   │       ├── ResourceNotFoundException.java
│   │   │       └── DuplicateResourceException.java
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── templates/
│   │       │   ├── layout.html
│   │       │   ├── login.html
│   │       │   ├── dashboard.html
│   │       │   ├── users.html
│   │       │   ├── user-form.html
│   │       │   └── about.html
│   │       └── static/
│   │           ├── css/style.css
│   │           └── js/app.js
│   └── test/
│       └── java/com/example/useraddressapi/
│           ├── controller/
│           │   ├── AuthControllerTest.java
│           │   ├── UserControllerTest.java
│           │   └── AddressControllerTest.java
│           ├── service/
│           │   ├── AuthServiceTest.java
│           │   ├── JwtServiceTest.java
│           │   ├── UserServiceTest.java
│           │   └── AddressServiceTest.java
│           └── db/
│               ├── UserRepositoryTest.java
│               └── AddressRepositoryTest.java
```

---

## 3. Dependencies (`pom.xml`)

Create a standard Spring Boot 3.x Maven project with these dependencies:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativeTo/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>user-address-api</artifactId>
    <version>1.0.0</version>
    <name>User Address API</name>
    <description>User and Address Management REST API with JWT Auth</description>

    <properties>
        <java.version>17</java.version>
        <jjwt.version>0.12.6</jjwt.version>
    </properties>

    <dependencies>
        <!-- Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Security -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>

        <!-- Thymeleaf (dashboard UI) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-thymeleaf</artifactId>
        </dependency>
        <dependency>
            <groupId>org.thymeleaf.extras</groupId>
            <artifactId>thymeleaf-extras-springsecurity6</artifactId>
        </dependency>

        <!-- Validation -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- JWT -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jjwt.version}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>

        <!-- Lombok (optional — for DTOs) -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

---

## 4. Configuration

### 4.1 `application.yml`

```yaml
server:
  port: 8080

app:
  jwt:
    secret: "YourBase64EncodedSecretKeyAtLeast256BitsLongForHS256Algorithm1234567890"
    expiration-ms: 86400000  # 24 hours

spring:
  thymeleaf:
    cache: false        # dev convenience
    prefix: classpath:/templates/
    suffix: .html
```

---

## 5. Implementation — Layer by Layer (Bottom-Up)

> [!IMPORTANT]
> **TDD Workflow**: For EVERY class below, write the test class FIRST, run it (expect failure), then implement the class until tests pass. The test specifications are provided alongside each implementation.

---

### 5.1 DB Layer — In-Memory Store

#### 5.1.1 `InMemoryStore.java`

This is the core storage engine. It wraps a `ConcurrentHashMap` and provides generic CRUD operations on `Map<String, Object>` records.

```java
package com.example.useraddressapi.db;

import org.springframework.stereotype.Component;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Generic in-memory data store.
 * Each "table" is a ConcurrentHashMap<String, Map<String, Object>>.
 * The key is always the record's "id" field (a UUID string).
 *
 * This class is designed so that swapping to a real DB later requires
 * only replacing this class — no changes to services or controllers.
 */
@Component
public class InMemoryStore {

    // tableName -> { id -> record }
    private final Map<String, ConcurrentHashMap<String, Map<String, Object>>> tables
            = new ConcurrentHashMap<>();

    /** Get or create a table */
    private ConcurrentHashMap<String, Map<String, Object>> table(String name) {
        return tables.computeIfAbsent(name, k -> new ConcurrentHashMap<>());
    }

    /** Save a record. If "id" is absent, generate one. Returns the saved record. */
    public Map<String, Object> save(String tableName, Map<String, Object> record) {
        Map<String, Object> copy = new LinkedHashMap<>(record);
        if (!copy.containsKey("id") || copy.get("id") == null) {
            copy.put("id", UUID.randomUUID().toString());
        }
        table(tableName).put((String) copy.get("id"), copy);
        return copy;
    }

    /** Find by ID. Returns Optional. */
    public Optional<Map<String, Object>> findById(String tableName, String id) {
        return Optional.ofNullable(table(tableName).get(id));
    }

    /** Find all records in a table. */
    public List<Map<String, Object>> findAll(String tableName) {
        return new ArrayList<>(table(tableName).values());
    }

    /** Find records matching a field value. */
    public List<Map<String, Object>> findByField(String tableName, String field, Object value) {
        return table(tableName).values().stream()
                .filter(r -> value.equals(r.get(field)))
                .collect(Collectors.toList());
    }

    /** Update a record. Returns updated record or empty if not found. */
    public Optional<Map<String, Object>> update(String tableName, String id,
                                                  Map<String, Object> updates) {
        return findById(tableName, id).map(existing -> {
            Map<String, Object> updated = new LinkedHashMap<>(existing);
            updates.forEach((k, v) -> {
                if (!"id".equals(k)) updated.put(k, v);  // never overwrite id
            });
            table(tableName).put(id, updated);
            return updated;
        });
    }

    /** Delete by ID. Returns true if record existed. */
    public boolean delete(String tableName, String id) {
        return table(tableName).remove(id) != null;
    }

    /** Delete all records matching a field value. Returns count deleted. */
    public long deleteByField(String tableName, String field, Object value) {
        ConcurrentHashMap<String, Map<String, Object>> t = table(tableName);
        List<String> toDelete = t.entrySet().stream()
                .filter(e -> value.equals(e.getValue().get(field)))
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
        toDelete.forEach(t::remove);
        return toDelete.size();
    }

    /** Count records in a table. */
    public long count(String tableName) {
        return table(tableName).size();
    }

    /** Clear a specific table (useful for tests). */
    public void clearTable(String tableName) {
        tables.remove(tableName);
    }

    /** Clear all tables (useful for tests). */
    public void clearAll() {
        tables.clear();
    }
}
```

#### 5.1.2 `UserRepository.java`

```java
package com.example.useraddressapi.db;

import org.springframework.stereotype.Repository;
import java.util.*;

/**
 * User-specific repository. Wraps InMemoryStore with table name "users"
 * and adds user-specific query methods.
 */
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
```

#### 5.1.3 `AddressRepository.java`

```java
package com.example.useraddressapi.db;

import org.springframework.stereotype.Repository;
import java.util.*;

/**
 * Address-specific repository. Table name "addresses".
 * Addresses are linked to users via "userId" field.
 */
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
```

**Tests to write FIRST:**

```
UserRepositoryTest:
  - testSave_generatesIdAndStoresUser()
  - testFindById_returnsUser()
  - testFindById_returnsEmptyForMissingId()
  - testFindByEmail_returnsUser()
  - testFindAll_returnsAllUsers()
  - testUpdate_updatesFieldsButNotId()
  - testDelete_removesUser()
  - testCount_returnsCorrectCount()

AddressRepositoryTest:
  - testSave_generatesIdAndStoresAddress()
  - testFindById_returnsAddress()
  - testFindByUserId_returnsAddressesForUser()
  - testFindAll_returnsAllAddresses()
  - testUpdate_updatesFieldsButNotId()
  - testDelete_removesAddress()
  - testDeleteByUserId_removesAllAddressesForUser()
```

---

### 5.2 DTOs (Records — Java 17+)

Use Java records for DTOs — immutable, concise, KISS-compliant.

#### 5.2.1 `LoginRequest.java`

```java
package com.example.useraddressapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank @Email String email,
    @NotBlank String password
) {}
```

#### 5.2.2 `RegisterRequest.java`

```java
package com.example.useraddressapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank String name,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 6) String password
) {}
```

#### 5.2.3 `AuthResponse.java`

```java
package com.example.useraddressapi.dto;

public record AuthResponse(
    String token,
    String userId,
    String email,
    String name
) {}
```

#### 5.2.4 `UserDto.java`

```java
package com.example.useraddressapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UserDto(
    String id,
    @NotBlank String name,
    @NotBlank @Email String email,
    String role,        // "USER" or "ADMIN"
    String createdAt
) {}
```

#### 5.2.5 `AddressDto.java`

```java
package com.example.useraddressapi.dto;

import jakarta.validation.constraints.NotBlank;

public record AddressDto(
    String id,
    @NotBlank String userId,
    @NotBlank String street,
    @NotBlank String city,
    String state,
    @NotBlank String zipCode,
    @NotBlank String country,
    String type          // "HOME", "WORK", "OTHER"
) {}
```

#### 5.2.6 `ApiResponse.java`

```java
package com.example.useraddressapi.dto;

public record ApiResponse<T>(
    boolean success,
    String message,
    T data
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, "Success", data);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
```

---

### 5.3 Exception Handling

#### 5.3.1 `ResourceNotFoundException.java`

```java
package com.example.useraddressapi.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, String id) {
        super(resource + " not found with id: " + id);
    }
}
```

#### 5.3.2 `DuplicateResourceException.java`

```java
package com.example.useraddressapi.exception;

public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}
```

#### 5.3.3 `GlobalExceptionHandler.java`

```java
package com.example.useraddressapi.exception;

import com.example.useraddressapi.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicate(DuplicateResourceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(ApiResponse.error(errors));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArg(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Internal server error: " + ex.getMessage()));
    }
}
```

---

### 5.4 Service Layer

#### 5.4.1 `JwtService.java`

```java
package com.example.useraddressapi.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
        this.expirationMs = expirationMs;
    }

    /** Generate a token containing userId and email as claims */
    public String generateToken(String userId, String email, String role) {
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    /** Extract the subject (userId) from a token */
    public String getUserIdFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    /** Validate the token. Returns true if valid and not expired. */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /** Get all claims */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```

**Tests to write FIRST (JwtServiceTest):**

```
  - testGenerateToken_returnsNonNullToken()
  - testGetUserIdFromToken_returnsCorrectUserId()
  - testValidateToken_returnsTrueForValidToken()
  - testValidateToken_returnsFalseForInvalidToken()
  - testValidateToken_returnsFalseForExpiredToken()
  - testParseClaims_containsEmailAndRole()
```

#### 5.4.2 `AuthService.java`

```java
package com.example.useraddressapi.service;

import com.example.useraddressapi.db.UserRepository;
import com.example.useraddressapi.dto.*;
import com.example.useraddressapi.exception.DuplicateResourceException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, JwtService jwtService,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse register(RegisterRequest request) {
        // Check duplicate email
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new DuplicateResourceException("Email already registered: " + request.email());
        }

        Map<String, Object> user = new LinkedHashMap<>();
        user.put("name", request.name());
        user.put("email", request.email());
        user.put("password", passwordEncoder.encode(request.password()));
        user.put("role", "USER");
        user.put("createdAt", Instant.now().toString());

        Map<String, Object> saved = userRepository.save(user);
        String token = jwtService.generateToken(
                (String) saved.get("id"), request.email(), "USER");

        return new AuthResponse(token, (String) saved.get("id"),
                request.email(), request.name());
    }

    public AuthResponse login(LoginRequest request) {
        Map<String, Object> user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), (String) user.get("password"))) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        String token = jwtService.generateToken(
                (String) user.get("id"), request.email(), (String) user.get("role"));

        return new AuthResponse(token, (String) user.get("id"),
                (String) user.get("email"), (String) user.get("name"));
    }
}
```

**Tests to write FIRST (AuthServiceTest):**

```
  - testRegister_createsUserAndReturnsToken()
  - testRegister_throwsOnDuplicateEmail()
  - testLogin_returnsTokenForValidCredentials()
  - testLogin_throwsOnInvalidEmail()
  - testLogin_throwsOnInvalidPassword()
```

#### 5.4.3 `UserService.java`

```java
package com.example.useraddressapi.service;

import com.example.useraddressapi.db.AddressRepository;
import com.example.useraddressapi.db.UserRepository;
import com.example.useraddressapi.dto.UserDto;
import com.example.useraddressapi.exception.DuplicateResourceException;
import com.example.useraddressapi.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final AddressRepository addressRepository;

    public UserService(UserRepository userRepository, AddressRepository addressRepository) {
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public UserDto getUserById(String id) {
        return userRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    public UserDto updateUser(String id, UserDto dto) {
        Map<String, Object> existing = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        // Check email uniqueness if email is changing
        if (dto.email() != null && !dto.email().equals(existing.get("email"))) {
            if (userRepository.findByEmail(dto.email()).isPresent()) {
                throw new DuplicateResourceException("Email already in use: " + dto.email());
            }
        }

        Map<String, Object> updates = new LinkedHashMap<>();
        if (dto.name() != null) updates.put("name", dto.name());
        if (dto.email() != null) updates.put("email", dto.email());
        if (dto.role() != null) updates.put("role", dto.role());

        return userRepository.update(id, updates)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    public void deleteUser(String id) {
        if (!userRepository.delete(id)) {
            throw new ResourceNotFoundException("User", id);
        }
        // Cascade delete addresses
        addressRepository.deleteByUserId(id);
    }

    private UserDto toDto(Map<String, Object> map) {
        return new UserDto(
                (String) map.get("id"),
                (String) map.get("name"),
                (String) map.get("email"),
                (String) map.get("role"),
                (String) map.get("createdAt")
        );
    }
}
```

**Tests to write FIRST (UserServiceTest):**

```
  - testGetAllUsers_returnsListOfUserDtos()
  - testGetUserById_returnsUserDto()
  - testGetUserById_throwsWhenNotFound()
  - testUpdateUser_updatesNameAndEmail()
  - testUpdateUser_throwsOnDuplicateEmail()
  - testDeleteUser_removesUserAndAddresses()
  - testDeleteUser_throwsWhenNotFound()
```

#### 5.4.4 `AddressService.java`

```java
package com.example.useraddressapi.service;

import com.example.useraddressapi.db.AddressRepository;
import com.example.useraddressapi.db.UserRepository;
import com.example.useraddressapi.dto.AddressDto;
import com.example.useraddressapi.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    public AddressService(AddressRepository addressRepository, UserRepository userRepository) {
        this.addressRepository = addressRepository;
        this.userRepository = userRepository;
    }

    public AddressDto createAddress(AddressDto dto) {
        // Verify user exists
        userRepository.findById(dto.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User", dto.userId()));

        Map<String, Object> address = new LinkedHashMap<>();
        address.put("userId", dto.userId());
        address.put("street", dto.street());
        address.put("city", dto.city());
        address.put("state", dto.state());
        address.put("zipCode", dto.zipCode());
        address.put("country", dto.country());
        address.put("type", dto.type() != null ? dto.type() : "HOME");

        return toDto(addressRepository.save(address));
    }

    public List<AddressDto> getAddressesByUserId(String userId) {
        return addressRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public AddressDto getAddressById(String id) {
        return addressRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Address", id));
    }

    public AddressDto updateAddress(String id, AddressDto dto) {
        addressRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Address", id));

        Map<String, Object> updates = new LinkedHashMap<>();
        if (dto.street() != null) updates.put("street", dto.street());
        if (dto.city() != null) updates.put("city", dto.city());
        if (dto.state() != null) updates.put("state", dto.state());
        if (dto.zipCode() != null) updates.put("zipCode", dto.zipCode());
        if (dto.country() != null) updates.put("country", dto.country());
        if (dto.type() != null) updates.put("type", dto.type());

        return addressRepository.update(id, updates)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Address", id));
    }

    public void deleteAddress(String id) {
        if (!addressRepository.delete(id)) {
            throw new ResourceNotFoundException("Address", id);
        }
    }

    private AddressDto toDto(Map<String, Object> map) {
        return new AddressDto(
                (String) map.get("id"),
                (String) map.get("userId"),
                (String) map.get("street"),
                (String) map.get("city"),
                (String) map.get("state"),
                (String) map.get("zipCode"),
                (String) map.get("country"),
                (String) map.get("type")
        );
    }
}
```

**Tests to write FIRST (AddressServiceTest):**

```
  - testCreateAddress_savesAndReturnsDto()
  - testCreateAddress_throwsWhenUserNotFound()
  - testGetAddressesByUserId_returnsList()
  - testGetAddressById_returnsDto()
  - testGetAddressById_throwsWhenNotFound()
  - testUpdateAddress_updatesFields()
  - testDeleteAddress_removesRecord()
  - testDeleteAddress_throwsWhenNotFound()
```

---

### 5.5 Security Layer

#### 5.5.1 `JwtAuthenticationFilter.java`

```java
package com.example.useraddressapi.security;

import com.example.useraddressapi.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (jwtService.validateToken(token)) {
                Claims claims = jwtService.parseClaims(token);
                String userId = claims.getSubject();
                String role = claims.get("role", String.class);

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                userId, null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                auth.setDetails(new WebAuthenticationDetailsSource()
                        .buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
```

#### 5.5.2 `JwtAuthenticationEntryPoint.java`

```java
package com.example.useraddressapi.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request,
                          HttpServletResponse response,
                          AuthenticationException authException) throws IOException {
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        new ObjectMapper().writeValue(response.getOutputStream(),
                Map.of("success", false, "message", "Unauthorized: " + authException.getMessage()));
    }
}
```

#### 5.5.3 `SecurityConfig.java`

```java
package com.example.useraddressapi.config;

import com.example.useraddressapi.security.JwtAuthenticationEntryPoint;
import com.example.useraddressapi.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final JwtAuthenticationEntryPoint entryPoint;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter,
                          JwtAuthenticationEntryPoint entryPoint) {
        this.jwtFilter = jwtFilter;
        this.entryPoint = entryPoint;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(ex -> ex.authenticationEntryPoint(entryPoint))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/", "/login", "/about", "/css/**", "/js/**").permitAll()
                // Admin-only endpoints
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                // All other API endpoints require authentication
                .requestMatchers("/api/**").authenticated()
                // Web pages require authentication
                .requestMatchers("/dashboard/**", "/users/**").authenticated()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

---

### 5.6 Controller Layer

#### 5.6.1 `AuthController.java`

```java
package com.example.useraddressapi.controller.api;

import com.example.useraddressapi.dto.*;
import com.example.useraddressapi.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("User registered successfully", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }
}
```

#### 5.6.2 `UserController.java`

```java
package com.example.useraddressapi.controller.api;

import com.example.useraddressapi.dto.*;
import com.example.useraddressapi.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUserById(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable String id, @Valid @RequestBody UserDto dto) {
        return ResponseEntity.ok(ApiResponse.ok("User updated", userService.updateUser(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.ok("User deleted", null));
    }
}
```

#### 5.6.3 `AddressController.java`

```java
package com.example.useraddressapi.controller.api;

import com.example.useraddressapi.dto.*;
import com.example.useraddressapi.service.AddressService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
public class AddressController {

    private final AddressService addressService;

    public AddressController(AddressService addressService) {
        this.addressService = addressService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AddressDto>> createAddress(
            @Valid @RequestBody AddressDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Address created", addressService.createAddress(dto)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<AddressDto>>> getByUserId(
            @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(addressService.getAddressesByUserId(userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressDto>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(addressService.getAddressById(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressDto>> updateAddress(
            @PathVariable String id, @Valid @RequestBody AddressDto dto) {
        return ResponseEntity.ok(ApiResponse.ok("Address updated",
                addressService.updateAddress(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(@PathVariable String id) {
        addressService.deleteAddress(id);
        return ResponseEntity.ok(ApiResponse.ok("Address deleted", null));
    }
}
```

#### 5.6.4 `DashboardController.java` (Web UI — Thymeleaf)

```java
package com.example.useraddressapi.controller.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    @GetMapping("/")
    public String home() {
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String loginPage() {
        return "login";
    }

    @GetMapping("/dashboard")
    public String dashboard() {
        return "dashboard";
    }

    @GetMapping("/users")
    public String usersPage() {
        return "users";
    }

    @GetMapping("/about")
    public String aboutPage() {
        return "about";
    }
}
```

**Controller Tests to write FIRST:**

```
AuthControllerTest (MockMvc):
  - testRegister_returns201WithToken()
  - testRegister_returns409OnDuplicateEmail()
  - testRegister_returns400OnInvalidInput()
  - testLogin_returns200WithToken()
  - testLogin_returns400OnBadCredentials()

UserControllerTest (MockMvc + @WithMockUser):
  - testGetAllUsers_returns200WithList()
  - testGetUserById_returns200WithUser()
  - testGetUserById_returns404WhenNotFound()
  - testUpdateUser_returns200WithUpdatedUser()
  - testDeleteUser_returns200()
  - testGetAllUsers_returns401WhenUnauthenticated()

AddressControllerTest (MockMvc + @WithMockUser):
  - testCreateAddress_returns201()
  - testGetByUserId_returns200WithList()
  - testGetById_returns200WithAddress()
  - testUpdateAddress_returns200()
  - testDeleteAddress_returns200()
  - testCreateAddress_returns401WhenUnauthenticated()
```

---

### 5.7 Web UI (Thymeleaf Templates)

#### Design System & Tailwind CSS

The UI must exactly replicate the `msrouter` project's visual theme: a pure dark developer console using **Tailwind CSS**.
- **Canvas / Body**: `bg-slate-950` (`#020617`), text `text-slate-200` (`#e2e8f0`).
- **Cards**: `bg-slate-900` (`#0f172a`) with `border-slate-800` (`#1e293b`) and `rounded-xl`.
- **Brand / Accents**: Cyan (`cyan-600` for primary buttons, `cyan-400` for brand text, `focus:border-cyan-500` for inputs).
- **Top Navigation (No Sidebar)**: A top nav bar (`bg-slate-900/80` with a bottom border `border-slate-800`), containing the brand title on the left and navigation tabs.
- **Inputs**: `rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500`.

Tailwind CSS will be integrated via CDN script in the `<head>` of the `layout.html` for simplicity. No custom CSS file is needed; rely entirely on Tailwind utility classes.

#### 5.7.1 `layout.html` — Base Thymeleaf layout fragment

Contains the HTML skeleton, Tailwind CSS script tag (`<script src="https://cdn.tailwindcss.com"></script>`), and the top navigation bar.
- **Nav Bar**: "UserAddress API" brand name (with `cyan-400` accent). Links for "Dashboard", "Users", and "About". Shows user name (`text-slate-400`) and a "Sign out" button if authenticated (`border-slate-700` styling).

#### 5.7.2 `login.html` — Login page

Centered card layout on `bg-slate-950` (`max-w-md bg-slate-900 border-slate-800`).
- **Inputs**: Email and Password with Tailwind classes (`bg-slate-800 border-slate-700`).
- **Button**: `bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg w-full`.
- **Demo Hint**: A small `bg-slate-950/60` callout box showing demo credentials.
JavaScript calls `/api/auth/login`, stores JWT in `localStorage`, redirects to `/dashboard`.

#### 5.7.3 `dashboard.html` — Dashboard overview

Layout matching the msrouter overview.
- **Header**: "Dashboard" (`text-2xl font-bold text-slate-100`).
- **Metrics Grid**: Responsive grid (`grid-cols-1 sm:grid-cols-2`) showing StatusCard style tiles for Total Users and Total Addresses.
  - Green status pill: `bg-emerald-500/15 text-emerald-400 border-emerald-500/30 rounded-full`.

#### 5.7.4 `users.html` — User management

- **Table**: Clean bordered table (`border-slate-800 bg-slate-900 overflow-x-auto`) with headers (`text-xs uppercase text-slate-500 tracking-wide`) and subtle dividers (`divide-slate-800/60`).
- **Columns**: Name, Email, Role, Created At, Actions.
- **Role Badges**: E.g. Admin badge `bg-cyan-500/15 text-cyan-300 rounded px-1.5 py-0.5 text-xs`.

#### 5.7.5 `user-form.html` — User edit forms

Matches the msrouter Profile/Admin forms. 2-column or 3-column grids for form inputs.
Buttons use the standard `cyan-600` primary button style. Form container uses `bg-slate-900 border-slate-800`.

#### 5.7.6 `about.html` — About page

A clean documentation page (`max-w-4xl space-y-10`). Sections using `text-xl font-semibold text-slate-100`.
Code snippets use `<code class="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-300">`.

#### 5.7.7 `app.js` — Frontend JavaScript

Core functions:
- `apiCall(method, url, body)` — wrapper around `fetch()` that adds `Authorization: Bearer <token>` header
- `login(email, password)` — POST to `/api/auth/login`, store token
- `register(name, email, password)` — POST to `/api/auth/register`, store token
- `logout()` — clear `localStorage`, redirect to `/login`
- `loadUsers()` — GET `/api/users`, populate table
- `createUser(data)` — POST registration flow (admin creates user)
- `updateUser(id, data)` — PUT `/api/users/{id}`
- `deleteUser(id)` — DELETE `/api/users/{id}`
- `loadAddresses(userId)` — GET `/api/addresses/user/{userId}`
- `createAddress(data)` — POST `/api/addresses`
- `updateAddress(id, data)` — PUT `/api/addresses/{id}`
- `deleteAddress(id)` — DELETE `/api/addresses/{id}`

---

## 6. REST API Specification

### 6.1 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, get JWT |

### 6.2 Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | JWT | List all users |
| GET | `/api/users/{id}` | JWT | Get user by ID |
| PUT | `/api/users/{id}` | JWT | Update user |
| DELETE | `/api/users/{id}` | JWT | Delete user + cascade addresses |

### 6.3 Addresses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/addresses` | JWT | Create address for a user |
| GET | `/api/addresses/user/{userId}` | JWT | Get all addresses for a user |
| GET | `/api/addresses/{id}` | JWT | Get address by ID |
| PUT | `/api/addresses/{id}` | JWT | Update address |
| DELETE | `/api/addresses/{id}` | JWT | Delete address |

### 6.4 Sample Request/Response

**Register:**
```json
// POST /api/auth/register
// Request:
{ "name": "John Doe", "email": "john@example.com", "password": "secret123" }

// Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOi...",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Create Address:**
```json
// POST /api/addresses (with Authorization: Bearer <token>)
// Request:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "street": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zipCode": "62704",
  "country": "US",
  "type": "HOME"
}

// Response (201):
{
  "success": true,
  "message": "Address created",
  "data": {
    "id": "660e8400-...",
    "userId": "550e8400-...",
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62704",
    "country": "US",
    "type": "HOME"
  }
}
```

---

## 7. TDD Execution Order

> [!IMPORTANT]
> Always follow **Red → Green → Refactor**. Write the test, watch it fail, write minimal code to pass, then refactor.

### Phase 1: DB Layer (No Spring context needed)
1. Write `InMemoryStore` unit tests → Implement `InMemoryStore`
2. Write `UserRepositoryTest` → Implement `UserRepository`
3. Write `AddressRepositoryTest` → Implement `AddressRepository`

### Phase 2: Service Layer (Mockito mocks for repos)
4. Write `JwtServiceTest` → Implement `JwtService`
5. Write `AuthServiceTest` → Implement `AuthService`
6. Write `UserServiceTest` → Implement `UserService`
7. Write `AddressServiceTest` → Implement `AddressService`

### Phase 3: Security (Integration tests)
8. Write security tests (unauthenticated access returns 401) → Implement `SecurityConfig`, `JwtAuthenticationFilter`, `JwtAuthenticationEntryPoint`

### Phase 4: Controller Layer (MockMvc integration tests)
9. Write `AuthControllerTest` → Implement `AuthController`
10. Write `UserControllerTest` → Implement `UserController`
11. Write `AddressControllerTest` → Implement `AddressController`

### Phase 5: Web UI + Manual Testing
12. Implement Thymeleaf templates and `app.js`
13. Manual browser testing of full flow

### Phase 6: End-to-End Integration Test
14. Write a full flow integration test:
    - Register user → Login → Create address → List addresses → Update address → Delete address → Delete user
    - Verify cascade delete of addresses when user is deleted

---

## 8. Data Seed / Bootstrap

Add a `CommandLineRunner` bean in the main application class to seed an admin user on startup:

```java
@Bean
CommandLineRunner seedData(UserRepository userRepository, PasswordEncoder encoder) {
    return args -> {
        if (userRepository.findByEmail("admin@example.com").isEmpty()) {
            Map<String, Object> admin = new LinkedHashMap<>();
            admin.put("name", "Admin");
            admin.put("email", "admin@example.com");
            admin.put("password", encoder.encode("admin123"));
            admin.put("role", "ADMIN");
            admin.put("createdAt", Instant.now().toString());
            userRepository.save(admin);
            System.out.println(">> Seeded admin user: admin@example.com / admin123");
        }
    };
}
```

---

## 9. Migration Path to Real Database

The `Map<String, Object>` approach makes migration straightforward:

| Target DB | Migration Strategy |
|---|---|
| **MongoDB** | Replace `InMemoryStore` with `MongoTemplate`. Each `Map<String, Object>` becomes a BSON document. Virtually zero refactoring needed. |
| **PostgreSQL/MySQL** | Replace `InMemoryStore` with `JdbcTemplate`. Map keys become column names. Write `INSERT INTO users (id, name, email, ...) VALUES (?, ?, ?, ...)` using map values. Add a schema.sql for table DDL. |
| **Redis** | Replace `InMemoryStore` with `RedisTemplate` using Hash operations. Each record maps to a Redis Hash. |

> The key insight: because the service layer only ever sees `Map<String, Object>` through the repository, swapping the repository implementation requires **zero changes** to services or controllers.

---

## 10. Build & Run

```bash
# Build
mvn clean package -DskipTests   # or with tests: mvn clean verify

# Run
mvn spring-boot:run

# Run tests
mvn test

# Access
# API:  http://localhost:8080/api/auth/login
# UI:   http://localhost:8080/login
```

---

## 11. Summary Checklist

- [x] Maven project with Spring Boot 3.3.x, Java 17
- [x] `InMemoryStore` with `ConcurrentHashMap<String, Map<String, Object>>`
- [x] `UserRepository` and `AddressRepository` wrapping `InMemoryStore`
- [x] DTOs as Java records with validation annotations
- [x] `JwtService` for token generation/validation (jjwt 0.12.x)
- [x] `AuthService` for register/login with BCrypt
- [x] `UserService` with CRUD + cascade delete
- [x] `AddressService` with CRUD + user-link validation
- [x] `JwtAuthenticationFilter` + `SecurityConfig`
- [x] REST controllers: Auth, User, Address
- [x] Thymeleaf dashboard UI: Login, Dashboard, Users, About
- [x] Frontend JS with `fetch()` + JWT from `localStorage`
- [x] Global exception handler with consistent `ApiResponse` format
- [x] Admin seed data on startup
- [x] Full test suite (30+ tests) written FIRST per TDD
- [x] All tests passing via `mvn test`, 9x% code coverage for all the code base (java, js, ts). frontend in ts.
