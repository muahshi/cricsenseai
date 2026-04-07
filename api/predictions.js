import { getCurrentMatches, generatePrediction, calcWinProb } from "./_lib/cricket.js";
import { getAccuracy, savePrediction } from "./_lib/db.js";

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { type } = req.query;

  try {
    // ─── ACCURACY STATS ───────────────────────────────────────────────────
    if (type === "accuracy") {
      const acc = await getAccuracy();
      return res.status(200).json({ ok: true, data: acc });
    }

    // ─── ALL MATCHES + PREDICTIONS ───────────────────────────────────────
    const matches = await getCurrentMatches();

    const results = await Promise.all(
      matches.slice(0, 10).map(async (match) => {
        const prob = calcWinProb(match);
        let prediction = null;

        // Only generate AI prediction for live matches
        const isLive = match.status?.toLowerCase() === "live" ||
          match.status === "1" ||
          match.status?.toLowerCase().includes("progress");

        if (isLive) {
          try {
            prediction = await generatePrediction(match);
            // Save prediction to DB
            await savePrediction({
              matchId: match.id,
              matchName: match.name,
              prediction: prediction.winner,
              confidence: prediction.confidence,
            });
          } catch {}
        }

        return {
          id: match.id,
          name: match.name,
          matchType: match.matchType,
          status: match.status,
          venue: match.venue,
          date: match.date,
          series: match.series,
          teamInfo: match.teamInfo,
          score: match.score,
          prob,
          prediction,
          isLive,
        };
      })
    );

    return res.status(200).json({
      ok: true,
      count: results.length,
      data: results,
      timestamp: new Date().toISOString(),
    });

  } catch (e) {
    console.error("Predictions API error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
