import { send } from "./_lib/tg.js";
import { upsertUser, userCount, predCount, getAccuracy } from "./_lib/db.js";
import { getMatches, getPrediction } from "./_lib/cricket.js";
import { config } from "./_lib/config.js";

async function cmdStart(chatId, user) {
  await upsertUser(chatId, { username: user.username || "", name: user.first_name || "Fan" });
  await send(chatId, `🏏 <b>CricSense AI mein swagat hai!</b>\n\nIndia ka #1 Cricket Intelligence Bot 🇮🇳\n\n<b>Commands:</b>\n/matches — Aaj ke matches\n/prediction — AI prediction\n/accuracy — Prediction accuracy\n/stats — Bot stats\n/help — Help\n\n<i>⚠️ 18+ Entertainment only.</i>`);
}

async function cmdMatches(chatId) {
  const ms = await getMatches();
  if (!ms.length) return send(chatId, "😔 Abhi koi match nahi hai.");
  let msg = "🏏 <b>Current Matches:</b>\n\n";
  for (const m of ms.slice(0, 5)) {
    const live = m.status?.toLowerCase() === "live";
    const s = m.score?.[0];
    msg += `${live ? "🔴 LIVE" : "⏰"} <b>${m.name}</b>\n${m.matchType} · ${m.series}\n`;
    if (s) msg += `📊 ${s.r}/${s.w} (${s.o} ov)\n`;
    msg += "\n";
  }
  await send(chatId, msg);
}

async function cmdPrediction(chatId) {
  const ms = await getMatches();
  const m = ms.find(x => x.status?.toLowerCase() === "live" || x.status === "1") || ms[0];
  if (!m) return send(chatId, "😔 Koi match nahi mila.");
  await send(chatId, "🤖 Analyzing...");
  const p = await getPrediction(m);
  await send(chatId, `🎯 <b>AI PREDICTION</b>\n\n<b>${m.name}</b>\n\n${p.text}\n\n🏆 Winner: <b>${p.winner}</b> (${p.confidence}%)\n\n<i>⚠️ Entertainment only.</i>`);
}

async function cmdAccuracy(chatId) {
  const a = await getAccuracy();
  await send(chatId, `📊 <b>Accuracy</b>\n\n✅ Correct: ${a.correct}\n📈 Total: ${a.total}\n🎯 Rate: <b>${a.pct}%</b>`);
}

async function cmdStats(chatId) {
  const [u, p, a] = await Promise.all([userCount(), predCount(), getAccuracy()]);
  await send(chatId, `📈 <b>CricSense Stats</b>\n\n👥 Users: <b>${u}</b>\n🎯 Predictions: <b>${p}</b>\n✅ Accuracy: <b>${a.pct}%</b>`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });
  try {
    const msg = req.body?.message;
    if (!msg) return res.status(200).json({ ok: true });
    const chatId = msg.chat.id;
    const cmd = (msg.text || "").split(" ")[0].toLowerCase();
    if (cmd === "/start")      await cmdStart(chatId, msg.from || {});
    else if (cmd === "/matches")    await cmdMatches(chatId);
    else if (cmd === "/prediction") await cmdPrediction(chatId);
    else if (cmd === "/accuracy")   await cmdAccuracy(chatId);
    else if (cmd === "/stats")      await cmdStats(chatId);
    else if (cmd === "/help")       await send(chatId, "📋 Commands:\n/matches /prediction /accuracy /stats /help");
  } catch (e) { console.error(e); }
  res.status(200).json({ ok: true });
}
