import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("🚀 Dealr backend is running");
});

/* =========================
   CLAUDE ENDPOINT
========================= */
app.post("/ask-ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    res.json({
      success: true,
      reply: data.content?.[0]?.text || "No response"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "AI request failed"
    });
  }
});

/* =========================
   MONNIFY MOCK - ACCOUNT CREATION
========================= */
app.post("/create-account", (req, res) => {
  const { name } = req.body;

  // Simulated Monnify response
  res.json({
    success: true,
    data: {
      accountName: `${name} - Dealr Wallet`,
      accountNumber: "80" + Math.floor(Math.random() * 100000000),
      bankName: "Moniepoint (Monnify)"
    }
  });
});

/* =========================
   MONNIFY MOCK - PAYMENT INITIATION
========================= */
app.post("/initiate-payment", (req, res) => {
  const { amount } = req.body;

  res.json({
    success: true,
    message: "Payment initiated",
    amount,
    status: "PENDING"
  });
});

/* =========================
   MONNIFY MOCK - PAYMENT CONFIRMATION
========================= */
app.post("/confirm-payment", (req, res) => {
  res.json({
    success: true,
    status: "SUCCESS",
    message: "Payment confirmed and split between vendor & platform"
  });
});

/* =========================
   WITHDRAW (SIMULATED PAYOUT)
========================= */
app.post("/withdraw", (req, res) => {
  const { amount, accountNumber } = req.body;

  res.json({
    success: true,
    message: `₦${amount} sent to ${accountNumber}`,
    status: "COMPLETED"
  });
});

/* =========================
   START SERVER
========================= */
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});