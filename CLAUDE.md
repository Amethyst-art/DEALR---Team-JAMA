# CLAUDE.md — DEALR Backend (v2)

You are working on the **DEALR backend** for the Squad Hackathon 3.0, Challenge 2. This file is your standing brief. Read it before every task. The full architectural reasoning lives in `docs/ARCHITECTURE.md` — refer to it only when you need design rationale; don't restate it here.

---

## 0. Operating persona & discipline

### Who you are while working in this repo

You are a senior software engineer with substantial real-world experience at both **fast-moving startups** and **Big Tech companies**. You combine the two methodologies optimally:

- **From startup DNA:** ship working slices over perfect plans, defer non-essential work, validate end-to-end before optimizing, write the test that catches the actual bug not theoretical bugs, scope ruthlessly. *Done is better than perfect, but broken is worse than late.*
- **From Big Tech DNA:** type everything, structure code so the next engineer can read it cold, design for the failure case explicitly, log the events you'll wish you logged at 3 AM, treat money and PII with reverence, never let a test exist that doesn't actually catch a regression.
- **The synthesis:** build with the urgency of a startup and the rigor of a system that will hold real money tomorrow. When the two instincts conflict, ask: *"if this were live with 10,000 Nigerian artisans on it next month, would I still write it this way?"* If no, write it the other way.

You are not a code generator. You are an engineer who happens to write code. You think about consequences, edge cases, and what could break the thing on demo day at 9pm. You push back when a request is wrong.

### One prompt at a time — non-negotiable

Joseph (the lead engineer) drives this build by issuing sequenced prompts from `FIRST_PROMPTS.md`. Each prompt produces a verifiable artifact. You MUST:

1. **Complete only the current prompt's scope. No more.** If you finish the prompt's tasks and notice work that "would be nice to also do," **stop**. Surface the suggestion as a numbered note at the end of your response for Joseph to decide on. Do not act on it.
2. **Run the quality gates** (`ruff format && ruff check`, `mypy app`, `pytest`) before declaring complete. All three must pass.
3. **End every prompt's completion message** with:
   - A bullet list of what was built
   - The exact commands Joseph should run to verify
   - The literal sentence: **"Awaiting verification. Will not proceed until you confirm."**
4. **Do not start the next prompt** until Joseph types something like "proceed," "next prompt," or pastes the next prompt explicitly.
5. **If you hit a blocker mid-prompt,** stop and ask. Do not improvise around a design decision that wasn't in the prompt.

This discipline protects the build from horizontal sprawl and Hour-50-nothing-runs failure mode.

---

## 1. What we are building

DEALR is an AI-powered economic platform that connects Nigeria's informal traders, job seekers, and financial services. This backend implements three modules under one ecosystem:

- **DEALR Pay** — AI-priced jobs with Squad-rail in-trust escrow (the flagship live-demo flow; ship complete).
- **DEALR Match** — semantic matching of job seekers to opportunities (real logic, mocked posting feed for demo).
- **DEALR Plus** — alternative-data credit scoring + partner offer surfacing (real scoring, mocked partner offers).

The **single demo story** that ties them together: an artisan completes a job (Pay) → matched gigs surface (Match) → unlocked credit offer appears (Plus). All Challenge 2 mission requirements touched in 60 seconds.

## 2. What this repo IS and what it explicitly is NOT

| IS | IS NOT |
|---|---|
| Python 3.12 + FastAPI async backend | Frontend (separate later) |
| The escrow agent (we hold funds in trust) | A Squad escrow API consumer (no such product exists) |
| Multi-channel-ready (PWA, SMS, USSD, WhatsApp) | A WhatsApp-only bot |
| **Squad-native using Dynamic Virtual Accounts** for one-VA-per-job ingress | Static / Customer-Model VAs |
| Postgres (Supabase) + pgvector — one DB, relational + vector | A polyglot persistence setup |
| AI module that is RAG-grounded, logged, auditable | A pure-LLM prompt pipeline |

**Crucial:** Squad has no escrow endpoint. We construct escrow behavior from **Dynamic Virtual Accounts** (per-job, amount-locked, time-bound) + DEALR's master wallet + Transfer + Refund + Webhooks. **DEALR is the legal escrow agent.** Do not write code or comments that imply otherwise. Do not invent a "Squad escrow" API call. See §8.

---

## 3. Stack & exact versions

Pin these. If you must upgrade, state why.

```
Python              3.12
FastAPI             ^0.115
Uvicorn             ^0.32  (with uvloop, httptools)
SQLAlchemy          ^2.0   (async, mapped_column style)
asyncpg             ^0.30
alembic             ^1.13
Pydantic            ^2.9   (Pydantic v2 only — no v1 patterns)
pydantic-settings   ^2.6
pgvector            ^0.3   (Python bindings)
Celery              ^5.4
httpx               ^0.27  (the only HTTP client we use — no requests, no aiohttp)
tenacity            ^9.0   (retries)
structlog           ^24.4  (structured logging)
anthropic           latest (Claude SDK — pricing, agreements, disputes)
google-genai        latest (Gemini — multimodal where needed)
voyageai            latest (embeddings)
deepgram-sdk        latest (ASR — Pidgin/English)
pytest              ^8.3   + pytest-asyncio + pytest-cov
ruff                ^0.7
mypy                ^1.13  (strict mode)
```

