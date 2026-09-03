# React + MUI Frontend & Backend Alignment - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Thymeleaf frontend with a React + MUI SPA implementing full user & address management (1-to-many), split the user `name` field into `firstName`/`lastName`, and deliver a README + assessment PDF.

**Architecture:** Spring Boot becomes API-only (JWT, in-memory store). New `frontend/` Vite app (React 19, TS, MUI v7, react-router v7) talks to it via dev proxy. Old web layer deleted. TDD throughout.

**Tech Stack:** Java 17 target (JDK 26 installed), Spring Boot 3, JUnit 5 + MockMvc + JaCoCo; Vite, React 19, TypeScript, @mui/material v7, @mui/icons-material, react-router-dom v7, Vitest + @testing-library/react + jsdom.

**Spec:** `docs/superpowers/specs/2026-09-03-react-mui-frontend-design.md`

## Global Constraints

- All commands run from `/Users/mst/ZCodeProject/user-address-api` unless stated.
- `set -euo pipefail` in bash snippets. Never commit secrets.
- JaCoCo gates must stay met: LINE >= 0.95, BRANCH >= 0.90, METHOD >= 0.95, CLASS 1.00 (`mvn verify` enforces).
- Seed admin credentials unchanged: `admin@example.com` / `admin123` (ADMIN_PASSWORD env override).
- Authorization model stays admin-flat (documented, intentional).
- Frontend tests written BEFORE frontend implementation (TDD); each `npm test` run must be green before commit.
- No comments in code unless asked. No em dashes in prose/commits.
- Run lint/typecheck after each task: backend `mvn verify`; frontend `npm test` + `npx tsc --noEmit`.
- Commit after every task; Jira-style not applicable here (no ticket); use concise conventional messages.

---

### Task 1: Backend - split `name` into `firstName`/`lastName` (DTOs, services, seed)

**Files:**
- Modify: `src/main/java/com/example/useraddressapi/dto/UserDto.java`, `UserUpdateDto.java`, `RegisterRequest.java`, `AuthResponse.java`
- Modify: `src/main/java/com/example/useraddressapi/service/UserService.java`, `AuthService.java`, `src/main/java/com/example/useraddressapi/UserAddressApiApplication.java`
- Test: `src/test/java/com/example/useraddressapi/service/UserServiceTest.java`, `AuthServiceTest.java`, `EndToEndIntegrationTest.java`, `controller/UserControllerTest.java`, `controller/AuthControllerTest.java`, `db/UserRepositoryTest.java`

**Interfaces:**
- Consumes: existing repositories/store (unchanged).
- Produces: `UserDto(id, firstName, lastName, email, role, createdAt)`; `UserUpdateDto(firstName, lastName, email, role)`; `RegisterRequest(firstName, lastName, email, password)`; `AuthResponse(token, userId, email, firstName, lastName)`; JSON fields `firstName`/`lastName` everywhere.

- [ ] **Step 1: Update tests to expect the new contract (failing)**

In `UserServiceTest.java`: change every construction/assertion of `new UserDto(..., "Alice", ...)` to `firstName="Alice", lastName="Smith"` style; add a test `updateUser_changesFirstNameAndLastNameSeparately`:

```java
@Test
void updateUser_changesFirstNameAndLastNameSeparately() {
    Map<String, Object> existing = new LinkedHashMap<>();
    existing.put("id", "u1"); existing.put("firstName", "Alice");
    existing.put("lastName", "Smith"); existing.put("email", "a@x.com");
    existing.put("role", "USER"); existing.put("createdAt", "t");
    when(userRepository.findById("u1")).thenReturn(Optional.of(existing));
    when(userRepository.findByEmail("a@x.com")).thenReturn(Optional.empty());
    when(userRepository.update(eq("u1"), any())).thenAnswer(inv -> inv.getArgument(1));
    // service returns merged map; assert updates map contains firstName/lastName keys
}
```

Adapt the same in `AuthServiceTest` (register/login return first/last), `UserControllerTest` (JSON paths `$.data.firstName`, `$.data.lastName`), `AuthControllerTest` (`$.data.firstName`), `EndToEndIntegrationTest` (register body with firstName/lastName; assertions on both fields), `UserRepositoryTest` if it references `name`.

- [ ] **Step 2: Run to verify failure**

