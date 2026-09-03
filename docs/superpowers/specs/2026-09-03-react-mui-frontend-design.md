# User & Address Management - React + MUI Frontend and Backend Alignment

Date: 2026-09-03
Status: Approved design (pending implementation)
Scope: Replaces the Thymeleaf/TS frontend with a React + Material UI SPA; splits the user `name` field into `firstName`/`lastName`; README rewrite plus PDF deliverable.

## Goal

Fulfill the full-stack assessment spec: a web application where administrators view and modify user profiles and their associated addresses (one user to many addresses), with a Java 17+/Spring Boot backend and a React + MUI frontend, clear navigation between list and detail views, and clean state management.

## Current State

- Backend (Spring Boot 3, Java 17 target): complete REST API with JWT auth - register/login, full user CRUD, full address CRUD (1-to-many via `/api/addresses/user/{userId}`).
- User model has a single `name` field; spec requires Email, First Name, Last Name.
- Frontend is Thymeleaf + vanilla TypeScript (login/dashboard/users/about pages) - not React, no address management UI.
- 112 backend tests green with JaCoCo gates (LINE >= 0.95, BRANCH >= 0.90, METHOD >= 0.95, CLASS 1.00). Frontend had Vitest tests (to be superseded).

## Decisions (user-approved)

1. Frontend is a separate Vite app (`frontend/`), React 19 + TypeScript, MUI v7 components, `react-router-dom` v7.
2. The old Thymeleaf/TS frontend is removed from the repo (used as inspiration only).
3. About page lives in the React app.
4. Keep the JWT login flow (login page in React, guarded routes).
5. User List uses the standard MUI Table (no DataGrid dependency).
6. Frontend tests: Vitest + React Testing Library, written first (TDD).
7. README rewritten for FE+BE setup and design choices; a PDF version generated with the assessment's file naming (`Staszewski_Michael_AssessmentForFullStackDeveloper_2026-09-03.pdf`).
8. No CORS config: Vite dev proxy forwards `/api` to `localhost:8080`, so dev calls are same-origin.

## Backend Changes

### User model split: `name` -> `firstName` + `lastName`

- `UserDto`: `id, firstName, lastName, email, role, createdAt` (both names `@NotBlank`, max 50 chars on write DTOs).
- `UserUpdateDto`: `firstName, lastName, email, role` (all optional as before, validation preserved).
- `RegisterRequest`: `firstName, lastName, email, password`.
- `AuthResponse`: `token, userId, email, firstName, lastName`.
- `InMemoryUser` entity + `UserRepository`/`UserService`/`AuthService` updated accordingly.
- Seed admin: `firstName="Admin"`, `lastName="User"`, `admin@example.com` / `admin123` (unchanged credentials).
- Display-name logic (where a single string is needed, e.g. welcome text): `firstName + " " + lastName`.

### Endpoints

No new endpoints. Existing contracts already cover the flow:

- `POST /api/auth/register` - create user (used by "Add User" in UI)
- `POST /api/auth/login` - obtain JWT
- `GET /api/users`, `GET /api/users/{id}`, `PUT /api/users/{id}`, `DELETE /api/users/{id}`
- `POST /api/addresses`, `GET /api/addresses/user/{userId}`, `GET /api/addresses/{id}`, `PUT /api/addresses/{id}`, `DELETE /api/addresses/{id}`

Authorization model stays admin-flat (documented in README): any authenticated user may manage any user's data. IDOR-style isolation was a prior review finding, accepted as intentional design.

### Web layer removal

- Delete `src/main/resources/templates/`, `src/main/resources/static/` (ts/js/css), `DashboardController` + `DashboardControllerTest`.
- `WebPageSecurityConfigTest` is replaced by an API-surface security test: `/api/auth/login` and `/api/auth/register` reachable without a token, `/api/users` and `/api/addresses/**` return 401 without one.
- `SecurityConfig`: drop page/static matchers; keep `permitAll` on `/api/auth/login` + `/api/auth/register` only, `authenticated()` on `/api/**`, `anyRequest().authenticated()`.
- Delete root `package.json`, `package-lock.json`, `node_modules`, `vitest.config.ts`, `src/test/frontend/` (superseded by `frontend/` app tests).
- JaCoCo gates unchanged.