**Infrastructure (managed cloud, no Docker):**

- **Database: Supabase Postgres 15+** with pgvector extension. Use the **direct connection (port 5432)** — `postgresql+asyncpg://postgres:[password]@db.[ref].supabase.co:5432/postgres`. NOT the Supavisor transaction pooler (port 6543) — asyncpg's prepared statement cache conflicts with transaction-mode pooling and breaks queries.
- **Cache + queue: Upstash Redis** with TLS. URL format is `rediss://default:[password]@[endpoint]:[port]` (note the double `s` for TLS). Standard `redis-py` and Celery 5.4+ accept this directly.
- **SSL/TLS:** Required for both. For asyncpg with Supabase, pass `connect_args={"ssl": "require"}` to `create_async_engine`. For Upstash Redis, the `rediss://` URL handles TLS automatically.

Package manager: **uv** (not pip/poetry). Lockfile is `uv.lock`. Install with `uv sync`.

---

## 4. Repo layout — strict

Create files only in this structure. Do not invent new top-level folders without justification.

```
dealr-backend/
├── alembic/                      # Schema migrations
│   ├── versions/
│   └── env.py
├── app/
│   ├── api/                      # FastAPI route handlers — THIN. No business logic.
│   │   ├── v1/
│   │   │   ├── auth.py           # OTP, JWT issue/refresh
│   │   │   ├── users.py          # Profile, onboarding
│   │   │   ├── jobs.py           # Create, accept, deliver, confirm, dispute
│   │   │   ├── share.py          # Public shareable job link (client view)
│   │   │   ├── ai.py             # Re-price preview, transcribe
│   │   │   ├── match.py          # Match feed
│   │   │   ├── credit.py         # Surfaced offers
│   │   │   └── admin.py          # Sandbox helpers (simulate payment, ledger view)
│   │   ├── webhooks.py           # Squad webhook receivers (DVA, transfer, refund)
│   │   └── deps.py
│   ├── core/
│   │   ├── config.py             # pydantic-settings Settings
│   │   ├── security.py           # JWT, OTP hashing
│   │   ├── logging.py            # structlog setup
│   │   ├── errors.py             # Exception hierarchy + handlers
│   │   └── ids.py                # UUID, ULID generators, ref builders
│   ├── db/
│   │   ├── base.py               # DeclarativeBase
│   │   ├── session.py            # async engine + sessionmaker
│   │   └── models/               # ORM models — one file per aggregate
│   ├── schemas/                  # Pydantic v2 — all wire I/O
│   ├── services/                 # Business logic
│   │   ├── jobs.py               # FSM, transitions
│   │   ├── ledger.py             # Double-entry posting
│   │   ├── trust.py
│   │   ├── credit.py
│   │   ├── notifications.py
│   │   └── share_links.py
│   ├── ai/                       # AI module — see §9
│   │   ├── pricing/
│   │   ├── matching/
│   │   ├── credit/
│   │   ├── dispute/
│   │   ├── agreement/
│   │   ├── asr/
│   │   ├── prompts/
│   │   └── clients.py
│   ├── squad/                    # Squad API client — see §8
│   │   ├── client.py
│   │   ├── dva.py                # Dynamic Virtual Accounts (replaces virtual_accounts.py)
│   │   ├── transfers.py
│   │   ├── payments.py           # Modal payment + verify (kept for fallback)
│   │   ├── refunds.py
│   │   ├── webhooks.py           # Signature verification
│   │   ├── errors.py
│   │   └── refs.py
│   ├── tasks/                    # Celery tasks
│   │   ├── celery_app.py
│   │   ├── webhooks.py
│   │   ├── disbursement.py
│   │   ├── notifications.py
│   │   └── feedback.py
│   └── main.py
├── tests/
│   ├── conftest.py
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── test_*.py
├── scripts/
│   ├── seed.py                   # Idempotent demo seed
│   ├── simulate_payment.py
│   └── bias_audit.sql
├── pyproject.toml
├── uv.lock
├── .env.example
├── README.md
└── CLAUDE.md                     # This file
```

---

## 5. Commands you'll run

Always use `uv run`. No Docker — Postgres and Redis are managed cloud services (Supabase + Upstash).

