import { MongoClient } from 'mongodb'; // ObjectId is not needed if you're fetching all

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function GET(request) { // Removed { params } as we're not looking for a specific ID
  try {
    await client.connect();
    const db = client.db('tokenchat');
    const chatsCollection = db.collection('groupchats');

    // Find all documents in the groupchats collection
    const groupChats = await chatsCollection.find({}).toArray();

    if (groupChats.length === 0) {
      return Response.json(
        { message: 'No group chats found' },
        { status: 200 } // Or 404 if you prefer for no results
      );
    }

    return Response.json(groupChats);

  } catch (error) {
    console.error('Error fetching group chats:', error);
    return Response.json(
      { error: 'Failed to fetch group chats' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}