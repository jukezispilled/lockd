import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function GET(request, { params }) {
  try {
    const { chatId } = await params; // Added await here

    // Validate chatId
    if (!chatId || typeof chatId !== 'string' || !ObjectId.isValid(chatId)) {
      return Response.json(
        { error: 'Valid Chat ID is required' },
        { status: 400 }
      );
    }

    const objectChatId = new ObjectId(chatId);

    await client.connect();
    const db = client.db('tokenchat');
    const chatsCollection = db.collection('groupchats');

    const chat = await chatsCollection.findOne({ _id: objectChatId });

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