import { getMatches, calcProb, getPrediction } from "./_lib/cricket.js";
import { savePred } from "./_lib/db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const matches = await getMatches();

    const data = await Promise.all(matches.slice(0, 10).map(async (m) => {
      const prob = calcProb(m);
      const live = ["live","1"].includes(m.status?.toLowerCase()) || m.status?.toLowerCase().includes("progress");
      let prediction = null;

      if (live) {
        try {
          prediction = await getPrediction(m);
          await savePred({ matchId: m.id, matchName: m.name, prediction: prediction.winner, confidence: prediction.confidence });
        } catch {}
      }

      return { ...m, prob, prediction, isLive: live };
    }));

    res.status(200).json({ ok: true, count: data.length, data, ts: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
