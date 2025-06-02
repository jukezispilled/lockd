// app/api/chat/create/route.js

import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const client = new MongoClient(uri);

export async function POST(request) {
  try {
    const { tokenName, tokenMint, creatorPublicKey } = await request.json();

    if (!tokenName || !tokenMint || !creatorPublicKey) {
      return Response.json(
        { error: 'Token name, mint, and creator public key are required' },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db('tokenchat');
    const chatsCollection = db.collection('groupchats');

    // Create unique chat ID
    const chatId = new ObjectId().toString();
    
    const chatData = {
      _id: chatId,
      name: `${tokenName} Community`,
      tokenName,
      tokenMint,
      creatorPublicKey,
      createdAt: new Date(),
      members: [creatorPublicKey], // Creator is first member
      messageCount: 0,
      isActive: true
    };

    const result = await chatsCollection.insertOne(chatData);

    return Response.json({
      success: true,
      chatId: result.insertedId || chatId,
      chatName: chatData.name
    });

  } catch (error) {
    console.error('Error creating group chat:', error);
    return Response.json(
      { error: 'Failed to create group chat' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}