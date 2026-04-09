import { getMatches } from "../_lib/cricket.js";
import { broadcast } from "../_lib/tg.js";
import { getPreds, saveResult, getAccuracy } from "../_lib/db.js";
import { verifyCron } from "../_lib/config.js";

export default async function handler(req, res) {
  if (!verifyCron(req)) return res.status(401).json({ error: "Unauthorized" });

  var matches = await getMatches();
  var preds = await getPreds(50);
  var checked = 0;

  for (var i = 0; i < matches.length; i++) {
    var m = matches[i];
    var s = (m.status || "").toLowerCase();
    if (s.indexOf("won") === -1 && s.indexOf("result") === -1) continue;

    var pred = null;
    for (var j = 0; j < preds.length; j++) {
      if (preds[j].matchId === m.id) { pred = preds[j]; break; }
    }
    if (!pred) continue;

    var winner = s.split(" won")[0].trim();
    var correct = !!(winner && pred.prediction && winner.toLowerCase().indexOf(pred.prediction.toLowerCase().split(" ")[0]) !== -1);

    await saveResult({ matchId: m.id, matchName: m.name, predicted: pred.prediction, actual: winner, correct: correct });

    var acc = await getAccuracy();
    await broadcast(
      "MATCH RESULT!\n\n" + m.name + "\nResult: " + m.status + "\n\nAI was " + (correct ? "CORRECT!" : "wrong this time.") + "\n\nOverall Accuracy: " + acc.pct + "%"
    );
    checked++;
  }

  res.status(200).json({ ok: true, checked: checked });
}
