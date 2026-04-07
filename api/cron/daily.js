import { getCurrentMatches, generatePrediction } from "../_lib/cricket.js";
import { broadcastToGroup, broadcastToAll } from "../_lib/telegram.js";
import { getAllUsers, savePrediction } from "../_lib/db.js";
import { verifyCronSecret, config } from "../_lib/config.js";

export default async function handler(req, res) {
  if (!verifyCronSecret(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const matches = await getCurrentMatches();

    if (!matches.length) {
      await broadcastToGroup("🏏 Aaj koi live match nahi hai. Kal ke liye taiyar rahein!");
      return res.status(200).json({ ok: true, message: "No matches today" });
    }

    // Build daily summary
    let msg = `🌅 <b>CricSense AI — Aaj Ki Cricket!</b>\n\n`;
    msg += `📅 ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}\n\n`;

    const liveMatches = matches.filter(m => {
      const s = m.status?.toLowerCase() || "";
      return s === "live" || s === "1" || s.includes("progress");
    });

    const upcomingMatches = matches.filter(m => {
      const s = m.status?.toLowerCase() || "";
      return !s.includes("live") && s !== "1" && !s.includes("progress");
    });

    if (liveMatches.length > 0) {
      msg += `🔴 <b>LIVE Matches (${liveMatches.length}):</b>\n`;
      for (const m of liveMatches.slice(0, 3)) {
        const score = m.score?.[0];
        msg += `• ${m.name}\n`;
        if (score) msg += `  📊 ${score.r}/${score.w} (${score.o} ov)\n`;
      }
      msg += "\n";
    }

    if (upcomingMatches.length > 0) {
      msg += `⏰ <b>Upcoming Matches (${upcomingMatches.length}):</b>\n`;
      for (const m of upcomingMatches.slice(0, 3)) {
        msg += `• ${m.name} — ${m.matchType}\n`;
      }
      msg += "\n";
    }

    // AI prediction for first live or upcoming match
    const targetMatch = liveMatches[0] || upcomingMatches[0];
    if (targetMatch) {
      try {
        const pred = await generatePrediction(targetMatch);
        await savePrediction({
          matchId: targetMatch.id,
          matchName: targetMatch.name,
          prediction: pred.winner,
          confidence: pred.confidence,
        });

        msg += `🤖 <b>AI Prediction:</b>\n`;
        msg += `${pred.text}\n\n`;
        msg += `🏆 Predicted Winner: <b>${pred.winner}</b> (${pred.confidence}% confidence)\n\n`;
      } catch {}
    }

    msg += `👉 <a href="${config.appUrl}">Live Analysis Web App</a>\n\n`;
    msg += `<i>⚠️ Entertainment only. 18+ Responsible gambling.</i>`;

    // Send to group
    await broadcastToGroup(msg);

    // Optionally broadcast to all users (be careful with rate limits)
    const users = await getAllUsers();
    if (users.length > 0 && users.length <= 50) {
      await broadcastToAll(users, msg);
    }

    return res.status(200).json({
      ok: true,
      matchesBroadcast: matches.length,
      usersNotified: users.length,
    });

  } catch (e) {
    console.error("Daily cron error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

