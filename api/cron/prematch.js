import { getMatches, getPrediction } from "../_lib/cricket.js";
import { broadcast } from "../_lib/tg.js";
import { verifyCron } from "../_lib/config.js";

export default async function handler(req, res) {
  if (!verifyCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const matches = await getMatches();
  const now = Date.now(), HOUR = 3600000;
  const soon = matches.filter(m => {
    const t = new Date(m.date || m.dateTimeGMT || 0).getTime();
    return t > now && t <= now + HOUR;
  });
  for (const m of soon) {
    const p = await getPrediction(m);
    await broadcast(`⚡ <b>MATCH ALERT — 1 GHANTE MEIN!</b>\n\n🏏 <b>${m.name}</b>\n${m.matchType} · ${m.series}\n\n🤖 ${p.text}\n\n🏆 Predicted: <b>${p.winner}</b> (${p.confidence}%)\n\n<i>⚠️ Entertainment only.</i>`);
  }
  res.json({ ok: true, sent: soon.length });
}
