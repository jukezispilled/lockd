// app/api/video-room/[chatId]/route.js

import { NextResponse } from 'next/server';

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

export async function POST(request, { params }) {
  console.log('--- POST Request Initiated ---');
  try {
    const { chatId } = await params; // Await params
    console.log(`POST: Received chatId: ${chatId}`);

    if (!DAILY_API_KEY) {
      console.error('POST: ERROR - Daily API key not configured!');
      return NextResponse.json(
        { error: 'Daily API key not configured' },
        { status: 500 }
      );
    }
    console.log('POST: Daily API Key is configured.');


    if (!chatId) {
      console.error('POST: ERROR - Chat ID is required!');
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }
    console.log('POST: Chat ID is present.');

    // Check if room already exists for this chat
    const roomName = `chat-${chatId}`;
    console.log(`POST: Constructed roomName: ${roomName}`);
    
    try {
      console.log(`POST: Attempting to check for existing room at URL: ${DAILY_API_URL}/rooms/${roomName}`);
      // Try to get existing room
      const existingRoomResponse = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`POST: Existing room check - Daily API response status: ${existingRoomResponse.status}`);

      if (existingRoomResponse.ok) {
        const existingRoom = await existingRoomResponse.json();
        console.log('POST: Found existing room. Returning its details.');
        console.log('POST: Existing room data:', existingRoom);
        return NextResponse.json({
          url: existingRoom.url,
          roomName: existingRoom.name,
          isExisting: true,
        });
      } else {
        console.log(`POST: Existing room check - Daily API response not OK. Status: ${existingRoomResponse.status}. Proceeding to create new room.`);
        const errorText = await existingRoomResponse.text();
        console.log('POST: Existing room check - Daily API response body (if error):', errorText);
      }
    } catch (error) {
      console.warn('POST: Error during existing room check (this is often normal if room doesn\'t exist):', error.message);
      console.log('POST: Room does not exist, will create new one.');
    }

    // Create new room
    const roomConfig = {
      name: roomName,
      properties: {
        enable_chat: true,
        enable_knocking: false,
        enable_prejoin_ui: false,
        enable_screenshare: true,
        enable_recording: false,
        start_video_off: false,
        start_audio_off: false,
        max_participants: 50,
        eject_at_room_exp: true,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
      },
    };
    console.log('POST: Room configuration for new room:', JSON.stringify(roomConfig, null, 2));
    console.log(`POST: Attempting to create new room at URL: ${DAILY_API_URL}/rooms`);

    const response = await fetch(`${DAILY_API_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roomConfig),
    });

    console.log(`POST: New room creation - Daily API response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('POST: ERROR - Daily API failed to create room. Response status:', response.status);
      console.error('POST: Daily API error response body:', errorData);
      return NextResponse.json(
        { error: 'Failed to create room', dailyApiError: errorData }, // Include dailyApiError for more detail
        { status: response.status }
      );
    }

    const room = await response.json();
    console.log('POST: Successfully created new room. Returning its details.');
    console.log('POST: Newly created room data:', room);

    return NextResponse.json({
      url: room.url,
      roomName: room.name,
      isExisting: false,
    });

  } catch (error) {
    console.error('POST: CRITICAL ERROR - Exception caught during POST request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    console.log('--- POST Request Finished ---');
  }
}

