import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { mintAddress } = await req.json();

    if (!mintAddress) {
      return NextResponse.json({ error: 'Mint address(es) is required.' }, { status: 400 });
    }

    let mintAccountsToProcess;

    // Ensure mintAccountsToProcess is always an array
    if (Array.isArray(mintAddress)) {
      mintAccountsToProcess = mintAddress;
    } else if (typeof mintAddress === 'string') {
      mintAccountsToProcess = [mintAddress];
    } else {
      return NextResponse.json({ error: 'Invalid mint address format. Must be a string or an array of strings.' }, { status: 400 });
    }

    if (mintAccountsToProcess.length === 0) {
      return NextResponse.json({ error: 'Mint address(es) cannot be empty.' }, { status: 400 });
    }

    const heliusApiKey = '530b3b75-39b9-4fc8-a12c-4fb4250eab6d';
    const heliusUrl = `https://api.helius.xyz/v0/token-metadata?api-key=${heliusApiKey}`;

    const allResults = {}; // Object to store all fetched image URLs

    // Iterate over each mint address and make a separate Helius request
    for (const mintAccount of mintAccountsToProcess) {
      try {
        const response = await fetch(heliusUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mintAccounts: [mintAccount], // Send only ONE mint account at a time
            includeOffChain: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Log specific errors for individual mints but don't stop the whole process
          console.warn(`Helius API error for mint ${mintAccount}: ${response.status} - ${errorData.message || response.statusText}`);
          allResults[mintAccount] = null; // Mark as null if an error occurred for this specific mint
          continue; // Move to the next mint address
        }

        const data = await response.json();

        // Process the single token metadata from the response
        if (data && data.length > 0) {
          const tokenMetadata = data[0]; // Get the first (and only) item in the array
          const imageUrl = tokenMetadata.offChainMetadata?.metadata?.image;
          allResults[mintAccount] = imageUrl || null; // Store the URL or null
        } else {
          // No metadata found for this specific mint
          console.warn(`No token metadata found for mint: ${mintAccount}`);
          allResults[mintAccount] = null;
        }
      } catch (error) {
        console.error(`Error fetching token image for mint ${mintAccount}:`, error);
        allResults[mintAccount] = null; // Mark as null if a network/parsing error occurred
      }
    }

    // Return the aggregated results
    return NextResponse.json(allResults);

  } catch (error) {
    console.error("Overall error in API route:", error);
    return NextResponse.json({ error: error.message || 'Failed to fetch token image(s).' }, { status: 500 });
  }
}