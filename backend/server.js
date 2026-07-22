require("dotenv").config();


const nodeFetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
if (!globalThis.fetch) globalThis.fetch = nodeFetch;

const express  = require("express");
const cors     = require("cors");
const axios    = require("axios");
const crypto   = require("crypto");

// ── Strip hidden \r or surrounding quotes from env vars ─────────────────────
const clean = (v = "") => v.replace(/\r/g, "").replace(/^["']|["']$/g, "").trim();

const GEMINI_API_KEY      = clean(process.env.GEMINI_API_KEY);
const MONNIFY_API_KEY     = clean(process.env.MONNIFY_API_KEY);
const MONNIFY_SECRET_KEY  = clean(process.env.MONNIFY_SECRET_KEY);
const MONNIFY_CONTRACT    = clean(process.env.MONNIFY_CONTRACT_CODE);
const MONNIFY_WEBHOOK_SECRET = clean(process.env.MONNIFY_WEBHOOK_SECRET || "");

const MONNIFY_BASE = "https://sandbox.monnify.com";

const app = express();
app.use(cors());
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "Dealr backend running" }));

// ════════════════════════════════════════════════════════════════════════════
// AI — /ask-ai  (Gemini)
// ════════════════════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `You are Dealr AI — a pricing assistant for Nigerian artisans.
When the user describes a job and a proposed price, analyse it and reply ONLY with this exact JSON structure.
No markdown fences, no extra text before or after the JSON:

{
  "verdict": "Fair" | "Too Low" | "Too High",
  "valid": true | false,
  "range": "₦X,000 – ₦Y,000",
  "breakdown": {
    "Item name": "₦Amount",
    "Item name": "₦Amount"
  },
  "note": "1-2 sentence plain English advice in the Nigerian market context"
}

Rules:
- Use realistic 2024/2025 Nigerian market rates for Lagos and Abuja
- Factor in materials, labour time, skill level, urgency
- "valid" is true if the proposed price is within or above market range
- Keep breakdown to 3-5 line items maximum
- Write the note in warm, direct language — like a mentor, not a textbook`;

app.post("/ask-ai", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT + "\n\nUser message: " + prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512
      }
    };

    const response = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" }
    });

    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Strip any markdown fences Gemini might add despite instructions
    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    res.json({ reply: cleaned });

  } catch (err) {
    console.error("❌ /ask-ai error:", err.response?.data || err.message);
    res.status(500).json({
      error: "AI request failed",
      details: err.response?.data?.error?.message || err.message
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MONNIFY — helpers
// ════════════════════════════════════════════════════════════════════════════
async function getMonnifyToken() {
  const credentials = Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString("base64");

  const response = await axios.post(
    `${MONNIFY_BASE}/api/v1/auth/login`,
    {},                                              // empty body — Monnify needs this
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json"
      }
    }
  );

  const token = response.data?.responseBody?.accessToken;
  if (!token) throw new Error("No access token returned by Monnify");
  return token;
}

// ════════════════════════════════════════════════════════════════════════════
// PAYMENTS — /pay  (initialise Monnify transaction)
// ════════════════════════════════════════════════════════════════════════════
app.post("/pay", async (req, res) => {
  try {
    // Normalise field names — handle both camelCase and snake_case from frontend
    const amount      = req.body.amount      || req.body.Amount;
    const email       = req.body.email       || req.body.customerEmail || "client@dealr.app";
    const jobId       = req.body.jobId       || req.body.job_id        || `JOB-${Date.now()}`;
    const customerName = req.body.customerName || req.body.name        || "Dealr Client";

    if (!amount || Number(amount) < 100) {
      return res.status(400).json({ error: "Invalid amount — must be ≥ 100 (₦)" });
    }

    const token = await getMonnifyToken();

    // paymentReference must be unique every time
    const paymentReference = `DEALR-${jobId}-${Date.now()}`;

    const payload = {
      amount:             Number(amount),
      customerName,
      customerEmail:      email,
      paymentReference,
      paymentDescription: `Dealr escrow payment — Job #${jobId}`,
      currencyCode:       "NGN",
      contractCode:       MONNIFY_CONTRACT,
      redirectUrl:        process.env.FRONTEND_URL || "http://localhost:5173/payment-success",
      paymentMethods:     ["CARD", "ACCOUNT_TRANSFER", "USSD", "PHONE_NUMBER"]
    };

    const response = await axios.post(
      `${MONNIFY_BASE}/api/v1/merchant/transactions/init-transaction`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const body = response.data?.responseBody;
    if (!body?.checkoutUrl) throw new Error("No checkoutUrl returned");

    res.json({
      checkoutUrl:        body.checkoutUrl,
      paymentReference:   body.paymentReference,
      transactionRef:     body.transactionReference,
      status:             body.status
    });

  } catch (err) {
    console.error("❌ /pay error:", err.response?.data || err.message);
    res.status(500).json({
      error:   "Payment initiation failed",
      details: err.response?.data?.responseMessage || err.message
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PAYMENTS — /pay/verify  
// ════════════════════════════════════════════════════════════════════════════
app.get("/pay/verify/:reference", async (req, res) => {
  try {
    const token = await getMonnifyToken();
    const ref = encodeURIComponent(req.params.reference);

    const response = await axios.get(
      `${MONNIFY_BASE}/api/v2/transactions/${ref}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(response.data?.responseBody || {});

  } catch (err) {
    console.error("❌ /pay/verify error:", err.response?.data || err.message);
    res.status(500).json({ error: "Verification failed", details: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// WEBHOOK — /webhook/monnify  (Monnify payment notifications)
// ════════════════════════════════════════════════════════════════════════════
app.post("/webhook/monnify", express.raw({ type: "application/json" }), (req, res) => {
  try {
    // Verify signature if secret is set
    if (MONNIFY_WEBHOOK_SECRET) {
      const signature = req.headers["monnify-signature"] || "";
      const hash = crypto
        .createHmac("sha512", MONNIFY_WEBHOOK_SECRET)
        .update(req.body)
        .digest("hex");

      if (hash !== signature) {
        console.warn("⚠️  Webhook signature mismatch");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const event = JSON.parse(req.body.toString());
    const { eventType, eventData } = event;

    console.log(`📩 Webhook received: ${eventType}`);

    // Handle payment events
    switch (eventType) {
      case "SUCCESSFUL_TRANSACTION":
        console.log(`✅ Payment confirmed: ${eventData?.transactionReference} — ₦${eventData?.amountPaid}`);
        // TODO: update job status to "escrow" in DB
        break;

      case "FAILED_TRANSACTION":
        console.log(`❌ Payment failed: ${eventData?.transactionReference}`);
        // TODO: notify artisan and client
        break;

      case "REVERSED_TRANSACTION":
        console.log(`↩️  Payment reversed: ${eventData?.transactionReference}`);
        break;

      default:
        console.log(`ℹ️  Unhandled event: ${eventType}`);
    }

    res.status(200).json({ received: true });

  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Dealr backend running on port ${PORT}`);
  console.log(`   AI:      ${GEMINI_API_KEY ? "✅ Gemini key loaded" : "❌ GEMINI_API_KEY missing"}`);
  console.log(`   Monnify: ${MONNIFY_API_KEY ? "✅ API key loaded" : "❌ MONNIFY_API_KEY missing"}`);
  console.log(`   Contract:${MONNIFY_CONTRACT ? "✅ Contract code loaded" : "❌ MONNIFY_CONTRACT_CODE missing"}\n`);
});