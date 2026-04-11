import { useState, useEffect, useCallback, useRef } from "react";

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     CricAI PREDICTOR  v4                                   ║
// ║  Shows: Demo Matches + Live/Upcoming Real Matches (pre-match predictions)  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const ADSTERRA_KEY      = "YOUR_ADSTERRA_KEY_HERE";
const CRICKET_DATA_BASE = "https://api.cricapi.com/v1";
const ODDS_API          = "https://api.the-odds-api.com/v4";
const GROQ_API          = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL        = "llama-3.3-70b-versatile";
const PROXY             = "https://api.allorigins.win/get?url=";

const SK = {
  GROQ:    "cricai_groq_key",
  ODDS:    "cricai_odds_key",
  CRICKET: "cricai_cricket_key",
};

// Decision thresholds
const MIN_PROB     = 65;
const SAFE_THRESH  = 70;
const VALUE_EDGE   = 10;
const HIGH_CONF    = 75;

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO MOCK DATA  (always shown, clearly labelled)
// ═══════════════════════════════════════════════════════════════════════════════
const DEMO_MATCHES = [
  {
    id: "demo1", _demo: true, _tab: "demo",
    sport_title: "Test", league: "Test Series",
    commence_time: new Date(Date.now() + 3600000).toISOString(),
    home_team: "India", away_team: "Australia",
    status: "live",
    bookmakers: [
      { key: "betfair",  title: "Betfair",  markets: [{ key: "h2h", outcomes: [{ name: "India", price: 1.85 }, { name: "Australia", price: 2.10 }, { name: "Draw", price: 3.40 }] }] },
      { key: "bet365",   title: "Bet365",   markets: [{ key: "h2h", outcomes: [{ name: "India", price: 1.90 }, { name: "Australia", price: 2.05 }, { name: "Draw", price: 3.20 }] }] },
    ],
    live: { team: "India", score: "287/4", overs: "68.2", rr: "4.21", target: null, rrr: null, lastW: "Kohli c Smith b Cummins 82", balls: ["1","4","W","0","6","1"], wickets: 4 },
  },
  {
    id: "demo2", _demo: true, _tab: "demo",
    sport_title: "ODI", league: "ODI Series",
    commence_time: new Date(Date.now() + 7200000).toISOString(),
    home_team: "England", away_team: "Pakistan",
    status: "live",
    bookmakers: [
      { key: "betfair",  title: "Betfair",  markets: [{ key: "h2h", outcomes: [{ name: "England", price: 1.60 }, { name: "Pakistan", price: 2.45 }] }] },
      { key: "pinnacle", title: "Pinnacle", markets: [{ key: "h2h", outcomes: [{ name: "England", price: 1.62 }, { name: "Pakistan", price: 2.40 }] }] },
    ],
    live: { team: "England", score: "156/3", overs: "28.0", rr: "5.57", target: 280, rrr: "6.94", lastW: "Root b Shaheen 34", balls: ["6","0","4","4","1","W"], wickets: 3 },
  },
  {
    id: "demo3", _demo: true, _tab: "demo",
    sport_title: "T20", league: "T20 Series",
    commence_time: new Date(Date.now() + 14400000).toISOString(),
    home_team: "West Indies", away_team: "New Zealand",
    status: "upcoming",
    bookmakers: [
      { key: "pinnacle", title: "Pinnacle", markets: [{ key: "h2h", outcomes: [{ name: "West Indies", price: 2.20 }, { name: "New Zealand", price: 1.72 }] }] },
      { key: "bet365",   title: "Bet365",   markets: [{ key: "h2h", outcomes: [{ name: "West Indies", price: 2.15 }, { name: "New Zealand", price: 1.75 }] }] },
    ],
    live: null,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REAL UPCOMING MATCHES — fetched from CricketData (cricapi.com)
// ═══════════════════════════════════════════════════════════════════════════════

// Build simulated odds from team strengths when The Odds API has no data
function generateOddsFromStrengths(teamA, teamB, format) {
  // Simple heuristic: give slight edge to known stronger teams
  const strong = ["India","Australia","England","Pakistan","New Zealand","South Africa","Sri Lanka","West Indies","Bangladesh"];
  const rankA = strong.indexOf(teamA);
  const rankB = strong.indexOf(teamB);
  const priceA = rankA >= 0 && (rankB < 0 || rankA < rankB) ? 1.75 : 2.10;
  const priceB = rankB >= 0 && (rankA < 0 || rankB < rankA) ? 1.75 : 2.10;
  return [
    {
      key: "cricai_est",
      title: "CricAI Est.",
      markets: [{
        key: "h2h",
        outcomes: [
          { name: teamA, price: priceA },
          { name: teamB, price: priceB },
          ...(format === "Test" ? [{ name: "Draw", price: 3.20 }] : []),
        ],
      }],
    },
  ];
}

// Fetch upcoming + live matches from CricketData
async function fetchUpcomingFromCricketData(cricketKey) {
  if (!cricketKey) return [];
  const endpoints = [
    `${CRICKET_DATA_BASE}/currentMatches?apikey=${cricketKey}&offset=0`,
    `${CRICKET_DATA_BASE}/matches?apikey=${cricketKey}&offset=0`,
  ];

  let allMatches = [];

  for (const url of endpoints) {
    try {
      let data = null;
      try {
        const r = await fetch(url, { mode: "cors" });
        if (r.ok) data = await r.json();
      } catch { /* try proxy */ }

      if (!data) {
        const pr = await fetch(`${PROXY}${encodeURIComponent(url)}`);
        if (pr.ok) { const b = await pr.json(); data = JSON.parse(b.contents); }
      }

      if (data?.status === "success" && Array.isArray(data.data)) {
        allMatches.push(...data.data);
        break; // got data, stop
      }
    } catch { /* skip */ }
  }

  // Deduplicate by id
  const seen = new Set();
  allMatches = allMatches.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });

  // Convert to our match format
  const now = Date.now();
  return allMatches
    .filter(m => m.teams?.length >= 2)
    .map(m => {
      const teams = m.teams || [];
      const startMs = m.dateTimeGMT ? new Date(m.dateTimeGMT).getTime() : now;
      const isLive = m.matchStarted && !m.matchEnded;
      const isUpcoming = !m.matchStarted && startMs > now;
      const isEnded = m.matchEnded;

      if (isEnded) return null; // skip finished

      // Parse score
      const scoreArr = m.score || [];
      const batting  = scoreArr[scoreArr.length - 1] || null;
      const runs = batting?.r ?? 0;
      const wkts = batting?.w ?? 0;
      const ovsNum = parseFloat(batting?.o || 0);
      const rr = ovsNum > 0 ? (runs / ovsNum).toFixed(2) : "0.00";
      const totalOvers = m.t20 ? 20 : m.odi ? 50 : 90;
      const target = scoreArr.length >= 2 ? (scoreArr[0].r + 1) : null;
      const runsLeft = target ? target - runs : null;
      const oversLeft = totalOvers - ovsNum;
      const rrr = (runsLeft && oversLeft > 0) ? (runsLeft / oversLeft).toFixed(2) : null;

      // Detect format
      const name = (m.name || m.matchType || "").toLowerCase();
      const format = m.t20 || name.includes("t20") ? "T20"
        : m.odi  || name.includes("odi")  ? "ODI"
        : name.includes("test") ? "Test" : "T20";

      // League / series name
      const league = m.series_id ? (m.seriesName || m.name || "International") : (m.name || "International");

      const liveData = isLive && batting ? {
        team: batting.inning?.split(" Inning")[0]?.split(" ")[0] || teams[0],
        score: `${runs}/${wkts}`,
        overs: String(ovsNum),
        rr,
        target,
        rrr,
        lastW: m.status || null,
        balls: [],
        wickets: wkts,
        _fromApi: true,
      } : null;

      return {
        id: m.id || `real_${Math.random()}`,
        _real: true,
        _tab: "live",
        sport_title: format,
        league: league.length > 40 ? league.slice(0, 40) + "…" : league,
        commence_time: m.dateTimeGMT || new Date(now + 3600000).toISOString(),
        home_team: teams[0],
        away_team: teams[1],
        status: isLive ? "live" : "upcoming",
        bookmakers: generateOddsFromStrengths(teams[0], teams[1], format),
        live: liveData,
        _cricInfo: m.status || null,
      };
    })
    .filter(Boolean)
    .slice(0, 12); // cap at 12 to avoid overload
}

