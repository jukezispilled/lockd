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
    const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;

    // Use DAS API getAssetBatch method for batch requests
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
            ids: mintAccountsToProcess, // Send all mint addresses at once
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Helius DAS API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        return NextResponse.json({ error: 'Failed to fetch token metadata from Helius.' }, { status: 500 });
      }

      const data = await response.json();
      const allResults = {};

      // Process the batch response
      if (data && data.result && Array.isArray(data.result)) {
        // Create a map of successful results
        const successfulResults = new Map();
        data.result.forEach(asset => {
          if (asset && asset.id) {
            const imageUrl = asset.content?.metadata?.image || asset.content?.files?.[0]?.uri;
            successfulResults.set(asset.id, imageUrl || null);
          }
        });

        // Ensure all requested mint addresses are included in the response
        mintAccountsToProcess.forEach(mintAccount => {
          if (successfulResults.has(mintAccount)) {
            allResults[mintAccount] = successfulResults.get(mintAccount);
          } else {
            // No metadata found for this mint
            console.warn(`No asset data found for mint: ${mintAccount}`);
            allResults[mintAccount] = null;
          }
        });
      } else if (data && data.error) {
        // Handle JSON-RPC error
        console.error('Helius DAS API error:', data.error);
        return NextResponse.json({ error: `API error: ${data.error.message}` }, { status: 500 });
      } else {
        // No metadata found for any mints
        console.warn('No asset data found for any of the provided mints');
        mintAccountsToProcess.forEach(mintAccount => {
          allResults[mintAccount] = null;
        });
      }

      return NextResponse.json(allResults);

    } catch (error) {
      console.error('Error fetching asset data from Helius DAS API:', error);
      return NextResponse.json({ error: 'Network error while fetching asset metadata.' }, { status: 500 });
    }

  } catch (error) {
    console.error("Overall error in API route:", error);
    return NextResponse.json({ error: error.message || 'Failed to fetch token image(s).' }, { status: 500 });
  }
}