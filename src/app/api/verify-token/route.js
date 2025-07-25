// app/api/verify-token/route.js

import { NextResponse } from 'next/server';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export async function POST(request) {
  try {
    const { walletAddress, tokenMint, requiredAmount, chatId } = await request.json();

    if (!walletAddress || !tokenMint || requiredAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify chat exists and get token requirements from your database
    // Replace this with your actual database query
    // Example: const chatData = await db.chat.findUnique({ where: { id: chatId } });
    
    // For now, we'll trust the client data but you should validate against your DB:
    console.log(`Verifying token gate for chat ${chatId}: ${tokenMint} >= ${requiredAmount}`);

    // Get all token accounts for the wallet using Helius
    const tokenAccountsResponse = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'token-gate-verification',
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          {
            mint: tokenMint,
          },
          {
            encoding: 'jsonParsed',
          },
        ],
      }),
    });

    if (!tokenAccountsResponse.ok) {
      throw new Error('Failed to fetch token accounts from Helius');
    }

    const tokenAccountsData = await tokenAccountsResponse.json();

    if (tokenAccountsData.error) {
      throw new Error(`Helius API error: ${tokenAccountsData.error.message}`);
    }

    // Calculate total balance across all token accounts
    let totalBalance = 0;
    
    if (tokenAccountsData.result && tokenAccountsData.result.value) {
      for (const account of tokenAccountsData.result.value) {
        const balance = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
        totalBalance += balance;
      }
    }

    // Check if user has required amount
    const hasAccess = totalBalance >= requiredAmount;

    // Optional: Log access attempts for monitoring
    console.log(`Token gate check: ${walletAddress} has ${totalBalance} of ${tokenMint}, needs ${requiredAmount}, access: ${hasAccess}`);

    return NextResponse.json({
      hasAccess,
      balance: totalBalance,
      required: requiredAmount,
      tokenMint,
      walletAddress,
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { 
        error: 'Token verification failed',
        hasAccess: false,
        balance: 0 
      },
      { status: 500 }
    );
  }
}