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

- Formatter: **Black** (line-length 100)
- Import sorting: **isort** (black profile)
- Unused imports: **autoflake**
- Pre-commit hooks handle all formatting: `poetry run pre-commit run --all-files`

## Key Conventions

- Google Sheets API accessed via **gspread** + **oauth2client**
- Sheet indices: 0 = Config, 1 = Individual Developers, 2 = Teams
- Retry logic in `run_multi_sheet_rotation.py` handles both rate limits (429, 70s wait) and transient server errors (500, 15s wait)
- All rotation scripts support `--manual` flag (updates existing column vs creating new)
