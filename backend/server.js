require("dotenv").config(); 

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/ask-ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: "Missing GEMINI_API_KEY inside environment configuration." });
    }

    const cleanApiKey = process.env.GEMINI_API_KEY.trim();

    
    const targetUrl = `https://googleapis.com{cleanApiKey}`; 
;
    
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are the Dealr Price Advisor specializing in the Nigerian freelance artisan market. 
            Analyze the requested trade transaction. Give your brief conversational summary text analysis. 
            At the absolute end of your response, you MUST output a raw JSON block formatted EXACTLY like this layout framework:

            \`\`\`json
            {
              "breakdown": {
                "Base Service Cost": "₦15,000",
                "Logistics/Markup": "₦5,000"
              },
              "range": "₦15,000 - ₦25,000",
              "valid": true,
              "verdict": "Fair Price"
            }
            \`\`\`

            User requested transaction details: ${prompt}`
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(JSON.stringify(data.error));
    }

    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({
      success: true,
      reply: aiResponseText || "No response generated."
    });

  } catch (err) {
    console.error("Gemini Failure Logs:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const axios = require("axios");

// Get Monnify access token
async function getMonnifyToken() {
  const credentials = Buffer.from(
    `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`
  ).toString("base64");

  const res = await axios.post(
    "https://sandbox.monnify.com/api/v1/auth/login",
    {},
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  return res.data.responseBody.accessToken;
}

// Initiate payment
app.post("/pay", async (req, res) => {
  try {
    const token = await getMonnifyToken();
    const { amount, email, jobId } = req.body;

    const response = await axios.post(
      "https://sandbox.monnify.com/api/v1/merchant/transactions/init-transaction",
      {
        amount,
        customerName: "Dealr Client",
        customerEmail: email,
        paymentReference: `DEALR-${jobId}-${Date.now()}`,
        paymentDescription: "Dealr Job Payment",
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        redirectUrl: "http://localhost:5173/payment-success",
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "BANK"],
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ checkoutUrl: response.data.responseBody.checkoutUrl });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Payment initiation failed" });
  }
});

app.listen(5000, () => console.log("Dealr backend running on port 5000"));
