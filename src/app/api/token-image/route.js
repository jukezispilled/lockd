// src/app/api/token-image/route.js

import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { mintAddresses } = await req.json(); // Changed to mintAddresses (plural)

        if (!mintAddresses || !Array.isArray(mintAddresses) || mintAddresses.length === 0) {
            return NextResponse.json({ error: 'An array of mint addresses is required.' }, { status: 400 });
        }

        const url = `https://api.helius.xyz/v0/token-metadata?api-key=530b3b75-39b9-4fc8-a12c-4fb4250eab6d`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mintAccounts: mintAddresses, // Pass the array directly
                includeOffChain: true,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Helius API error: ${response.status} - ${errorData.message || response.statusText}`);
        }

        const data = await response.json();

        const results = [];
        if (data && data.length > 0) {
            data.forEach(tokenMetadata => {
                const mintAddress = tokenMetadata.mint; // Helius returns the mint address in the metadata object
                const imageUrl = tokenMetadata.offChainMetadata?.metadata?.image;

                if (mintAddress) { // Ensure mint address exists
                    results.push({
                        mintAddress,
                        imageUrl: imageUrl || null // Return null if image not found for this token
                    });
                }
            });
            return NextResponse.json({ results });
        } else {
            return NextResponse.json({ error: 'No token metadata found for the given addresses.' }, { status: 404 });
        }
    } catch (error) {
        console.error("Error in API route:", error);
        return NextResponse.json({ error: error.message || 'Failed to fetch token images.' }, { status: 500 });
    }
}