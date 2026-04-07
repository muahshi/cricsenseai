# 🏏 CricSense AI — India's #1 Cricket Intelligence

> AI-powered cricket predictions, live analysis, Telegram bot, and automated alerts.

![CricSense AI](https://img.shields.io/badge/CricSense-AI%20Cricket-00e5ff?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Live-39ff14?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-2.0-ff6b35?style=for-the-badge)

---

## ⚡ Quick Deploy (GitHub Pages — Zero Build!)

1. **Fork / Upload** this repo to GitHub
2. Go to **Settings → Pages → Source: main branch / root**
3. Open `index.html` and add your API keys in the `CFG` object at the top
4. Done! Your app is live at `https://yourusername.github.io/cricsense-ai/`

```javascript
// In index.html, find this section and add your keys:
const CFG = {
  CRICKET_KEY: "your-cricapi-key",   // https://cricapi.com
  GROQ_KEY:    "your-groq-key",      // https://console.groq.com (FREE)
  ODDS_KEY:    "your-odds-key",      // Optional
};
```

---

## 📁 File Structure

```
cricsense-ai/
│
├── index.html          ← MAIN APP (self-contained, no build needed!)
│
├── api/                ← Vercel Serverless Functions (for Telegram bot)
│   ├── telegram.js     ← Telegram webhook handler
│   ├── predictions.js  ← Predictions API
│   ├── setup.js        ← One-time webhook setup
│   └── _lib/
│       ├── config.js   ← Environment variables
│       ├── db.js       ← MongoDB + in-memory DB
│       ├── cricket.js  ← Cricket data + AI
│       └── telegram.js ← Telegram message sender
│
├── api/cron/
│   ├── daily.js        ← 9 AM daily broadcast
│   ├── prematch.js     ← Pre-match alerts
│   └── results.js      ← Result checker
│
├── vercel.json         ← Vercel config + cron jobs
├── package.json        ← For Vercel deployment
└── .env.example        ← Environment variables template
```

---

## 🎯 Features

### Frontend (index.html)
- ✅ **Onboarding** — 3-screen animated intro
- ✅ **Live Match List** — Real matches via CricketData API
- ✅ **Win Probability Gauge** — SVG animated ring
- ✅ **AI Analysis** — 7 tabs (Ball · Wicket · Score · Market · Momentum · Player · WhatIf)
- ✅ **Ball-by-Ball Prediction** — Next 6 balls with probabilities
- ✅ **LAGAI/KHAI Signals** — With exact odds
- ✅ **Market Trap Detection** — Smart money alerts
- ✅ **Momentum Meter** — Live team momentum tracking
- ✅ **Recent Deliveries** — Ball-by-ball history
- ✅ **AI Chatbot** — Match-specific Q&A
- ✅ **Demo Mode** — Works without any API key!
- ✅ **Auto Refresh** — Every 60 seconds

### Telegram Bot
- `/start` — Register + welcome
- `/matches` — Today's matches
- `/prediction` — AI prediction
- `/accuracy` — Prediction accuracy
- `/stats` — Total users + predictions
- `/help` — All commands

---

## 🔑 API Keys (All Free!)

| API | Purpose | Free Tier |
|-----|---------|-----------|
| [CricAPI](https://cricapi.com) | Live cricket data | 100 req/day |
| [Groq](https://console.groq.com) | AI analysis (Llama 3.3) | Generous free tier |
| [The Odds API](https://the-odds-api.com) | Live odds | 500 req/month |
| [Telegram BotFather](https://t.me/BotFather) | Bot token | Free |
| [MongoDB Atlas](https://mongodb.com/atlas) | Database | 512MB free |

---

## 🚀 Deploy on Vercel (Full Stack with Bot)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "CricSense AI initial commit"
git remote add origin https://github.com/yourusername/cricsense-ai.git
git push -u origin main
```

### 2. Connect to Vercel
- Go to [vercel.com](https://vercel.com) → New Project → Import your repo
- Framework: **Other** (or Vite if using React build)

### 3. Set Environment Variables in Vercel
```
VITE_GROQ_KEY         = gsk_xxxxxxxx
VITE_CRICKET_KEY      = xxxxxxxx  
VITE_ODDS_KEY         = xxxxxxxx
TELEGRAM_BOT_TOKEN    = 1234567890:xxxxx
TELEGRAM_GROUP_ID     = -1003807280474
MONGODB_URI           = mongodb+srv://...
CRON_SECRET           = your-random-secret
```

### 4. Register Telegram Webhook (ONE TIME)
```
https://your-app.vercel.app/api/setup?secret=your-random-secret
```

### 5. Setup Cron Jobs (Free at cron-job.org)
```
Daily:    https://your-app.vercel.app/api/cron/daily?secret=SECRET    → 9 AM IST (30 3 * * *)
Prematch: https://your-app.vercel.app/api/cron/prematch?secret=SECRET → Every 30 min
Results:  https://your-app.vercel.app/api/cron/results?secret=SECRET  → Every hour
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Pure HTML + React (via CDN, no build!) |
| Styling | CSS Variables + Inline Styles |
| AI | Groq Llama 3.3-70B (3 model fallbacks) |
| Cricket Data | CricAPI (cricapi.com) |
| Backend | Vercel Serverless Functions |
| Database | MongoDB Atlas + In-memory fallback |
| Bot | Telegram Bot API |

---

## 🔍 Troubleshooting

**App not loading?**
→ Check browser console for errors
→ Make sure you're serving via HTTP (not file://)

**No live matches?**
→ CRICKET_KEY not set → Demo matches show automatically
→ Free tier = 100 req/day, use demo mode to save quota

**AI not working?**
→ Add GROQ_KEY in CFG object in index.html
→ AI has 3 model fallbacks + static fallback

**Telegram bot not responding?**
→ Run setup endpoint: `/api/setup?secret=YOUR_SECRET`
→ Check TELEGRAM_BOT_TOKEN is correct in Vercel env vars

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/telegram` | POST | Telegram webhook receiver |
| `/api/predictions` | GET | All matches + AI predictions |
| `/api/predictions?type=accuracy` | GET | Prediction accuracy stats |
| `/api/setup?secret=...` | GET | Register Telegram webhook |
| `/api/cron/daily?secret=...` | GET | Trigger daily broadcast |
| `/api/cron/prematch?secret=...` | GET | Trigger pre-match alerts |
| `/api/cron/results?secret=...` | GET | Check + broadcast results |

---

## ⚠️ Disclaimer

*CricSense AI is for entertainment purposes only. Not financial advice. 18+ only. Please gamble responsibly.*

---

*Made with ❤️ for Indian cricket fans 🇮🇳*
