// app/api/chat/[chatId]/messages/route.js

import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// GET - Fetch messages for a chat
export async function GET(request, { params }) {
  try {
    const { chatId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const skip = parseInt(searchParams.get('skip')) || 0;

    if (!chatId) {
      return Response.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db('tokenchat');
    const messagesCollection = db.collection('messages');

    const messages = await messagesCollection
      .find({ chatId })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return Response.json({ messages });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return Response.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

// POST - Send a new message
export async function POST(request, { params }) {
  try {
    const { chatId } = params;
    const { content, senderPublicKey } = await request.json();

    if (!chatId || !content || !senderPublicKey) {
      return Response.json(
        { error: 'Chat ID, content, and sender public key are required' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.length > 1000) {
      return Response.json(
        { error: 'Message too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db('tokenchat');
    const messagesCollection = db.collection('messages');
    const chatsCollection = db.collection('groupchats');

    // Verify chat exists
    const chat = await chatsCollection.findOne({ _id: chatId });
    if (!chat) {
      return Response.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Create message
    const message = {
      _id: new ObjectId().toString(),
      chatId,
      content: content.trim(),
      senderPublicKey,
      timestamp: new Date(),
      edited: false,
      reactions: []
    };

    await messagesCollection.insertOne(message);

    // Update chat's message count and last activity
    await chatsCollection.updateOne(
      { _id: chatId },
      { 
        $inc: { messageCount: 1 },
        $set: { lastActivity: new Date() },
        $addToSet: { members: senderPublicKey } // Add sender to members if not already there
      }
    );

    return Response.json({ 
      success: true, 
      message: {
        ...message,
        _id: message._id
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return Response.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}