# User & Address Management API

A Spring Boot 3.x REST API for managing users and their addresses, with JWT authentication, an
in-memory `ConcurrentHashMap` persistence layer, a Thymeleaf web dashboard, and full TDD test
coverage across the Java backend and TypeScript frontend.

## Tech stack

- **Backend:** Java 17, Spring Boot 3.3.4, Spring Security, Spring Web, Thymeleaf
- **Auth:** JWT (jjwt 0.12.6), BCrypt password hashing
- **Persistence:** in-memory `ConcurrentHashMap` repository layer
- **Frontend:** TypeScript (compiled to a minified bundle via esbuild), Tailwind CSS (CDN)
- **Tests:** JUnit 5, Mockito, MockMvc (backend); Vitest + jsdom (frontend)
- **Quality:** JaCoCo (backend), Vitest coverage (frontend), ESLint, Prettier

## Features

- JWT sign-up / login with two roles (ADMIN, USER)
- CRUD for users and their addresses (cascade deletion)
- Centralized exception handling and DTO validation
- Web dashboard: login, user management, and stats pages
- Seed admin account created on startup

## Requirements

- JDK 17+ (project targets Java 17)
- Maven 3.9+
- Node.js 18+ and npm (for the frontend build and tests)

## Getting started

### Backend

```bash
mvn spring-boot:run
```

The app starts on `http://localhost:8080`. A seed admin is created on startup:

- Email: `admin@example.com`
- Password: `admin123`

Use the web UI at `http://localhost:8080/login`, or call the REST API directly.

### Frontend (rebuild the TS bundle)

```bash
npm install
npm run build     # compiles ts/app.ts -> static/js/app.js
```

## API

All endpoints return JSON wrapped in an `ApiResponse`.

| Method | Path                        | Auth   | Description                     |
|--------|-----------------------------|--------|---------------------------------|
| POST   | `/api/auth/register`        | Public | Register a user                 |
| POST   | `/api/auth/login`           | Public | Login, returns a JWT            |
| GET    | `/api/users`                | Bearer | List users                      |
| GET    | `/api/users/{id}`           | Bearer | Get a user                      |
| PUT    | `/api/users/{id}`           | Bearer | Update a user (partial)         |
| DELETE | `/api/users/{id}`           | Bearer | Delete a user (cascades addrs)  |
| GET    | `/api/addresses/user/{id}`  | Bearer | List a user's addresses         |
| POST   | `/api/addresses`            | Bearer | Create an address for a user    |
| PUT    | `/api/addresses/{id}`       | Bearer | Update an address (partial)     |
| DELETE | `/api/addresses/{id}`       | Bearer | Delete an address               |

Authenticate by sending `Authorization: Bearer <token>`.

### Authorization model (intentional design)

This sample is built as a **single-dashboard admin tool**: the routes require a valid JWT, but every
authenticated user is treated as an administrator who can manage all users and all addresses
(`PUT`/`DELETE` on any user or address, and address creation against any `userId`). There is no
per-user ownership isolation (no tenant/IDOR guard) by design, to keep the demo simple. If this were
a multi-tenant product you would derive the acting user's id from the JWT and enforce
ownership/role checks in the service layer.

## Configuration

Environment variables (optional, dev defaults provided):

| Variable         | Default | Description                                  |
|------------------|---------|----------------------------------------------|
| `APP_JWT_SECRET` | (placeholder HS256 key) | JWT signing secret; **must** be overridden with a strong random value in any real deployment. |
| `ADMIN_PASSWORD` | `admin123` | Password for the seeded `admin@example.com` account. |

Example:

```bash
APP_JWT_SECRET="$(openssl rand -base64 48)" ADMIN_PASSWORD="<strong-password>" mvn spring-boot:run
```

## Tests

### Backend (JUnit + MockMvc)

```bash
mvn test                        # runs the suite
mvn verify                      # runs the suite + JaCoCo coverage report
```

Coverage report: `target/site/jacoco/index.html`.

### Frontend (Vitest)

```bash
npm run build        # compile the bundle
npm test             # unit tests
npm run test:coverage# unit tests + coverage report
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking
npm run format:check # Prettier
```

Coverage report: `coverage/`.

## Project structure

```
src/main/java/com/example/useraddressapi/
  config/       Spring Security configuration
  controller/   API controllers + web (Thymeleaf) controllers
  db/           In-memory ConcurrentHashMap repositories
  dto/          Request/response records and DTOs
  exception/    Domain exceptions + global handler
  security/     JWT filter and entry point
  service/      Business logic (auth, user, address, jwt)

src/main/resources/
  static/ts/    TypeScript frontend source (compiled to static/js/app.js)
  templates/    Thymeleaf templates (login, dashboard, users, about)

src/test/
  java/         Backend tests (unit + integration + E2E)
  frontend/     Frontend tests (Vitest + jsdom)
```
