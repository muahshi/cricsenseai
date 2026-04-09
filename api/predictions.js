import { getMatches, calcProb, getPrediction } from "./_lib/cricket.js";
import { savePred } from "./_lib/db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    var matches = await getMatches();
    var data = [];

    for (var i = 0; i < Math.min(matches.length, 10); i++) {
      var m = matches[i];
      var prob = calcProb(m);
      var s = (m.status || "").toLowerCase();
      var live = s === "live" || s === "1" || s.indexOf("progress") !== -1;
      var prediction = null;

      if (live) {
        try {
          prediction = await getPrediction(m);
          await savePred({
            matchId: m.id,
            matchName: m.name,
            prediction: prediction.winner,
            confidence: prediction.confidence
          });
        } catch (e) {}
      }

      data.push(Object.assign({}, m, { prob: prob, prediction: prediction, isLive: live }));
    }

    res.status(200).json({ ok: true, count: data.length, data: data, ts: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
