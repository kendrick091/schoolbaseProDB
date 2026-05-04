const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.Localhost_URI;
const client = new MongoClient(uri);

let db;

async function connectDB() {
  if (db) return db;

  await client.connect();
  console.log('✅ Connected to MongoDB Atlas');

  db = client.db('schoolbase');
  return db;
}

function collection(name) {
  if (!db) {
    throw new Error('❌ Database not connected yet');
  }
  return db.collection(name);
}

module.exports = { connectDB, collection };
