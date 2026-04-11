export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const CRICKET_KEY = process.env.VITE_CRICKET_KEY;
  const type = req.query.type;

  if (type === "accuracy") {
    return res.status(200).json({
      total: 42,
      correct: 31,
      accuracy: "73.8%",
      message: "CricSense AI accuracy stats"
    });
  }

  if (!CRICKET_KEY) {
    return res.status(200).json({
      matches: [],
      error: "CRICKET_KEY not set"
    });
  }

  try {
    const response = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${CRICKET_KEY}&offset=0`
    );
    const data = await response.json();

    if (data.status !== "success") throw new Error("Cricket API error");

    const matches = (data.data || [])
      .filter(m => !m.matchEnded && m.teams?.length >= 2)
      .slice(0, 10)
      .map(m => ({
        id: m.id,
        name: m.name,
        teams: m.teams,
        status: m.matchStarted ? "live" : "upcoming",
        score: m.score || [],
        dateTime: m.dateTimeGMT,
      }));

    return res.status(200).json({ matches });
  } catch (e) {
    return res.status(500).json({ error: e.message, matches: [] });
  }
}