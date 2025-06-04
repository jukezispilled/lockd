import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { mintAddress } = await req.json();

    if (!mintAddress) {
      return NextResponse.json({ error: 'Mint address(es) is required.' }, { status: 400 });
    }

    let mintAccountsToFetch;

    // Check if mintAddress is an array or a single string
    if (Array.isArray(mintAddress)) {
      mintAccountsToFetch = mintAddress;
    } else if (typeof mintAddress === 'string') {
      mintAccountsToFetch = [mintAddress];
    } else {
      return NextResponse.json({ error: 'Invalid mint address format. Must be a string or an array of strings.' }, { status: 400 });
    }

    if (mintAccountsToFetch.length === 0) {
      return NextResponse.json({ error: 'Mint address(es) cannot be empty.' }, { status: 400 });
    }

    const url = `https://api.helius.xyz/v0/token-metadata?api-key=530b3b75-39b9-4fc8-a12c-4fb4250eab6d`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mintAccounts: mintAccountsToFetch, // Use the dynamically determined array
        includeOffChain: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Helius API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const data = await response.json();

    // If you're expecting an array of results, you'll likely want to return an object mapping mint addresses to their image URLs
    const results = {};
    if (data && data.length > 0) {
      data.forEach(tokenMetadata => {
        if (tokenMetadata.mint) { // Helius response includes the mint address
          const imageUrl = tokenMetadata.offChainMetadata?.metadata?.image;
          results[tokenMetadata.mint] = imageUrl || null; // Store null if no image found
        }
      });
      return NextResponse.json(results);
    } else {
      return NextResponse.json({ error: 'No token metadata found for the given address(es).' }, { status: 404 });
    }
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json({ error: error.message || 'Failed to fetch token image(s).' }, { status: 500 });
  }
}