export default async function handler(req, res) {
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const GROUP_ID  = process.env.TELEGRAM_GROUP_ID;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: GROUP_ID,
        text: "🌅 <b>Good Morning! CricSense AI Daily Update</b>\n\n🏏 Aaj ke matches check karo:\nhttps://cricsenseai.vercel.app",
        parse_mode: "HTML",
      }),
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}