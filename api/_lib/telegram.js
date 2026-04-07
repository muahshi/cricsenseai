import { config } from "./config.js";

const BASE = `https://api.telegram.org/bot${config.telegramToken}`;

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────
export async function sendMessage(chatId, text, options = {}) {
  if (!config.telegramToken) {
    console.log("[Telegram Mock]", chatId, text.slice(0, 100));
    return;
  }
  try {
    const res = await fetch(`${BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...options,
      }),
    });
    return await res.json();
  } catch (e) {
    console.error("Telegram send error:", e.message);
  }
}

// ─── BROADCAST TO GROUP ───────────────────────────────────────────────────────
export async function broadcastToGroup(text) {
  if (!config.telegramGroupId) return;
  return sendMessage(config.telegramGroupId, text);
}

// ─── BROADCAST TO ALL USERS ───────────────────────────────────────────────────
export async function broadcastToAll(users, text) {
  const results = [];
  for (const user of users) {
    try {
      await sendMessage(user.id, text);
      results.push({ id: user.id, ok: true });
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      results.push({ id: user.id, ok: false, error: e.message });
    }
  }
  return results;
}

// ─── SET WEBHOOK ──────────────────────────────────────────────────────────────
export async function setWebhook(url) {
  if (!config.telegramToken) return { ok: false, error: "No token" };
  try {
    const res = await fetch(`${BASE}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── GET WEBHOOK INFO ─────────────────────────────────────────────────────────
export async function getWebhookInfo() {
  if (!config.telegramToken) return null;
  try {
    const res = await fetch(`${BASE}/getWebhookInfo`);
    return await res.json();
  } catch {
    return null;
  }
}

// ─── ANSWER CALLBACK QUERY ─────────────────────────────────────────────────────
export async function answerCallback(callbackQueryId, text = "") {
  if (!config.telegramToken) return;
  try {
    await fetch(`${BASE}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch {}
}

