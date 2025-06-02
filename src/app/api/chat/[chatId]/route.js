// app/api/chat/[chatId]/route.js

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function GET(request, { params }) {
  try {
    const { chatId } = params;

    if (!chatId) {
      return Response.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db('tokenchat');
    const chatsCollection = db.collection('groupchats');

    const chat = await chatsCollection.findOne({ _id: chatId });

    if (!chat) {
      return Response.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    return Response.json(chat);

  } catch (error) {
    console.error('Error fetching chat:', error);
    return Response.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}