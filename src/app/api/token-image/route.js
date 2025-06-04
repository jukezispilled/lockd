import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { mintAddress } = await req.json();

    if (!mintAddress) {
      return NextResponse.json({ error: 'Mint address is required.' }, { status: 400 });
    }

    const url = `https://api.helius.xyz/v0/token-metadata?api-key=530b3b75-39b9-4fc8-a12c-4fb4250eab6d`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mintAccounts: [mintAddress],
        includeOffChain: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Helius API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const tokenMetadata = data[0];
      const imageUrl = tokenMetadata.offChainMetadata?.metadata?.image;

      if (imageUrl) {
        return NextResponse.json({ imageUrl });
      } else {
        return NextResponse.json({ error: 'Image URL not found for this token.' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'No token metadata found for the given address.' }, { status: 404 });
    }
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json({ error: error.message || 'Failed to fetch token image.' }, { status: 500 });
  }
}