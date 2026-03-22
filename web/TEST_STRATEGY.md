# Nord Review - Test Strategy & CI Plan

## Application Overview

Nord Review is a Nuxt 4 full-stack app for managing code review rotation across teams. It handles user authentication (registration with domain restriction, email confirmation, password reset), team/developer/squad management, and an algorithmic rotation system that assigns reviewers with load balancing, experience-level constraints, and repeat prevention.

**Tech stack:** Nuxt 4, Vue 3, Drizzle ORM, SQLite (NuxtHub), Shadcn-Vue, Vitest, nuxt-auth-utils.

---

## Current Test Coverage

| Area             | File                                  | What's tested                                                                                                                                                              |
| ---------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth utils       | `tests/auth/auth-constants.test.ts`   | `isAllowedEmail`, `generateToken`, `tokenExpiresAt`, `ALLOWED_DOMAINS`                                                                                                     |
| Auth utils       | `tests/auth/email-validation.test.ts` | Email domain validation edge cases                                                                                                                                         |
| Rotation (devs)  | `tests/rotation/developers.test.ts`   | `selectMostAvailable`, `allocateReviewers`, `runDevRotation` — experience rules, load balancing, preferable reviewers, repeat prevention (stress tested 50-200 iterations) |
| Rotation (teams) | `tests/rotation/teams.test.ts`        | `runTeamRotation` — squad assignment, cooldown rules, load balancing, fairness (stress tested 100-200 iterations)                                                          |

**Not covered:** API endpoints, query utilities, frontend components, E2E flows.

---

## Unit Tests (Vitest)

### Priority 1: Server utilities (pure functions, no DB)

**`tests/rotation/helpers.test.ts`** — Rotation helper utilities

- `shuffleArray` returns new array with same elements, does not mutate original
- `shuffleArray` with empty/single-element arrays
- `selectBalanced` picks candidates with lowest assignment counts
- `selectBalanced` returns all candidates when count >= candidates.length
- `selectBalanced` respects assignment count ordering

**`tests/auth/password-validation.test.ts`** — Registration password rules

- Minimum 8 characters enforced
- Zod schema validation from register endpoint

### Priority 2: Query utilities (need DB mock or in-memory SQLite)

These tests require a test database setup (in-memory SQLite with Drizzle).

**`tests/queries/users.test.ts`**

- `queryAllUsers` returns all users with correct shape (no passwordHash)
- `queryUserByEmail` returns user or undefined
- `createUser` inserts user and returns it
- `confirmUser` sets emailConfirmed, clears token
- `updateUserRole` changes role, prevents invalid roles
- `setResetToken` / `updateUserPassword` token lifecycle

**`tests/queries/developers.test.ts`**

- `queryDevelopers` ordered by firstName
- `resolveDeveloper` by slug then by ID
- `createDeveloper` auto-generates slug from name
- `updateDeveloper` regenerates slug on name change
- `deleteDeveloper` cascades team/squad removal
- `queryDeveloperAssociations` returns correct groupings

**`tests/queries/teams.test.ts`**

- `queryTeams` includes member count
- `resolveTeam` by slug then by ID
- `createTeam` auto-generates slug
- `deleteTeam` cascades everything

**`tests/queries/team-developers.test.ts`**

- `addTeamMember` / `removeTeamMember` with cascade
- `setPreferableReviewers` replaces list
- Unique constraint on team+developer pair

**`tests/queries/squads.test.ts`**

- `createSquad` with initial members
- `updateSquad` replaces member list
- Unique constraint on squad+developer pair

**`tests/queries/rotations.test.ts`**

- `createRotation` stores assignments with resolved names
- `queryRotations` pagination and ordering
- `updateAssignmentReviewers` replaces reviewers
- `queryLatestRotations` returns one per (team, mode)

### Priority 3: Rotation orchestration (integration-level, needs DB)

**`tests/rotation/orchestration.test.ts`**

- `executeDevRotation` loads context from DB and produces valid assignments
- `executeTeamRotation` loads squads, produces valid assignments
- Empty team returns empty assignments
- Team with no squads returns empty for team mode

---

## E2E / Component Tests

> **Note on Storybook:** Storybook is ideal for visual component documentation and isolated interaction testing. For full user flow E2E, Playwright (which Nuxt supports natively via `@nuxt/test-utils`) is the better fit. The recommended approach below uses **Storybook for component stories** and **Playwright for E2E flows**.

### Storybook Component Stories

Install: `npx storybook@latest init --type vue3`

**Custom components to cover:**

| Component           | Stories                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| `EmailInput`        | Default, pre-filled value, domain switching, paste handling, disabled state      |
| `Team/SubNav`       | All tabs, active states for Rotations (devs vs teams paths)                      |
| `Team/RotationList` | Empty state, single rotation, multiple rotations, edit mode with reviewer toggle |
| `ui/Badge`          | All variants (role badges, status badges)                                        |

### Playwright E2E Tests

#### Smoke Tests (run on every push)

These verify the app boots and critical paths work. Fast, no side effects.

| Test                           | What it verifies                                                       |
| ------------------------------ | ---------------------------------------------------------------------- |
| `e2e/smoke/app-loads.spec.ts`  | Home page renders, redirects to /login when unauthenticated            |
| `e2e/smoke/login.spec.ts`      | Login form renders, submits with valid credentials, lands on dashboard |
| `e2e/smoke/navigation.spec.ts` | After login: Teams page loads, Developers page loads, nav links work   |

