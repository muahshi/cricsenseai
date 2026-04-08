import { getMatches, getPrediction } from "../_lib/cricket.js";
import { broadcast } from "../_lib/tg.js";
import { savePred } from "../_lib/db.js";
import { verifyCron, config } from "../_lib/config.js";

export default async function handler(req, res) {
  if (!verifyCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const matches = await getMatches();
  if (!matches.length) { await broadcast("🏏 Aaj koi match nahi hai."); return res.json({ ok: true }); }

  const live = matches.filter(m => ["live","1"].includes(m.status?.toLowerCase()));
  const upcoming = matches.filter(m => !["live","1"].includes(m.status?.toLowerCase()));

  let msg = `🌅 <b>CricSense AI — Aaj Ki Cricket!</b>\n\n`;
  if (live.length) {
    msg += `🔴 <b>Live (${live.length}):</b>\n`;
    live.slice(0,3).forEach(m => {
      const s = m.score?.[0];
      msg += `• ${m.name}\n${s ? `  📊 ${s.r}/${s.w} (${s.o} ov)\n` : ""}`;
    });
    msg += "\n";
  }
  if (upcoming.length) {
    msg += `⏰ <b>Upcoming (${upcoming.length}):</b>\n`;
    upcoming.slice(0,3).forEach(m => { msg += `• ${m.name} — ${m.matchType}\n`; });
    msg += "\n";
  }

  const target = live[0] || upcoming[0];
  if (target) {
    const p = await getPrediction(target);
    await savePred({ matchId: target.id, matchName: target.name, prediction: p.winner, confidence: p.confidence });
    msg += `🤖 <b>AI Prediction:</b>\n${p.text}\n\n🏆 Winner: <b>${p.winner}</b> (${p.confidence}%)\n\n`;
  }
  msg += `<i>⚠️ Entertainment only. 18+ Responsible gambling.</i>`;
  await broadcast(msg);
  res.json({ ok: true, matchCount: matches.length });
}
