import { sendMessage } from "./_lib/telegram.js";
import { saveUser, getUser, getUserCount, getPredictionCount, getAccuracy } from "./_lib/db.js";
import { getCurrentMatches, generatePrediction } from "./_lib/cricket.js";
import { config } from "./_lib/config.js";

// ─── COMMAND HANDLERS ─────────────────────────────────────────────────────────

async function handleStart(chatId, user) {
  await saveUser(chatId, {
    username: user.username || "",
    firstName: user.first_name || "Cricket Fan",
  });

  const msg = `🏏 <b>CricSense AI mein aapka swagat hai!</b>

India ka #1 Cricket Intelligence Bot 🇮🇳

<b>Kya milega aapko:</b>
⚡ Real-time AI match predictions
📊 Win probability calculations  
💰 LAGAI/KHAI signals
🎯 Ball-by-ball analysis
⚠️ Market trap alerts

<b>Commands:</b>
/matches — Aaj ke matches
/prediction — AI prediction
/accuracy — Prediction accuracy
/stats — Bot statistics
/help — Sabhi commands

<i>⚠️ Sirf entertainment ke liye. 18+ only. Responsible gambling.</i>

👉 <a href="${config.appUrl}">Web App bhi try karo!</a>`;

  await sendMessage(chatId, msg);
}

async function handleMatches(chatId) {
  const matches = await getCurrentMatches();
  if (!matches.length) {
    await sendMessage(chatId, "😔 Abhi koi live match nahi hai. Baad mein check karo!");
    return;
  }

  let msg = "🏏 <b>Current Matches:</b>\n\n";
  for (const m of matches.slice(0, 5)) {
    const live = m.status?.toLowerCase() === "live" || m.status === "1";
    const score = m.score?.[0];
    msg += `${live ? "🔴 LIVE" : "⏰ Upcoming"} — <b>${m.name}</b>\n`;
    msg += `📋 ${m.matchType} | ${m.series}\n`;
    if (score) msg += `📊 ${score.r}/${score.w} (${score.o} ov)\n`;
    msg += `\n`;
  }
  msg += `\n👉 <a href="${config.appUrl}">Full analysis ke liye Web App kholein</a>`;
  await sendMessage(chatId, msg);
}

async function handlePrediction(chatId) {
  const matches = await getCurrentMatches();
  const liveMatch = matches.find(m => {
    const s = m.status?.toLowerCase() || "";
    return s === "live" || s === "1" || s.includes("progress");
  }) || matches[0];

  if (!liveMatch) {
    await sendMessage(chatId, "😔 Abhi koi match nahi hai jiske liye prediction de sakein.");
    return;
  }

  await sendMessage(chatId, "🤖 AI analysis kar raha hai... thoda ruko...");

  const pred = await generatePrediction(liveMatch);
  const msg = `🎯 <b>AI PREDICTION</b>

<b>Match:</b> ${liveMatch.name}
<b>Series:</b> ${liveMatch.series}

${pred.text}

<b>Win Probability:</b>
▸ ${pred.prob.t1name}: <b>${pred.prob.t1}%</b>
▸ ${pred.prob.t2name}: <b>${pred.prob.t2}%</b>

<b>Predicted Winner:</b> ${pred.winner} 🏆
<b>Confidence:</b> ${pred.confidence}%

<i>⚠️ Entertainment only. Responsible gambling karo.</i>
👉 <a href="${config.appUrl}">Detailed analysis</a>`;

  await sendMessage(chatId, msg);
}

async function handleAccuracy(chatId) {
  const acc = await getAccuracy();
  const msg = `📊 <b>Prediction Accuracy</b>

✅ Correct: <b>${acc.correct}</b>
📈 Total: <b>${acc.total}</b>
🎯 Accuracy: <b>${acc.percentage}%</b>

${acc.percentage >= 70 ? "🔥 Bahut badiya!" : acc.percentage >= 55 ? "👍 Theek hai!" : "📉 Improvement ho raha hai..."}

<i>AI model continuously improve ho raha hai.</i>`;
  await sendMessage(chatId, msg);
}

async function handleStats(chatId) {
  const [users, preds, acc] = await Promise.all([
    getUserCount(),
    getPredictionCount(),
    getAccuracy(),
  ]);
  const msg = `📈 <b>CricSense AI Stats</b>

👥 Total Users: <b>${users}</b>
🎯 Predictions Made: <b>${preds}</b>
✅ Accuracy: <b>${acc.percentage}%</b>
🌐 Status: <b>Online ✓</b>

<i>India ka sabse accurate cricket AI! 🏏</i>`;
  await sendMessage(chatId, msg);
}

async function handleHelp(chatId) {
  const msg = `🏏 <b>CricSense AI — Commands</b>

/start — Bot shuru karo
/matches — Aaj ke live/upcoming matches
/prediction — Next match AI prediction
/accuracy — Kitne sahi rahe predictions
/stats — Total users aur predictions
/help — Yeh message

<b>Features:</b>
• Real-time win probability
• Ball-by-ball AI predictions
• LAGAI/KHAI betting signals
• Market trap detection
• Player analysis
• What-If scenarios

👉 <a href="${config.appUrl}">Full Web App</a> mein aur bhi features!

<i>⚠️ 18+ only. Entertainment ke liye. Responsible gambling.</i>`;
  await sendMessage(chatId, msg);
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "CricSense Telegram Bot" });
  }

  try {
    const update = req.body;
    const message = update.message || update.edited_message;
    if (!message) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text || "";
    const user = message.from || {};
    const cmd = text.split(" ")[0].toLowerCase().replace("@" + (process.env.BOT_USERNAME || ""), "");

    switch (cmd) {
      case "/start": await handleStart(chatId, user); break;
      case "/matches": await handleMatches(chatId); break;
      case "/prediction": await handlePrediction(chatId); break;
      case "/accuracy": await handleAccuracy(chatId); break;
      case "/stats": await handleStats(chatId); break;
      case "/help": await handleHelp(chatId); break;
      default:
        if (text && !text.startsWith("/")) {
          await sendMessage(chatId, `🤖 "${text}" — Yeh command nahi samjha. /help type karo!`);
        }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Telegram handler error:", e);
    res.status(200).json({ ok: true }); // Always 200 for Telegram
  }
}