#### Regression Tests (run on PR)

Full user flows that catch regressions in core functionality.

**Authentication flows:**
| Test | Steps |
|------|-------|
| `e2e/auth/register.spec.ts` | Fill form, submit, verify confirmation token page. Test invalid domain rejection. Test duplicate email. |
| `e2e/auth/login-errors.spec.ts` | Wrong password shows error. Unconfirmed user gets 403 message. |
| `e2e/auth/password-reset.spec.ts` | Request reset, use token, login with new password |

**Team management:**
| Test | Steps |
|------|-------|
| `e2e/teams/crud.spec.ts` | Create team, verify in list, edit name, delete team |
| `e2e/teams/members.spec.ts` | Add member to team, set reviewer count and experience, add preferable reviewers, remove member |
| `e2e/teams/squads.spec.ts` | Create squad, add members, edit, delete |

**Developer management:**
| Test | Steps |
|------|-------|
| `e2e/developers/crud.spec.ts` | Create developer, verify in list, edit, delete |
| `e2e/developers/associations.spec.ts` | View developer profile, verify rotation history grouping |

**Rotation:**
| Test | Steps |
|------|-------|
| `e2e/rotation/run-dev-rotation.spec.ts` | Navigate to rotate page, select Developers mode, run rotation, verify assignments appear |
| `e2e/rotation/run-team-rotation.spec.ts` | Select Squads mode, run rotation, verify assignments |
| `e2e/rotation/edit-assignment.spec.ts` | Open rotation, enter edit mode, change reviewer, save, verify |

**User management (admin):**
| Test | Steps |
|------|-------|
| `e2e/users/role-management.spec.ts` | Admin sees Users nav, opens page, toggles user role, verifies badge change |
| `e2e/users/self-protection.spec.ts` | Admin cannot change own role (button shows "You") |

**Authorization:**
| Test | Steps |
|------|-------|
| `e2e/auth/role-access.spec.ts` | Developer user cannot access /users (API returns 403). Developer cannot create teams (API returns 403). |

---

## Regression Test Definitions

Regression tests guard against reintroducing known bugs and breaking existing behavior.

### Critical Path Regression Suite

| ID     | Area     | Test                                                            | Why it matters             |
| ------ | -------- | --------------------------------------------------------------- | -------------------------- |
| REG-01 | Rotation | Experience rules hold after 50 consecutive rotations            | Core algorithm correctness |
| REG-02 | Rotation | Unexperienced devs get assigned as reviewers (not just targets) | Phase 3 allocation logic   |
| REG-03 | Rotation | No developer reviews themselves                                 | Self-review prevention     |
| REG-04 | Rotation | Repeat prevention across consecutive rotations                  | Rotation diversity         |
| REG-05 | Rotation | Cooldown applies when squad size >= 2x reviewer count           | Fair squad distribution    |
| REG-06 | Auth     | Domain-restricted registration blocks other domains             | Security boundary          |
| REG-07 | Auth     | Expired confirmation tokens are rejected                        | Token lifecycle            |
| REG-08 | Auth     | Self role change is blocked                                     | Admin safety               |
| REG-09 | Data     | Deleting a developer cascades team and squad removal            | Data integrity             |
| REG-10 | Data     | Deleting a team cascades rotations and assignments              | Data integrity             |
| REG-11 | API      | Public rotation endpoint works without auth                     | External integrations      |
| REG-12 | API      | Automated rotation respects 14-day interval                     | Prevent double rotation    |

### Rotation Algorithm Regression (unit-level, already partially covered)

These are stress tests that run many iterations to catch probabilistic bugs:

- 200 iterations of dev rotation with experience rule validation
- 200 iterations of team rotation with cooldown enforcement
- 100 iterations with preferable reviewer constraints

---

## Smoke Test Definitions

Smoke tests answer: "Is the app fundamentally working?" Run after every deploy.

| ID     | Test             | Pass criteria                                   | Max duration |
| ------ | ---------------- | ----------------------------------------------- | ------------ |
| SMK-01 | App starts       | Home page returns 200                           | 5s           |
| SMK-02 | Auth works       | Login with seeded admin returns session         | 3s           |
| SMK-03 | Teams load       | GET /api/teams returns array                    | 2s           |
| SMK-04 | Developers load  | GET /api/developers returns array               | 2s           |
| SMK-05 | Public API works | GET /api/public/rotations returns array         | 2s           |
| SMK-06 | Rotation runs    | POST /api/teams/{id}/rotations creates rotation | 5s           |
| SMK-07 | Static assets    | CSS and JS bundles load (no 404)                | 3s           |

---

## CI Pipeline Structure

```
PR opened / push to master
├── lint          (fast, parallel)
├── unit-tests    (fast, parallel)
├── build         (depends on lint + unit)
├── e2e-smoke     (depends on build)
└── e2e-regression (depends on build, PR only)
```

### Workflow: `.github/workflows/web-tests.yml`

**Triggers:** Push to master, pull requests
**Jobs:**

1. **lint** — TypeScript check (vue-tsc), formatting (oxfmt --check)
2. **unit** — `vitest run` with coverage
3. **build** — `nuxt build` to verify production build
4. **smoke** — Start preview server, run Playwright smoke suite
5. **regression** — Full Playwright regression suite (PR only, to save CI minutes)

---

## Recommended New Dependencies

```bash
# In web/ directory
pnpm add -D @nuxt/test-utils @playwright/test playwright
pnpm add -D @vitest/coverage-v8
```
