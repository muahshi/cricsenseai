import { config } from "./config.js";

// ─── IN-MEMORY FALLBACK DATABASE ─────────────────────────────────────────────
const memDB = {
  users: new Map(),        // telegramId -> { id, username, firstName, joinedAt }
  predictions: [],         // { matchId, matchName, prediction, confidence, timestamp }
  results: [],             // { matchId, winner, accuracy, timestamp }
};

let mongoClient = null;
let db = null;

// ─── CONNECT TO MONGO ─────────────────────────────────────────────────────────
async function connectMongo() {
  if (!config.mongoUri) return null;
  if (db) return db;
  try {
    const { MongoClient } = await import("mongodb");
    mongoClient = new MongoClient(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    await mongoClient.connect();
    db = mongoClient.db("cricsense");
    console.log("✅ MongoDB connected");
    return db;
  } catch (e) {
    console.warn("⚠️ MongoDB failed, using in-memory:", e.message);
    return null;
  }
}

// ─── USER OPERATIONS ─────────────────────────────────────────────────────────
export async function saveUser(telegramId, data) {
  const user = { id: telegramId, ...data, joinedAt: new Date() };
  try {
    const d = await connectMongo();
    if (d) {
      await d.collection("users").updateOne(
        { id: telegramId },
        { $set: user },
        { upsert: true }
      );
      return;
    }
  } catch {}
  memDB.users.set(telegramId, user);
}

export async function getUser(telegramId) {
  try {
    const d = await connectMongo();
    if (d) return await d.collection("users").findOne({ id: telegramId });
  } catch {}
  return memDB.users.get(telegramId) || null;
}

export async function getAllUsers() {
  try {
    const d = await connectMongo();
    if (d) return await d.collection("users").find({}).toArray();
  } catch {}
  return Array.from(memDB.users.values());
}

export async function getUserCount() {
  try {
    const d = await connectMongo();
    if (d) return await d.collection("users").countDocuments();
  } catch {}
  return memDB.users.size;
}

// ─── PREDICTION OPERATIONS ────────────────────────────────────────────────────
export async function savePrediction(prediction) {
  const doc = { ...prediction, timestamp: new Date() };
  try {
    const d = await connectMongo();
    if (d) {
      await d.collection("predictions").insertOne(doc);
      return;
    }
  } catch {}
  memDB.predictions.push(doc);
  if (memDB.predictions.length > 200) memDB.predictions.shift();
}

export async function getPredictions(limit = 20) {
  try {
    const d = await connectMongo();
    if (d) return await d.collection("predictions")
      .find({}).sort({ timestamp: -1 }).limit(limit).toArray();
  } catch {}
  return memDB.predictions.slice(-limit).reverse();
}

export async function getPredictionCount() {
  try {
    const d = await connectMongo();
    if (d) return await d.collection("predictions").countDocuments();
  } catch {}
  return memDB.predictions.length;
}

// ─── ACCURACY / RESULTS ───────────────────────────────────────────────────────
export async function saveResult(result) {
  const doc = { ...result, timestamp: new Date() };
  try {
    const d = await connectMongo();
    if (d) {
      await d.collection("results").insertOne(doc);
      return;
    }
  } catch {}
  memDB.results.push(doc);
}

export async function getAccuracy() {
  try {
    const d = await connectMongo();
    if (d) {
      const results = await d.collection("results").find({}).toArray();
      return calcAccuracy(results);
    }
  } catch {}
  return calcAccuracy(memDB.results);
}

function calcAccuracy(results) {
  if (!results.length) return { total: 0, correct: 0, percentage: 0 };
  const correct = results.filter(r => r.correct).length;
  return {
    total: results.length,
    correct,
    percentage: Math.round((correct / results.length) * 100),
  };
}

