import { setWebhook, getWebhookInfo } from "./_lib/telegram.js";
import { config, verifyCronSecret } from "./_lib/config.js";

export default async function handler(req, res) {
  // Verify secret
  if (!verifyCronSecret(req)) {
    return res.status(401).json({ ok: false, error: "Invalid secret" });
  }

  try {
    const webhookUrl = `${config.appUrl}/api/telegram`;

    // Set webhook
    const result = await setWebhook(webhookUrl);
    
    // Get current webhook info
    const info = await getWebhookInfo();

    return res.status(200).json({
      ok: true,
      message: "Webhook setup complete!",
      webhookUrl,
      telegramResult: result,
      currentInfo: info,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
