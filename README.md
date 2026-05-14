# DEALR — AI-Powered Economic Platform

DEALR is an intelligent platform connecting Nigeria's informal traders, job seekers, and financial services. It uses AI to price service jobs fairly, secures every transaction through Squad-powered escrow, matches workers to opportunities, and converts completed transactions into alternative-data credit signals.

Built for **Squad Hackathon 3.0, Challenge 2: Smart Systems — The Intelligent Economy**.

---

## Quick Start

### Prerequisites

- Python 3.12+
- `uv` package manager ([install](https://docs.astral.sh/uv/))
- Supabase account (free) — [sign up](https://supabase.com)
- Upstash Redis account (free) — [sign up](https://upstash.com)
- Squad API credentials (sandbox) — [sign up](https://sandbox.squadco.com)

### Setup

1. **Clone and enter the repo:**
   ```bash
   cd dealr-backend
   ```

2. **Install dependencies:**
   ```bash
   uv sync
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in:
   - `DATABASE_URL` from Supabase
   - `REDIS_URL` from Upstash (TLS-enabled)
   - Squad sandbox credentials (`SQUAD_BASE_URL`, `SQUAD_SECRET_KEY`, `SQUAD_MERCHANT_ID`)
   - Generate secrets:
     ```bash
     openssl rand -hex 32  # JWT_SECRET, SHARE_LINK_SECRET
     openssl rand -hex 16  # BVN_SALT
     ```

4. **Test database connection:**
   ```bash
   uv run python -c \
     "import asyncio, asyncpg; \
      asyncio.run(asyncpg.connect('$DATABASE_URL'.replace('+asyncpg',''), ssl='require').close())"
   ```

### Running the server

**Development (reload on code changes):**
```bash
uv run uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`

**Health check:**
```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

### Database migrations

```bash
# Apply all pending migrations
uv run alembic upgrade head

# Create a new migration after schema changes
uv run alembic revision --autogenerate -m "describe your change"
```

### Running tests

```bash
# All tests
uv run pytest -x

# With coverage
uv run pytest -x --cov=app --cov-report=term-missing

# Specific test file
uv run pytest tests/test_health.py -v
```

### Code quality

```bash
# Format code
uv run ruff format .

# Lint
uv run ruff check . --fix

# Type check
uv run mypy app
```

---

## Architecture

DEALR is built as a layered system:

```
┌──────────────────────────────────────────────┐
│  EDGE       │ WhatsApp · PWA · USSD · SMS    │
├──────────────────────────────────────────────┤
│  AI         │ Pricing · Matching · Credit    │
├──────────────────────────────────────────────┤
│  CORE       │ Job FSM · Ledger · Webhooks    │
├──────────────────────────────────────────────┤
│  DATA       │ Events · Features · Vectors    │
├──────────────────────────────────────────────┤
│  RAIL       │ Squad (VA · Transfer · Refund) │
└──────────────────────────────────────────────┘
```

**Key modules:**

- `app/api/v1/` — FastAPI route handlers (thin, all logic delegated)
- `app/services/` — Core business logic (jobs FSM, ledger, credit)
- `app/squad/` — Squad API client (pure, testable)
- `app/ai/` — AI models (pricing, matching, credit, disputes)
- `app/core/` — Infrastructure (config, logging, errors, security)
- `app/db/` — Database models and session management

See `docs/ARCHITECTURE.md` for design rationale and `CLAUDE.md` for operational standards.

---

## API Routes

All routes under `/api/v1`. Full OpenAPI docs at `/docs`.

### Health
- `GET /health` — Returns `{"status": "ok"}`

### Jobs (coming in Prompt 5)
- `POST /jobs` — Create a new job
- `GET /jobs` — List user's jobs
- `GET /jobs/{id}` — Get job details
- `POST /jobs/{id}/start` — Artisan begins work
- `POST /jobs/{id}/deliver` — Artisan marks complete
- `POST /jobs/{id}/dispute` — Raise a dispute

### Shareable Link (coming in Prompt 5)
- `GET /share/{token}` — View a shared job (public)
- `POST /share/{token}/accept` — Accept and initiate payment
- `POST /share/{token}/confirm` — Confirm delivery

### Webhooks (coming in Prompt 5)
- `POST /webhooks/squad/dva` — Dynamic VA payment events
- `POST /webhooks/squad/transfer` — Transfer / disbursement events
- `POST /webhooks/squad/refund` — Refund events

### Admin (sandbox only, coming in Prompt 5)
- `POST /admin/simulate-payment` — Fake a Squad DVA payment (testing)
- `GET /admin/jobs/{id}/ledger` — View transaction ledger for a job

---

## Development Workflow

### Adding a new endpoint

1. Define request/response schemas in `app/schemas/`
2. Write business logic in `app/services/`
3. Add FastAPI route handler in `app/api/v1/`
4. Write tests in `tests/` (unit or integration)
5. Run `uv run ruff format . && uv run ruff check . && uv run mypy app && uv run pytest -x`

### Adding a database model

1. Create ORM model in `app/db/models/`
2. Run `uv run alembic revision --autogenerate -m "add model_name table"`
3. Review the migration, adjust if needed
4. Run `uv run alembic upgrade head`

### Debugging

- **Structured logs:** All logs are JSON in prod, colored console in dev
  ```python
  import structlog
  log = structlog.get_logger()
  log.info("event.name", job_id=..., amount_kobo=...)
  ```
- **Type checking:** `uv run mypy app` catches errors early
- **Test first:** Failing test before code helps clarify intent

---

## Environment Variables

See `.env.example` for all variables. Key groups:

| Group | Purpose |
|-------|---------|
| `ENV`, `LOG_LEVEL` | Runtime config |
| `DATABASE_URL`, `TEST_DATABASE_URL` | Supabase Postgres |
| `REDIS_URL`, `CELERY_*` | Upstash Redis + task queue |
| `JWT_SECRET`, `BVN_SALT`, `SHARE_LINK_SECRET` | Crypto secrets |
| `SQUAD_*` | Squad API credentials |
| `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, etc. | AI provider keys |

**Security:** Never commit `.env`. `.gitignore` prevents this.

---

## Testing Strategy

- **Unit tests:** Pure functions in `services/`, `squad/`, `ai/`
- **Integration tests:** Endpoints + DB (use `TEST_DATABASE_URL`)
- **Fixtures:** Mock Squad responses with `respx`
- **Coverage:** Minimum 75% overall; ≥90% on critical paths

Run:
```bash
uv run pytest -x --cov=app --cov-report=html
# Open htmlcov/index.html to see coverage gaps
```

---

## Deployment

This is a **managed cloud backend** — no Docker. Deployment uses:

- **Database:** Supabase (managed Postgres + pgvector + serverless)
- **Cache/Queue:** Upstash Redis (managed, TLS)
- **Compute:** Your hosting provider (Heroku, Railway, Fly.io, etc.)
- **Payment:** Squad (managed, no custody risk for DEALR)

Example deployment command:
```bash
# Heroku
heroku container:push web
heroku container:release web
heroku run "uv run alembic upgrade head"
```

---

## Contributing

1. Read `CLAUDE.md` for coding standards
2. Create a feature branch
3. Implement vertically (one feature slice, end-to-end)
4. All tests pass: `uv run pytest -x && uv run ruff check . && uv run mypy app`
5. Open a PR

---

## Support & Questions

- **Architecture:** See `docs/ARCHITECTURE.md`
- **Operational standards:** See `CLAUDE.md`
- **Prompt sequence:** See `FIRST_PROMPTS.md`
- **Squad API docs:** https://docs.squadco.com/

---

## License

Proprietary — DEALR Team, 2026.
