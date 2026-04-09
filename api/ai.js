import { callGroq } from "./_lib/cricket.js";

var FALLBACKS = [
  "Current match dynamics suggest batting side has momentum. Run rate above par with wickets in hand - strong position.",
  "Pressure building on batting side. Dot ball percentage high in last 2 overs. Wicket probability elevated. Bowling team in control.",
  "Momentum shift detected. Current partnership stabilizing the innings. Projected total looking 
  .",
  "Based on scoring patterns, par score projection trending above initial estimates. Both teams have realistic paths to victory."
];

function getPrompt(matchName, tab, message) {
  var base = "Cricket match: " + matchName + ".";
  if (tab === "Ball") return base + " Predict next 6 balls with specific outcomes (runs/dot/wicket probability). Format as Ball 1: outcome - X%. Use cricket terms. Mix Hindi and English.";
  if (tab === "Wicket") return base + " Wicket danger analysis. Rate wicket probability 1 to 10 for next 3 overs. Most vulnerable batsman and why? Bowling matchup insights.";
  if (tab === "Score") return base + " Score projection. Predict final total range, current run rate vs required, par score, over or under performance likelihood.";
  if (tab === "Market") return base + " Betting market analysis. LAGAI/KHAI signals, market traps, smart money movement, exact entry price recommendation.";
  if (tab === "Momentum") return base + " Momentum tracker. Rate both teams 1 to 10. Last 3 overs analysis, key turning points, momentum shift triggers.";
  if (tab === "Player") return base + " Player analysis. Top performers, form guide, key player to watch, head to head insights.";
  if (tab === "WhatIf") return base + " Run 3 What-If scenarios: 1) Wicket in next 2 balls 2) 20-run over next 3) 5-over rain delay. Impact on result for each.";
  if (tab === "chat") return base + " User question: " + message + ". Answer as cricket expert in 3 to 4 sentences. Mix Hindi and English.";
  return base + " Give a brief match analysis in 3 to 4 sentences.";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  var body = req.body || {};
  var matchName = body.matchName || body.matchId || "Unknown match";
  var tab = body.tab || "Ball";
  var message = body.message || "";

  var prompt = getPrompt(matchName, tab, message);

  try {
    var result = await callGroq(prompt);
    var fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    res.status(200).json({ ok: true, result: result || fallback });
  } catch (e) {
    var fallback2 = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    res.status(200).json({ ok: true, result: fallback2 });
  }
}
