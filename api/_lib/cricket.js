import { config } from "./config.js";

const DEMO = [
  { id:"d1", name:"Lahore Qalandars vs Karachi Kings", matchType:"T20", status:"live",
    venue:"Gaddafi Stadium, Lahore", series:"Pakistan Super League 2025",
    teamInfo:[{name:"Lahore Qalandars"},{name:"Karachi Kings"}],
    score:[{r:112,w:3,o:13.4}] },
  { id:"d2", name:"India vs Australia", matchType:"ODI", status:"live",
    venue:"Wankhede Stadium, Mumbai", series:"India vs Australia 2025",
    teamInfo:[{name:"India"},{name:"Australia"}],
    score:[{r:203,w:4,o:38.2}] },
  { id:"d3", name:"Chennai Super Kings vs Mumbai Indians", matchType:"T20", status:"upcoming",
    venue:"MA Chidambaram Stadium", series:"IPL 2025",
    teamInfo:[{name:"Chennai Super Kings"},{name:"Mumbai Indians"}], score:[] },
];

export async function getMatches() {
  if (!config.cricketKey) return DEMO;
  try {
    const r = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${config.cricketKey}&offset=0`);
    const d = await r.json();
    if (d.status === "success" && d.data?.length) return d.data;
  } catch {}
  return DEMO;
}

export function calcProb(match) {
  const t1 = match.teamInfo?.[0]?.name || match.name?.split(" vs ")?.[0] || "Team A";
  const t2 = match.teamInfo?.[1]?.name || match.name?.split(" vs ")?.[1] || "Team B";
  const s = match.score?.[0];
  if (!s) return { t1: 50, t2: 50, t1n: t1, t2n: t2 };
  const tot = match.matchType?.toUpperCase() === "T20" ? 20 : 50;
  const rr = s.o > 0 ? s.r / s.o : 0;
  const proj = s.r + rr * (tot - s.o) * ((10 - s.w) / 10);
  const par = match.matchType?.toUpperCase() === "T20" ? 165 : 280;
  let p = 50 + ((proj - par) / par) * 30;
  p = Math.min(85, Math.max(15, p));
  return { t1: Math.round(p), t2: Math.round(100 - p), t1n: t1, t2n: t2 };
}

const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama3-70b-8192", "mixtral-8x7b-32768"];

export async function groqAI(prompt) {
  if (!config.groqKey) return null;
  for (const model of GROQ_MODELS) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.groqKey}` },
        body: JSON.stringify({ model, max_tokens: 600, temperature: 0.7, messages: [{ role: "user", content: prompt }] }),
      });
      if (!r.ok) continue;
      const d = await r.json();
      const text = d.choices?.[0]?.message?.content || "";
      if (text) return text;
    } catch {}
  }
  return null;
}

export async function getPrediction(match) {
  const prob = calcProb(match);
  const t1 = prob.t1n, t2 = prob.t2n;
  const score = match.score?.[0];
  const scoreStr = score ? `${score.r}/${score.w} in ${score.o} overs` : "Match not started";
  const prompt = `Cricket match: ${match.name}. Format: ${match.matchType}. Score: ${scoreStr}. Win prob: ${t1} ${prob.t1}%, ${t2} ${prob.t2}%.\nGive brief prediction (3-4 lines): winner, key factors, confidence. Mix Hindi-English.`;
  const ai = await groqAI(prompt);
  const winner = prob.t1 > prob.t2 ? t1 : t2;
  const confidence = Math.max(prob.t1, prob.t2);
  return {
    text: ai || `🎯 AI Prediction: ${winner} has ${confidence}% win probability. Current match dynamics favor ${winner}. Watch for momentum shifts.`,
    winner, confidence, prob,
  };
}
