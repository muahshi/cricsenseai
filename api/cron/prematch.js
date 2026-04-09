import { getMatches, getPrediction } from "../_lib/cricket.js";
import { broadcast } from "../_lib/tg.js";
import { verifyCron } from "../_lib/config.js";

export default async function handler(req, res) {
  if (!verifyCron(req)) return res.status(401).json({ error: "Unauthorized" });

  var matches = await getMatches();
  var now = Date.now();
  var HOUR = 3600000;
  var sent = 0;

  for (var i = 0; i < matches.length; i++) {
    var m = matches[i];
    var matchTime = new Date(m.date || m.dateTimeGMT || 0).getTime();
    if (matchTime > now && matchTime <= now + HOUR) {
      var pred = await getPrediction(m);
      await broadcast(
        "MATCH ALERT - 1 Ghante Mein!\n\n" + m.name + "\n" + m.matchType + " - " + m.series + "\n\nAI Prediction:\n" + pred.text + "\n\nPredicted Winner: " + pred.winner + " (" + pred.confidence + "%)\n\nSirf entertainment ke liye."
      );
      sent++;
    }
  }

  res.status(200).json({ ok: true, sent: sent });
}