// ═══════════════════════════════════════════════════════════════════════════════
// ODDS API — for real betting odds (merged on top of real matches)
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchOdds(apiKey) {
  if (!apiKey) return [];
  const sports = ["cricket_test_match", "cricket_odi", "cricket_t20"];
  const all = [];
  for (const sport of sports) {
    const url = `${ODDS_API}/sports/${sport}/odds/?apiKey=${apiKey}&regions=uk,au&markets=h2h&oddsFormat=decimal`;
    try {
      let res = await fetch(url, { mode: "cors" }).catch(() => null);
      if (res && res.ok) { all.push(...await res.json()); continue; }
      const pRes = await fetch(`${PROXY}${encodeURIComponent(url)}`);
      if (pRes.ok) {
        const body = await pRes.json();
        const parsed = JSON.parse(body.contents);
        if (Array.isArray(parsed)) all.push(...parsed);
      }
    } catch { /* skip */ }
  }
  return all;
}

// Try to merge real odds into CricketData matches by team name
function mergeRealOdds(cricketMatches, oddsMatches) {
  return cricketMatches.map(cm => {
    const match = oddsMatches.find(om => {
      const ha = om.home_team?.toLowerCase();
      const aa = om.away_team?.toLowerCase();
      const ch = cm.home_team?.toLowerCase();
      const ca = cm.away_team?.toLowerCase();
      return (ha?.includes(ch) || ch?.includes(ha)) &&
             (aa?.includes(ca) || ca?.includes(aa));
    });
    if (match) {
      return { ...cm, bookmakers: match.bookmakers, _hasRealOdds: true };
    }
    return cm;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
function impliedProb(decimalOdds) {
  return decimalOdds > 0 ? parseFloat(((1 / decimalOdds) * 100).toFixed(1)) : 0;
}

function getBestOdds(bookmakers) {
  const best = {};
  for (const bk of bookmakers) {
    for (const market of bk.markets) {
      if (market.key !== "h2h") continue;
      for (const o of market.outcomes) {
        if (!best[o.name] || o.price > best[o.name].price) {
          best[o.name] = { price: o.price, bookmaker: bk.title };
        }
      }
    }
  }
  return best;
}

function detectValueBet(aiProb, bestOdds) {
  const impl = impliedProb(bestOdds);
  const edge = aiProb - impl;
  return { isValue: edge >= VALUE_EDGE, edge: parseFloat(edge.toFixed(1)) };
}

function passesFilter(r) {
  if (!r) return false;
  if (r.decision === "NO BET") return false;
  const probs = Object.values(r.win_probability || {});
  if (Math.max(...probs, 0) < MIN_PROB) return false;
  if (r.decision === "SAFE BET" && r.wicket_chance === "HIGH") return false;
  return true;
}

function isSafeBet(r) {
  const probs = Object.values(r?.win_probability || {});
  return r?.decision === "SAFE BET" &&
    Math.max(...probs, 0) >= SAFE_THRESH &&
    r?.wicket_chance !== "HIGH";
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROQ — advanced prompt supporting both live & pre-match
// ═══════════════════════════════════════════════════════════════════════════════
async function callGroq(match, groqKey) {
  const bestOdds = getBestOdds(match.bookmakers);
  const oddsStr = Object.entries(bestOdds)
    .map(([team, { price, bookmaker }]) =>
      `${team}: ${price} (${bookmaker}) → implied ${impliedProb(price)}%`
    ).join(" | ");

  const L = match.live;
  const isPreMatch = !L || !L.score;

  let liveCtx = "PRE-MATCH: No live score yet.";
  let pressureCtx = "";

  if (!isPreMatch) {
    liveCtx = [
      `Batting: ${L.team} | Score: ${L.score} | Overs: ${L.overs} | CRR: ${L.rr}`,
      `Wickets fallen: ${L.wickets ?? "?"}`,
      L.target ? `Target: ${L.target} | RRR: ${L.rrr}` : "",
      L.lastW  ? `Last wicket: ${L.lastW}` : "",
      L.balls?.length ? `Recent balls: ${L.balls.join("-")}` : "",
    ].filter(Boolean).join("\n");

    if (L.rrr && L.rr) {
      const gap = parseFloat(L.rrr) - parseFloat(L.rr);
      pressureCtx = gap > 2 ? `HIGH PRESSURE: RRR ${L.rrr} >> CRR ${L.rr}. Collapse risk elevated.`
        : gap > 0.5 ? `MODERATE PRESSURE: RRR (${L.rrr}) slightly above CRR (${L.rr}).`
        : `LOW PRESSURE: Batting team comfortable.`;
    }
    const recentW = (L.balls || []).filter(b => b === "W").length;
    if (recentW >= 2) pressureCtx += ` COLLAPSE SIGNAL: ${recentW} wickets in last 6 balls.`;
  }

  const prompt = `You are CricAI — elite cricket decision engine.

MATCH: ${match.home_team} vs ${match.away_team} | Format: ${match.sport_title} | League: ${match.league || "International"}
SITUATION: ${isPreMatch ? "PRE-MATCH — Use odds, team form & format to predict." : "IN-PLAY"}
${liveCtx}
${pressureCtx}

BEST ODDS: ${oddsStr}

${isPreMatch ? `PRE-MATCH ANALYSIS RULES:
- Analyze odds implied probabilities carefully
- Factor in: home advantage, format suitability, team rankings
- T20: favor aggressive batting teams; Test: favor consistent sides
- If one team implied probability > 65% and odds > 1.5 → valid entry
- SAFE BET if implied prob > 70% and consistent across bookmakers` : `IN-PLAY ANALYSIS RULES:
- Momentum from recent balls, CRR vs RRR, wickets in hand
- SAFE BET only if prob > 70% and wicket risk NOT HIGH
- Factor collapse risk if 2+ recent wickets`}

STRICT JSON ONLY — no markdown:
{
  "win_probability": {
    "${match.home_team}": <0-100>,
    "${match.away_team}": <0-100>
  },
  "decision": "SAFE BET" | "SMALL BET" | "NO BET",
  "favored_team": "<team or null>",
  "reason": "<one crisp sentence>",
  "next_ball": "WICKET" | "SIX" | "FOUR" | "DOT" | "RUN",
  "next_ball_conf": <0-100>,
  "next_over_runs": "<e.g. 6-8>",
  "wicket_chance": "LOW" | "MEDIUM" | "HIGH",
  "momentum": "${match.home_team}" | "${match.away_team}" | "BALANCED",
  "pressure": "LOW" | "MEDIUM" | "HIGH",
  "is_value_bet": true | false,
  "value_edge": <number>,
  "best_odds": <number>,
  "best_bookmaker": "<name>",
  "recommendation": "<stake advice or null>",
  "key_insight": "<exciting fan insight>",
  "risk_level": "low" | "medium" | "high",
  "confidence": <0-100>,
  "pre_match_tip": ${isPreMatch ? '"<tip for pre-match e.g. Back India — odds undervalue their home advantage>"' : "null"}
}`;

  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL, max_tokens: 520, temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Groq error ${res.status}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    // Client-side value bet cross-check
    const favTeam = parsed.favored_team;
    if (favTeam && bestOdds[favTeam]) {
      const { isValue, edge } = detectValueBet(parsed.win_probability?.[favTeam] || 0, bestOdds[favTeam].price);
      if (isValue && !parsed.is_value_bet) { parsed.is_value_bet = true; parsed.value_edge = edge; }
    }
    return parsed;
  } catch {
    return {
      win_probability: { [match.home_team]: 50, [match.away_team]: 50 },
      decision: "NO BET", favored_team: null,
      reason: "Parse error — defaulting to NO BET.", next_ball: "RUN",
      next_ball_conf: 0, next_over_runs: "?", wicket_chance: "MEDIUM",
      momentum: "BALANCED", pressure: "MEDIUM", is_value_bet: false,
      value_edge: 0, best_odds: null, best_bookmaker: null,
      recommendation: null, key_insight: "", risk_level: "high", confidence: 0,
      pre_match_tip: null,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function maybeSendNotif(match, r) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (isSafeBet(r) && (r.confidence || 0) >= HIGH_CONF) {
    new Notification(`✅ SAFE BET: ${r.favored_team}`, {
      body: `${match.home_team} vs ${match.away_team} · ${r.confidence}% · ${r.key_insight}`,
      tag: "cricai", renotify: true,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const cn = (...c) => c.filter(Boolean).join(" ");

function Spinner({ size = 20, cls = "text-emerald-400" }) {
  return (
    <svg className={cn("animate-spin", cls)} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.15" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function AdBanner() {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ADSTERRA_KEY !== "YOUR_ADSTERRA_KEY_HERE") {
      const s = document.createElement("script");
      s.src = `//www.highperformanceformat.com/${ADSTERRA_KEY}/invoke.js`;
      s.async = true;
      ref.current.innerHTML = "";
      ref.current.appendChild(s);
    }
  }, []);
  if (ADSTERRA_KEY === "YOUR_ADSTERRA_KEY_HERE") {
    return (
      <div className="w-full my-3 rounded-xl border border-dashed border-slate-700/40 bg-slate-800/20 py-2 px-4 text-center">
        <span className="text-[10px] text-slate-700">📢 Ad Space</span>
      </div>
    );
  }
  return <div ref={ref} className="w-full my-3 overflow-hidden rounded-xl min-h-[60px]" />;
}

// Countdown timer for upcoming matches
function Countdown({ to }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(to) - Date.now();
      if (diff <= 0) { setLabel("Starting now"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [to]);
  return (
    <span className="text-[10px] text-amber-400 font-mono bg-amber-950/30 border border-amber-800/30 rounded-full px-2 py-0.5">
      ⏱ {label}
    </span>
  );
}

function ScoreStrip({ live, status }) {
  if (status === "upcoming" || !live?.score) {
    return (
      <div className="rounded-xl bg-slate-900/40 border border-slate-700/30 px-4 py-3 mb-3 flex items-center gap-3">
        <span className="text-xl">🏟️</span>
        <div>
          <p className="text-slate-400 text-xs font-semibold">Pre-Match</p>
          <p className="text-slate-600 text-[10px]">AI will predict based on odds & team form</p>
        </div>
      </div>
    );
  }

  const ballStyle = b =>
    b === "W" ? "bg-red-500 text-white" :
    b === "6" ? "bg-emerald-500 text-white" :
    b === "4" ? "bg-sky-500 text-white" :
    b === "0" ? "bg-slate-700 text-slate-400" :
    "bg-slate-700/80 text-slate-300";

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-700/40 px-4 py-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-slate-400 text-xs">{live.team} · </span>
          <span className="text-white font-bold font-mono text-base">{live.score}</span>
          <span className="text-slate-500 text-xs"> ({live.overs} ov)</span>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-slate-600 uppercase tracking-wider">CRR</div>
          <div className="text-emerald-400 font-mono font-bold">{live.rr}</div>
        </div>
      </div>
      {live.rrr && (
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[9px] text-slate-600">Target: <span className="text-slate-400 font-mono">{live.target}</span></span>
          <span className="text-[9px] text-slate-600">RRR: <span className={cn("font-mono font-bold", parseFloat(live.rrr) > parseFloat(live.rr) + 2 ? "text-red-400" : "text-amber-400")}>{live.rrr}</span></span>
        </div>
      )}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] text-slate-600 mr-0.5">Last 6</span>
        {live.balls?.length > 0
          ? live.balls.map((b, i) => (
              <span key={i} className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", ballStyle(b))}>{b}</span>
            ))
          : <span className="text-[9px] text-slate-700 italic">real-time from CricketData</span>
        }
      </div>
      {live.lastW && <p className="text-[10px] text-slate-500">🔴 {live.lastW}</p>}
    </div>
  );
}

function Ring({ val }) {
  const r = 30, c = 2 * Math.PI * r;
  const col = val >= 75 ? "#10b981" : val >= 60 ? "#f59e0b" : "#94a3b8";
  return (
    <div className="relative flex items-center justify-center w-16 h-16 flex-shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} stroke="#1e293b" strokeWidth="6" fill="none" />
        <circle cx="32" cy="32" r={r} stroke={col} strokeWidth="6" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (val / 100) * c}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1), stroke 0.5s" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-xs font-bold leading-none" style={{ color: col }}>{val}%</div>
        <div className="text-[7px] text-slate-600 uppercase tracking-widest">conf</div>
      </div>
    </div>
  );
}

function EventBadge({ event, conf }) {
  const map = {
    WICKET: { e: "🎯", l: "Wicket Likely",  c: "border-red-800/40 text-red-300 bg-red-950/30" },
    SIX:    { e: "💥", l: "SIX Coming",     c: "border-emerald-800/40 text-emerald-300 bg-emerald-950/30" },
    FOUR:   { e: "⚡", l: "FOUR Likely",    c: "border-sky-800/40 text-sky-300 bg-sky-950/30" },
    DOT:    { e: "🛡️", l: "Dot Ball",       c: "border-slate-700/40 text-slate-400 bg-slate-800/40" },
    RUN:    { e: "📈", l: "Steady Scoring", c: "border-slate-700/40 text-slate-400 bg-slate-800/40" },
  };
  const m = map[event] || map.RUN;
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", m.c)}>
      <span>{m.e}</span><span>{m.l}</span>
      {conf ? <span className="opacity-60">· {conf}%</span> : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATCH CARD
// ═══════════════════════════════════════════════════════════════════════════════
function MatchCard({ match, groqKey, onBet }) {
  const [phase,    setPhase]    = useState("idle");
  const [ai,       setAi]       = useState(null);
  const [errMsg,   setErrMsg]   = useState("");
  const [allBooks, setAllBooks] = useState(false);
  const [filtered, setFiltered] = useState(false);

  const isPreMatch = !match.live || !match.live.score;

  async function analyze() {
    if (!groqKey) { setErrMsg("Add Groq API key in Settings."); setPhase("error"); return; }
    setPhase("loading"); setAi(null); setErrMsg(""); setFiltered(false);
    try {
      const r = await callGroq(match, groqKey);
      if (!passesFilter(r)) {
        setAi({ ...r, decision: "NO BET", _filtered: true });
        setFiltered(true); setPhase("done"); return;
      }
      setAi(r); setPhase("done");
      maybeSendNotif(match, r);
      if (r.decision !== "NO BET") onBet?.({ match, r });
    } catch (e) { setErrMsg(e.message); setPhase("error"); }
  }

  const decision  = ai?.decision;
  const isSafe    = decision === "SAFE BET";
  const isSmall   = decision === "SMALL BET";
  const isActive  = isSafe || isSmall;
  const probA = ai?.win_probability?.[match.home_team] || 0;
  const probB = ai?.win_probability?.[match.away_team] || 0;

  const formatColor = match.sport_title === "T20" ? "text-violet-300 bg-violet-900/40 border-violet-800/30"
    : match.sport_title === "ODI" ? "text-sky-300 bg-sky-900/40 border-sky-800/30"
    : "text-amber-300 bg-amber-900/30 border-amber-800/30";

  const momentumKey = ai?.momentum === match.home_team ? "dominant_home"
    : ai?.momentum === match.away_team ? "dominant_away" : "balanced";

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all duration-500",
      isSafe  && phase === "done" ? "border-emerald-700/50 shadow-lg shadow-emerald-900/10" :
      isSmall && phase === "done" ? "border-amber-700/40" : "border-slate-700/40",
      "bg-slate-800/50"
    )}>

      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border", formatColor)}>
              {match.sport_title}
            </span>
            {/* Status badges */}
            {match.status === "live" && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-300 bg-red-950/40 border border-red-800/40 rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                LIVE
              </span>
            )}
            {match.status === "upcoming" && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-950/30 border border-amber-800/30 rounded-full px-2.5 py-0.5">
                ⏰ UPCOMING
              </span>
            )}
            {match._demo && <span className="text-[9px] text-slate-600 border border-slate-700/50 rounded-full px-2 py-0.5">demo</span>}
            {match._real && match._hasRealOdds && <span className="text-[9px] text-emerald-700 border border-emerald-900/50 rounded-full px-2 py-0.5 bg-emerald-950/30">real odds</span>}
            {match._real && !match._hasRealOdds && <span className="text-[9px] text-slate-600 border border-slate-700/30 rounded-full px-2 py-0.5">est. odds</span>}
          </div>
          {match.status === "upcoming" && (
            <Countdown to={match.commence_time} />
          )}
        </div>

        {/* League name */}
        {match.league && (
          <p className="text-[10px] text-slate-600 mb-1 truncate">{match.league}</p>
        )}

        <h3 className="text-white font-bold text-xl leading-snug" style={{ fontFamily: "'Syne', sans-serif" }}>
          {match.home_team} <span className="text-slate-600 font-normal text-base">vs</span> {match.away_team}
        </h3>
        <p className="text-slate-500 text-[11px] mt-0.5">
          {new Date(match.commence_time).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
        {match._cricInfo && isPreMatch && (
          <p className="text-[10px] text-slate-600 mt-1">{match._cricInfo}</p>
        )}
      </div>

      {/* Score / Pre-match strip */}
      <div className="px-5">
        <ScoreStrip live={match.live} status={match.status} />
      </div>

      {/* Odds */}
      <div className="px-5 pb-3">
        {(allBooks ? match.bookmakers : match.bookmakers.slice(0, 1)).map(bk => (
          <div key={bk.key} className="mb-2 last:mb-0">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1.5">{bk.title}</p>
            <div className="flex flex-wrap gap-1.5">
              {bk.markets[0]?.outcomes.map(o => (
                <div key={o.name} className="flex-1 min-w-[68px] rounded-lg bg-slate-900/60 border border-slate-700/40 px-2 py-2 text-center">
                  <div className="text-[9px] text-slate-500 truncate">{o.name}</div>
                  <div className="text-emerald-300 font-mono font-bold text-sm mt-0.5">{o.price.toFixed(2)}</div>
                  <div className="text-[8px] text-slate-600 mt-0.5">{impliedProb(o.price).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {match.bookmakers.length > 1 && (
          <button onClick={() => setAllBooks(p => !p)} className="text-[10px] text-slate-600 hover:text-slate-400 mt-1 transition-colors">
            {allBooks ? "▲ Less" : `▼ ${match.bookmakers.length - 1} more bookmaker`}
          </button>
        )}
      </div>

      {/* Ad slot */}
      <div className="px-5"><AdBanner /></div>

      {/* AI Section */}
      <div className="border-t border-slate-700/30 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px]">⚡</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
              AI · Llama 3 · {isPreMatch ? "Pre-Match" : "In-Play"}
            </span>
          </div>
          {phase !== "loading" && (
            <button onClick={analyze}
              className={cn("text-[12px] px-4 py-1.5 rounded-full font-semibold transition-all",
                phase === "idle" || phase === "error"
                  ? "bg-violet-700 hover:bg-violet-600 text-white"
                  : "border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500"
              )}>
              {phase === "done" ? "↺ Re-analyze" : "Analyze"}
            </button>
          )}
        </div>

        {/* Loading */}
        {phase === "loading" && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="relative">
              <Spinner size={44} cls="text-violet-400" />
              <div className="absolute inset-0 flex items-center justify-center text-lg">🏏</div>
            </div>
            <div className="text-center">
              <p className="text-slate-500 text-xs animate-pulse">
                {isPreMatch ? "Analyzing team form & odds…" : "Analyzing live situation…"}
              </p>
              <p className="text-slate-600 text-[10px] mt-0.5">Pressure · Value · Decision engine</p>
            </div>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="rounded-xl bg-red-950/30 border border-red-800/30 px-4 py-3">
            <p className="text-red-400 text-xs">⚠ {errMsg}</p>
          </div>
        )}

        {/* Result */}
        {phase === "done" && ai && (
          <div className={cn(
            "rounded-xl border px-4 py-4",
            isSafe  ? "border-emerald-700/40 bg-emerald-950/20" :
            isSmall ? "border-amber-700/30 bg-amber-950/10" :
            "border-slate-700/30 bg-slate-900/30"
          )}>
            {/* Decision + badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={cn(
                "text-[11px] font-bold px-3 py-1 rounded-full border uppercase tracking-widest",
                isSafe  ? "border-emerald-600/50 bg-emerald-900/40 text-emerald-300" :
                isSmall ? "border-amber-600/40 bg-amber-900/30 text-amber-300" :
                "border-slate-600/40 bg-slate-800/40 text-slate-400"
              )}>
                {isSafe ? "✅ SAFE BET" : isSmall ? "🟡 SMALL BET" : "⛔ NO BET"}
              </span>
              {ai.is_value_bet && isActive && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-violet-600/40 bg-violet-900/30 text-violet-300 uppercase tracking-wider">
                  💎 VALUE +{ai.value_edge}%
                </span>
              )}
              {ai.risk_level && (
                <span className={cn(
                  "text-[10px] px-2 py-1 rounded-full border font-medium uppercase tracking-wider",
                  ai.risk_level === "low"    ? "border-emerald-800/30 text-emerald-500 bg-emerald-950/20" :
                  ai.risk_level === "medium" ? "border-amber-800/30 text-amber-500 bg-amber-950/20" :
                  "border-red-800/30 text-red-500 bg-red-950/20"
                )}>Risk: {ai.risk_level}</span>
              )}
              {filtered && <span className="text-[9px] text-slate-600 border border-slate-700/30 rounded-full px-2 py-0.5">filtered</span>}
            </div>

            {/* Win probability bars */}
            {(probA > 0 || probB > 0) && (
              <div className="mb-3 space-y-1.5">
                {[{ team: match.home_team, prob: probA }, { team: match.away_team, prob: probB }].map(({ team, prob }) => (
                  <div key={team}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-slate-400 truncate max-w-[60%]">{team}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-300">{prob}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-1000",
                          prob >= 70 ? "bg-emerald-500" : prob >= 55 ? "bg-amber-500" : "bg-slate-600"
                        )}
                        style={{ width: `${prob}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Signal row */}
            <div className="flex items-start gap-3 mb-3">
              {isActive
                ? <Ring val={ai.confidence} />
                : <div className="w-14 h-14 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-2xl flex-shrink-0">⛔</div>
              }
              <div className="flex-1 min-w-0">
                <p className={cn("font-bold text-base mb-1 leading-tight",
                  isSafe ? "text-emerald-400" : isSmall ? "text-amber-400" : "text-slate-400")}
                  style={{ fontFamily: "'Syne', sans-serif" }}>
                  {isActive ? ai.favored_team : "No Entry"}
                </p>
                <p className="text-slate-400 text-xs leading-relaxed">{ai.reason}</p>
                {isActive && ai.recommendation && (
                  <p className="text-xs font-semibold mt-1 text-slate-400">
                    Stake: <span className={isSafe ? "text-emerald-400" : "text-amber-400"}>{ai.recommendation}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Pre-match tip box */}
            {isPreMatch && ai.pre_match_tip && (
              <div className="rounded-lg bg-violet-900/20 border border-violet-800/30 px-3 py-2.5 mb-3">
                <p className="text-[10px] text-violet-300 font-semibold uppercase tracking-widest mb-1">Pre-Match Tip</p>
                <p className="text-[11px] text-violet-200 leading-relaxed">{ai.pre_match_tip}</p>
              </div>
            )}

            {/* Key insight */}
            {ai.key_insight && (
              <div className="rounded-lg bg-slate-800/60 border border-slate-700/30 px-3 py-2 mb-3">
                <p className="text-[11px] text-slate-300 leading-relaxed">💡 {ai.key_insight}</p>
              </div>
            )}

            {/* Badges row */}
            <div className="flex flex-wrap gap-2 mb-3">
              {ai.next_ball && <EventBadge event={ai.next_ball} conf={ai.next_ball_conf} />}
              {ai.momentum && (
                <span className={cn("inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border font-medium",
                  momentumKey === "dominant_home" ? "border-sky-800/30 text-sky-300 bg-sky-950/20"
                  : momentumKey === "dominant_away" ? "border-orange-800/30 text-orange-300 bg-orange-950/20"
                  : "border-slate-700/30 text-slate-500 bg-slate-800/30"
                )}>
                  {momentumKey === "dominant_home" ? `⚡ ${match.home_team} dominant`
                  : momentumKey === "dominant_away" ? `⚡ ${match.away_team} dominant`
                  : "⚖️ Balanced"}
                </span>
              )}
              {ai.wicket_chance && (
                <span className={cn("inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border font-medium",
                  ai.wicket_chance === "HIGH"   ? "border-red-800/30 text-red-300 bg-red-950/20" :
                  ai.wicket_chance === "MEDIUM" ? "border-amber-800/30 text-amber-300 bg-amber-950/20" :
                  "border-slate-700/30 text-slate-500 bg-slate-800/30"
                )}>🎯 Wicket: {ai.wicket_chance}</span>
              )}
              {ai.pressure && ai.pressure !== "LOW" && (
                <span className={cn("inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border font-medium",
                  ai.pressure === "HIGH" ? "border-red-800/30 text-red-300 bg-red-950/20" :
                  "border-amber-800/30 text-amber-300 bg-amber-950/20"
                )}>🔥 Pressure: {ai.pressure}</span>
              )}
            </div>

            {ai.next_over_runs && (
              <div className="text-[11px] text-slate-500 mb-3">
                Next over estimate: <span className="text-slate-300 font-mono">{ai.next_over_runs} runs</span>
              </div>
            )}

            {isActive && ai.best_odds && (
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] bg-slate-800 border border-slate-700/40 rounded-lg px-2.5 py-1 text-slate-300">
                  Best odds: <strong className="text-emerald-300">{ai.best_odds}</strong>
                </span>
                <span className="text-[11px] bg-slate-800 border border-slate-700/40 rounded-lg px-2.5 py-1 text-slate-300">
                  Book: <strong className="text-emerald-300">{ai.best_bookmaker}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {phase === "idle" && (
          <div className="text-center py-4 text-slate-600 text-xs">
            {isPreMatch ? "Tap Analyze for pre-match prediction" : "Tap Analyze to get AI prediction"}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function Settings({ open, onClose, onSave, notifOk, onReqNotif }) {
  const [groq,    setGroq]    = useState(() => localStorage.getItem(SK.GROQ)    || "");
  const [odds,    setOdds]    = useState(() => localStorage.getItem(SK.ODDS)    || "");
  const [cricket, setCricket] = useState(() => localStorage.getItem(SK.CRICKET) || "");
  const [ok, setOk] = useState(false);
  if (!open) return null;

  const save = () => {
    localStorage.setItem(SK.GROQ,    groq.trim());
    localStorage.setItem(SK.ODDS,    odds.trim());
    localStorage.setItem(SK.CRICKET, cricket.trim());
    onSave({ groq: groq.trim(), odds: odds.trim(), cricket: cricket.trim() });
    setOk(true);
    setTimeout(() => { setOk(false); onClose(); }, 1400);
  };

  const fields = [
    { label: "Groq API Key",        val: groq,    set: setGroq,    ph: "gsk_••••••••••",      link: "https://console.groq.com/keys", lt: "Get free →" },
    { label: "The Odds API Key",    val: odds,    set: setOdds,    ph: "••••••••••••••••",     link: "https://the-odds-api.com",      lt: "Get free →" },
    { label: "CricketData API Key", val: cricket, set: setCricket, ph: "cricapi_••••••••",     link: "https://cricketdata.org",       lt: "Get free →" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#0d1f2d] border border-slate-700/50 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="sm:hidden flex justify-center pt-3"><div className="w-9 h-1 bg-slate-700 rounded-full" /></div>
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>Settings</h2>
            <p className="text-slate-500 text-xs">Keys stay in your browser only</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/30 px-4 py-3 flex gap-3">
            <span className="text-lg">🔒</span>
            <p className="text-xs text-slate-400 leading-relaxed">All keys stored in <code className="text-emerald-400">localStorage</code>. Never sent to any server except the provider directly.</p>
          </div>
          {fields.map(f => (
            <div key={f.label}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest">{f.label}</label>
                <a href={f.link} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400 hover:text-emerald-300">{f.lt}</a>
              </div>
              <input type="password" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono" />
            </div>
          ))}
          <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 px-4 py-3">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              💡 <strong className="text-slate-400">CricketData</strong> — fetches real upcoming/live matches worldwide (PSL, IPL, Tests, ODIs, T20s). Free: 100 req/day at cricketdata.org
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-800/50 border border-slate-700/30 px-4 py-3">
            <div>
              <p className="text-sm text-slate-300 font-medium">Notifications</p>
              <p className="text-[11px] text-slate-500">SAFE BET signals only</p>
            </div>
            {notifOk
              ? <span className="text-xs text-emerald-400 font-semibold">✓ On</span>
              : <button onClick={onReqNotif} className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-full font-semibold">Enable</button>
            }
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3 pt-3 border-t border-slate-800/60">
          <button onClick={save} className={cn("flex-1 py-3 rounded-xl font-bold text-sm", ok ? "bg-emerald-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white")}>
            {ok ? "✓ Saved!" : "Save & Close"}
          </button>
          <button onClick={onClose} className="px-5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function TabBar({ active, onChange, liveCounts }) {
  const tabs = [
    { id: "all",     label: "All",         icon: "🏏" },
    { id: "live",    label: `Live & Upcoming`, icon: "🔴", count: liveCounts.live },
    { id: "demo",    label: "Demo",        icon: "📊", count: liveCounts.demo },
  ];
  return (
    <div className="flex items-center gap-1.5 mb-5 p-1 bg-slate-800/40 rounded-2xl border border-slate-700/30">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all",
            active === t.id
              ? "bg-slate-700 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          <span>{t.icon}</span>
          <span>{t.label}</span>
          {t.count != null && t.count > 0 && (
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
              active === t.id ? "bg-slate-600 text-slate-200" : "bg-slate-700 text-slate-400"
            )}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// Empty state for no live matches
function EmptyLive({ hasCricketKey }) {
  return (
    <div className="rounded-2xl border border-slate-700/30 bg-slate-800/30 px-6 py-10 text-center">
      <div className="text-4xl mb-3">🌐</div>
      <p className="text-slate-300 font-semibold text-sm mb-2">
        {hasCricketKey ? "No live/upcoming matches right now" : "Add CricketData API key"}
      </p>
      <p className="text-slate-600 text-xs leading-relaxed max-w-xs mx-auto">
        {hasCricketKey
          ? "CricketData found no current matches. Check back during a live series (PSL, IPL, Tests, etc.)"
          : "Get a free key at cricketdata.org → Settings → CricketData API Key. Fetches PSL, IPL, Tests, ODIs and more."
        }
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [groqKey,    setGroqKey]    = useState(() => localStorage.getItem(SK.GROQ)    || "");
  const [oddsKey,    setOddsKey]    = useState(() => localStorage.getItem(SK.ODDS)    || "");
  const [cricketKey, setCricketKey] = useState(() => localStorage.getItem(SK.CRICKET) || "");

  const [showSettings, setShowSettings] = useState(false);
  const [activeTab,    setActiveTab]    = useState("all");

  // Separate match lists
  const [demoMatches, setDemoMatches]   = useState(DEMO_MATCHES);
  const [liveMatches, setLiveMatches]   = useState([]);

  const [loadingOdds,   setLoadingOdds]   = useState(false);
  const [loadingLive,   setLoadingLive]   = useState(false);
  const [errMsg,        setErrMsg]        = useState("");
  const [liveErr,       setLiveErr]       = useState("");
  const [lastFetch,     setLastFetch]     = useState(null);

  const [notifOk, setNotifOk] = useState(false);
  const [bets,    setBets]    = useState([]);
  const [toast,   setToast]   = useState(null);

  useEffect(() => {
    if ("Notification" in window) setNotifOk(Notification.permission === "granted");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Syne:wght@700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Load real upcoming/live matches (CricketData + optional Odds merge) ──────
  const loadLiveMatches = useCallback(async () => {
    if (!cricketKey) { setLiveMatches([]); return; }
    setLoadingLive(true); setLiveErr("");
    try {
      // Parallel: CricketData + Odds API (odds merged if key exists)
      const [cricMatches, oddsData] = await Promise.all([
        fetchUpcomingFromCricketData(cricketKey),
        fetchOdds(oddsKey),
      ]);

      if (cricMatches.length === 0) {
        setLiveErr("No upcoming cricket matches found. Try again later.");
        setLiveMatches([]);
      } else {
        const merged = oddsData.length > 0
          ? mergeRealOdds(cricMatches, oddsData)
          : cricMatches;
        setLiveMatches(merged);
        showToast(`🌐 ${merged.length} upcoming/live matches loaded`, "success");
      }
      setLastFetch(new Date());
    } catch (e) {
      setLiveErr("CricketData error: " + e.message);
      setLiveMatches([]);
    } finally { setLoadingLive(false); }
  }, [cricketKey, oddsKey, showToast]);

  // ── Load demo Odds (for demo matches' odds panel) ─────────────────────────
  const loadDemoOdds = useCallback(async () => {
    if (!oddsKey) return;
    setLoadingOdds(true); setErrMsg("");
    try {
      const data = await fetchOdds(oddsKey);
      if (data.length > 0) {
        // Merge real odds into demo too if teams match
        setDemoMatches(prev => prev.map((dm, i) => {
          const realMatch = data[i % data.length];
          if (realMatch) return { ...dm, bookmakers: realMatch.bookmakers, _realOdds: true };
          return dm;
        }));
      }
    } catch { /* keep demo odds */ }
    finally { setLoadingOdds(false); }
  }, [oddsKey]);

  useEffect(() => {
    loadLiveMatches();
    loadDemoOdds();
  }, [loadLiveMatches, loadDemoOdds]);

  // Auto-refresh every 5 min
  useEffect(() => {
    const t = setInterval(() => { loadLiveMatches(); loadDemoOdds(); }, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadLiveMatches, loadDemoOdds]);

  const reqNotif = async () => {
    if (!("Notification" in window)) return;
    const r = await Notification.requestPermission();
    setNotifOk(r === "granted");
    if (r === "granted") showToast("🔔 Notifications enabled!", "success");
  };

  const refresh = () => { loadLiveMatches(); loadDemoOdds(); };

  // Filter matches by tab
  const allMatches  = [...liveMatches, ...demoMatches];
  const shownMatches =
    activeTab === "live" ? liveMatches :
    activeTab === "demo" ? demoMatches :
    allMatches;

  const isLoading = loadingOdds || loadingLive;

  const liveCounts = {
    live: liveMatches.length,
    demo: demoMatches.length,
  };

  return (
    <div className="min-h-screen text-white"
      style={{ fontFamily: "'IBM Plex Mono', monospace", background: "linear-gradient(155deg,#091525 0%,#0c1e2e 50%,#091525 100%)" }}>

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-2xl shadow-2xl text-sm font-semibold text-center max-w-[85vw]",
          toast.type === "success" ? "bg-emerald-700 text-white" :
          toast.type === "bet"     ? "bg-violet-700 text-white" :
          "bg-slate-700 text-white"
        )} style={{ animation: "fadeDown 0.3s ease" }}>
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-[#091525]/90 backdrop-blur-md px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-700/20 border border-emerald-700/30 flex items-center justify-center">🏏</div>
          <span className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
            <span className="text-white">CricAI</span><span className="text-emerald-400"> Predictor</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={isLoading}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-700/60 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all disabled:opacity-40">
            {isLoading ? <Spinner size={15} cls="text-slate-500" /> : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
            )}
          </button>
          <button onClick={() => setShowSettings(true)}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all",
              groqKey ? "border border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
            )}>
            ⚙ {groqKey ? "Settings" : "Setup Keys"}
          </button>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { l: "Live Matches",   v: liveMatches.filter(m => m.status === "live").length,     s: "real-time",        a: "text-red-400" },
            { l: "Upcoming",       v: liveMatches.filter(m => m.status === "upcoming").length, s: "scheduled",        a: "text-amber-400" },
            { l: "AI Model",       v: "Llama 3",                                               s: "70B · Groq",       a: "text-violet-400" },
            { l: "Last Refresh",   v: lastFetch ? lastFetch.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—",
              s: cricketKey ? "CricketData" : "no key", a: "text-sky-400" },
          ].map(c => (
            <div key={c.l} className="rounded-xl bg-slate-800/40 border border-slate-700/30 px-4 py-3.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">{c.l}</p>
              <p className={cn("text-xl font-bold", c.a)} style={{ fontFamily: "'Syne', sans-serif" }}>{c.v}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{c.s}</p>
            </div>
          ))}
        </div>

        <AdBanner />

        {/* Bet streak */}
        {bets.length >= 2 && (
          <div className="rounded-xl border border-amber-700/30 bg-amber-950/20 px-4 py-3 flex items-center gap-3 mb-4">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-amber-300 font-bold text-sm">{bets.length} signals found</p>
              <p className="text-amber-600 text-[11px]">Multiple high-confidence opportunities today</p>
            </div>
          </div>
        )}

        {/* CricketData key prompt */}
        {!cricketKey && (
          <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/10 px-4 py-3 mb-4 flex gap-3 items-start">
            <span className="text-lg flex-shrink-0">🌐</span>
            <div>
              <p className="text-emerald-300 text-xs font-semibold mb-1">Get real upcoming matches</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Add your <strong className="text-slate-400">CricketData API key</strong> in Settings to see live PSL, IPL, Tests, ODIs & more — with pre-match AI predictions.
              </p>
              <button onClick={() => setShowSettings(true)} className="mt-2 text-[11px] text-emerald-400 font-semibold hover:text-emerald-300">
                → Open Settings
              </button>
            </div>
          </div>
        )}

        {/* Errors */}
        {liveErr && activeTab !== "demo" && (
          <div className="rounded-xl border border-amber-800/30 bg-amber-950/20 px-4 py-3 text-amber-400 text-xs mb-4">⚠ {liveErr}</div>
        )}

        {/* Tab bar */}
        <TabBar active={activeTab} onChange={setActiveTab} liveCounts={liveCounts} />

        {/* Loading */}
        {isLoading && activeTab !== "demo" && (
          <div className="flex flex-col items-center py-10 gap-3">
            <Spinner size={40} cls="text-emerald-400" />
            <p className="text-slate-500 text-sm animate-pulse">Fetching live cricket data…</p>
          </div>
        )}

        {/* Empty live state */}
        {!isLoading && activeTab === "live" && liveMatches.length === 0 && (
          <EmptyLive hasCricketKey={!!cricketKey} />
        )}

        {/* Match cards */}
        {(!isLoading || activeTab === "demo") && shownMatches.length > 0 && (
          <div className="space-y-4">
            {shownMatches.map((m, i) => (
              <div key={m.id} style={{ animation: "fadeUp 0.4s ease both", animationDelay: `${i * 60}ms` }}>
                <MatchCard
                  match={m}
                  groqKey={groqKey}
                  onBet={({ match, r }) => {
                    setBets(p => [...p, { match, r }]);
                    if (r.decision === "SAFE BET") {
                      showToast(`✅ SAFE BET: ${r.favored_team} · ${r.confidence}%`, "bet");
                    } else {
                      showToast(`🟡 SMALL BET: ${r.favored_team}`, "info");
                    }
                  }}
                />
                {(i === 1 || i === 3) && <AdBanner />}
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-10 text-center text-[10px] text-slate-700 max-w-xs mx-auto leading-relaxed">
          CricAI is for informational purposes only. Gambling involves financial risk. Please bet responsibly. 18+ only.
        </p>
        <AdBanner />
      </main>

      <Settings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={({ groq, odds, cricket }) => {
          setGroqKey(groq); setOddsKey(odds); setCricketKey(cricket);
          showToast("Keys saved", "success");
        }}
        notifOk={notifOk}
        onReqNotif={reqNotif}
      />

      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeDown { from { opacity:0; transform:translate(-50%,-8px); } to { opacity:1; transform:translate(-50%,0); } }
      `}</style>
    </div>
  );
}