export async function GET(request, { params }) {
  console.log('--- GET Request Initiated ---');
  try {
    const { chatId } = await params; // Await params
    console.log(`GET: Received chatId: ${chatId}`);

    if (!DAILY_API_KEY) {
      console.error('GET: ERROR - Daily API key not configured!');
      return NextResponse.json(
        { error: 'Daily API key not configured' },
        { status: 500 }
      );
    }
    console.log('GET: Daily API Key is configured.');

    if (!chatId) {
      console.error('GET: ERROR - Chat ID is required!');
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }
    console.log('GET: Chat ID is present.');

    const roomName = `chat-${chatId}`;
    console.log(`GET: Constructed roomName: ${roomName}`);

    try {
      console.log(`GET: Attempting to fetch room at URL: ${DAILY_API_URL}/rooms/${roomName}`);
      const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`GET: Daily API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('GET: ERROR - Daily API returned non-OK status. Response status:', response.status);
        console.error('GET: Daily API error response body:', errorData);
        // Specifically log 404 for clarity
        if (response.status === 404) {
          console.error(`GET: Room '${roomName}' not found on Daily.co.`);
        }
        return NextResponse.json(
          { error: 'Room not found', dailyApiError: errorData },
          { status: response.status } // Pass Daily.co's actual status
        );
      }

      const room = await response.json();
      console.log('GET: Successfully fetched room. Returning its details.');
      console.log('GET: Fetched room data:', room);

      return NextResponse.json({
        url: room.url,
        roomName: room.name,
        config: room.config,
        participants: room.participants || [],
      });

    } catch (error) {
      console.error('GET: ERROR - Exception caught during fetch to Daily API:', error);
      return NextResponse.json(
        { error: 'Failed to fetch room', details: error.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('GET: CRITICAL ERROR - Exception caught during GET request processing:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    console.log('--- GET Request Finished ---');
  }
}

export async function DELETE(request, { params }) {
  console.log('--- DELETE Request Initiated ---');
  try {
    const { chatId } = await params; // Await params
    console.log(`DELETE: Received chatId: ${chatId}`);

    if (!DAILY_API_KEY) {
      console.error('DELETE: ERROR - Daily API key not configured!');
      return NextResponse.json(
        { error: 'Daily API key not configured' },
        { status: 500 }
      );
    }
    console.log('DELETE: Daily API Key is configured.');

    if (!chatId) {
      console.error('DELETE: ERROR - Chat ID is required!');
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }
    console.log('DELETE: Chat ID is present.');

    const roomName = `chat-${chatId}`;
    console.log(`DELETE: Constructed roomName: ${roomName}`);

    try {
      console.log(`DELETE: Attempting to delete room at URL: ${DAILY_API_URL}/rooms/${roomName}`);
      const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`DELETE: Daily API response status: ${response.status}`);

      if (!response.ok && response.status !== 404) {
        const errorData = await response.text();
        console.error('DELETE: ERROR - Daily API failed to delete room with non-404 error. Response status:', response.status);
        console.error('DELETE: Daily API error response body:', errorData);
        return NextResponse.json(
          { error: 'Failed to delete room', dailyApiError: errorData },
          { status: response.status }
        );
      }

      if (response.status === 404) {
        console.warn(`DELETE: Room '${roomName}' was not found on Daily.co (already deleted or never existed).`);
      } else {
        console.log('DELETE: Room deleted successfully from Daily.co.');
      }

      return NextResponse.json({
        success: true,
        message: 'Room deleted successfully',
        roomName: roomName,
      });

    } catch (error) {
      console.error('DELETE: ERROR - Exception caught during delete to Daily API:', error);
      return NextResponse.json(
        { error: 'Failed to delete room', details: error.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('DELETE: CRITICAL ERROR - Exception caught during DELETE request processing:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    console.log('--- DELETE Request Finished ---');
  }
}

export async function PUT(request, { params }) {
  console.log('--- PUT Request Initiated ---');
  try {
    const { chatId } = await params; // Await params
    const body = await request.json();
    console.log(`PUT: Received chatId: ${chatId}`);
    console.log('PUT: Received request body:', JSON.stringify(body, null, 2));

    if (!DAILY_API_KEY) {
      console.error('PUT: ERROR - Daily API key not configured!');
      return NextResponse.json(
        { error: 'Daily API key not configured' },
        { status: 500 }
      );
    }
    console.log('PUT: Daily API Key is configured.');

    if (!chatId) {
      console.error('PUT: ERROR - Chat ID is required!');
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }
    console.log('PUT: Chat ID is present.');

    const roomName = `chat-${chatId}`;
    console.log(`PUT: Constructed roomName: ${roomName}`);

    try {
      const updateProperties = body.properties || {};
      console.log('PUT: Properties to update:', JSON.stringify(updateProperties, null, 2));
      console.log(`PUT: Attempting to update room at URL: ${DAILY_API_URL}/rooms/${roomName}`);

      // Daily.co uses POST for updating rooms
      const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
        method: 'POST', // Correct method for Daily.co room updates
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: updateProperties,
        }),
      });

      console.log(`PUT: Daily API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('PUT: ERROR - Daily API failed to update room. Response status:', response.status);
        console.error('PUT: Daily API error response body:', errorData);
        return NextResponse.json(
          { error: 'Failed to update room', dailyApiError: errorData },
          { status: response.status }
        );
      }

      const room = await response.json();
      console.log('PUT: Successfully updated room. Returning its details.');
      console.log('PUT: Updated room data:', room);

      return NextResponse.json({
        success: true,
        room: room,
        message: 'Room updated successfully',
      });

    } catch (error) {
      console.error('PUT: ERROR - Exception caught during update to Daily API:', error);
      return NextResponse.json(
        { error: 'Failed to update room', details: error.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('PUT: CRITICAL ERROR - Exception caught during PUT request processing:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    console.log('--- PUT Request Finished ---');
  }
}