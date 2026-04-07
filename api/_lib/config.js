// ─── ALL ENVIRONMENT VARIABLES ───────────────────────────────────────────────
export const config = {
  groqKey: process.env.VITE_GROQ_KEY || "",
  oddsKey: process.env.VITE_ODDS_KEY || "",
  cricketKey: process.env.VITE_CRICKET_KEY || "",
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramGroupId: process.env.TELEGRAM_GROUP_ID || "",
  mongoUri: process.env.MONGODB_URI || "",
  cronSecret: process.env.CRON_SECRET || "default-secret",
  appUrl: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://my-cricket-bot.vercel.app",
};

export function verifyCronSecret(req) {
  const { secret } = req.query || {};
  return secret === config.cronSecret;
}

