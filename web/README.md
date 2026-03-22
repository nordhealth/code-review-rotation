# Nord Review — Web App

A self-contained web application for managing code review rotations. Handles teams, developers, squads, rotation history, and automated scheduling through a browser interface.

## Stack

- **Framework:** Nuxt 4 (Vue 3 Composition API, TypeScript)
- **Database:** SQLite via NuxtHub (Cloudflare D1 in production)
- **ORM:** Drizzle ORM
- **UI:** shadcn-vue + Tailwind CSS v4
- **Auth:** nuxt-auth-utils (session-based) + per-user API keys (SHA-256 hashed)
- **Linting + Formatting:** @antfu/eslint-config (ESLint handles both, single quotes, no semicolons)
- **Testing:** Vitest (100% coverage on rotation logic)
- **Git Hooks:** Husky + lint-staged (pre-commit: ESLint fix on staged files)

## Quick Start

```bash
cd web
pnpm install
pnpm dev
```

First run seeds the database with sample data. Default admin: `joao.goncalves@nordhealth.com` / `admin123!`

To reset the database and re-seed:

```bash
pnpm dev:fresh
```

## Project Structure

```
app/
  components/       # Vue components (Team/, ui/)
  layouts/          # App layout (navigation, auth)
  pages/            # File-based routing
  types/            # TypeScript interfaces
  lib/              # Client utilities
server/
  api/              # API route handlers
  db/
    schema.ts       # Drizzle schema definitions
    migrations/     # SQL migrations
  plugins/          # Nitro plugins (seed, etc.)
  tasks/            # Nitro scheduled tasks (rotation cron)
  utils/
    queries/        # Database query functions
    rotation/       # Rotation algorithm (developers, teams, schedule)
    auth.ts         # Auth helpers (requireAdmin, requireAuth, requireApiKey)
    api-key.ts      # API key generation + SHA-256 hashing
    webhook.ts      # Webhook HMAC-SHA256 signing
    drizzle.ts      # DB instance + re-exports
tests/              # Vitest test suite
```

## Rotation Scheduling

Rotations run automatically via a Nitro scheduled task (`server/tasks/rotate.ts`) that executes every hour. On each run it checks every team's effective schedule and triggers rotations when due. Rotation time is hardcoded at 04:00 in the team's configured timezone.

### Global Defaults (admin Settings page)

| Setting  | Default         |
| -------- | --------------- |
| Interval | 14 days         |
| Day      | Wednesday       |
| Timezone | Europe/Helsinki |

### Per-Team Overrides

Each team can override interval, day, and timezone. Null values fall through to the global default.

### Manual Rotations

The `POST /api/rotate` endpoint accepts an API key (`x-api-key` header) and supports `teamId` and `mode` query parameters for on-demand rotation triggers.

## API Keys

Users can generate personal API keys from the API Keys page. Keys are SHA-256 hashed before storage (plaintext shown once on creation). External services authenticate via `Authorization: Bearer <key>` header to access the read-only public rotations endpoint.

## Webhooks

Admins can configure webhooks in Settings. When a rotation is created, the app sends a signed POST request to each active webhook URL with the full rotation payload (team, assignments, reviewer slackIds/gitlabIds). Payloads are signed with HMAC-SHA256 via the `X-Webhook-Signature` header.

## Database

Migrations are managed with Drizzle Kit:

```bash
pnpm db:generate    # Generate migration from schema changes
pnpm db:migrate     # Apply migrations
```

## Linting

```bash
pnpm lint           # Check
pnpm lint:fix       # Auto-fix
```

Uses @antfu/eslint-config: single quotes, no semicolons, `any` is forbidden.

## Testing

```bash
pnpm vitest run              # Run all tests
pnpm vitest run --coverage   # Run with coverage report
pnpm vitest                  # Watch mode
```

Coverage is enforced at 100% for rotation logic, auth constants, API key utils, webhook signing, and client utilities.

## Typecheck

```bash
pnpm typecheck      # Run vue-tsc typecheck
```

## API Overview

| Method | Path                       | Auth       | Description                            |
| ------ | -------------------------- | ---------- | -------------------------------------- |
| GET    | `/api/teams`               | User       | List all teams                         |
| POST   | `/api/teams`               | Admin      | Create team                            |
| GET    | `/api/teams/:id`           | User       | Get team details                       |
| PUT    | `/api/teams/:id`           | Admin      | Update team (incl. schedule overrides) |
| DELETE | `/api/teams/:id`           | Admin      | Delete team                            |
| GET    | `/api/teams/:id/rotations` | User       | List rotations for a team              |
| POST   | `/api/teams/:id/rotations` | Admin      | Create manual rotation                 |
| GET    | `/api/settings`            | Admin      | Get global settings                    |
| PUT    | `/api/settings`            | Admin      | Update global settings                 |
| POST   | `/api/rotate`              | API key    | Trigger automated rotation             |
| GET    | `/api/public/rotations`    | Bearer key | Read-only current rotations (external) |
| GET    | `/api/keys`                | User       | List user's API keys                   |
| POST   | `/api/keys`                | User       | Create API key                         |
| DELETE | `/api/keys/:id`            | User       | Revoke API key                         |
| GET    | `/api/webhooks`            | Admin      | List webhooks                          |
| POST   | `/api/webhooks`            | Admin      | Create webhook                         |
| PUT    | `/api/webhooks/:id`        | Admin      | Toggle webhook active/paused           |
| DELETE | `/api/webhooks/:id`        | Admin      | Delete webhook                         |

## AI / MCP Integration

Nord Review exposes an [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server that lets AI assistants query rotation data directly. AI agents can look up current reviewers, list teams, and list developers through natural language.

The MCP endpoint authenticates via API keys (the same keys used for the public REST API). Full setup instructions for Claude Code, Cursor, and Windsurf are available in the app at **[/docs/mcp](app/pages/docs/mcp.vue)**.

### llms.txt

The app serves a [`/llms.txt`](https://llmstxt.org) file (generated by [`nuxt-llms`](https://nuxt.com/modules/llms)) that describes the application, its API, MCP server, and public endpoints in a format optimized for LLM consumption.

### API Documentation

Interactive API docs are available at `/_scalar` (powered by [Scalar](https://scalar.com)). All endpoints are annotated with OpenAPI schemas documenting request bodies, response shapes, and error codes.

## Deployment

The app is configured for NuxtHub (Cloudflare Pages + D1). See [NuxtHub docs](https://hub.nuxt.com) for deployment instructions.
