import { config } from "./config.js";

var DEMO = [
  {
    id: "d1",
    name: "Lahore Qalandars vs Karachi Kings",
    matchType: "T20",
    status: "live",
    venue: "Gaddafi Stadium, Lahore",
    series: "Pakistan Super League 2025",
    teamInfo: [{ name: "Lahore Qalandars" }, { name: "Karachi Kings" }],
    score: [{ r: 112, w: 3, o: 13.4 }]
  },
  {
    id: "d2",
    name: "India vs Australia",
    matchType: "ODI",
    status: "live",
    venue: "Wankhede Stadium, Mumbai",
    series: "India vs Australia 2025",
    teamInfo: [{ name: "India" }, { name: "Australia" }],
    score: [{ r: 203, w: 4, o: 38.2 }]
  },
  {
    id: "d3",
    name: "Chennai Super Kings vs Mumbai Indians",
    matchType: "T20",
    status: "upcoming",
    venue: "MA Chidambaram Stadium",
    series: "IPL 2025",
    teamInfo: [{ name: "Chennai Super Kings" }, { name: "Mumbai Indians" }],
    score: []
  }
];

export async function getMatches() {
  if (!config.cricketKey) return DEMO;
  try {
    var r = await fetch("https://api.cricapi.com/v1/currentMatches?apikey=" + config.cricketKey + "&offset=0");
    var d = await r.json();
    if (d.status === "success" && d.data && d.data.length) return d.data;
  } catch (e) {}
  return DEMO;
}

export function calcProb(match) {
  var parts = (match.name || "").split(" vs ");
  var t1 = (match.teamInfo && match.teamInfo[0] && match.teamInfo[0].name) || parts[0] || "Team A";
  var t2 = (match.teamInfo && match.teamInfo[1] && match.teamInfo[1].name) || parts[1] || "Team B";
  var s = match.score && match.score[0];
  if (!s) return { t1: 50, t2: 50, t1n: t1, t2n: t2 };
  var mt = (match.matchType || "").toUpperCase();
  var totalOvers = mt === "T20" ? 20 : 50;
  var rr = s.o > 0 ? s.r / s.o : 0;
  var proj = s.r + rr * (totalOvers - s.o) * ((10 - s.w) / 10);
  var par = mt === "T20" ? 165 : 280;
  var p = 50 + ((proj - par) / par) * 30;
  p = Math.min(85, Math.max(15, p));
  return { t1: Math.round(p), t2: Math.round(100 - p), t1n: t1, t2n: t2 };
}

var GROQ_MODELS = ["llama-3.3-70b-versatile", "llama3-70b-8192", "mixtral-8x7b-32768"];

export async function callGroq(prompt) {
  if (!config.groqKey) return null;
  for (var i = 0; i < GROQ_MODELS.length; i++) {
    try {
      var r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + config.groqKey
        },
        body: JSON.stringify({
          model: GROQ_MODELS[i],
          max_tokens: 600,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!r.ok) continue;
      var d = await r.json();
      var text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (text) return text;
    } catch (e) {}
  }
  return null;
}

export async function getPrediction(match) {
  var prob = calcProb(match);
  var t1 = prob.t1n;
  var t2 = prob.t2n;
  var s = match.score && match.score[0];
  var scoreStr = s ? (s.r + "/" + s.w + " in " + s.o + " overs") : "Match not started";
  var prompt = "Cricket match: " + match.name + ". Format: " + match.matchType + ". Score: " + scoreStr + ". Win probability: " + t1 + " " + prob.t1 + "%, " + t2 + " " + prob.t2 + "%. Give a brief prediction in 3-4 lines covering winner, key factors, confidence level. Mix Hindi and English.";
  var ai = await callGroq(prompt);
  var winner = prob.t1 > prob.t2 ? t1 : t2;
  var confidence = Math.max(prob.t1, prob.t2);
  return {
    text: ai || ("AI Prediction: " + winner + " has " + confidence + "% win probability based on current match dynamics."),
    winner: winner,
    confidence: confidence,
    prob: prob
  };
}
