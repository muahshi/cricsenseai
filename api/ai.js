import { config } from "./_lib/config.js";

var GROQ_MODELS = ["llama-3.3-70b-versatile", "llama3-70b-8192", "mixtral-8x7b-32768"];

async function callGroq(prompt) {
  var key = config.groqKey;
  if (!key) return null;
  for (var i = 0; i < GROQ_MODELS.length; i++) {
    try {
      var r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
        body: JSON.stringify({ model: GROQ_MODELS[i], max_tokens: 500, temperature: 0.7, messages: [{ role: "user", content: prompt }] })
      });
      if (!r.ok) continue;
      var d = await r.json();
      var t = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (t && t.trim()) return t.trim();
    } catch (e) {}
  }
  return null;
}

var FALLBACKS = {
  Ball: "Ball predictions:\nBall 1: Dot - 28%\nBall 2: Single - 30%\nBall 3: Four - 14%\nBall 4: Wicket - 11%\nBall 5: Two runs - 18%\nBall 6: Six - 8%\n\nCurrent conditions favor bowling side. Pitch slowing down.",
  Wicket: "Wicket danger: 7/10\n\nPressure on batting. Last 3 overs: 2 wickets. Opening bowler returning - key threat. 18 dot balls in last 2 overs.",
  Score: "Score projection:\nProjected total: 168-175\nPar score: 162\nSlightly ahead of par. Key: overs 16-18.",
  Market: "LAGAI slightly overpriced. KHAI has value.\n\nSmart money moving toward bowling side. Wait for better entry price before LAGAI.",
  Momentum: "Batting: 6/10\nBowling: 7/10\n\nMomentum shifted after last wicket. Batting needs a big over to reset.",
  Player: "Top scorer building steadily. Key bowler has variations troubling batsmen.\n\nWatch pace bowler in death overs - has been key all season.",
  WhatIf: "1) Wicket next 2 balls: Bowling team wins prob 72%\n2) 20-run over: Batting team surges to 68%\n3) Rain delay 5 overs: Slightly favors batting side.",
  full: "Match analysis:\n\nBatting side currently ahead of par with good partnerships. Bowling team needs early wickets in next 3 overs.\n\nKey battles: Pace vs top-order. Death overs will decide the match.\n\nPrediction: Batting side has 58% chance if they bat 20 overs without collapse.",
  chat: "Match mein abhi interesting phase chal raha hai. Batting side needs to accelerate. Bowling captain has saved best bowler for death overs. Next 4 overs are crucial."
};

function buildPrompt(matchName, matchScore, tab, msg) {
  var ctx = "Match: " + matchName + (matchScore ? ". Score: " + matchScore : "") + ". ";
  if (tab === "Ball") return ctx + "Predict next 6 balls with outcomes (dot/single/four/six/wicket/wide %). Format: Ball 1: X - Y%. Be specific. Hinglish ok.";
  if (tab === "Wicket") return ctx + "Wicket danger analysis. Rate 1-10 for next 3 overs. Most vulnerable batsman and why? Hinglish.";
  if (tab === "Score") return ctx + "Score projection. Final total range, CRR vs RRR, par score, over/under. Hinglish.";
  if (tab === "Market") return ctx + "LAGAI/KHAI analysis. Entry price recommendation, market traps. Hinglish.";
  if (tab === "Momentum") return ctx + "Momentum: rate both teams 1-10. Last 3 overs analysis. Hinglish.";
  if (tab === "Player") return ctx + "Player analysis. Top performers, key player to watch. Hinglish.";
  if (tab === "WhatIf") return ctx + "3 What-If scenarios: 1)Wicket in 2 balls 2)20-run over 3)Rain delay. Impact each. Hinglish.";
  if (tab === "full") return ctx + "Full match analysis: current situation, key battles, prediction, odds recommendation. 4-5 lines. Hinglish.";
  if (tab === "chat" && msg) return ctx + "User asks: " + msg + ". Answer as cricket expert, 2-3 lines. Hinglish.";
  return ctx + "Brief match analysis, 3 lines. Hinglish.";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  var body = req.body || {};
  var matchName = body.matchName || body.matchId || "Current match";
  var matchScore = body.matchScore || body.score || "";
  var tab = body.tab || "full";
  var msg = body.message || "";

  var result = null;
  try {
    result = await callGroq(buildPrompt(matchName, matchScore, tab, msg));
  } catch (e) {}

  if (!result) {
    result = FALLBACKS[tab] || (tab === "chat" && msg ? "Bahut accha sawaal! " + FALLBACKS.chat : FALLBACKS.full);
  }

  return res.status(200).json({ ok: true, result: result });
}
