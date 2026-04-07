import { getCurrentMatches, generatePrediction } from "../_lib/cricket.js";
import { broadcastToGroup } from "../_lib/telegram.js";
import { verifyCronSecret, config } from "../_lib/config.js";

export default async function handler(req, res) {
  if (!verifyCronSecret(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const matches = await getCurrentMatches();
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    // Find matches starting within 1 hour
    const upcoming = matches.filter(m => {
      const matchTime = new Date(m.date || m.dateTimeGMT || 0).getTime();
      const diff = matchTime - now;
      return diff > 0 && diff <= ONE_HOUR;
    });

    if (!upcoming.length) {
      return res.status(200).json({ ok: true, message: "No upcoming matches in 1 hour" });
    }

    for (const match of upcoming) {
      const pred = await generatePrediction(match);
      const matchTime = new Date(match.date || match.dateTimeGMT).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit",
      });

      const msg = `⚡ <b>MATCH ALERT — 1 GHANTE MEIN!</b>

🏏 <b>${match.name}</b>
📋 ${match.matchType} | ${match.series}
📍 ${match.venue || "TBD"}
🕐 ${matchTime} IST

🤖 <b>Pre-Match AI Prediction:</b>
${pred.text}

🏆 Predicted Winner: <b>${pred.winner}</b>
📊 Confidence: ${pred.confidence}%

👉 <a href="${config.appUrl}">Live Analysis karo!</a>

<i>⚠️ Entertainment only. Responsible gambling.</i>`;

      await broadcastToGroup(msg);
    }

    return res.status(200).json({
      ok: true,
      alertsSent: upcoming.length,
      matches: upcoming.map(m => m.name),
    });

  } catch (e) {
    console.error("Prematch cron error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

