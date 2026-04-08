import { getMatches } from "../_lib/cricket.js";
import { broadcast } from "../_lib/tg.js";
import { getPreds, saveResult, getAccuracy } from "../_lib/db.js";
import { verifyCron } from "../_lib/config.js";

export default async function handler(req, res) {
  if (!verifyCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const matches = await getMatches();
  const preds = await getPreds(50);
  let checked = 0;
  for (const m of matches) {
    const s = m.status?.toLowerCase() || "";
    if (!s.includes("won") && !s.includes("result")) continue;
    const pred = preds.find(p => p.matchId === m.id);
    if (!pred) continue;
    const winner = s.split(" won")[0]?.trim();
    const correct = winner && pred.prediction && winner.toLowerCase().includes(pred.prediction.toLowerCase().split(" ")[0]);
    await saveResult({ matchId: m.id, matchName: m.name, predicted: pred.prediction, actual: winner, correct: !!correct });
    const acc = await getAccuracy();
    await broadcast(`🏁 <b>MATCH RESULT!</b>\n\n🏏 <b>${m.name}</b>\nResult: ${m.status}\n\n${correct ? "✅" : "❌"} AI was <b>${correct ? "CORRECT 🎉" : "wrong 😅"}</b>\n\n📈 Overall Accuracy: <b>${acc.pct}%</b>`);
    checked++;
  }
  res.json({ ok: true, checked });
}
