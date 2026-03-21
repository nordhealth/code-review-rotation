# PVC Code Review Rotation

## Python Environment

- Uses **Poetry** for dependency management
- Run commands with `poetry run <command>` (e.g., `poetry run pytest tests/ -x -q`)
- Install deps: `poetry install`
- Python 3.11+ required (see `.python-version`)
- **Do NOT use** bare `python`, `python3`, or `uv run` — use `poetry run` exclusively

## Project Structure

```
lib/              # Core library modules
  config_loader.py    # Reads config from Google Sheets (Config tab)
  data_types.py       # Developer/Team dataclasses
  env_constants.py    # Environment variable handling
  utilities.py        # Shared helpers (sheet operations, allocation logic)
scripts/          # Entry points
  run_multi_sheet_rotation.py     # Main: multi-sheet rotation (devs + teams)
  rotate_devs_reviewers.py        # Single-sheet developer rotation
  rotate_team_reviewers.py        # Single-sheet team rotation
  check_scheduled_rotation_needed.py  # Schedule checker for CI
tests/            # Pytest test suite
```

## Running Tests

```bash
poetry run pytest tests/ -x -q          # Quick run, stop on first failure
poetry run pytest tests/ -v             # Verbose
poetry run coverage run -m pytest tests/ && poetry run coverage report -m  # With coverage
```

## Code Style

- Linting + formatting: **Ruff** (line-length 100, replaces Black, isort, autoflake)
- Format: `poetry run ruff format .`
- Lint + fix: `poetry run ruff check --fix .`
- Pre-commit hooks handle all formatting: `poetry run pre-commit run --all-files`

## Web App (`web/`)

- **Framework:** Nuxt 4, Vue 3 Composition API, TypeScript
- **DB:** SQLite via NuxtHub, Drizzle ORM
- **UI:** shadcn-vue (prefix `UI`), Tailwind CSS v4
- **Tests:** Vitest with 100% coverage on rotation logic
- **Linting + Formatting:** `@antfu/eslint-config` (ESLint handles both). Do **NOT** use Prettier, oxlint, or oxfmt. Do not run `npx oxfmt` on files in this repo.
- **Lint:** `cd web && pnpm lint` (check) / `pnpm lint:fix` (auto-fix)
- **Pre-commit:** Husky + lint-staged runs ESLint fix on staged JS/TS/Vue files, ruff on staged Python files
- **Run dev:** `cd web && pnpm dev` (or `pnpm dev:fresh` to reset DB)
- **Run tests:** `cd web && pnpm vitest run --coverage`
- **Generate migrations:** `cd web && pnpm db:generate`

## TypeScript Rules

- **`any` is forbidden.** The ESLint rule `ts/no-explicit-any` is enforced as an error. Never use `any` in new or modified code.
- **Type everything explicitly.** Function parameters, return types, refs, reactive objects, and useFetch generics must all have proper types. Prefer interfaces from `~/types` over inline types.
- **Type assertions (`as X`) are a last resort.** Before casting, try: narrowing with type guards, generic type parameters, `satisfies`, or `Partial<typeof table.$inferInsert>` for Drizzle updates.
- **Catch blocks use `unknown`.** Access error properties via inline cast: `(error as { data?: { message?: string } })?.data?.message`. Never `catch (e: any)`.
- **Prefer `undefined` over `null`** for optional refs and default values, unless the API or schema explicitly uses `null`.
- **No type assertions to bypass problems.** If the type system resists, fix the underlying type rather than silencing it with `as`.
- **Use Drizzle's inferred types** for database operations: `typeof table.$inferInsert`, `typeof table.$inferSelect` instead of hand-written types that drift from the schema.

## Key Conventions

- Google Sheets API accessed via **gspread** + **oauth2client**
- Sheet indices: 0 = Config, 1 = Individual Developers, 2 = Teams
- Retry logic in `run_multi_sheet_rotation.py` handles both rate limits (429, 70s wait) and transient server errors (500, 15s wait)
- All rotation scripts support `--manual` flag (updates existing column vs creating new)
