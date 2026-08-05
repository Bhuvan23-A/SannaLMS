# RBAC — Admin Dashboard Access Plan (Super Admin vs College Admin)

**Status:** In progress — partially implemented on `develop`
**Owner:** Platform Team
**Last updated:** 2026-08-05

## 1. Goal

Differentiate access levels between **Super Admin** and **College Admin** (plus
Trainer / Teaching Assistant / Student) across the admin dashboard (`admin-ui`),
the backend microservices, and the post-login redirect flow — so each role lands
directly in the dashboard scoped to exactly what that role may see and do.

## 2. Role Model (Keycloak → LMS)

| Keycloak realm role | LMS role (UI constant) | Access level |
| --- | --- | --- |
| `superadmin` | `SUPER_ADMIN` | Global / cross-tenant |
| `tenantadmin` | `COLLEGE_ADMIN` | Single tenant (their college) |
| `instructor` | `PRIMARY_TRAINER` | Teaching content for their courses |
| `TEACHING_ASSISTANT` | `TEACHING_ASSISTANT` | Limited course support |
| `student` | `STUDENT` | Learn + submit only |

Mapping is centralized in:

- `frontend/admin-ui/src/hooks/useRole.ts` (UI)
- `frontend/admin-ui/src/components/Topbar.tsx` (token → `mockRole`, profile)
- Every service's `src/roles.guard.ts` (backend `RolesGuard` — unified role alias
  mapping: `superadmin`/`tenantadmin`/`instructor`/`student` → canonical constants)

## 3. Access Matrix — Admin UI Modules

| Module (route) | Super Admin | College Admin | Trainer | TA | Student |
| --- | --- | --- | --- | --- | --- |
| Dashboard `/` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendar `/calendar` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications `/notifications` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search `/search` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Forums `/forums` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chat `/chat` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Colleges** `/colleges` (create/list) | ✅ | ❌ *(route-guarded)* | ❌ | ❌ | ❌ |
| Departments `/departments` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Branches `/branches` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Semesters `/semesters` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Courses `/courses` | ✅ | ✅ (their tenant) | ✅ (their courses) | ❌ | ✅ (view) |
| Assessments `/assessments` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Question Bank `/assessments/questions` | ✅ | ✅ | ✅ | ❌ | ❌ |
| Quizzes `/assessments/quizzes` | ✅ | ✅ | ✅ | ❌ | ✅ (attempt) |
| Assignments `/assessments/assignments` | ✅ | ✅ | ✅ | ✅ | ✅ (submit) |
| Gradebook `/assessments/gradebook` | ✅ | ✅ | ✅ | ✅ | ✅ (own grades) |
| Attendance `/attendance` | ✅ | ✅ | ✅ | ✅ | ✅ (check-in) |
| Live Classes `/liveclasses` | ✅ | ✅ | ✅ | ❌ | ✅ (join) |
| Certificates `/certificates` | ✅ | ✅ | ✅ | ❌ | ✅ (own) |
| Analytics `/analytics` | ✅ | ✅ | ✅ | ❌ | ❌ |

**Key differentiator:** `Colleges` (tenant provisioning) is **Super Admin only** —
removed from the College Admin sidebar and now also blocked by the client-side
`RoleGuard` on `/colleges`.

## 4. Current Implementation Status

### Done

- [x] **Sidebar menus per role** — `Sidebar.tsx` renders `superAdminLinks`,
      `collegeAdminLinks`, `trainerLinks`, `studentLinks` based on resolved role.
- [x] **Backend enforcement** — unified `RolesGuard` in all services maps Keycloak
      roles to canonical constants; e.g. `college.controller.ts` requires
      `SUPER_ADMIN` for create, departments/branches/semesters require
      `SUPER_ADMIN | COLLEGE_ADMIN` for writes.
- [x] **Topbar profile + Logout** — avatar dropdown with name/email/role and a
      Keycloak logout redirect.
