/**
 * Netlify Serverless Function: generate-speech.js
 * Route: POST /api/generate-speech (mapped via netlify.toml) or /.netlify/functions/generate-speech
 * 
 * Purpose:
 * Securely calls ElevenLabs Text-to-Speech API using the server-side ELEVENLABS_API_KEY,
 * receives the binary MP3 stream, and returns it to the client safely.
 */

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS pre-flight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Enforce POST method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Method Not Allowed. Please send a POST request with JSON payload.',
      }),
    };
  }

  // Retrieve API key from server environment
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_actual_elevenlabs_api_key_here') {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'ELEVENLABS_API_KEY is not configured in server environment variables.',
        code: 'API_KEY_MISSING',
        hint: 'Please set ELEVENLABS_API_KEY in your Netlify Environment Variables or local .env file.',
      }),
    };
  }

  // Parse incoming JSON request body
  let requestData;
  try {
    requestData = JSON.parse(event.body || '{}');
  } catch (parseError) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Invalid JSON request body. Please ensure your request contains valid JSON.',
      }),
    };
  }

  const { text, voice_id, model_id, voice_settings } = requestData;

  // Input Validations
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Text is required. Please type or paste some text before generating speech.',
      }),
    };
  }

  const trimmedText = text.trim();
  const MAX_CHARACTERS = 2500;
  if (trimmedText.length > MAX_CHARACTERS) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: `Text is too long (${trimmedText.length} characters). Maximum allowed is ${MAX_CHARACTERS} characters.`,
      }),
    };
  }

  if (!voice_id || typeof voice_id !== 'string' || voice_id.trim() === '') {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Voice ID is required. Please select an available voice from the dropdown.',
      }),
    };
  }

  // Default parameters
  const chosenModel = model_id || 'eleven_multilingual_v2';
  const chosenSettings = {
    stability: typeof voice_settings?.stability === 'number' ? voice_settings.stability : 0.5,
    similarity_boost: typeof voice_settings?.similarity_boost === 'number' ? voice_settings.similarity_boost : 0.75,
    style: typeof voice_settings?.style === 'number' ? voice_settings.style : 0.0,
    use_speaker_boost: voice_settings?.use_speaker_boost !== false,
  };

  try {
    // ElevenLabs Text to Speech API endpoint
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice_id.trim())}?output_format=mp3_44100_128`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: trimmedText,
        model_id: chosenModel,
        voice_settings: chosenSettings,
      }),
    });

    if (!apiResponse.ok) {
      let errorMessage = `ElevenLabs API error: HTTP ${apiResponse.status}`;
      try {
        const errorData = await apiResponse.json();
        if (errorData.detail && typeof errorData.detail === 'object') {
          errorMessage = errorData.detail.message || JSON.stringify(errorData.detail);
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        const rawText = await apiResponse.text().catch(() => '');
        if (rawText) errorMessage = rawText;
      }

      return {
        statusCode: apiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: errorMessage,
          statusCode: apiResponse.status,
        }),
      };
    }

    // Convert binary audio buffer into base64 string for Netlify Function binary response
    const arrayBuffer = await apiResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: base64Audio,
      isBase64Encoded: true,
    };
  } catch (networkError) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: `Network failure connecting to ElevenLabs: ${networkError.message}`,
        code: 'NETWORK_ERROR',
      }),
    };
  }
};