Run: `mvn -q test -Dtest='UserServiceTest,AuthServiceTest,UserControllerTest,AuthControllerTest,EndToEndIntegrationTest,UserRepositoryTest'`
Expected: compile failures on `name` accessor / JSON paths missing.

- [ ] **Step 3: Implement DTO changes**

`UserDto.java`:
```java
public record UserDto(
    String id,
    @NotBlank @Size(max = 50) String firstName,
    @NotBlank @Size(max = 50) String lastName,
    @NotBlank @Email String email,
    String role,
    String createdAt
) {}
```
`UserUpdateDto.java`:
```java
public record UserUpdateDto(
    @Size(max = 50) String firstName,
    @Size(max = 50) String lastName,
    @Email String email,
    String role
) {}
```
`RegisterRequest.java`:
```java
public record RegisterRequest(
    @NotBlank @Size(max = 50) String firstName,
    @NotBlank @Size(max = 50) String lastName,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 6) String password
) {}
```
`AuthResponse.java`:
```java
public record AuthResponse(String token, String userId, String email, String firstName, String lastName) {}
```

- [ ] **Step 4: Update services + seed**

`UserService.updateUser`: replace `if (dto.name() != null) updates.put("name", dto.name());` with:
```java
if (dto.firstName() != null) updates.put("firstName", dto.firstName());
if (dto.lastName() != null) updates.put("lastName", dto.lastName());
```
`toDto`: `(String) map.get("firstName"), (String) map.get("lastName")`.
`AuthService.register`: `user.put("firstName", request.firstName()); user.put("lastName", request.lastName());` and `new AuthResponse(token, id, email, request.firstName(), request.lastName())`.
`AuthService.login`: read both fields from stored map; fallback: if `firstName`/`lastName` null but `name` present (stale store impossible since in-memory, keep simple, no fallback).
`UserAddressApiApplication.seedData`: `admin.put("firstName", "Admin"); admin.put("lastName", "User");` (remove `name`).
Also check `db/AddressService/AddressRepository` for user "name" joins (none expected).

- [ ] **Step 5: Run full backend suite**

Run: `mvn verify`
Expected: BUILD SUCCESS, all tests green, JaCoCo met.

- [ ] **Step 6: Commit**

```bash
git add -A src/
git commit -m "Split user name into firstName/lastName across DTOs, services, and seed admin"
```

---

### Task 2: Backend - remove web layer, API-only security

**Files:**
- Delete: `src/main/java/com/example/useraddressapi/controller/web/` (DashboardController), `src/test/java/com/example/useraddressapi/controller/web/` (DashboardControllerTest), `src/test/java/com/example/useraddressapi/config/WebPageSecurityConfigTest.java`, `src/main/resources/templates/`, `src/main/resources/static/`
- Modify: `src/main/java/com/example/useraddressapi/config/SecurityConfig.java`
- Create: `src/test/java/com/example/useraddressapi/config/ApiSecurityConfigTest.java`
- Delete: root `package.json`, `package-lock.json`, `vitest.config.ts`, `src/test/frontend/`, `node_modules/` (from repo + disk)

**Interfaces:**
- Produces: API-only server. Security: `permitAll` = `/api/auth/login`, `/api/auth/register`; `/api/**` authenticated; `anyRequest().authenticated()`.

- [ ] **Step 1: Write failing API security test**

`src/test/java/com/example/useraddressapi/config/ApiSecurityConfigTest.java`:
```java
package com.example.useraddressapi.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiSecurityConfigTest {

    @Autowired private MockMvc mockMvc;

    @Test void loginEndpointReachableWithoutToken() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"email\":\"admin@example.com\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk());
    }
    @Test void registerEndpointReachableWithoutToken() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                .content("{\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"ab@x.com\",\"password\":\"secret1\"}"))
                .andExpect(status().isOk());
    }
    @Test void usersApiRequiresToken() throws Exception {
        mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
    }
    @Test void addressesApiRequiresToken() throws Exception {
        mockMvc.perform(get("/api/addresses/user/u1")).andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: Run, verify pass state vs expected**

Run: `mvn -q test -Dtest=ApiSecurityConfigTest`
Expected: login/register PASS already; users/addresses PASS (401 already). If any fail, capture why (they define the contract; the WebPageSecurityConfigTest currently asserts page access, which must be deleted with the web layer).

- [ ] **Step 3: Remove web layer + old frontend tooling**

```bash
rm -rf src/main/java/com/example/useraddressapi/controller/web \
       src/test/java/com/example/useraddressapi/controller/web \
       src/main/resources/templates src/main/resources/static \
       src/test/frontend vitest.config.ts package.json package-lock.json node_modules
