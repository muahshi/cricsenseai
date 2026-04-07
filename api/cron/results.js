import { getCurrentMatches } from "../_lib/cricket.js";
import { broadcastToGroup } from "../_lib/telegram.js";
import { getPredictions, saveResult, getAccuracy } from "../_lib/db.js";
import { verifyCronSecret, config } from "../_lib/config.js";

export default async function handler(req, res) {
  if (!verifyCronSecret(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const matches = await getCurrentMatches();
    const predictions = await getPredictions(50);

    let resultsChecked = 0;

    for (const match of matches) {
      const status = match.status?.toLowerCase() || "";
      const isFinished = status.includes("won") || status.includes("result") ||
        status.includes("complete") || status.includes("finished");

      if (!isFinished) continue;

      // Find prediction for this match
      const pred = predictions.find(p => p.matchId === match.id);
      if (!pred) continue;

      // Determine winner from status
      const winner = status.includes("won") ? match.status.split(" won")[0].trim() : null;
      const correct = winner && pred.prediction &&
        winner.toLowerCase().includes(pred.prediction.toLowerCase().split(" ")[0]);

      await saveResult({
        matchId: match.id,
        matchName: match.name,
        predicted: pred.prediction,
        actual: winner || "Unknown",
        correct: !!correct,
      });

      resultsChecked++;

      // Broadcast result
      const acc = await getAccuracy();
      const msg = `🏁 <b>MATCH RESULT!</b>

🏏 <b>${match.name}</b>
📊 Result: ${match.status}

${correct ? "✅" : "❌"} AI Prediction: <b>${pred.prediction}</b> — ${correct ? "SAHI NIKLA! 🎉" : "Is baar chuuk gayi AI 😅"}

📈 <b>Overall Accuracy: ${acc.percentage}%</b>

👉 <a href="${config.appUrl}">Next match analysis</a>`;

      await broadcastToGroup(msg);
    }

    const finalAcc = await getAccuracy();

    return res.status(200).json({
      ok: true,
      resultsChecked,
      accuracy: finalAcc,
    });

  } catch (e) {
    console.error("Results cron error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

