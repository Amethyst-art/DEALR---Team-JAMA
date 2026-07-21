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

   
    const cleanApiKey = process.env.GEMINI_API_KEY.replace(/["'\s]/g, "");

    
    const ai = new GoogleGenAI({ apiKey: cleanApiKey });

    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are the Dealr Price Advisor specializing in the Nigerian freelance artisan market. 
      Analyze the requested trade transaction. Give your brief conversational summary text analysis. 
      At the absolute end of your response, you MUST output a raw JSON block formatted EXACTLY like this layout framework:

      \`\`\`json
      {
        "breakdown": {
          "Base Service Cost": "₦45,000",
          "Material Requirements": "₦25,000",
          "Logistics/Markup": "₦10,000"
        },
        "range": "₦75,000 - ₦90,000",
        "valid": true,
        "verdict": "Fair Price"
      }
      \`\`\`

      User requested transaction details: ${prompt}`,
    });

    res.json({ 
      success: true,
      reply: response.text 
    });

  } catch (err) {
    console.error("Gemini Failure Logs:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, () => console.log("Dealr backend running on port 5000"));