rm src/test/java/com/example/useraddressapi/config/WebPageSecurityConfigTest.java
```
Update `SecurityConfig.java` authorizeHttpRequests to:
```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers("/api/**").authenticated()
    .anyRequest().authenticated()
)
```
Update `.gitignore`: remove `src/main/resources/static/js/app.js` and validation-png lines that referenced old app; keep `target/`, `node_modules/` etc.

- [ ] **Step 4: Full verify**

Run: `mvn verify`
Expected: BUILD SUCCESS; test count = previous 112 + 4 (ApiSecurityConfigTest) - 5 (DashboardControllerTest) - 6 (WebPageSecurityConfigTest) + prior adds; coverage gates met (web controller classes removed).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove Thymeleaf web layer and old TS tooling; API-only security contract test"
```

---

### Task 3: Frontend scaffold - Vite + React + MUI + router + test harness

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/vite-env.d.ts`
- Create: `frontend/src/test/setup.ts` (RTL cleanup + jest-dom matchers)
- Test: `frontend/src/App.test.tsx` (route smoke: renders login at `/login`)

**Interfaces:**
- Produces: runnable `npm run dev` (port 5173, proxy `/api` -> `http://localhost:8080`); `npm test` harness; MUI `ThemeProvider` with `createTheme` in `App.tsx`; routes defined below.

- [ ] **Step 1: Scaffold files with exact content**

`frontend/package.json`:
```json
{
  "name": "user-address-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src"
  },
  "dependencies": {
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.0",
    "@mui/icons-material": "^7.3.0",
    "@mui/material": "^7.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.5.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.8.0",
    "vite": "^6.3.0",
    "vitest": "^3.2.0"
  }
}
```
`frontend/vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8080' } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true }
});
```
`frontend/tsconfig.json` (standard Vite React-TS; moduleResolution bundler, jsx react-jsx, strict) and `frontend/tsconfig.node.json` per Vite template. `frontend/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(() => cleanup());
```
`frontend/src/App.tsx` (initial minimal, will grow in Task 6):
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const theme = createTheme({ palette: { mode: 'dark' } });

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```
`frontend/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('redirects root to login', async () => {
  render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
});
```
(The login heading arrives with Task 4; if run before Task 4 this fails - acceptable only as scaffold smoke. Prefer executing tasks in order.)

- [ ] **Step 2: Install and run smoke test**

Run: `cd frontend && npm install && npm test`
Expected: App.test may fail (login page not built yet). If so, defer passing to Task 4; harness must run without config errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/ .gitignore
git commit -m "Scaffold Vite React+MUI frontend with test harness"
```

---

### Task 4: Frontend - API client, auth context, Login page

**Files:**
- Create: `frontend/src/api/types.ts`, `frontend/src/api/client.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/pages/LoginPage.tsx`
- Test: `frontend/src/api/client.test.ts`, `frontend/src/pages/LoginPage.test.tsx`

**Interfaces:**
- Produces: `apiCall<T>(method, url, body?) => Promise<ApiResponse<T>>`; `ApiResponse<T> = { success: boolean; message: string; data: T }`; `User = { id, firstName, lastName, email, role, createdAt? }`; `Address = { id?, userId, street, city, state?, zipCode, country, type? }`; `AuthResponse = { token, userId, email, firstName, lastName }`; `AuthProvider` with `login(email, password)`, `logout()`, `user`, `isAuthenticated`; localStorage keys `token`, `authUser` (JSON).

- [ ] **Step 1: Write failing tests**