## Frontend (`frontend/` Vite app)

### Stack

- Vite + React 19 + TypeScript
- MUI v7 (`@mui/material`, `@emotion/react`, `@emotion/styled`), `@mui/icons-material`
- `react-router-dom` v7
- Vitest + @testing-library/react + jsdom

### Structure

```
frontend/
  src/
    api/            # typed API client, auth token storage
    context/        # AuthContext (token + user info, login/logout)
    pages/          # LoginPage, UserListPage, UserDetailPage, AboutPage
    components/     # RequireAuth, UserFormDialog, AddressCard, AddressFormDialog, ConfirmDialog
    App.tsx         # routes + layout
    main.tsx
  index.html
  package.json
  vite.config.ts    # dev proxy: '/api' -> http://localhost:8080
```

### Pages and flows

- **Login (`/login`)**: MUI Card, email/password TextFields, error Alert on failure. On success: store token (localStorage) + user info, navigate to `/users`.
- **User List (`/users`)**: MUI Table with columns Email, First Name, Last Name, Role, Actions. "Add User" button opens `UserFormDialog` (first name, last name, email, password, role). Row actions: "Manage" (navigate `/users/:id`), "Delete" (ConfirmDialog).
- **User Detail (`/users/:id`)**: profile Card (email, names, role) with "Edit Profile" dialog; addresses section lists `AddressCard`s (street, city, state, zip, country, type) each with Edit and Delete actions; "Add Address" opens `AddressFormDialog`. All mutations refetch the user's data.
- **About (`/about`)**: static content describing the app and design choices.
- **`RequireAuth`**: wraps protected routes; no token -> redirect `/login`.

### State management

Hooks only: `useState`/`useEffect` for data fetching, `AuthContext` for the session. No Redux/Zustand - assessment criterion is "Cleanness & Lightness". Refetch after mutation (no optimistic updates) keeps state simple and correct.

### API client

- Single `apiClient.ts` with typed responses mirroring backend `ApiResponse<T>`; attaches `Authorization: Bearer <token>`; throws `Error(message)` on non-OK.
- Base URL `/api` (same origin via dev proxy; in prod build, same host or configurable `VITE_API_BASE`).

### Error handling

- API errors surface as MUI Snackbars (list page) or inline Alerts (dialogs/forms).
- 401 on any call -> clear token, redirect to login (session expiry).

### Testing (TDD)

- `apiClient.test.ts`: header attachment, error propagation, 204 handling (delete).
- `UserListPage.test.tsx`: renders rows from mocked fetch, "Manage" navigation, delete flow with confirm.
- `UserDetailPage.test.tsx`: profile render, address list render, add/edit/delete address via dialogs (mocked fetch).
- `LoginPage.test.tsx`: validation, successful login stores token, failure shows error.
- Run: `npm test` (Vitest, jsdom).

## README + PDF

- README rewritten: overview, prerequisites (JDK 17+ - note tested on 26, Node 20+), backend run (`mvn spring-boot:run` or package), frontend run (`npm install`, `npm run dev`), default admin credentials, API table, design choices (React+MUI SPA over Thymeleaf; separate apps; admin-flat authorization; hooks-only state; refetch-after-mutation), assessment coverage mapping.
- PDF: generate from README content via pandoc (or Chrome print as fallback), named `Staszewski_Michael_AssessmentForFullStackDeveloper_2026-09-03.pdf` at repo root (gitignored? No - include in repo as the submission artifact).

## Verification

1. `mvn verify` - all backend tests green, JaCoCo gates met.
2. `cd frontend && npm test` - all frontend tests green.
3. Playwright E2E against running stack (Vite dev server on :5173, Spring on :8080): login -> add user -> edit profile -> add address -> edit address -> delete address -> delete user -> logout.
4. Fresh-context code review subagent (per rule 60-code-review-subagent) over the full diff; BLOCKERs fixed before commit.

## Out of Scope

- Pagination, sorting, filtering on the user list (small in-memory dataset).
- Per-user ownership/IDOR isolation (accepted design).
- CSRF (stateless JWT API, no cookies).
- Production deployment config (single `vite build` output documented; no Docker).
