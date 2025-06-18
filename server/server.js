import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'path';
import Entry from "./models/entry.js";
import User from "./models/user.js";
import connectDB from "./db.js";
import mongoose from 'mongoose';

const users = [];
const PORT = 3000;


mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
  });

const ENTRIES_FILE = path.join(process.cwd(), 'journalEntries.json');
const app = express();
app.use(cors());
app.use(express.json());

console.log("🔑 OpenRouter API Key loaded:", process.env.OPENROUTER_API_KEY ? "Yes" : "No");

app.post('/reflect', async (req, res) => {
  try {
    const { entry, mood, memoryContext } = req.body;

    if (!entry || !mood) {
      return res.status(400).json({ error: 'Missing journal entry or mood' });
    }

    const payload = {
      model: 'mistralai/mistral-7b-instruct',
      messages: [
        { role: "system", content: "You are a helpful AI memory companion journaling assistant." },
        { role: "user", content: `Here is my journal entry: "${entry}"\n\nMood: ${mood}\n\nMemory:\n${memoryContext}` }
      ]
    };

    console.log("🧠 Sending to OpenRouter:", payload);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      const text = await response.text();
      console.error("❌ Failed to parse JSON. Raw response:", text);
      return res.status(500).json({ error: 'Invalid response from OpenRouter API', raw: text });
    }

    if (!response.ok) {
      console.error("❌ OpenRouter API error:", data);
      return res.status(500).json({ error: data });
    }

    res.json(data);

  } catch (error) {
    console.error('🔥 Reflect endpoint error:', error.stack || error);
    res.status(500).json({ error: 'Failed to fetch AI response.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Check if user already exists
  const existingUser = users.find(user => user.username === username);
  if (existingUser) {
    return res.status(409).json({ error: 'Username already taken.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword };
    users.push(newUser);

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (err) {
    console.error('Error in /register:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: 'User already exists' });

    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Signup successful' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Signup failed' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log("Incoming login data:", req.body);

  try {
    console.log("Looking for user with email:", email);
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'your_secret',
      { expiresIn: '1d' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your_secret', (err, decoded) => {
    if (err) return res.sendStatus(403);

    if (!decoded.userId) {
      console.log("❌ No userId found in token payload");
      return res.sendStatus(403);
    }

    req.userId = decoded.userId;
    console.log("✅ Token verified. User ID:", req.userId);
    next();
  });
}

app.post('/save-entry', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret');

    const userId = decoded.userId; // ✅ Important: use .userId
    if (!userId) {
      console.log("❌ No userId found in token payload");
      return res.status(400).json({ error: "Invalid token payload" });
    }

    const { content, mood, trigger, response, date } = req.body;

    console.log("📝 Entry save payload:", { content, mood, trigger, response, date, userId });

    const newEntry = new Entry({
      content,
      mood,
      trigger,
      response,
      date,
      userId: new mongoose.Types.ObjectId(userId) // ✅ Correct way
    });

    await newEntry.save();
    res.status(201).json({ message: "Entry saved successfully!" });

  } catch (error) {
    console.error("❌ Error saving entry:", error.message);
    if (error.name === 'ValidationError') {
      for (let field in error.errors) {
        console.error(`⚠️ Validation error - ${field}:`, error.errors[field].message);
      }
    } else {
      console.error("❌ Full error stack:", error);
    }

    res.status(500).json({ error: "Failed to save entry" });
  }
});

