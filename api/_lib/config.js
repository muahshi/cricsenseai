export const config = {
  // Support ALL possible naming variations Vercel pe ho sakti hain
  groqKey:       process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.GROQ || "",
  cricketKey:    process.env.CRICKET_API_KEY || process.env.CRICKET_KEY || process.env.CRICKETDATA_KEY || "",
  oddsKey:       process.env.ODDS_API_KEY || process.env.ODDS_KEY || "",
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "",
  telegramGroup: process.env.TELEGRAM_GROUP_ID || process.env.TELEGRAM_GROUP || "",
  mongoUri:      process.env.MONGODB_URI || process.env.MONGO_URI || "",
  cronSecret:    process.env.CRON_SECRET || "",
  appUrl:        process.env.VERCEL_URL
                   ? "https://" + process.env.VERCEL_URL
                   : "http://localhost:3000"
};

export function verifyCron(req) {
  const secret = (req.query && req.query.secret) || "";
  return secret === config.cronSecret;
}
