import { config } from "./config.js";

var mem = { users: {}, predictions: [], results: [] };
var _db = null;

async function getDb() {
  if (!config.mongoUri) return null;
  if (_db) return _db;
  try {
    var mod = await import("mongodb");
    var MongoClient = mod.MongoClient;
    var client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    _db = client.db("cricsense");
    return _db;
  } catch (e) {
    return null;
  }
}

export async function upsertUser(id, data) {
  var doc = Object.assign({ id: id }, data, { updatedAt: new Date() });
  var d = await getDb();
  if (d) {
    await d.collection("users").updateOne({ id: id }, { $set: doc }, { upsert: true });
    return;
  }
  mem.users[id] = doc;
}

export async function getAllUsers() {
  var d = await getDb();
  if (d) return d.collection("users").find({}).toArray();
  return Object.values(mem.users);
}

export async function userCount() {
  var d = await getDb();
  if (d) return d.collection("users").countDocuments();
  return Object.keys(mem.users).length;
}

export async function savePred(doc) {
  var d = await getDb();
  var full = Object.assign({}, doc, { ts: new Date() });
  if (d) {
    await d.collection("predictions").insertOne(full);
    return;
  }
  mem.predictions.push(full);
  if (mem.predictions.length > 200) mem.predictions.shift();
}

export async function getPreds(n) {
  n = n || 50;
  var d = await getDb();
  if (d) return d.collection("predictions").find({}).sort({ ts: -1 }).limit(n).toArray();
  return mem.predictions.slice(-n).reverse();
}

export async function predCount() {
  var d = await getDb();
  if (d) return d.collection("predictions").countDocuments();
  return mem.predictions.length;
}

export async function saveResult(doc) {
  var d = await getDb();
  var full = Object.assign({}, doc, { ts: new Date() });
  if (d) {
    await d.collection("results").insertOne(full);
    return;
  }
  mem.results.push(full);
}

export async function getAccuracy() {
  var d = await getDb();
  var res = d ? await d.collection("results").find({}).toArray() : mem.results;
  if (!res.length) return { total: 0, correct: 0, pct: 0 };
  var correct = res.filter(function(r) { return r.correct; }).length;
  return { total: res.length, correct: correct, pct: Math.round((correct / res.length) * 100) };
}
