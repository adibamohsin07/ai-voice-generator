/**
 * Netlify Serverless Function: voices.js
 * Route: GET /api/voices (mapped via netlify.toml) or /.netlify/functions/voices
 * 
 * Purpose:
 * Securely fetch available ElevenLabs voices on the server side
 * without ever exposing the ELEVENLABS_API_KEY to the client browser.
 */

exports.handler = async (event, context) => {
  // Set standard CORS headers for safety
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle browser CORS pre-flight checks
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Enforce GET method
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Method Not Allowed. Please send a GET request.',
      }),
    };
  }

  // Retrieve API key securely from server environment variables
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_actual_elevenlabs_api_key_here') {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'ELEVENLABS_API_KEY is not configured in server environment variables.',
        code: 'API_KEY_MISSING',
        hint: 'Create a .env file locally with ELEVENLABS_API_KEY=your_key, or add it in Netlify Site Settings > Environment variables.',
      }),
    };
  }

  try {
    // Call the official ElevenLabs Voices endpoint
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey.trim(),
        'Accept': 'application/json',
      },
    });

    // Check if ElevenLabs returned an error (e.g. 401 Unauthorized, 429 Quota Exceeded)
    if (!response.ok) {
      let errorMessage = `ElevenLabs API error: HTTP ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail && typeof errorData.detail === 'object') {
          errorMessage = errorData.detail.message || JSON.stringify(errorData.detail);
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseErr) {
        // Fallback to text if response isn't JSON
        const rawText = await response.text().catch(() => '');
        if (rawText) errorMessage = rawText;
      }

      return {
        statusCode: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: errorMessage,
          statusCode: response.status,
        }),
      };
    }

    const data = await response.json();
    const rawVoices = data.voices || [];

    // Filter and sanitize voice objects for the frontend
    const sanitizedVoices = rawVoices.map((voice) => {
      const labels = voice.labels || {};
      return {
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category || 'premade',
        description: voice.description || labels.description || '',
        accent: labels.accent || '',
        gender: labels.gender || '',
        age: labels.age || '',
        use_case: labels['use case'] || labels.use_case || '',
        preview_url: voice.preview_url || '',
      };
    });

    // Sort voices alphabetically by name
    sanitizedVoices.sort((a, b) => a.name.localeCompare(b.name));

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        count: sanitizedVoices.length,
        voices: sanitizedVoices,
      }),
    };
  } catch (networkError) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: `Failed to reach ElevenLabs API: ${networkError.message}`,
        code: 'NETWORK_ERROR',
      }),
    };
  }
};
