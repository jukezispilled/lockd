// app/api/token-image/route.js
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// Helius API key from environment variables
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
// MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

export async function POST(req) {
  // --- 1. Initial Setup and Environment Variable Checks ---
  if (!HELIUS_API_KEY) {
    console.error("HELIUS_API_KEY is not defined in environment variables.");
    return NextResponse.json({ error: "Server configuration error: Helius API key missing." }, { status: 500 });
  }
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined in environment variables.");
    return NextResponse.json({ error: "Server configuration error: MongoDB URI missing." }, { status: 500 });
  }

  let client; // Declare client variable to be accessible in finally block
  let mintAddress; // Declare mintAddress outside the try block for broader scope

  try {
    // --- 2. Establish MongoDB Connection for this Request ---
    console.log("Attempting to connect to MongoDB...");
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("Successfully connected to MongoDB.");

    const db = client.db('tokenchat'); // <<< IMPORTANT: Use your actual database name here
    const tokenImagesCollection = db.collection('tokenimages'); // <<< IMPORTANT: Use your actual collection name

    // Ensure indexes are created (idempotent operation, safe to call on every request)
    await tokenImagesCollection.createIndex({ mintAddress: 1 }, { unique: true });
    await tokenImagesCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 }); // 7 days
    console.log("MongoDB indexes ensured.");

    // --- 3. Parse Request Body and Validate Input ---
    let body;
    try {
      // Check if request has content-type header
      const contentType = req.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error("Invalid content-type:", contentType);
        return NextResponse.json({ 
          error: 'Content-Type must be application/json' 
        }, { status: 400 });
      }

      // Clone the request to check if body is empty
      const requestClone = req.clone();
      const text = await requestClone.text();
      
      if (!text || text.trim() === '') {
        console.error("Empty request body received");
        return NextResponse.json({ 
          error: 'Request body cannot be empty. Please provide a JSON object with mintAddress.' 
        }, { status: 400 });
      }

      // Now parse the JSON
      body = await req.json();
      mintAddress = body.mintAddress;
      
    } catch (jsonParseError) {
      console.error("Error parsing request JSON:", jsonParseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body. Please ensure you are sending valid JSON.' 
      }, { status: 400 });
    }
    
    console.log("Received request for mint addresses:", mintAddress);

    if (!mintAddress) {
      console.log("Invalid request: Mint address(es) is required.");
      return NextResponse.json({ 
        error: 'Mint address(es) is required. Please provide mintAddress in the request body.',
        example: { mintAddress: "So11111111111111111111111111111111111111112" }
      }, { status: 400 });
    }

    let mintAccountsToProcess;
    if (Array.isArray(mintAddress)) {
      mintAccountsToProcess = mintAddress;
    } else if (typeof mintAddress === 'string') {
      mintAccountsToProcess = [mintAddress];
    } else {
      console.log("Invalid request: Invalid mint address format.");
      return NextResponse.json({ 
        error: 'Invalid mint address format. Must be a string or an array of strings.',
        example: { mintAddress: "So11111111111111111111111111111111111111112" }
      }, { status: 400 });
    }

    if (mintAccountsToProcess.length === 0) {
      console.log("Invalid request: Mint address(es) cannot be empty.");
      return NextResponse.json({ 
        error: 'Mint address(es) cannot be empty.',
        example: { mintAddress: "So11111111111111111111111111111111111111112" }
      }, { status: 400 });
    }

    const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

    const results = {}; // Object to hold all final mintAddress -> imageUrl mappings
    const mintsToFetchFromHelius = []; // Array of mints not found in cache
    const mintsFromCache = []; // Array of mints found in cache

    // --- 4. Check Cache (MongoDB) for existing images ---
    console.log(`Checking cache for ${mintAccountsToProcess.length} mints...`);
    const cachedImages = await tokenImagesCollection.find({
      mintAddress: { $in: mintAccountsToProcess }
    }).toArray();

    const cachedMintMap = new Map(cachedImages.map(img => [img.mintAddress, img.imageUrl]));

    mintAccountsToProcess.forEach(mint => {
      if (cachedMintMap.has(mint)) {
        results[mint] = cachedMintMap.get(mint);
        mintsFromCache.push(mint);
      } else {
        mintsToFetchFromHelius.push(mint);
      }
    });

    if (mintsFromCache.length > 0) {
      console.log(`Cache HIT for ${mintsFromCache.length} mints:`, mintsFromCache);
    } else {
      console.log("Cache MISS: No mints found in cache.");
    }

    // Filter for unique addresses to send to Helius to avoid redundant API calls
    const uniqueMintsToFetchFromHelius = [...new Set(mintsToFetchFromHelius)];

    // --- 5. If there are uncached mints, fetch them from Helius ---
    if (uniqueMintsToFetchFromHelius.length > 0) {
      console.log(`Cache MISS: Fetching ${uniqueMintsToFetchFromHelius.length} new mints from Helius:`, uniqueMintsToFetchFromHelius);
      try {
        const response = await fetch(heliusUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'batch-request',
            method: 'getAssetBatch',
            params: {
              ids: uniqueMintsToFetchFromHelius,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Helius DAS API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
          // Do not throw here; allow the request to proceed with cached data + no image for failed fetches
        } else {
          const data = await response.json();
          const newImagesToCache = [];

          if (data && data.result && Array.isArray(data.result)) {
            data.result.forEach(asset => {
              if (asset && asset.id) {
                const imageUrl = asset.content?.metadata?.image || asset.content?.files?.[0]?.uri;
                
                results[asset.id] = imageUrl || null;
                
                newImagesToCache.push({
                  mintAddress: asset.id,
                  imageUrl: imageUrl || null,
                  createdAt: new Date(),
                });
              }
            });
          } else if (data && data.error) {
            console.error('Helius DAS API error (batch response):', data.error);
          } else {
            console.warn('No asset data or unexpected response format for batch from Helius');
          }

          // --- 6. Save newly fetched images to MongoDB cache ---
          if (newImagesToCache.length > 0) {
            try {
              console.log(`Attempting to cache ${newImagesToCache.length} new token images to MongoDB...`);
              await tokenImagesCollection.insertMany(newImagesToCache, { ordered: false });
              console.log(`Successfully cached ${newImagesToCache.length} new token images.`);
            } catch (dbErr) {
              if (dbErr.code === 11000) {
                console.warn('MongoDB cache warning: Attempted to insert duplicate mint address, likely concurrent request.');
              } else {
                console.error('Error saving new token images to MongoDB:', dbErr);
              }
            }
          } else {
              console.log("No new images to cache from Helius API response.");
          }
        }

      } catch (error) {
        console.error('Network error during Helius API call:', error);
      }
    } else {
      console.log("No new mints needed from Helius API. All data came from cache.");
    }

    // --- 7. Return the combined results to the client ---
    console.log("Returning combined results to client.");
    return NextResponse.json(results);

  } catch (error) {
    // --- 8. General Error Handling for the API Route ---
    console.error("Overall error in API route:", error);
    if (error.message.includes("MongoServerSelectionError")) {
      console.error("Database connection failed. Check MongoDB server and URI.");
      return NextResponse.json({ error: 'Database connection error. Please ensure MongoDB is running and URI is correct.' }, { status: 500 });
    }
    return NextResponse.json({ error: error.message || 'Failed to process token image request.' }, { status: 500 });
  } finally {
    // --- 9. Close MongoDB Connection ---
    if (client) {
      await client.close();
      console.log("MongoDB client closed for this request.");
    }
  }
}