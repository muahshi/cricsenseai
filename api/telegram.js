import { send } from "./_lib/tg.js";
import { upsertUser, userCount, predCount, getAccuracy } from "./_lib/db.js";
import { getMatches, getPrediction } from "./_lib/cricket.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  try {
    var update = req.body || {};
    var msg = update.message;
    if (!msg) return res.status(200).json({ ok: true });

    var chatId = msg.chat.id;
    var text = msg.text || "";
    var cmd = text.split(" ")[0].toLowerCase();
    var user = msg.from || {};

    if (cmd === "/start") {
      await upsertUser(chatId, { username: user.username || "", name: user.first_name || "Fan" });
      await send(chatId, "CricSense AI mein swagat hai!\n\nIndia ka #1 Cricket Intelligence Bot\n\nCommands:\n/matches - Aaj ke matches\n/prediction - AI prediction\n/accuracy - Prediction accuracy\n/stats - Bot stats\n/help - Help\n\nSirf entertainment ke liye. 18+ only.");

    } else if (cmd === "/matches") {
      var matches = await getMatches();
      if (!matches.length) {
        await send(chatId, "Abhi koi match nahi hai.");
      } else {
        var out = "Current Matches:\n\n";
        for (var i = 0; i < Math.min(matches.length, 5); i++) {
          var m = matches[i];
          var live = (m.status || "").toLowerCase() === "live";
          var s = m.score && m.score[0];
          out += (live ? "LIVE" : "Upcoming") + " - " + m.name + "\n";
          out += m.matchType + " - " + m.series + "\n";
          if (s) out += "Score: " + s.r + "/" + s.w + " (" + s.o + " ov)\n";
          out += "\n";
        }
        await send(chatId, out);
      }

    } else if (cmd === "/prediction") {
      var ms = await getMatches();
      var target = null;
      for (var j = 0; j < ms.length; j++) {
        if ((ms[j].status || "").toLowerCase() === "live") { target = ms[j]; break; }
      }
      if (!target && ms.length) target = ms[0];
      if (!target) {
        await send(chatId, "Koi match nahi mila.");
      } else {
        await send(chatId, "AI analyze kar raha hai...");
        var pred = await getPrediction(target);
        await send(chatId, "AI PREDICTION\n\n" + target.name + "\n\n" + pred.text + "\n\nPredicted Winner: " + pred.winner + " (" + pred.confidence + "%)\n\nSirf entertainment ke liye.");
      }

    } else if (cmd === "/accuracy") {
      var acc = await getAccuracy();
      await send(chatId, "Prediction Accuracy\n\nCorrect: " + acc.correct + "\nTotal: " + acc.total + "\nAccuracy: " + acc.pct + "%");

    } else if (cmd === "/stats") {
      var uc = await userCount();
      var pc = await predCount();
      var ac = await getAccuracy();
      await send(chatId, "CricSense Stats\n\nUsers: " + uc + "\nPredictions: " + pc + "\nAccuracy: " + ac.pct + "%");

    } else if (cmd === "/help") {
      await send(chatId, "Commands:\n/matches\n/prediction\n/accuracy\n/stats\n/help");
    }

  } catch (e) {
    console.error(e);
  }

  res.status(200).json({ ok: true });
}