- [x] **Sidebar profile card** — avatar initials, name, email, role badge, logout
      pinned at the bottom of the left sidebar.
- [x] **Post-login direct routing** — Super/College Admins landing on the SannaLMS
      portal are auto-redirected (`window.location.replace`) to
      `admin.sannalms.sannainnovations.com/?token=…`; the admin UI resolves the same
      JWT and renders the role-scoped dashboard.
- [x] **Route guard (client)** — `components/RoleGuard.tsx` blocks `/colleges` for
      non-Super Admins with an access-denied panel.

### Pending / Next

- [ ] Apply `RoleGuard` to the remaining **Admin/Staff-only** routes
      (`/analytics`, question bank, attendance management views) as those pages
      implement management UI.
- [ ] **Tenant scoping (critical)** — College Admin must only see **their** tenant's
      data. Backend endpoints must inject `request.user.tenantId` into every
      `where` clause (assignment/questions services already accept optional
      `courseId`; audit the rest). UI must show tenant badge in the Topbar.
- [ ] **Fix first-paint role flash** — `useRole`/`Topbar` default to `SUPER_ADMIN`
      before the JWT is decoded; a College Admin can briefly see the Super Admin
      menu (the Sidebar profile-card badge inherits the same bug). Resolve by
      blocking render until the token is decoded (loading state) — one fix covers
      both hook consumers.
- [ ] **Token-in-URL mitigation** — the portal→admin redirect passes the JWT via
      `?token=`. `window.location.replace` + the Topbar `history.replaceState`
      cleanup already reduce exposure, but consider a short-lived one-time token
      exchange endpoint or `postMessage` handshake so the JWT never lands in
      server access logs / the `Referer` header.
- [ ] **Admin URL configuration** — the redirect base URL defaults to
      `https://admin.sannalms.sannainnovations.com`; local dev must set
      `VITE_ADMIN_URL` (e.g. `http://localhost:3000`) to avoid bouncing admin test
      users to production.
- [ ] **Trainer-only sections** — restrict `Course Builder`-style management actions
      to `PRIMARY_TRAINER`; block `TEACHING_ASSISTANT` from destructive actions.
- [ ] **Per-feature gating** — hide/disable buttons (e.g. “Add College”) on shared
      pages per role, not just routes.
- [ ] **E2E tests** — login as each Keycloak test user and assert sidebar links,
      denied pages, and API 403s.

## 5. Backend Enforcement Notes

- `RolesGuard` is the enforcement point; `@Roles('SUPER_ADMIN')` etc. are declared
  on controllers. UI gating is UX only.
- Services verified: college, department, branch, semester (create = admins only;
  read = admins + student).
- **Deliberate mismatch:** the client `RoleGuard` blocks the whole `/colleges` page
  for non-Super Admins, while the backend GET `/colleges` still allows
  `COLLEGE_ADMIN`/`STUDENT` reads (only create is `SUPER_ADMIN`-only). This is
  intentional UX (hide the module entirely); the backend remains the source of
  truth for enforcement. Do not "align" the client guard down to match the API.
- To-do: audit all remaining controllers and add `@Roles` where missing.

## 6. Redirect Flow (final design)

```
Keycloak login
   │
   ▼
SannaLMS portal (saas-web-app) — check-sso
   │
   ├─ superadmin / tenantadmin  → admin.sannalms…/?token=<jwt>   (direct, role-scoped)
   ├─ instructor                → portal (Trainer view) or /courses?token=…
   └─ student                   → portal (Student view)
```

## 7. Definition of Done

1. Each role sees only its own sidebar + pages; URL access to forbidden pages shows
   the denied panel and the backend returns 403.
2. College Admin queries are scoped to `tenant_id` from the JWT attribute.
3. Super Admin sees all colleges; College Admin never sees the Colleges module.
4. Login lands admins on the admin dashboard — no manual click-through.