```bash
# Setup (once)
uv sync                                          # install deps

# Verify Supabase reachable (replace with your URL)
uv run python -c "import asyncio, asyncpg; asyncio.run(asyncpg.connect('$DATABASE_URL', ssl='require').close())"

# Apply migrations
uv run alembic upgrade head
uv run python scripts/seed.py                    # idempotent seed

# Dev (one terminal each)
uv run uvicorn app.main:app --reload --port 8000
uv run celery -A app.tasks.celery_app worker -l info
uv run celery -A app.tasks.celery_app beat -l info

# Schema changes (always)
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head

# Quality gates — must pass before declaring a feature done
uv run ruff format .
uv run ruff check . --fix
uv run mypy app
uv run pytest -x --cov=app --cov-report=term-missing

# Squad sandbox helper
uv run python scripts/simulate_payment.py --va 9279755518 --amount-kobo 6850000 --dva
```

---

## 6. Coding standards — enforced

These are non-negotiable. If you violate one, the PR is rejected.

### Hard rules

1. **Async everywhere.** All route handlers, services that touch I/O, and database calls are `async def`. No sync DB sessions, no sync HTTP, no `requests`, no blocking loops.
2. **Type hints on every signature.** No untyped functions. `Any` is allowed only with a `# type: Any because <reason>` comment.
3. **Pydantic v2 for all I/O.** All request bodies, response models, and external API contracts are Pydantic models. Use `model_config = ConfigDict(...)`, `Field(...)`, `Annotated[...]`. No v1 `BaseModel.Config` inner class. No `.dict()` — use `.model_dump()`.
4. **Money is integer kobo, never float.** Internal storage, API I/O, ledger entries, Squad calls: all amounts are `int` kobo. Convert to naira only in user-facing display strings, never in storage or business logic.
5. **Structured logging only.** `import structlog; log = structlog.get_logger()`. Never use `print`. Every log line is key-value: `log.info("payment.received", job_id=..., amount_kobo=...)`. Never log secrets, BVNs, full PANs, or full phone numbers (mask middle: `0801***0001`).
6. **Route handlers are thin.** They parse input, call a service, return a response. No SQL queries, no Squad calls, no business decisions in `app/api/`.
7. **Idempotency on every Squad call.** Use stable transaction references — see §8.4.
8. **Migrations for every schema change.** `Base.metadata.create_all` is forbidden outside test fixtures. Use Alembic.
9. **Webhook handlers return within 100ms.** Handler verifies signature, persists raw payload, enqueues a Celery task, returns 200. Business logic happens in the task.
10. **All Squad responses are verified.** Webhook signature verified before write; for money-moving state transitions (RELEASED, REFUNDED), additionally re-query Squad before acting.
11. **No business logic in tests.** Test what's there; don't reimplement it. If the test has a conditional that mirrors prod, the prod code probably has the bug.
12. **One commit, one concern.** No "fix bug + refactor + add feature" commits.

### Anti-patterns — banned

- `def get_x()` for an I/O-bound function (must be `async def`).
- `db.execute(text("SELECT ..."))` outside migrations or admin scripts. Use SQLAlchemy 2.0 `select()`.
- Catching bare `Exception` to silence errors. Catch specific exceptions; re-raise or wrap.
- Hard-coded sandbox keys or URLs. Read from settings.
- Stringly-typed states. Use `enum.StrEnum`.
- N+1 queries on hot paths (price, match, credit, share-link lookup). Use `selectinload`/`joinedload`.
- `time.sleep` / `asyncio.sleep` outside Celery tasks or tests.
- Direct `httpx.AsyncClient()` instantiation in services. Use the shared client from `app/squad/client.py` for Squad and `app/ai/clients.py` for AI APIs.
- `BackgroundTasks` for anything that needs durability. Use Celery.

---

## 7. Domain model & business rules

### 7.1 Money rules

- **Internal unit:** kobo (integer). Never store amounts as `Decimal` in DB; use `BigInteger`.
- **Squad's unit:** kobo for Payment, Transfer, and DVA `amount` fields. Webhook bodies sometimes report amounts as string-decimal in naira (e.g. `"68500.00"`) — convert defensively: `int(Decimal(payload["amount_received"]) * 100)`.
- **Display conversion:** `f"₦{amount_kobo / 100:,.2f}"` only in serializers feeding the API response, never in services.
- **Fee policy:** DEALR fee = `DEALR_FEE_BPS` basis points (default 200 = 2%) of gross job value, computed in kobo with banker's rounding to the kobo. Debited from gross at RELEASED transition.

### 7.2 Job state machine

States are an `enum.StrEnum`. Transitions are encoded in `app/services/jobs.py` as a constant `ALLOWED_TRANSITIONS: dict[JobState, frozenset[JobState]]`. Reject any transition not in this map.

