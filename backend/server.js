import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import crypto from "crypto";

dotenv.config();

// ── Strip hidden characters from env vars ─────────────────────────────────────
const clean = (v) => (v || "").replace(/[\r\n\s]+$/g, "").trim();

const MONNIFY_API_KEY       = clean(process.env.MONNIFY_API_KEY);
const MONNIFY_SECRET_KEY    = clean(process.env.MONNIFY_SECRET_KEY);
const MONNIFY_CONTRACT_CODE = clean(process.env.MONNIFY_CONTRACT_CODE);
const MONNIFY_BASE          = "https://sandbox.monnify.com";

// ── Warn about missing keys on startup ───────────────────────────────────────
const REQUIRED = { GEMINI_API_KEY, MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE };
Object.entries(REQUIRED).forEach(([k, v]) => {
  if (!v) console.warn(`⚠️  Missing env var: ${k}`);
});

const app = express();
app.use(cors());

// Raw body for webhook signature verification — JSON for everything else
app.use((req, res, next) => {
  if (req.path === "/webhook/monnify") {
    let raw = "";
    req.on("data", (c) => { raw += c.toString(); });
    req.on("end", () => { req.rawBody = raw; next(); });
  } else {
    express.json()(req, res, next);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// HEALTH
// ════════════════════════════════════════════════════════════════════════════
app.get("/", (_req, res) => res.json({ status: "ok", service: "Dealr Backend" }));
app.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ════════════════════════════════════════════════════════════════════════════
// AI  —  POST /price
// Frontend sends: { prompt: string }
// Backend calls:  Claude API
// Returns:        { reply: string }  ← JSON string the frontend parses
// ════════════════════════════════════════════════════════════════════════════
const GEMINI_API_KEY = clean(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Dealr AI, a pricing expert for Nigerian artisans in Lagos, Abuja, and Port Harcourt.

When the user describes a job and a proposed price, respond with ONLY a valid JSON object.
No markdown. No code fences. No text outside the JSON.

Format:
{
  "verdict": "Fair" or "Too Low" or "Too High",
  "valid": true or false,
  "range": "₦X,000 – ₦Y,000",
  "breakdown": {
    "Line item name": "₦Amount"
  },
  "note": "1-2 sentences of plain English advice for the Nigerian market"
}

Rules:
- Use real 2024/2025 Nigerian market rates
- Include 3-5 breakdown items
- "valid" is true when proposed price is at or above the fair range floor
- Convert shorthand: 50k = ₦50,000, 120k = ₦120,000
- Never wrap output in markdown code blocks`;

app.post("/price", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini error:", err);
      return res.status(502).json({ error: "Gemini API error", details: err });
    }

    const data = await response.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Strip any accidental markdown fences before sending
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    res.json({ reply: cleaned });
  } catch (err) {
    console.error("❌ /price:", err.message);
    res.status(500).json({ error: "AI request failed", details: err.message });
  }
});

// Keep /ask-ai as an alias so old frontend calls still work
app.post("/ask-ai", (req, res) => {
  req.url = "/price";
  app._router.handle(req, res);
});

// ════════════════════════════════════════════════════════════════════════════
// MONNIFY HELPER  —  Get Bearer token
// ════════════════════════════════════════════════════════════════════════════
async function getMonnifyToken() {
  const credentials = Buffer.from(
    `${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`
  ).toString("base64");

  const response = await fetch(`${MONNIFY_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),   // Monnify login requires an empty JSON body
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Monnify auth failed: ${err}`);
  }

  const data  = await response.json();
  const token = data?.responseBody?.accessToken;
  if (!token) throw new Error("No accessToken in Monnify response");
  return token;
}

// ════════════════════════════════════════════════════════════════════════════
// PAY  —  POST /pay
// Frontend sends: { amount: number, email: string, jobId: string }
// Returns:        { checkoutUrl: string, paymentReference: string }
// ════════════════════════════════════════════════════════════════════════════
app.post("/pay", async (req, res) => {
  try {
    // Accept multiple field name conventions from the frontend
    const amount = req.body.amount ?? req.body.Amount;
    const email  = req.body.email  ?? req.body.customerEmail ?? "client@dealr.app";
    const jobId  = req.body.jobId  ?? req.body.job_id ?? `JOB_${Date.now()}`;
    const name   = req.body.name   ?? req.body.customerName ?? "Dealr Client";
    const desc   = req.body.description ?? "Dealr Job Payment";

    // Validate
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number (in Naira)" });
    }

    const token = await getMonnifyToken();

    // Unique reference — alphanumeric only, max 64 chars
    const paymentReference = `DEALR-${String(jobId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}-${Date.now()}`;

    const response = await fetch(
      `${MONNIFY_BASE}/api/v1/merchant/transactions/init-transaction`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numAmount,
          customerName: name,
          customerEmail: email,
          paymentReference,
          paymentDescription: desc,
          currencyCode: "NGN",
          contractCode: MONNIFY_CONTRACT_CODE,
          redirectUrl: process.env.REDIRECT_URL ?? "http://localhost:5173/payment-success",
          paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD", "PHONE_NUMBER"],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Monnify /pay error:", errText);
      return res.status(502).json({ error: "Monnify rejected the request", details: errText });
    }

    const data = await response.json();
    const body = data?.responseBody;
    if (!body?.checkoutUrl) throw new Error("No checkoutUrl in Monnify response");

    res.json({
      success: true,
      checkoutUrl: body.checkoutUrl,
      transactionReference: body.transactionReference,
      paymentReference,
    });
  } catch (err) {
    console.error("❌ /pay:", err.message);
    res.status(500).json({ error: "Payment initiation failed", details: err.message });
  }
});

// Legacy route alias — frontend may call /initiate-payment
app.post("/initiate-payment", (req, res) => {
  req.url = "/pay";
  app._router.handle(req, res);
});

// ════════════════════════════════════════════════════════════════════════════
// VERIFY  —  GET /pay/verify/:ref
// Returns Monnify transaction status for a given paymentReference
// ════════════════════════════════════════════════════════════════════════════
app.get("/pay/verify/:ref", async (req, res) => {
  try {
    const token    = await getMonnifyToken();
    const response = await fetch(
      `${MONNIFY_BASE}/api/v2/merchant/transactions/query?paymentReference=${req.params.ref}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    res.json(data?.responseBody ?? {});
  } catch (err) {
    console.error("❌ /pay/verify:", err.message);
    res.status(500).json({ error: "Verification failed", details: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PAYOUT  —  POST /payout
// Triggered when client confirms delivery → releases escrow to artisan
// Frontend sends: { amount: number, jobId: string }
// ════════════════════════════════════════════════════════════════════════════
app.post("/payout", async (req, res) => {
  try {
    const { amount, jobId, accountNumber, bankCode, accountName } = req.body;

    if (!amount || !jobId) {
      return res.status(400).json({ error: "amount and jobId are required" });
    }

    // If no real bank details provided yet, simulate the payout for demo
    if (!accountNumber || !bankCode) {
      console.log(`[DEMO] Simulating payout of ₦${amount} for job ${jobId}`);
      return res.json({
        success: true,
        message: `₦${Number(amount).toLocaleString()} released to artisan successfully`,
        status: "SIMULATED",
      });
    }

    const token    = await getMonnifyToken();
    const response = await fetch(`${MONNIFY_BASE}/api/v2/disbursements/single`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(amount),
        reference: `DEALR-PAY-${String(jobId).replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}`,
        narration: "Dealr job payment release",
        destinationBankCode: bankCode,
        destinationAccountNumber: accountNumber,
        currency: "NGN",
        destinationAccountName: accountName ?? "Artisan",
        async: false,
      }),
    });

    const data = await response.json();
    res.json({ success: true, message: "Payout initiated", data: data?.responseBody });
  } catch (err) {
    console.error("❌ /payout:", err.message);
    res.status(500).json({ error: "Payout failed", details: err.message });
  }
});

// Legacy alias
app.post("/withdraw", (req, res) => {
  req.url = "/payout";
  app._router.handle(req, res);
});

// ════════════════════════════════════════════════════════════════════════════
// WEBHOOK  —  POST /webhook/monnify
// Monnify posts here after every transaction event
// ════════════════════════════════════════════════════════════════════════════
app.post("/webhook/monnify", (req, res) => {
  try {
    const sig = req.headers["monnify-signature"];
    if (sig && MONNIFY_SECRET_KEY) {
      const computed = crypto
        .createHmac("sha512", MONNIFY_SECRET_KEY)
        .update(req.rawBody ?? "")
        .digest("hex");
      if (computed !== sig) {
        console.warn("⚠️  Webhook signature mismatch — rejected");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const { eventType, eventData } = JSON.parse(req.rawBody ?? "{}");
    console.log(`📩 Webhook: ${eventType} | ref: ${eventData?.paymentReference ?? eventData?.reference}`);

    switch (eventType) {
      case "SUCCESSFUL_TRANSACTION":
        // TODO: mark job as "escrow" in DB, notify artisan
        break;
      case "FAILED_TRANSACTION":
        // TODO: mark job as "payment_failed", notify client
        break;
      case "SUCCESSFUL_DISBURSEMENT":
        // TODO: mark job as "done", notify both parties
        break;
    }

    // Always return 200 — Monnify retries on anything else
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Webhook:", err.message);
    res.status(200).json({ received: true });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n Dealr backend on port ${PORT}`);
  console.log(`   GET  /health`);
  console.log(`   POST /price          ← AI pricing (Claude)`);
  console.log(`   POST /pay            ← Monnify checkout`);
  console.log(`   GET  /pay/verify/:ref`);
  console.log(`   POST /payout         ← Release escrow to artisan`);
  console.log(`   POST /webhook/monnify\n`);
});