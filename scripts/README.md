# Scripts — Google Sheets Rotation

Python scripts that automate code review rotation using Google Sheets as the data store and GitHub Actions for scheduling.

## How It Works

1. Scripts read team/developer configuration from a Google Sheet
2. The rotation algorithm assigns reviewers with load balancing and experience-aware selection
3. Assignments are written back to the sheet as new date columns
4. GitHub Actions runs the scripts on a cron schedule (every 2 Wednesdays)

## Prerequisites

- Python 3.11+
- [Poetry](https://python-poetry.org/) for dependency management
- Google Cloud project with Sheets API and Drive API enabled
- Service Account credentials JSON file
- A Google Sheet shared with the Service Account (Editor access)

## Setup

```bash
# Install dependencies
poetry install

# Create .env file
cat > .env << 'EOF'
CREDENTIAL_FILE=credentials.json
SHEET_NAMES=Your Sheet Name Here
EOF

# Install pre-commit hooks (optional)
poetry run pre-commit install
```

For multiple sheets, list one per line in `SHEET_NAMES`:

```
SHEET_NAMES=Front End - Code Reviewers
Backend - Code Reviewers
Mobile - Code Reviewers
```

## Google Sheet Structure

The sheet needs three tabs (by index, names are flexible):

**Tab 0 — Config** (required to exist, content optional)

| A | B |
|---|---|
| Unexperienced Developers | Default Number of Reviewers |
| Dev1 | 2 |
| Dev11 | |

Developers listed here are considered junior. Everyone else is experienced. Empty list = all experienced.

**Tab 1 — Individual Developers** (required)

| Developer | Number of Reviewers | Preferable Reviewers |
|-----------|--------------------|--------------------|
| Dev1 | 2 | Dev2, Dev3 |
| Dev2 | 2 | Dev3, Dev4 |

**Tab 2 — Teams** (optional)

| Team | Team Developers | Number of Reviewers |
|------|----------------|-------------------|
| Team1 | Dev1, Dev2, Dev3 | 2 |
| Team2 | Dev4, Dev5 | 2 |

## Running

```bash
# Multi-sheet mode (recommended)
poetry run python scripts/run_multi_sheet_rotation.py --type all
poetry run python scripts/run_multi_sheet_rotation.py --type devs
poetry run python scripts/run_multi_sheet_rotation.py --type teams

# Manual mode (updates existing column instead of creating new)
poetry run python scripts/run_multi_sheet_rotation.py --type all --manual

# Single-sheet mode
poetry run python scripts/rotate_devs_reviewers.py
poetry run python scripts/rotate_team_reviewers.py
```

## Testing

```bash
poetry run pytest tests/ -v
poetry run coverage run -m pytest tests/ && poetry run coverage report -m
```

## Code Style

Uses Ruff for linting and formatting:

```bash
poetry run ruff format .
poetry run ruff check --fix .
```

## GitHub Actions

Workflows in `.github/workflows/`:

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `tests.yml` | PR / push to master | Runs pytest + coverage |
| `all-review-rotations.yml` | Cron (Wed 03:00 UTC) + manual | Runs both dev and team rotations across all sheets |
| `single-sheet-devs-rotation.yml` | Manual | Single-sheet developer rotation |
| `single-sheet-teams-rotation.yml` | Manual | Single-sheet team rotation |

The cron workflow tracks the last scheduled rotation date in a GitHub Variable (`LAST_SCHEDULED_ROTATION_DATE`) and only runs if 14+ days have passed.

## Google Cloud Setup

1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Sheets API** and **Google Drive API**
3. Create a **Service Account** and download the credentials JSON
4. Save as `credentials.json` in the project root
5. Share your Google Sheet with the service account's `client_email` (Editor access)
