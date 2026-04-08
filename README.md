# 🏏 CricSense AI — India's #1 Cricket Intelligence

> AI-powered cricket predictions, live analysis, Telegram bot & automated alerts.
> **All API keys are server-side only — never exposed to the browser.**

---

## 🚀 Vercel Deploy Steps (5 minutes)

### Step 1 — GitHub pe push karo
```bash
git init
git add .
git commit -m "CricSense AI"
git remote add origin https://github.com/YOUR_USERNAME/cricsense-ai.git
git push -u origin main
```

### Step 2 — Vercel pe import karo
1. [vercel.com](https://vercel.com) → **New Project**
2. Apna GitHub repo select karo
3. Framework: **Other**
4. Deploy karo

### Step 3 — Environment Variables add karo
Vercel Dashboard → Project → **Settings → Environment Variables**

| Variable | Value | Kahan se milega |
|----------|-------|-----------------|
| `CRICKET_KEY` | cricapi key | [cricapi.com](https://cricapi.com) — FREE (100/day) |
| `GROQ_KEY` | groq key | [console.groq.com](https://console.groq.com) — FREE |
| `ODDS_KEY` | odds key | [the-odds-api.com](https://the-odds-api.com) — optional |
| `TELEGRAM_BOT_TOKEN` | bot token | [@BotFather](https://t.me/BotFather) on Telegram |
| `TELEGRAM_GROUP_ID` | group ID | [@userinfobot](https://t.me/userinfobot) se pata karo |
| `MONGODB_URI` | mongo uri | [mongodb.com/atlas](https://mongodb.com/atlas) — FREE 512MB (optional) |
| `CRON_SECRET` | koi bhi string | Khud banao, e.g. `abc123xyz` |

### Step 4 — Redeploy (keys apply karne ke liye)
Vercel Dashboard → Deployments → **Redeploy**

### Step 5 — Telegram webhook register karo (ek baar)
```
https://YOUR-APP.vercel.app/api/setup?secret=YOUR_CRON_SECRET
```

---

## 📁 File Structure

```
cricsense-ai/
├── index.html              ← Frontend (NO API keys!)
├── package.json
├── vercel.json             ← Routing + cron config
├── .env.example            ← Env vars template
│
└── api/
    ├── predictions.js      ← GET /api/predictions — matches + win prob
    ├── ai.js               ← POST /api/ai — AI analysis (GROQ_KEY server-side)
    ├── telegram.js         ← POST /api/telegram — bot webhook
    ├── setup.js            ← GET /api/setup — register webhook
    │
    ├── _lib/
    │   ├── config.js       ← All env vars
    │   ├── db.js           ← MongoDB + in-memory fallback
    │   ├── cricket.js      ← Cricket data + AI
    │   └── tg.js           ← Telegram sender
    │
    └── cron/
        ├── daily.js        ← 9 AM broadcast (30 3 * * *)
        ├── prematch.js     ← Pre-match alerts (*/30 * * * *)
        └── results.js      ← Result checker (0 * * * *)
```

---

## 🔒 Security Architecture

```
Browser (index.html)
      |
      | /api/predictions  (no keys needed)
      | /api/ai           (no keys needed)
      ↓
Vercel Serverless Functions
      |
      | GROQ_KEY (server only)
      | CRICKET_KEY (server only)
      | TELEGRAM_BOT_TOKEN (server only)
      ↓
External APIs (Groq, CricAPI, Telegram)
```

Frontend mein **zero API keys** — sab kuch `/api/` endpoints ke through jaata hai.

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/predictions` | GET | Matches + win probability + AI predictions |
| `/api/ai` | POST | AI tab analysis (Ball/Wicket/Score etc.) |
| `/api/telegram` | POST | Telegram bot webhook |
| `/api/setup?secret=...` | GET | Register Telegram webhook |
| `/api/cron/daily?secret=...` | GET | Manual daily broadcast trigger |
| `/api/cron/prematch?secret=...` | GET | Manual pre-match alert trigger |
| `/api/cron/results?secret=...` | GET | Manual results check trigger |

---

## 🔍 Troubleshooting

**App kholne pe koi match nahi dikh raha?**
→ CRICKET_KEY Vercel env mein add hai? Redeploy kiya?
→ Demo matches automatically dikhne chahiye

**AI analysis kaam nahi kar raha?**
→ GROQ_KEY check karo Vercel env mein
→ 3 model fallbacks hain + static fallback bhi hai

**Telegram bot reply nahi kar raha?**
→ `/api/setup?secret=YOUR_SECRET` run karo
→ TELEGRAM_BOT_TOKEN correct hai?

**Cron jobs nahi chal rahe?**
→ Vercel Pro chahiye for built-in crons
→ Free alternative: [cron-job.org](https://cron-job.org) pe URLs add karo with `?secret=YOUR_SECRET`

---

*⚠️ Entertainment only · 18+ · Responsible Gambling · India 🇮🇳*
