import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'sqlvis';
const CONFIG_FILE = path.join(process.cwd(), 'db_fallback.json');

let dbClient = null;
let db = null;
let useFallback = false;

async function getDB() {
  if (useFallback) return null;
  if (db) return db;
  try {
    dbClient = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
    await dbClient.connect();
    db = dbClient.db(DB_NAME);
    return db;
  } catch (err) {
    console.warn(`MongoDB connection failed. Falling back to local file storage. Error: ${err.message}`);
    useFallback = true;
    return null;
  }
}

export async function GET() {
  const database = await getDB();
  if (useFallback || !database) {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return NextResponse.json({ ...parsed, storage: 'fallback' });
      }
      return NextResponse.json({ levelColors: {}, questionColors: {}, notes: '', storage: 'fallback' });
    } catch (e) {
      return NextResponse.json({ levelColors: {}, questionColors: {}, notes: '', storage: 'fallback' });
    }
  }

  try {
    const col = database.collection('configs');
    const doc = await col.findOne({ _id: 'user_settings' });
    if (doc) {
      return NextResponse.json({ levelColors: doc.levelColors || {}, questionColors: doc.questionColors || {}, notes: doc.notes || '', storage: 'mongodb' });
    }
    return NextResponse.json({ levelColors: {}, questionColors: {}, notes: '', storage: 'mongodb' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { levelColors, questionColors, notes } = body;
    const database = await getDB();

    if (useFallback || !database) {
      const data = { levelColors: levelColors || {}, questionColors: questionColors || {}, notes: notes || '' };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
      return NextResponse.json({ success: true, storage: 'fallback' });
    }

    const col = database.collection('configs');
    await col.updateOne(
      { _id: 'user_settings' },
      { $set: { levelColors: levelColors || {}, questionColors: questionColors || {}, notes: notes || '' } },
      { upsert: true }
    );
    return NextResponse.json({ success: true, storage: 'mongodb' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
