export default async function handler(req, res) {
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
  const GROUP_ID   = process.env.TELEGRAM_GROUP_ID;
  const CRICKET_KEY = process.env.VITE_CRICKET_KEY;

  try {
    const r = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${CRICKET_KEY}&offset=0`
    );
    const data = await r.json();
    const finished = (data.data || []).filter(m => m.matchEnded).slice(0, 2);

    if (finished.length > 0) {
      const list = finished.map(m => `✅ ${m.name}\n${m.status}`).join("\n\n");
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: GROUP_ID,
          text: `🏆 <b>Match Results</b>\n\n${list}`,
          parse_mode: "HTML",
        }),
      });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}