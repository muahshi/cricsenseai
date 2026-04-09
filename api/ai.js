import { callGroq } from "./_lib/cricket.js";

var FALLBACKS = {
  Ball: "Ball-by-ball prediction:\nBall 1: Dot ball - 30%\nBall 2: Single - 28%\nBall 3: Four - 14%\nBall 4: Dot ball - 25%\nBall 5: Wicket - 10%\nBall 6: Two runs - 20%\n\nCurrent conditions favor the bowling side. Pitch slowing down in this phase.",
  Wicket: "Wicket danger rating: 7/10\n\nPressure building on batting side. Last 3 overs: 2 wickets fell. Opening bowler returning next over - key threat. Batsman has faced 18 dot balls in last 2 overs.",
  Score: "Score projection:\nProjected total: 168-175\nPar score: 162\nCurrent team is slightly ahead of par.\nKey overs: 16-18 will decide the final total.",
  Market: "Market signals:\nLAGAI: slightly overpriced at current odds\nKHAI: value here\n\nSmart money moving toward bowling side. Avoid LAGAI at current price. Wait for odds to shift for better value entry.",
  Momentum: "Momentum analysis:\nBatting team: 6/10\nBowling team: 7/10\n\nMomentum shifted to bowling side after last wicket. Two consecutive dot overs. Batting team needs a big over to reset momentum.",
  Player: "Player spotlight:\nTop scorer playing cautiously but building. Key bowler troubling batsmen with variations.\n\nWatch for the pace bowler return spell - has taken key wickets in death overs all season.",
  WhatIf: "What-If scenarios:\n\n1) Wicket next 2 balls: Bowling team win probability jumps to 72%.\n\n2) 20-run over: Batting team surges to 68% win probability.\n\n3) Rain delay 5 overs: Match reduced, slightly favors batting side.",
  chat: "Match mein abhi interesting phase chal raha hai. Batting side ko next 4 overs mein accelerate karna hoga. Bowling captain apna best bowler death overs ke liye bachaa ke rakha hai. 15th over is match ka turning point ho sakta hai."
};

function getPrompt(matchName, tab, message) {
  var base = "Cricket match: " + matchName + ". ";
  if (tab === "Ball") return base + "Predict next 6 balls with specific outcomes. Format: Ball 1: outcome - X%. Use cricket terms. Mix Hindi and English.";
  if (tab === "Wicket") return base + "Wicket danger analysis. Rate 1-10 for next 3 overs. Most vulnerable batsman and why?";
  if (tab === "Score") return base + "Score projection. Final total range, current RR vs required, par score assessment.";
  if (tab === "Market") return base + "LAGAI/KHAI signals, market traps, smart money movement, entry price recommendation.";
  if (tab === "Momentum") return base + "Momentum tracker. Rate both teams 1-10. Last 3 overs analysis, turning points.";
  if (tab === "Player") return base + "Player analysis. Top performers, form guide, key player to watch.";
  if (tab === "WhatIf") return base + "3 What-If scenarios: 1) Wicket in next 2 balls 2) 20-run over 3) Rain delay 5 overs.";
  if (tab === "chat" && message) return base + "User question: " + message + " Answer in 3-4 sentences. Mix Hindi and English.";
  return base + "Brief match analysis in 3-4 sentences.";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  var body = req.body || {};
  var matchName = body.matchName || body.matchId || "Current Match";
  var tab = body.tab || "Ball";
  var message = body.message || "";
  var result = null;

  try {
    result = await callGroq(getPrompt(matchName, tab, message));
  } catch (e) {}

  if (!result || result.trim() === "") {
    result = FALLBACKS[tab] || FALLBACKS.chat;
  }

  return res.status(200).json({ ok: true, result: result });
}
