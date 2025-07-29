import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Prompt from "./models/Prompt.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect MongoDB and seed default prompt
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    const existingPrompt = await Prompt.findOne();
    if (!existingPrompt) {
      await Prompt.create({
        prompt: `You are a highly specialized AI Finance Assistant. You ONLY answer questions about:
- Personal finance
- Budgeting
- Investments
- Saving plans
- Taxes
- Financial planning
- Business finance

If a user asks anything else, respond with:
"I'm a finance assistant. Please ask finance-related questions only."`,
      });
      console.log("📝 Default system prompt inserted into MongoDB.");
    }
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));
// 🧠 Chat Route: Finance Assistant
app.post("/api/chat", async (req, res) => {
  const userMessages = req.body.messages || [];

  // Load latest system prompt from DB
  const promptDoc = await Prompt.findOne().sort({ updatedAt: -1 });
  const systemPrompt =
    promptDoc?.prompt ||
    `You are a highly specialized AI Finance Assistant. You ONLY answer questions about:
- Personal finance
- Budgeting
- Investments
- Saving plans
- Taxes
- Financial planning
- Business finance

If a user asks anything else, respond with:
"I'm a finance assistant. Please ask finance-related questions only."`;

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...userMessages,
  ];

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    res.json(response.data);
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "OpenAI request timed out." });
    }
    console.error("OpenAI Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to get response from GPT" });
  }
});

// 🎨 Image Generator Route
app.post("/api/image/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        prompt,
        n: 1,
        size: "512x512",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const imageUrl = response.data.data[0].url;
    res.json({ imageUrl });
  } catch (error) {
    console.error("Image generation error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate image." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
