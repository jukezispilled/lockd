// app/api/upload-metadata/route.js
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    
    // Forward the request to pump.fun API
    const response = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let fetch handle it for FormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `IPFS upload failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error in IPFS upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}