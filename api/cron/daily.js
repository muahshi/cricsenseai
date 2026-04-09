import { getMatches, getPrediction } from "../_lib/cricket.js";
import { broadcast } from "../_lib/tg.js";
import { savePred } from "../_lib/db.js";
import { verifyCron } from "../_lib/config.js";

export default async function handler(req, res) {
  if (!verifyCron(req)) return res.status(401).json({ error: "Unauthorized" });

  var matches = await getMatches();
  if (!matches.length) {
    await broadcast("Aaj koi cricket match nahi hai.");
    return res.status(200).json({ ok: true });
  }

  var live = matches.filter(function(m) { return (m.status || "").toLowerCase() === "live"; });
  var upcoming = matches.filter(function(m) { return (m.status || "").toLowerCase() !== "live"; });

  var msg = "CricSense AI - Aaj Ki Cricket!\n\n";

  if (live.length) {
    msg += "LIVE (" + live.length + "):\n";
    for (var i = 0; i < Math.min(live.length, 3); i++) {
      var s = live[i].score && live[i].score[0];
      msg += "- " + live[i].name + "\n";
      if (s) msg += "  Score: " + s.r + "/" + s.w + " (" + s.o + " ov)\n";
    }
    msg += "\n";
  }

  if (upcoming.length) {
    msg += "Upcoming (" + upcoming.length + "):\n";
    for (var j = 0; j < Math.min(upcoming.length, 3); j++) {
      msg += "- " + upcoming[j].name + " (" + upcoming[j].matchType + ")\n";
    }
    msg += "\n";
  }

  var target = live[0] || upcoming[0];
  if (target) {
    var pred = await getPrediction(target);
    await savePred({ matchId: target.id, matchName: target.name, prediction: pred.winner, confidence: pred.confidence });
    msg += "AI Prediction:\n" + pred.text + "\n\nPredicted Winner: " + pred.winner + " (" + pred.confidence + "%)\n\n";
  }

  msg += "Sirf entertainment ke liye. 18+ Responsible gambling.";
  await broadcast(msg);
  res.status(200).json({ ok: true, matchCount: matches.length });
}
