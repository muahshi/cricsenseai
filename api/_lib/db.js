import { config } from "./config.js";

// In-memory fallback (resets on cold start — use MongoDB for persistence)
const mem = { users: new Map(), predictions: [], results: [] };
let _db = null;

async function db() {
  if (!config.mongoUri) return null;
  if (_db) return _db;
  try {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    _db = client.db("cricsense");
    return _db;
  } catch { return null; }
}

export async function upsertUser(id, data) {
  const doc = { id, ...data, updatedAt: new Date() };
  const d = await db();
  if (d) { await d.collection("users").updateOne({ id }, { $set: doc }, { upsert: true }); return; }
  mem.users.set(id, doc);
}
export async function getAllUsers() {
  const d = await db();
  if (d) return d.collection("users").find({}).toArray();
  return [...mem.users.values()];
}
export async function userCount() {
  const d = await db();
  if (d) return d.collection("users").countDocuments();
  return mem.users.size;
}
export async function savePred(doc) {
  const d = await db();
  if (d) { await d.collection("predictions").insertOne({ ...doc, ts: new Date() }); return; }
  mem.predictions.push({ ...doc, ts: new Date() });
  if (mem.predictions.length > 200) mem.predictions.shift();
}
export async function getPreds(n = 50) {
  const d = await db();
  if (d) return d.collection("predictions").find({}).sort({ ts: -1 }).limit(n).toArray();
  return mem.predictions.slice(-n).reverse();
}
export async function predCount() {
  const d = await db();
  if (d) return d.collection("predictions").countDocuments();
  return mem.predictions.length;
}
export async function saveResult(doc) {
  const d = await db();
  if (d) { await d.collection("results").insertOne({ ...doc, ts: new Date() }); return; }
  mem.results.push({ ...doc, ts: new Date() });
}
export async function getAccuracy() {
  const d = await db();
  const res = d ? await d.collection("results").find({}).toArray() : mem.results;
  if (!res.length) return { total: 0, correct: 0, pct: 0 };
  const correct = res.filter(r => r.correct).length;
  return { total: res.length, correct, pct: Math.round((correct / res.length) * 100) };
}
