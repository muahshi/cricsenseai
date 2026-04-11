api/ai.js file banao — yeh content daalo:
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GROQ_KEY = process.env.VITE_GROQ_KEY;
  if (!GROQ_KEY) {
    return res.status(400).json({ error: "GROQ key missing" });
  }

  try {
    const { messages, max_tokens = 1000 } = req.body;
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          max_tokens,
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(400).json({ error: data.error?.message || "Groq error" });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}