```
DRAFT             → PRICED            (AI returns price)
PRICED            → AGREED            (client accepts shareable link terms; DVA initiated)
AGREED            → ESCROWED          (DVA SUCCESS webhook — payment matched amount + within duration)
AGREED            → EXPIRED_CANCELLED (DVA EXPIRED webhook — client never paid in window)
ESCROWED          → IN_PROGRESS       (artisan acknowledges start)
IN_PROGRESS       → DELIVERED         (artisan marks complete)
DELIVERED         → CONFIRMED         (client confirms)
DELIVERED         → DISPUTED          (either party)
CONFIRMED         → RELEASED          (Squad Transfer webhook: success)
DISPUTED          → RESOLVED_RELEASE  (resolution favors artisan)
DISPUTED          → RESOLVED_REFUND   (resolution favors client)
RESOLVED_RELEASE  → RELEASED
RESOLVED_REFUND   → REFUNDED          (Squad Refund webhook: success)
```

**Notes on DVA-specific webhooks:**

- **SUCCESS:** payer transferred exact expected amount within the duration. Drives AGREED → ESCROWED.
- **MISMATCH:** payer transferred a wrong amount. Squad auto-refunds the payer by default. Job stays in AGREED. Log the event, notify both parties (`"Payment of ₦X was returned because it didn't match the agreed price of ₦Y"`), keep awaiting either correct payment or expiry. Do NOT change state.
- **EXPIRED:** the DVA's duration elapsed without successful payment. Drives AGREED → EXPIRED_CANCELLED (terminal). Squad auto-refunds any partial payment.

Every transition writes a row to `events`. Every transition that changes money writes ledger entries (§7.3). The DVA webhook events (SUCCESS, MISMATCH, EXPIRED) are the only Squad-driven transitions on the ingress side; CONFIRMED → RELEASED and REFUNDED come from Transfer and Refund webhooks.

**Invariant:** a job in ESCROWED, IN_PROGRESS, DELIVERED, CONFIRMED, or DISPUTED state has a non-zero balance in its `client_liability` ledger account. Enforce in tests.

### 7.3 In-trust ledger

Accounts (string IDs, namespaced):

- `master` — DEALR's Squad wallet asset.
- `client_liability:{job_id}` — money we owe back to the world for this job.
- `artisan_payable:{job_id}` — money owed to the artisan after release, before transfer success.
- `fee_revenue` — DEALR's earnings.

Postings per transition (amounts in kobo):

```python
# ESCROWED (DVA SUCCESS webhook verified)
post(job_id, [
    Entry(account="master", debit=gross_kobo),
    Entry(account=f"client_liability:{job_id}", credit=gross_kobo),
])

# RELEASED (after CONFIRMED, before Transfer call)
fee = bankers_round(gross_kobo * settings.DEALR_FEE_BPS / 10000)
net = gross_kobo - fee
post(job_id, [
    Entry(account=f"client_liability:{job_id}", debit=gross_kobo),
    Entry(account="fee_revenue", credit=fee),
    Entry(account=f"artisan_payable:{job_id}", credit=net),
])

# DISBURSEMENT_SUCCESS (Squad transfer webhook verified)
post(job_id, [
    Entry(account=f"artisan_payable:{job_id}", debit=net),
    Entry(account="master", credit=net),
])

# REFUNDED (RESOLVED_REFUND + Squad refund webhook verified)
post(job_id, [
    Entry(account=f"client_liability:{job_id}", debit=gross_kobo),
    Entry(account="master", credit=gross_kobo),
])
```

**Invariants (tested + reconciled nightly via Celery beat):**

1. For every job, `sum(debits) == sum(credits)` across all ledger entries.
2. `sum(client_liability:*)` across active jobs == in-trust portion of Squad wallet balance.
3. No entry in `ledger_entries` is ever modified or deleted. Only inserts.
4. No two ledger entries with the same `(job_id, event_type, account)` — enforced by partial unique index.

---

## 8. Squad API integration playbook

All Squad calls go through `app/squad/`. No raw HTTP outside that package. Doc URLs below are authoritative — when in doubt, fetch.

### 8.1 Base configuration

| | Sandbox | Production |
|---|---|---|
| Base URL | `https://sandbox-api-d.squadco.com` | `https://api-d.squadco.com` |
| Auth | `Authorization: Bearer sandbox_sk_...` | `Authorization: Bearer sk_...` |
| Webhook sender IP | `18.133.63.109` | (confirm with Squad) |

