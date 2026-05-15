# DEALR — Fair Pricing. Guaranteed Payment.
### Built by Team JAMA · Squad AI Hackathon 2026

> *"Deals done right, every time"*
> *"Deals done right, every time"*

---

## What is Dealr?

Nigeria has over 120 million artisans. 76–80% have no access to market 
pricing intelligence. 40% report being owed money after completing work.

Dealr fixes both problems in one flow.

An artisan describes a job in plain English or Pidgin. Dealr instantly:
- Generates a **fair market price** with a full cost breakdown
- Creates a **plain-language agreement** (no lawyers needed)
- Secures payment in **Squad-powered escrow** before work begins
- Releases funds only when the client **confirms delivery**

No guesswork. No ghosting. No silence.

---

## Live Demo Flow

| Step | What Happens |
|------|-------------|
| 1 | Artisan describes job: *"One senator kaftan, hand embroidery, 4 days"* |
| 2 | Claude AI returns fair price range + cost breakdown |
| 3 | Agreement generated automatically |
| 4 | Client receives shareable link, reviews terms, pays via Squad |
| 5 | Funds held in escrow |
| 6 | Client confirms delivery and Squad releases payment to artisan |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (mobile-first) |
| Backend | Python · FastAPI |
| Database | SQLite |
| AI Pricing | Claude API (Anthropic) |
| Payments | Squad API (Escrow) |
| Notifications | Termii |

---

## Squad API Integration

Dealr uses Squad's escrow API as its **core trust mechanism** — not a 
surface integration.

- `POST /payments/initiate` — client pays, funds held in escrow
- Escrow hold confirmed to both artisan and client
- `POST /payments/confirm` — client confirms delivery, Squad releases funds
- Dispute flag pauses the flow and holds funds pending review

---

## AI Pricing Engine

The Claude-powered pricing engine analyses:
- Job type and complexity
- Material cost benchmarks (Nigerian market rates)
- Labour time estimates
- Urgency and customisation factors

Returns a structured JSON response:
```json
{
  "materials": 5000,
  "labour": 7200,
  "overhead": 1220,
  "recommended_price": 16800,
  "floor_price": 13440
}
```

---

## Hackathon Pillars

| Pillar | How Dealr Delivers |
|--------|-------------------|
| AI Automation | Pricing engine automates market intelligence in seconds |
| Squad APIs | Escrow is the trust mechanism — payment is the product |
| Use of Data | Structured pricing signals from job type, materials, labour |
| Financial Innovation | First fair transaction layer for Nigeria's informal economy |

---

## How to Run Locally

```bash
# Clone the repo
git clone https://github.com/Adebimpe100/DEALR---Team-JAMA.git
cd DEALR---Team-JAMA

# Install dependencies
npm install

# Add your environment variables
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, SQUAD_API_KEY

# Run the pricing test
node test.js
```

---

## Demo Seed Jobs (for testing the AI)
"One senator kaftan with hand embroidery, delivery in 4 days"
"Weld compound gate, 3.5 metres wide, 2 metres high, delivery in 3 days"
"Full hair and makeup for traditional wedding, 3 people, Saturday morning"
"Event decoration for birthday, 200 guests, balloon arch and centrepieces"

---

## The Problem We're Solving

- **120M+** artisans in Nigeria's informal economy
- **76–80%** lack access to market pricing intelligence
- **40%** report being owed wages after delivery
- **Zero** structured protection for either party

Dealr doesn't just help people get paid.
It ensures every price is fair, every agreement is clear, 
and every payment is guaranteed.

---

## SDG Alignment

- **SDG 1** — No Poverty: protects artisan income
- **SDG 8** — Decent Work: fair, reliable working conditions
- **SDG 9** — Innovation: data-driven pricing infrastructure
- **SDG 10** — Reduced Inequalities: formal tools for informal workers

---

## Team JAMA

| Member | Role |
|--------|------|
| Allison | Product Lead · AI Integration · Creative |
| Mojolajesu | Frontend · UI/UX |
| Joseph | Backend · Payments |
| Adebimpe | Project Management |

---

*Squad AI Hackathon · 2026*