`frontend/src/api/client.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiCall } from './client';

describe('apiCall', () => {
  beforeEach(() => localStorage.setItem('token', 'tok'));
  afterEach(() => localStorage.clear());

  it('attaches bearer token and parses json', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, message: 'ok', data: [1, 2] })
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = await apiCall<number[]>('GET', '/users');
    expect(res.data).toEqual([1, 2]);
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('throws backend message on error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 400,
      json: () => Promise.resolve({ success: false, message: 'Email already in use', data: null })
    }));
    await expect(apiCall('POST', '/auth/register', {})).rejects.toThrow('Email already in use');
  });

  it('handles 204 no-content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));
    const res = await apiCall('DELETE', '/users/u1');
    expect(res.success).toBe(true);
  });
});
```
`frontend/src/pages/LoginPage.test.tsx`: render LoginPage wrapped in `MemoryRouter` + `AuthProvider`; type `admin@example.com` / `admin123` with mocked fetch returning token; assert navigation to `/users` happened (spy on `useNavigate` via router state or assert `login` called and token stored); failure path shows Alert with message.

- [ ] **Step 2: Run, verify red**

Run: `cd frontend && npm test`
Expected: failures - modules not found.

- [ ] **Step 3: Implement**

`frontend/src/api/types.ts`:
```ts
export interface ApiResponse<T> { success: boolean; message: string; data: T }
export interface User { id: string; firstName: string; lastName: string; email: string; role: string; createdAt?: string }
export interface Address { id?: string; userId: string; street: string; city: string; state?: string; zipCode: string; country: string; type?: string }
export interface AuthData { token: string; userId: string; email: string; firstName: string; lastName: string }
```
`frontend/src/api/client.ts`:
```ts
import type { ApiResponse } from './types';
export const TOKEN_KEY = 'token';
export async function apiCall<T>(method: string, url: string, body?: unknown): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetch('/api' + url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (response.status === 204) return { success: true, message: 'No content', data: undefined as T };
  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok) throw new Error(data?.message || 'Request failed: ' + response.status);
  return data;
}
```
`frontend/src/context/AuthContext.tsx`: Context with `{ user: AuthData | null, login: (email, password) => Promise<void>, logout: () => void }`; `login` calls `apiCall<AuthData>('POST', '/auth/login', { email, password })`, stores `token` + `authUser` JSON in localStorage; `logout` removes both; exposes `user` initialized from localStorage.
`frontend/src/pages/LoginPage.tsx`: MUI Card centered, TextField email + TextField password (type=password), Button "Sign in", `Alert` on error, submit calls `login` then `navigate('/users')`. Register form NOT here (Add User is admin action on list page).

- [ ] **Step 4: Run, verify green**

