import { config } from "./config.js";

// ─── FETCH CURRENT MATCHES ────────────────────────────────────────────────────
export async function getCurrentMatches() {
  if (!config.cricketKey) return getDemoMatches();
  try {
    const res = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${config.cricketKey}&offset=0`,
      { headers: { "Content-Type": "application/json" } }
    );
    const data = await res.json();
    if (data.status === "success" && data.data?.length > 0) {
      return data.data.filter(m => m.name && m.status);
    }
  } catch (e) {
    console.error("Cricket API error:", e.message);
  }
  return getDemoMatches();
}

// ─── DEMO MATCHES ─────────────────────────────────────────────────────────────
function getDemoMatches() {
  return [
    {
      id: "demo-1",
      name: "Lahore Qalandars vs Karachi Kings",
      matchType: "T20",
      status: "live",
      venue: "Gaddafi Stadium, Lahore",
      date: new Date().toISOString(),
      teamInfo: [{ name: "Lahore Qalandars" }, { name: "Karachi Kings" }],
      score: [{ r: 112, w: 3, o: 13.4, inning: "Lahore Qalandars Inning 1" }],
      series: "Pakistan Super League 2025",
    },
    {
      id: "demo-2",
      name: "India vs Australia",
      matchType: "ODI",
      status: "live",
      venue: "Wankhede Stadium, Mumbai",
      date: new Date().toISOString(),
      teamInfo: [{ name: "India" }, { name: "Australia" }],
      score: [{ r: 203, w: 4, o: 38.2, inning: "India Inning 1" }],
      series: "India vs Australia 2025",
    },
  ];
}

// ─── WIN PROBABILITY ─────────────────────────────────────────────────────────
export function calcWinProb(match) {
  const teams = match.name?.split(" vs ") || ["Team A", "Team B"];
  const t1 = match.teamInfo?.[0]?.name || teams[0];
  const t2 = match.teamInfo?.[1]?.name || teams[1];
  const score = match.score?.[0];

  if (!score) return { t1: 50, t2: 50, t1name: t1, t2name: t2 };

  const { r, w, o } = score;
  const totalOvers = match.matchType?.toUpperCase() === "T20" ? 20 : 50;
  const remaining = totalOvers - o;
  const rr = o > 0 ? r / o : 0;
  const wicketsLeft = 10 - w;
  const projected = r + (rr * remaining * (wicketsLeft / 10));
  const par = match.matchType?.toUpperCase() === "T20" ? 165 : 280;
  let p = 50 + ((projected - par) / par) * 30;
  p = Math.min(85, Math.max(15, p));

  return { t1: Math.round(p), t2: Math.round(100 - p), t1name: t1, t2name: t2 };
}

// ─── AI PREDICTION ────────────────────────────────────────────────────────────
export async function generatePrediction(match) {
  const prob = calcWinProb(match);
  const teams = match.name?.split(" vs ") || ["Team A", "Team B"];
  const t1 = match.teamInfo?.[0]?.name || teams[0];
  const t2 = match.teamInfo?.[1]?.name || teams[1];

  // Try Groq AI
  if (config.groqKey) {
    try {
      const score = match.score?.[0];
      const prompt = `Cricket match: ${match.name}. Format: ${match.matchType}. Series: ${match.series}.
Current score: ${score ? `${score.r}/${score.w} in ${score.o} overs` : "Match not started"}.
Win probability: ${t1}: ${prob.t1}%, ${t2}: ${prob.t2}%.

Provide a brief AI prediction (3-4 lines) with: winner prediction, key factors, and confidence level. Hindi-English mix ok.`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const d = await res.json();
      const text = d.choices?.[0]?.message?.content || "";
      if (text) return { text, confidence: prob.t1, winner: t1, prob };
    } catch (e) {
      console.error("Groq error:", e.message);
    }
  }

  // Fallback
  const winner = prob.t1 > prob.t2 ? t1 : t2;
  const confidence = Math.max(prob.t1, prob.t2);
  return {
    text: `🎯 AI Prediction: ${winner} has ${confidence}% win probability. Based on current match dynamics, ${winner} has the edge. Watch for momentum shifts in the next 3 overs.`,
    confidence,
    winner,
    prob,
  };
}

