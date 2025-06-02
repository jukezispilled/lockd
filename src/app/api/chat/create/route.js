// app/api/chat/create/route.js

import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

let cachedClient = null;

async function connectToDatabase(debugLogs) {
  if (cachedClient) {
    debugLogs.push('Using cached MongoDB client');
    return cachedClient;
  }

  debugLogs.push('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  debugLogs.push('MongoDB connected');
  return client;
}

export async function POST(request) {
  const debugLogs = ['POST request received at /api/chat/create'];

  try {
    const body = await request.json();
    debugLogs.push('Request body parsed');
    debugLogs.push(JSON.stringify(body));

    const { tokenName, tokenMint, creatorPublicKey } = body;

    if (!tokenName || !tokenMint || !creatorPublicKey) {
      debugLogs.push('Missing required fields');
      return Response.json(
        {
          error: 'Token name, mint, and creator public key are required',
          debug: debugLogs
        },
        { status: 400 }
      );
    }

    const client = await connectToDatabase(debugLogs);
    const db = client.db('tokenchat');
    const chatsCollection = db.collection('groupchats');
    debugLogs.push('Connected to DB and got collection');

    const chatData = {
      name: `${tokenName} Community`,
      tokenName,
      tokenMint,
      creatorPublicKey,
      createdAt: new Date(),
      members: [creatorPublicKey],
      messageCount: 0,
      isActive: true
    };

    debugLogs.push('Inserting chat data');
    const result = await chatsCollection.insertOne(chatData);
    debugLogs.push(`Insert result: ${JSON.stringify(result)}`);

    return Response.json({
      success: true,
      chatId: result.insertedId,
      chatName: chatData.name,
      debug: debugLogs
    });

  } catch (error) {
    debugLogs.push('Error occurred');
    debugLogs.push(error.message);
    return new Response(
      JSON.stringify({
        error: 'Failed to create group chat',
        details: error.message,
        debug: debugLogs
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}