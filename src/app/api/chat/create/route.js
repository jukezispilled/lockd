// app/api/chat/create/route.js
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

export async function POST(request) {
  // Create connection inside the function for Edge compatibility
  const client = new MongoClient(uri, {
    // Edge-optimized connection options
    maxPoolSize: 1, // Keep pool small for Edge
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 3000,
    connectTimeoutMS: 5000,
  });

  try {
    console.log('Starting chat creation request...');
    
    // Parse request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const { tokenName, tokenSym, tokenMint, creatorPublicKey, amount } = body;

    // Validate required fields
    if (!tokenName || !tokenSym || !tokenMint || !creatorPublicKey) {
      console.error('Missing required fields:', { tokenName, tokenSym, tokenMint, creatorPublicKey });
      return Response.json(
        { error: 'Token name, symbol, mint, and creator public key are required' },
        { status: 400 }
      );
    }

    // Validate amount if provided
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0 || isNaN(amount))) {
      console.error('Invalid amount provided:', { amount, type: typeof amount });
      return Response.json(
        { error: 'Amount must be a positive number if provided' },
        { status: 400 }
      );
    }

    // Connect to MongoDB (fresh connection for each request in Edge)
    await client.connect();
    const db = client.db('tokenchat');
    const chatsCollection = db.collection('groupchats');

    console.log('Connected to MongoDB');

    // Create new ObjectId for the chat
    const chatObjectId = new ObjectId();
    
    const chatData = {
      _id: chatObjectId,
      name: `${tokenName}`,
      tokenName,
      tokenSym,
      tokenMint,
      creatorPublicKey,
      createdAt: new Date(),
      members: [creatorPublicKey],
      messageCount: 0,
      isActive: true
    };

    // Add amount to chatData if provided
    if (amount !== undefined && amount > 0) {
      chatData.amount = amount;
      console.log('Amount included in chat data:', amount);
    }

    console.log('Inserting chat data:', chatData);

    // Insert the chat document
    const result = await chatsCollection.insertOne(chatData);
    
    console.log('Insert result:', result);

    // Prepare response data
    const responseData = {
      success: true,
      chatId: chatObjectId.toString(),
      chatName: chatData.name
    };

    // Include amount in response if it was provided
    if (amount !== undefined && amount > 0) {
      responseData.amount = amount;
    }

    return Response.json(responseData);

  } catch (error) {
    console.error('Detailed error in chat creation:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Handle specific MongoDB errors
    if (error.name === 'MongoServerError') {
      return Response.json(
        { error: 'Database operation failed', details: error.message },
        { status: 500 }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Generic error response
    return Response.json(
      { 
        error: 'Failed to create group chat',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    // Always close connection in Edge runtime
    await client.close();
  }
}