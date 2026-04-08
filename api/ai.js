import { groqAI } from "./_lib/cricket.js";

const TAB_PROMPTS = {
  Ball:     (m, s) => `Cricket match: ${m}. Score: ${s}.\nPredict next 6 balls with specific outcomes (runs/dot/wicket %). Format each as: Ball 1: [outcome – X%]. Use cricket terminology. Hindi-English mix ok.`,
  Wicket:   (m, s) => `Cricket match: ${m}. Score: ${s}.\nWicket danger analysis. Rate wicket probability 1-10 for next 3 overs. Most vulnerable batsman and why? Bowling matchup insights.`,
  Score:    (m, s) => `Cricket match: ${m}. Score: ${s}.\nScore projection: predict final total range, current RR vs required, par score, over/under performance likelihood.`,
  Market:   (m, s) => `Cricket match: ${m}. Score: ${s}.\nBetting market analysis: LAGAI/KHAI signals, market traps, smart money movement, exact entry price recommendation. Be specific.`,
  Momentum: (m, s) => `Cricket match: ${m}. Score: ${s}.\nMomentum tracker: rate both teams 1-10. Last 3 overs analysis, key turning points, momentum shift triggers.`,
  Player:   (m, s) => `Cricket match: ${m}. Score: ${s}.\nPlayer analysis: top performers, form guide, key player to watch, head-to-head insights.`,
  WhatIf:   (m, s) => `Cricket match: ${m}. Score: ${s}.\n3 What-If scenarios: 1) Wicket in next 2 balls 2) 20-run over next 3) 5-over rain delay. Impact on result for each.`,
  chat:     (m, s, q) => `Match: ${m}. Score: ${s}.\nUser question: ${q}\nAnswer as cricket expert in 3-4 sentences. Hindi-English mix ok.`,
};

const FALLBACKS = [
  "📊 Current match dynamics suggest batting side has momentum. Run rate above par with wickets in hand — strong position.",
  "🎯 Pressure building on batting side! Dot ball % high in last 2 overs. Wicket probability elevated. Bowling team in control.",
  "⚡ Momentum shift detected! Current partnership stabilizing innings. Projected total looking competitive.",
  "🔮 Based on scoring patterns, par score projection trending above initial estimates. Both teams have realistic paths to victory.",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { matchId, tab, message, matchName, score } = req.body || {};
  if (!tab) return res.status(400).json({ error: "tab required" });

  const matchStr = matchName || matchId || "Unknown match";
  const scoreStr = score || "Score not available";
  const promptFn = TAB_PROMPTS[tab] || TAB_PROMPTS.chat;
  const prompt = promptFn(matchStr, scoreStr, message);

  try {
    const result = await groqAI(prompt);
    res.status(200).json({ ok: true, result: result || FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
  } catch {
    res.status(200).json({ ok: true, result: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
  }
}
