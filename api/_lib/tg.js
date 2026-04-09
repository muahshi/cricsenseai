import { config } from "./config.js";

function base() {
  return "https://api.telegram.org/bot" + config.telegramToken;
}

export async function send(chatId, text) {
  if (!config.telegramToken) return;
  try {
    await fetch(base() + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });
  } catch (e) {}
}

export async function broadcast(text) {
  if (config.telegramGroup) await send(config.telegramGroup, text);
}

export async function setWebhook(url) {
  try {
    var r = await fetch(base() + "/setWebhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url })
    });
    return r.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
