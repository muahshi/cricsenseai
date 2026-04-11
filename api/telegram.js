const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID  = process.env.TELEGRAM_GROUP_ID;

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { message } = req.body;
    if (!message) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;
    const text   = message.text || "";
    const user   = message.from?.first_name || "User";

    if (text.startsWith("/start")) {
      await sendMessage(chatId,
        `🏏 <b>CricSense AI mein aapka swagat hai ${user}!</b>\n\n` +
        `Commands:\n/matches - Aaj ke matches\n/prediction - AI prediction\n/accuracy - Accuracy stats\n/help - Help`
      );
    } else if (text.startsWith("/matches")) {
      await sendMessage(chatId, "🏏 <b>Aaj ke matches load ho rahe hain...</b>\nApp dekho: https://cricsenseai.vercel.app");
    } else if (text.startsWith("/prediction")) {
      await sendMessage(chatId, "🧠 <b>AI Prediction:</b>\nApp mein jaake match select karo aur Analysis Shuru Karo dabao!");
    } else if (text.startsWith("/accuracy")) {
      await sendMessage(chatId, "📊 <b>CricSense AI Accuracy: 73.8%</b>\n42 predictions mein se 31 sahi!");
    } else if (text.startsWith("/help")) {
      await sendMessage(chatId,
        "🆘 <b>Help</b>\n\n/start - Start\n/matches - Matches\n/prediction - Prediction\n/accuracy - Stats\n\n🌐 App: https://cricsenseai.vercel.app"
      );
    } else {
      await sendMessage(chatId, "🏏 CricSense AI — /help type karo commands ke liye!");
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}