Run: `cd frontend && npm test`
Expected: all green (including Task 3 App.test now that login exists - wire `/login` route in App.tsx now: `<Route path="/login" element={<LoginPage />} />`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "Add API client, auth context, and MUI login page with tests"
```

---

### Task 5: Frontend - UserList page with Add User + Delete

**Files:**
- Create: `frontend/src/pages/UserListPage.tsx`, `frontend/src/components/UserFormDialog.tsx`, `frontend/src/components/ConfirmDialog.tsx`
- Test: `frontend/src/pages/UserListPage.test.tsx`, `frontend/src/components/ConfirmDialog.test.tsx`

**Interfaces:**
- Consumes: `apiCall`, `User`, `AuthContext`.
- Produces: `UserFormDialog` props: `{ open: boolean, onClose: () => void, onSaved: () => void }` (create mode only); `ConfirmDialog` props: `{ open: boolean, title: string, message: string, onConfirm: () => void, onClose: () => void }`.

- [ ] **Step 1: Write failing tests**

`UserListPage.test.tsx` (mock `apiCall` via `vi.mock('./api/client')` or fetch stub):
- renders header row Email/First/Last/Role and one user row (Alice Smith) from mocked GET `/users`
- "Add User" button opens dialog; fill firstName/lastName/email/password; submit calls POST `/auth/register`; list refetches
- clicking "Delete" on a row opens ConfirmDialog; confirm calls DELETE `/users/:id`; row disappears
`ConfirmDialog.test.tsx`: renders title/message; Confirm button invokes `onConfirm` and closes.

- [ ] **Step 2: Run red. Step 3: Implement**

`UserListPage.tsx`: `useEffect` loads users via `apiCall<User[]>('GET', '/users')`; MUI `Table` in `Paper` with `TableHead` (Email, First Name, Last Name, Role, Actions), `TableBody` rows; row actions: `Button`/`IconButton` "Manage" (`<Link to={/users/${id}}>` styled) and "Delete" (opens ConfirmDialog; on confirm `apiCall('DELETE', '/users/' + id)` then reload; error -> Snackbar). App bar top with title, user name, Sign out button (`logout()` from context, navigate `/login`). "Add User" `Button variant="contained"` opens `UserFormDialog`.
`UserFormDialog.tsx`: `Dialog` with `TextField`s First Name, Last Name, Email, Password (`type="password"`), Role `Select` (USER/ADMIN, default USER); submit: `apiCall('POST', '/auth/register', {...})`; success -> `onSaved()` + close; error -> inline `Alert` in dialog.
`ConfirmDialog.tsx`: `Dialog` title + message + Cancel/Confirm `Button`s; confirm color `error`.
App.tsx: add routes `<Route path="/users" element={<RequireAuth><UserListPage /></RequireAuth>} />` (RequireAuth built here or Task 4 - build in this task as part of App wiring: `const isAuthenticated` from context; if no token `Navigate to /login`).

- [ ] **Step 4: Run green. Step 5: Commit**

```bash
git add frontend/src
git commit -m "Add user list page with add/delete flows and dialogs"
```

---

### Task 6: Frontend - UserDetail page: profile edit + address CRUD (the 1-to-many core)

**Files:**
- Create: `frontend/src/pages/UserDetailPage.tsx`, `frontend/src/components/AddressCard.tsx`, `frontend/src/components/AddressFormDialog.tsx`, `frontend/src/components/ProfileFormDialog.tsx`
- Test: `frontend/src/pages/UserDetailPage.test.tsx`

**Interfaces:**
- Consumes: `apiCall`, `User`, `Address`, dialogs.
- Produces: `AddressFormDialog` props: `{ open, address: Address | null, userId: string, onClose, onSaved }` (null address = create); `ProfileFormDialog` props: `{ open, user: User, onClose, onSaved }`.

- [ ] **Step 1: Write failing tests**

`UserDetailPage.test.tsx` (fetch mocks for `GET /users/u1`, `GET /addresses/user/u1`, PUT/POST/DELETE):
- shows profile card with email/firstName/lastName/role and "Edit Profile" button
- "Edit Profile" opens dialog; change last name; save calls `PUT /users/u1` with `{ lastName: 'NewName' }` (partial update); card re-renders
- renders address Cards for each address (street/city visible)
- "Add Address" opens dialog; fill street/city/zip/country; save calls `POST /addresses` with `{ userId: 'u1', street, city, zipCode, country }`; new card appears
- address "Edit" opens dialog pre-filled; save calls `PUT /addresses/:id`; "Delete" -> ConfirmDialog -> `DELETE /addresses/:id`; card disappears
- "Back to users" link navigates to `/users`

- [ ] **Step 2: Run red. Step 3: Implement**

`UserDetailPage.tsx`: loads user (`GET /users/:id`) and addresses (`GET /addresses/user/:id`) in `useEffect` (Promise.all); layout: Breadcrumbs/back `Button` ("All users"), profile `Card` (Avatar with initials, name typography, email/role Chip, "Edit Profile" `Button` -> `ProfileFormDialog`), addresses `Typography` header + "Add Address" button -> `AddressFormDialog` (address=null), grid of `AddressCard`s.
`ProfileFormDialog.tsx`: fields First/Last/Email (Role select admin only? keep Role select same as UserFormDialog); submit `PUT /users/:id` with changed fields only; on success `onSaved()`.
`AddressCard.tsx`: `Card` with address line1 (street), city/state/zip, country + type `Chip`; CardActions: Edit (`IconButton` EditIcon -> `AddressFormDialog` with address), Delete -> ConfirmDialog -> `DELETE /addresses/:id`.
`AddressFormDialog.tsx`: fields Street, City, State (optional), Zip, Country, Type `Select` (HOME/WORK/BILLING/SHIPPING default HOME); create: POST `/addresses` `{ userId, ... }`; edit: PUT `/addresses/:id` (no userId change).
Refetch both profile and addresses after each mutation.

- [ ] **Step 4: Run green. Step 5: Commit**

```bash
git add frontend/src
git commit -m "Add user detail page with profile edit and address CRUD (1-to-many)"
```

---

### Task 7: Frontend - About page + final route/layout polish

**Files:**
- Create: `frontend/src/pages/AboutPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/pages/AboutPage.test.tsx`

- [ ] **Step 1: Failing test**: AboutPage renders headings "About", "Design Choices", bullet points mentioning React + MUI, Spring Boot, 1-to-many. Route `/about` accessible without auth? Keep public like login (it is documentation). Test: navigate `/about` renders content.
- [ ] **Step 2: Implement**: `AboutPage.tsx` with MUI `Container`, `Typography`, `List` describing the app, stack, and design choices (React+MUI SPA, separate frontend, admin-flat authorization, hooks-only state, refetch-after-mutation). App.tsx final routes: `/login`, `/about` public; `/users`, `/users/:id` behind `RequireAuth`; catch-all -> Navigate `/login`.
- [ ] **Step 3: Green + tsc + build check**: `npm test && npx tsc --noEmit && npm run build`.
- [ ] **Step 4: Commit**: `git commit -m "Add about page with design notes; finalize routes"`

---

### Task 8: README rewrite + PDF generation

**Files:**
- Modify: `README.md`
- Create: `Staszewski_Michael_AssessmentForFullStackDeveloper_2026-09-03.pdf` (generated)

- [ ] **Step 1: Rewrite README**: overview; prerequisites (JDK 17+, tested on 26; Node 20+); backend run (`mvn spring-boot:run`, or `mvn package` + `java -jar target/user-address-api-1.0.0.jar`); frontend run (`cd frontend && npm install && npm run dev` at http://localhost:5173); default admin creds; API endpoint table; test commands both sides; design choices section (User -> Address flow: list -> Manage -> detail with profile + address cards; why dialogs + refetch; React+MUI rationale; admin-flat authorization note); assessment coverage mapping.
- [ ] **Step 2: Generate PDF**: convert README.md to PDF named `Staszewski_Michael_AssessmentForFullStackDeveloper_2026-09-03.pdf`. Preferred: `pandoc README.md -o Staszewski_Michael_AssessmentForFullStackDeveloper_2026-09-03.pdf` (check `which pandoc`; if missing, use macOS `textutil` + Pages/Chrome headless print fallback; the pdf-build skill in `links/shared-skills/pdf-build` handles LaTeX but README.md is markdown - pandoc route first).
- [ ] **Step 3: Commit**: `git add README.md *.pdf && git commit -m "Rewrite README for React+MUI app and generate assessment PDF"`

---

### Task 9: Full verification (both sides) + Playwright E2E

- [ ] **Step 1: Backend**: `mvn verify` green, coverage gates met.
- [ ] **Step 2: Frontend**: `cd frontend && npm test && npx tsc --noEmit && npm run build` green.
- [ ] **Step 3: Live run**: start backend (`java -jar target/user-address-api-1.0.0.jar` after package) + frontend dev (`cd frontend && npm run dev`).
- [ ] **Step 4: Playwright E2E via CDP** (Chrome on 9222, pattern proven earlier): navigate `http://localhost:5173/login`; login admin; assert `/users` list renders admin row; Add User (Test/Person/test@x.com); Manage -> detail; Edit Profile (change last name); Add Address (street/city/zip/country); Edit Address; Delete Address; back to list; delete test user; Sign out. Screenshots as evidence. All checks PASS required.
- [ ] **Step 5: Commit any fixes; final commit** `git commit -m "E2E verified"` (if no changes, skip).

---

### Task 10: Fresh-context code review subagent + fixes

- [ ] **Step 1**: Dispatch review subagent (rule 60) with full diff `c85f926..HEAD` plus `~/ZCodeProject/JAVA_CODE_REVIEW.md` and `~/ZCodeProject/NODEJS_CODE_REVIEW.md` context; instruct: BLOCKER findings must cite file:line; frontend and backend both.
- [ ] **Step 2**: Fix all BLOCKERs; SHOULD items per user's standing policy (low-risk hardening yes, big refactors no).
- [ ] **Step 3**: Re-run `mvn verify` + `npm test`; commit fixes; push `origin main`.

---

## Self-Review Notes

- Spec coverage: user model split (Task 1), web layer removal + API security (Task 2), React+MUI app with all four pages (Tasks 3-7), tests-first each (TDD), README+PDF (Task 8), E2E + review (Tasks 9-10). Coverage complete.
- Type consistency: `ApiResponse<T>`, `User`, `Address`, `AuthData` defined once in Task 4 interfaces and reused in Tasks 5-7. Backend JSON field names match TS interfaces (`firstName`, `lastName`).
- No placeholders: every task includes concrete code or exact file operations.
