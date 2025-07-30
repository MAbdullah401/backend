// ✅ BACKEND (server.js)
import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import SystemPrompt from "./models/SystemPrompt.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.get("/api/chat/prompt", async (req, res) => {
  try {
    const latestPrompt = await SystemPrompt.findOne().sort({ updatedAt: -1 });
    res.json({ prompt: latestPrompt?.systemPrompt || "" });
  } catch (err) {
    res.status(500).json({ error: "Failed to load prompt" });
  }
});

app.put("/api/chat/prompt", async (req, res) => {
  const { newPrompt } = req.body;
  if (!newPrompt) return res.status(400).json({ error: "New prompt is required." });

  try {
    const updated = await SystemPrompt.create({ systemPrompt: newPrompt });
    res.json({ message: "✅ Prompt updated successfully", prompt: updated.systemPrompt });
  } catch (err) {
    res.status(500).json({ error: "Failed to update prompt" });
  }
});

app.get("/api/prompt/history", async (req, res) => {
  try {
    const history = await SystemPrompt.find().sort({ createdAt: -1 });
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.post("/api/chat/talk", async (req, res) => {
  const { userPrompt } = req.body;
  if (!userPrompt) return res.status(400).json({ error: "User prompt is required." });

  try {
    const promptDoc = await SystemPrompt.findOne().sort({ updatedAt: -1 });
    const systemPrompt = promptDoc?.systemPrompt || "You are a helpful assistant.";

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

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
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("OpenAI Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to get response from GPT" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));