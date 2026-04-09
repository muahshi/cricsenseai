export const config = {
  groqKey:       process.env.GROQ_KEY || "",
  cricketKey:    process.env.CRICKET_KEY || "",
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramGroup: process.env.TELEGRAM_GROUP_ID || "",
  mongoUri:      process.env.MONGODB_URI || "",
  cronSecret:    process.env.CRON_SECRET || "",
  appUrl:        process.env.VERCEL_URL
                   ? "https://" + process.env.VERCEL_URL
                   : "http://localhost:3000"
};

export function verifyCron(req) {
  const secret = (req.query && req.query.secret) || "";
  return secret === config.cronSecret;
}
