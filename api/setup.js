export default async function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const domain = req.headers.host;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://${domain}/api/telegram` }),
      }
    );
    const data = await response.json();
    return res.status(200).json({ success: true, telegram: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}