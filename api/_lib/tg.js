import { config } from "./config.js";

const BASE = () => `https://api.telegram.org/bot${config.telegramToken}`;

export async function send(chatId, text) {
  if (!config.telegramToken) return;
  await fetch(`${BASE()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => {});
}

export async function broadcast(text) {
  if (config.telegramGroup) await send(config.telegramGroup, text);
}

export async function setWebhook(url) {
  const r = await fetch(`${BASE()}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return r.json();
}
