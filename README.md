# Code Review Rotation

Automated code review assignment system for development teams. Assigns reviewers fairly using load balancing, experience-aware selection, and configurable schedules.

## Two Approaches

This repository contains two independent systems that solve the same problem in different ways:

### [`web/`](web/) — Nord Review Web App

A self-contained Nuxt web application with its own database, UI, and built-in scheduling. Teams, developers, squads, and rotation history are managed through a browser interface. Rotations run automatically via an internal cron job (Nitro scheduled tasks) — no external triggers needed.

- **Stack:** Nuxt 4, SQLite (via NuxtHub/Cloudflare D1), Drizzle ORM, shadcn-vue
- **Scheduling:** Internal hourly cron checks each team's configured schedule
- **Configuration:** Admin UI for global defaults and per-team overrides (interval, day, timezone)
- **Integrations:** Per-user API keys for external access, webhook notifications (HMAC-signed) on rotation events
- **Deployment:** Cloudflare Pages + D1 via NuxtHub

### [`scripts/`](scripts/) + [`lib/`](lib/) — Google Sheets + GitHub Actions

Python scripts that read team configuration from Google Sheets, run the rotation algorithm, and write assignments back to the sheet. Scheduling is handled by GitHub Actions cron workflows.

- **Stack:** Python 3.11+, Poetry, gspread, Google Sheets API
- **Scheduling:** GitHub Actions cron (every 2 Wednesdays) + manual triggers
- **Configuration:** Google Sheets tabs (Config, Individual Developers, Teams)
- **Deployment:** GitHub Actions runners

## Rotation Algorithm

Both systems share the same core logic:

**Individual Developer Allocation**
- Each developer gets N assigned reviewers (configurable per developer)
- Reviewers are selected with load balancing (fewest current assignments first)
- At least one experienced reviewer is guaranteed per developer
- Preferable reviewer lists are respected when possible
- Previous rotation assignments are avoided to maximize reviewer diversity

**Team/Squad Rotation**
- Each squad gets N reviewers drawn from its member pool
- When a squad has fewer members than needed, experienced developers from the broader team fill the gaps
- Load balancing distributes squad review duty fairly across all developers

## Project Structure

```
scripts/              # Python entry points (Google Sheets rotation)
lib/                  # Python core library (config, data types, utilities)
tests/                # Python test suite (pytest)
web/                  # Nuxt web application (see web/README.md)
.github/workflows/    # GitHub Actions (Python tests + rotation cron)
```

## Getting Started

- **Web app:** See [`web/README.md`](web/README.md)
- **Python scripts:** See [`scripts/README.md`](scripts/README.md)