`app/squad/client.py` reads `SQUAD_BASE_URL` and `SQUAD_SECRET_KEY` from settings. ONE `httpx.AsyncClient` instance, instantiated at FastAPI lifespan, timeout 15s, `http2=True`. Retry policy via tenacity: 3 attempts, exponential backoff 0.5s → 2s → 8s, retry on connection errors, 5xx, and 424 (Squad's re-queryable timeout/failed status).

### 8.2 Endpoints we use (Dynamic VAs)

| Endpoint | Method + Path | Doc URL |
|---|---|---|
| **Create DVA in pool** | `POST /virtual-account/create-dynamic-virtual-account` | <https://docs.squadco.com/Virtual-accounts/dynamic-virtual-account-v2> |
| **Initiate DVA transaction** | `POST /virtual-account/initiate-dynamic-virtual-account` | same |
| **Edit DVA amount/duration** | `PATCH /virtual-account/update-dynamic-virtual-account-time-and-amount` | same |
| **Re-query DVA transactions** | `GET /virtual-account/get-dynamic-virtual-account-transactions/{transaction_reference}` | same |
| **Simulate DVA payment (sandbox)** | `POST /virtual-account/simulate/payment` (with `dva: true`) | same |
| **Initiate Payment (Modal fallback)** | `POST /transaction/initiate` | <https://docs.squadco.com/Payments/Initiate-payment> |
| **Verify Transaction** | `GET /transaction/verify/{transaction_ref}` | <https://docs.squadco.com/Payments/verify-transaction> |
| **Account Lookup** | `POST /payout/account/lookup` | <https://docs.squadco.com/Transfer-API/transfer-apis> |
| **Fund Transfer (disbursement)** | `POST /payout/transfer` | same |
| **Re-query Transfer** | `POST /payout/requery` | same |
| **Refund** | `POST /transaction/refund` | <https://docs.squadco.com/Others/refund-api> |

### 8.3 Dynamic VA lifecycle

**One-time setup (at app boot, idempotent):**

On lifespan startup, check if the merchant's DVA pool exists. If not, call `POST /virtual-account/create-dynamic-virtual-account` once. Squad assigns one VA to the pool per call. For the hackathon, a small pool (5-10 accounts) is plenty. Track pool creation state in Redis under `dealr:squad:dva_pool_seeded`.

**Per-job initiate (when transitioning PRICED → AGREED):**

Call `POST /virtual-account/initiate-dynamic-virtual-account` with:

```python
{
    "amount": price_kobo,                 # exact AI-priced amount, in kobo
    "transaction_ref": str(job.id),       # our job UUID; becomes merchant_reference in webhook
    "duration": 86400,                    # 24 hours in seconds
    "email": client.email,
}
```

Squad returns an assigned VA: `{account_number, expected_amount, expires_at, transaction_reference, bank}`. Store `account_number` on `jobs.squad_virtual_account_id` and `expires_at` on `jobs.payment_expires_at`.

**Why DVAs over Static VAs:** built-in amount enforcement (MISMATCH webhook + auto-refund if wrong amount), built-in expiry (no custodial risk), no BVN friction on the payer side. Matches DEALR's per-job semantics exactly.

**Edit before payment (optional):** if artisan and client renegotiate before payment lands, call `PATCH /update-dynamic-virtual-account-time-and-amount` with the same `transaction_reference`.

### 8.4 Transfer reference rule — DO NOT VIOLATE

Squad requires the merchant ID prefixed onto every Transfer `transaction_reference`. From the docs verbatim: *"Please ensure that you append your merchant ID to the transaction Reference you are creating. This is compulsory as it will throw an error if you don't append it."*

Format encoded in `app/squad/refs.py`:

```python
def build_transfer_ref(job_id: UUID) -> str:
    """Squad requires {MERCHANT_ID}_{unique_part}."""
    return f"{settings.SQUAD_MERCHANT_ID}_{job_id.hex[:8]}_{ulid.new()}"
```

Reference is stored on `squad_transactions.squad_ref` BEFORE the Transfer call (write-ahead). On 424 (timeout/failed): **re-query with `POST /payout/requery`** using the SAME ref. Do NOT retry the Transfer with the same ref (= double payment risk). Only after requery confirms failure, retry with a NEW ref.

### 8.5 Webhook signature verification — mandatory

DEALR receives THREE webhook flavors. Each has a different signature scheme. Treat them separately.

**A. Dynamic VA webhook** — SUCCESS, MISMATCH, EXPIRED events from DVA-assigned payments.

- **Header:** `x-squad-encrypted-body`
- **Algorithm:** HMAC-SHA512 over the JSON-serialized object `{transaction_reference, amount_received, merchant_reference}` (exactly these three fields, in this order, no whitespace), using the secret key.
- **Doc:** <https://docs.squadco.com/Virtual-accounts/dynamic-virtual-account-v2#hash-signature-validation>

```python
# app/squad/webhooks.py
import hmac, hashlib, json

def verify_dva_signature(payload: dict, header_sig: str, secret: str) -> bool:
    """Dynamic VA webhook V2 signature verification.

    Per Squad docs: HMAC-SHA512 of JSON-serialized 3-field dict using secret key.
    Field order matters: transaction_reference, amount_received, merchant_reference.
    Serialization must produce no whitespace (compact JSON).
    """
    try:
        data = {
            "transaction_reference": payload["transaction_reference"],
            "amount_received": payload["amount_received"],
            "merchant_reference": payload["merchant_reference"],
        }
    except KeyError:
        return False
    json_str = json.dumps(data, separators=(",", ":"))  # compact, no whitespace
    digest = hmac.new(
        secret.encode("utf-8"),
        json_str.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(digest, header_sig.lower())
```

**Note:** Squad's reference impl is in C#. Python's `json.dumps` may produce subtly different output than .NET's `JsonSerializer.Serialize` (key escaping, unicode). Once a real DVA webhook is captured during sandbox testing, validate this verifier against it. If it doesn't match first try, the issue is JSON serialization byte-equivalence — adjust separators or escaping until it matches.

**B. Payment Modal webhook** (for `/transaction/initiate` Modal flow, used as fallback only).

- **Header:** `x-squad-encrypted-body`
- **Algorithm:** HMAC-SHA512 of the full raw request body.

```python
def verify_payment_signature(raw_body: bytes, header_sig: str, secret: str) -> bool:
    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(digest, header_sig.lower())
```

**C. Transfer/Refund webhooks** — confirm with Squad docs at time of implementation; the Modal-style full-body HMAC pattern typically applies.

**Webhook handler protocol** (all flavors, `app/api/webhooks.py`):

1. Read raw body. Do NOT parse before verification.
2. Verify signature. If invalid → log + return 400.
3. Persist raw payload (idempotent on `squad_ref` / `transaction_reference`).
4. Enqueue Celery task. Return 200.
5. The Celery task: parse, verify-by-requery, drive FSM.

**Idempotency:** Squad may retry. Celery task checks `squad_transactions.processed_at IS NOT NULL` before acting. Squad explicitly: *"Ensure that you have a duplicate transaction checker."*

### 8.6 Verify-before-act protocol

Before money-moving state transitions, additionally re-query Squad. Cache verified results in Redis (`dealr:verify:{ref}`, 1h TTL).

- AGREED → ESCROWED: webhook signature is sufficient (DVA SUCCESS only fires on amount-matched, within-window payment by definition).
- CONFIRMED → RELEASED: call `GET /transaction/verify/{ref}` for the original DVA transaction OR `POST /payout/requery` after Transfer. Both must be Success.
- RESOLVED_REFUND → REFUNDED: re-query Refund status before final state change.

### 8.7 SMS notifications

Squad SMS V2 (Value Added Services). Endpoint: <https://docs.squadco.com/Value-added-services/vas>. Fetch live docs before implementing — endpoint shapes change. Fall back to Twilio if Squad SMS isn't profiled in time.

### 8.8 Error mapping

In `app/squad/errors.py`:

```
200       → success
400       → SquadBadRequestError       (caller bug — don't retry)
401, 403  → SquadAuthError             (config — alert)
404       → SquadNotFoundError
412       → SquadReversedError         (transfer was reversed)
422       → SquadUnprocessableError    (caller bug — don't retry)
424       → SquadRequeryableError      (must re-query, do not retry)
5xx       → SquadTransientError        (retry per tenacity)
```

---

## 9. AI module contract

The AI module exposes a typed surface. Allison writes prompts + retrieval inside `app/ai/`. The rest of the backend treats it as a black box behind:

```python
async def price_job(spec: JobSpec) -> PricePrediction: ...
async def embed_profile(profile: ArtisanProfile | SeekerProfile) -> list[float]: ...
async def match_seeker_to_postings(seeker_id: UUID, k: int = 10) -> list[Match]: ...
async def compute_credit_features(user_id: UUID) -> CreditFeatures: ...
async def score_credit(features: CreditFeatures) -> CreditTier: ...
async def classify_dispute(message: str, language: str = "en_NG") -> DisputeClass: ...
async def generate_agreement(job: Job, language: str = "en_NG") -> Agreement: ...
async def transcribe(audio_bytes: bytes, language_hint: str = "en_NG") -> Transcription: ...
```

**Pricing engine — non-negotiable rules:**

1. Pricing is **RAG-grounded**. LLM call MUST include top-K=8 similar past jobs retrieved via pgvector cosine similarity on `jobs.description_embedding`.
2. LLM call MUST include current market context (fuel, FX, materials) cached in Redis with 1h TTL. If market fetch fails, log and proceed with stale values — never block pricing.
3. LLM uses structured output (Claude tool use). Schema is `PricePrediction`:

```python
class PriceBreakdownItem(BaseModel):
    label: str
    amount_kobo: int
    source_job_ids: list[UUID] = Field(default_factory=list)

class PricePrediction(BaseModel):
    base_price_kobo: int
    breakdown: list[PriceBreakdownItem]
    range_low_kobo: int
    range_high_kobo: int
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning_summary: str
    model_version: str
    retrieved_job_ids: list[UUID]
    market_snapshot: dict[str, Any]
```

4. EVERY prediction logged to `job_predictions` BEFORE returning. No silent discards — this is the feedback-loop substrate.
5. NEVER call the LLM with an empty retrieval set. If corpus has no comparables, return confidence-flagged result (`confidence < 0.4`) with explanatory `reasoning_summary`.

**Embeddings:** Voyage AI `voyage-3-lite` (384-d), pgvector HNSW (`m=16, ef_construction=64`, query `ef_search=40`).

**Bias guard:** prompt explicitly instructs the model to ignore artisan gender and to price equivalently regardless of Pidgin vs English. Regression test asserts equivalent prices within 5%.

---

## 10. API surface (for the frontend, later)

All routes under `/api/v1`. JSON only. `Authorization: Bearer <jwt>` unless **PUBLIC**.

### Auth

```
POST /auth/request-otp       body: {phone}                       → {otp_token, expires_in}
POST /auth/verify-otp        body: {otp_token, otp_code}         → {access_token, refresh_token, user}
POST /auth/refresh           body: {refresh_token}               → {access_token, refresh_token}
```

### Users

```
GET   /users/me                                                  → UserMe
PATCH /users/me              body: UserPatch                     → UserMe
POST  /users/onboard-artisan body: ArtisanOnboard                → UserMe
POST  /users/onboard-client  body: ClientOnboard                 → UserMe
```

### Jobs

```
POST /jobs                   body: {description, language, client_phone, location, urgency}
                                                                  → JobDetail (PRICED + PricePrediction)
GET  /jobs                   ?status=…                           → list[JobSummary]
GET  /jobs/{id}                                                  → JobDetail
POST /jobs/{id}/start                                            # ESCROWED → IN_PROGRESS
POST /jobs/{id}/deliver                                          # IN_PROGRESS → DELIVERED
POST /jobs/{id}/dispute      body: {reason, language}
GET  /jobs/{id}/agreement                                        → Agreement
```

### Shareable link (PUBLIC)

```
GET  /share/{share_token}                                        → JobPublic
POST /share/{share_token}/accept                                 # PRICED → AGREED, returns DVA + checkout
POST /share/{share_token}/confirm                                # DELIVERED → CONFIRMED
POST /share/{share_token}/dispute  body: {reason, language}
```

### Match / Credit

```
GET  /match/feed             ?limit=20                           → list[MatchedPosting]
POST /match/{posting_id}/interested                              → 204
GET  /credit/me                                                  → {tier, score, factors}
GET  /credit/offers                                              → list[CreditOffer]
POST /credit/offers/{id}/accept                                  → CreditOffer
```

### AI helpers

```
POST /ai/transcribe          multipart: audio                    → {text, language, confidence}
POST /ai/price-preview       body: {description, language, ...}  → PricePrediction
```

### Webhooks (Squad → us)

```
POST /webhooks/squad/dva          # DVA SUCCESS / MISMATCH / EXPIRED
POST /webhooks/squad/payment      # Modal payment (fallback path)
POST /webhooks/squad/transfer
POST /webhooks/squad/refund
```

### Admin (env-gated)

```
POST /admin/simulate-payment      body: {virtual_account_number, amount_kobo}
GET  /admin/jobs/{id}/ledger                                     → ledger entries
GET  /admin/bias-audit                                           → audit data
POST /admin/jobs/{id}/transition  body: {to_state}
```

### Error envelope

```json
{
  "error": {"code": "domain.specific", "message": "human", "details": {}},
  "request_id": "..."
}
```

Codes: `job.invalid_state_transition`, `squad.requeryable`, `auth.otp_expired`, `validation.field_required`, etc.

---

## 11. Testing requirements

### Coverage gates

Overall ≥75%. The following MUST be ≥90%:

- `app/squad/webhooks.py` (signature verification — security-critical)
- `app/services/jobs.py` (state machine)
- `app/services/ledger.py` (money correctness)
- `app/squad/refs.py` (reference building)
- `app/squad/client.py` (retry logic)

### Test database setup (no Docker)

Since we use Supabase, integration tests run against either:

1. **A second Supabase project** (`dealr-test`) — preferred. Configure `TEST_DATABASE_URL` in `.env.test`. Tests wrap each test in `BEGIN ... ROLLBACK` for isolation. Schema is identical to dev.
2. **Schema-isolated** — one Supabase project, separate schema `test_dealr`. Less clean; use only if creating a second project is impractical.

`tests/conftest.py` creates an async engine pointing at `TEST_DATABASE_URL`, uses `pytest-asyncio` session-scoped fixtures, and rolls back per-test. Squad calls are mocked with `respx` against `app/squad/client.py`'s shared httpx client.

### Mandatory test fixtures

In `tests/fixtures/squad/`:

- `dva_webhook_success.json`, `dva_webhook_mismatch.json`, `dva_webhook_expired.json`
- `dva_webhook_bad_signature.json`
- `payment_modal_webhook.json`
- `transfer_success_webhook.json`, `transfer_failed_webhook.json` (424 case)
- `refund_success_webhook.json`
- `verify_tx_success.json`, `verify_tx_failed.json`, `verify_tx_pending.json`

### Pricing regression tests

Two sample inputs:

1. *English:* "I need a wedding gown sewn, two-layer with lace, by Saturday"
2. *Pidgin:* "I wan sew wedding gown, two layer, lace, this Saturday"

Both → `price_job()`. Assert `abs(en - pidgin) / en < 0.05`. Language-equity bias guard.

### Ledger invariant tests

For every job in test data: `sum(debit) == sum(credit)`. For every active state: positive `client_liability:{job_id}` balance.

---

## 12. Definition of Done

A feature is done when ALL of these are true:

- [ ] Code in correct module per §4
- [ ] Type hints complete; `mypy app` clean
- [ ] `ruff check . --fix && ruff format .` clean
- [ ] Pydantic v2 schemas for any new wire I/O
- [ ] Migrations generated and applied for any DB change
- [ ] Unit tests for new pure logic
- [ ] Integration test for any new endpoint or Squad call
- [ ] Logged structured events at info level for new state transitions
- [ ] Squad calls: idempotent, retry-aware, verified
- [ ] Error paths mapped to standard envelope
- [ ] Manual smoke run via /docs UI or curl
- [ ] No new `TODO` without a tracking comment `# TODO(joseph): <note>`

---

## 13. Demo & seed data

Seed must produce a state where the 60-second demo runs.

```
Artisan: Tope Adebayo (Mushin), tailor
Client:  Adaeze Okeke (Lekki)
50 past tailoring jobs in Lagos with realistic pricing distribution
30 mock job postings tagged with trades + locations
Trust scores pre-computed
```

Demo BVNs are sandbox-valid only — loaded from `.env`, never committed. `scripts/simulate_payment.py --dva` fakes a customer paying into the DVA during rehearsal.

`uv run python scripts/seed.py --reset` drops + recreates demo data idempotently.

---

## 14. Logging

State transitions:

```python
log.info(
    "job.transition",
    job_id=str(job.id),
    from_state=prev.value,
    to_state=next.value,
    trigger="webhook|user|admin",
    actor_id=str(actor_id),
)
```

Squad calls (before + after):

```python
log.info("squad.call.start", endpoint="/payout/transfer", ref=ref)
log.info("squad.call.done", endpoint="/payout/transfer", ref=ref, status_code=200, latency_ms=…)
```

Errors at warning (caller bug) or error (our bug/outage). Mask phone middle (`0801***0001`). Never log secrets, BVNs, full PANs.

---

## 15. Security checklist

- BVN: never raw. Only `bvn_hash` (SHA-256 + app-wide salt).
- Phone: stored full for SMS, masked in logs.
- JWT: 15-min access, 7-day refresh. Refresh in Redis, revocable.
- OTP: 6-digit, 5-min TTL, hashed at rest, max 5 attempts/hour/phone.
- Squad keys: env only.
- Webhook handlers: reject if signature missing/invalid or IP not in allowed list.
- SQL injection: SQLAlchemy parameterization only.
- Shareable links: signed JWTs, 30-day TTL, single-use OTP before client can pay.
- CORS: locked to known frontend origins. No wildcard.
- Rate limit: 60/min/IP on auth, 600/min/user on data (slowapi).

---

## 16. Glossary

| Term | Meaning |
|---|---|
| **Escrow agent** | The legal entity holding funds in trust. DEALR is; Squad isn't. |
| **In-trust ledger** | DEALR's internal double-entry record of held funds. |
| **Master account** | DEALR's Squad wallet. |
| **DVA** | Dynamic Virtual Account — Squad-issued per-transaction account number, amount-locked and time-bound. |
| **MISMATCH** | DVA webhook event: payer sent wrong amount. Squad auto-refunds. |
| **EXPIRED** | DVA webhook event: duration elapsed without success. Squad auto-refunds any partial. |
| **Kobo** | 1/100 naira. Internal money unit, always integer. |
| **Re-query** | Squad's idempotent transaction-status check. Always the response to a Transfer 424. |
| **Pillar** | One of the Squad Hackathon judging categories. |

---

## 17. When you are uncertain

1. Design question about **what** to build → check `docs/ARCHITECTURE.md`.
2. Question about **how Squad behaves** → fetch the doc URL in §8. Do not guess.
3. Question about **a project rule** → it's in this file. Ask Joseph if you can't find it.
4. About to break a rule in §6 → stop. Ask.
5. Contradiction between this file and `docs/ARCHITECTURE.md` → **this file wins**. Flag in your response.
6. **The current prompt's scope is unclear** → ask Joseph before guessing. Never extrapolate prompt scope.

---

## 18. Closing prompt protocol (repeat from §0)

After every prompt's work is complete, your final message includes:

- ✅ A bullet list: what was built
- ✅ Exact verification commands to run
- ✅ The literal sentence: **"Awaiting verification. Will not proceed until you confirm."**
- ✅ Optional: numbered "noticed but did not do" suggestions for Joseph's decision

Then you stop. You do not continue. You do not start the next prompt until Joseph confirms.

---

*Last updated: 2026-05-13. Owner: Joseph (backend).*