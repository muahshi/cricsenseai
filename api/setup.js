import { setWebhook } from "./_lib/tg.js";
import { verifyCron, config } from "./_lib/config.js";

export default async function handler(req, res) {
  if (!verifyCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const url = `${config.appUrl}/api/telegram`;
  const result = await setWebhook(url);
  res.status(200).json({ ok: true, webhookUrl: url, result });
}
