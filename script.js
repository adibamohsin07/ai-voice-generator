/**
 * ==============================================================================
 * AI Voice Generator - Vanilla JavaScript Client
 * Securely interfaces with ElevenLabs API via Netlify Serverless Functions
 * ==============================================================================
 */

// Global State
const state = {
  voices: [],
  selectedVoice: null,
  isGenerating: false,
  audioBlobUrl: null,
  currentSpeedIndex: 1,
  speeds: [0.75, 1.0, 1.25, 1.5, 2.0],
  previewAudio: null,
};

// Model descriptions dictionary for dynamic feedback
const MODEL_DESCRIPTIONS = {
  eleven_multilingual_v2: 'Best quality for lifelike emotional expression, storytelling, and 29+ international languages.',
  eleven_turbo_v2_5: 'Ultra-fast latency and high fidelity across 32 languages. Great for real-time conversation.',
  eleven_flash_v2_5: 'Fastest 75ms response time model. Optimized for ultra-low latency applications.',
  eleven_monolingual_v1: 'Classic legacy model specifically tuned for English speech generation.',
};

// DOM Element References
const elements = {
  // Navigation & Status
  backendStatusPill: document.getElementById('backend-status-pill'),
  backendStatusText: document.getElementById('backend-status-text'),
  openGuideBtn: document.getElementById('open-guide-btn'),
  guideModal: document.getElementById('guide-modal'),
  closeGuideBtn: document.getElementById('close-guide-btn'),
  modalGotItBtn: document.getElementById('modal-got-it-btn'),

  // Alerts
  alertBanner: document.getElementById('alert-banner'),
  alertIcon: document.getElementById('alert-icon'),
  alertTitle: document.getElementById('alert-title'),
  alertMessage: document.getElementById('alert-message'),
  alertCloseBtn: document.getElementById('alert-close-btn'),

  // Text Inputs
  speechText: document.getElementById('speech-text'),
  charCount: document.getElementById('char-count'),
  pasteTextBtn: document.getElementById('paste-text-btn'),
  clearTextBtn: document.getElementById('clear-text-btn'),
  promptChips: document.querySelectorAll('.prompt-chip'),

  // Voice & Model Selectors
  voiceSelect: document.getElementById('voice-select'),
  refreshVoicesBtn: document.getElementById('refresh-voices-btn'),
  voiceTags: document.getElementById('voice-tags'),
  previewVoiceBtn: document.getElementById('preview-voice-btn'),
  modelSelect: document.getElementById('model-select'),
  modelDescription: document.getElementById('model-description'),

  // Advanced Tuning Accordion
  toggleSettingsBtn: document.getElementById('toggle-settings-btn'),
  settingsPanel: document.getElementById('settings-panel'),
  stabilitySlider: document.getElementById('stability-slider'),
  stabilityVal: document.getElementById('stability-val'),
  similaritySlider: document.getElementById('similarity-slider'),
  similarityVal: document.getElementById('similarity-val'),
  styleSlider: document.getElementById('style-slider'),
  styleVal: document.getElementById('style-val'),
  resetSettingsBtn: document.getElementById('reset-settings-btn'),

  // Action Button
  generateBtn: document.getElementById('generate-btn'),
  generateIcon: document.getElementById('generate-icon'),
  generateSpinner: document.getElementById('generate-spinner'),
  generateBtnText: document.getElementById('generate-btn-text'),

  // Audio Result Card
  audioResultCard: document.getElementById('audio-result-card'),
  resultVoiceBadge: document.getElementById('result-voice-badge'),
  downloadAudioBtn: document.getElementById('download-audio-btn'),
  customPlayer: document.querySelector('.custom-player'),
  mainAudioPlayer: document.getElementById('main-audio-player'),
  playPauseBtn: document.getElementById('play-pause-btn'),
  playIcon: document.getElementById('play-icon'),
  pauseIcon: document.getElementById('pause-icon'),
  rewindBtn: document.getElementById('rewind-btn'),
  forwardBtn: document.getElementById('forward-btn'),
  speedBtn: document.getElementById('speed-btn'),
  timelineBar: document.getElementById('timeline-bar'),
  timelineProgress: document.getElementById('timeline-progress'),
  timelineHandle: document.getElementById('timeline-handle'),
  timeCurrent: document.getElementById('time-current'),
  timeDuration: document.getElementById('time-duration'),
  muteBtn: document.getElementById('mute-btn'),
  volumeSlider: document.getElementById('volume-slider'),
};

/* ==============================================================================
   1. Initialization & Event Listeners
   ============================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadVoices();
});

function initEventListeners() {
  // Character count & input
  elements.speechText.addEventListener('input', updateCharCount);

  // Quick Prompt Chips
  elements.promptChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-text');
      elements.speechText.value = text;
      updateCharCount();
      elements.speechText.focus();
    });
  });

  // Textarea tools
  elements.clearTextBtn.addEventListener('click', () => {
    elements.speechText.value = '';
    updateCharCount();
    elements.speechText.focus();
  });

  elements.pasteTextBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        elements.speechText.value = text;
        updateCharCount();
      }
    } catch (err) {
      showAlert('warning', 'Clipboard Access', 'Could not read clipboard automatically. Please press Ctrl+V directly in the text box.');
    }
  });

  // Voice and Model selections
  elements.voiceSelect.addEventListener('change', handleVoiceChange);
  elements.refreshVoicesBtn.addEventListener('click', () => loadVoices(true));
  elements.previewVoiceBtn.addEventListener('click', toggleVoicePreview);

  elements.modelSelect.addEventListener('change', (e) => {
    const desc = MODEL_DESCRIPTIONS[e.target.value] || 'ElevenLabs neural voice model.';
    elements.modelDescription.textContent = desc;
  });

  // Advanced Tuning Accordion
  elements.toggleSettingsBtn.addEventListener('click', () => {
    const isExpanded = elements.toggleSettingsBtn.getAttribute('aria-expanded') === 'true';
    elements.toggleSettingsBtn.setAttribute('aria-expanded', !isExpanded);
    elements.toggleSettingsBtn.classList.toggle('expanded', !isExpanded);
    elements.settingsPanel.classList.toggle('hidden', isExpanded);
  });

  // Tuning sliders
  elements.stabilitySlider.addEventListener('input', (e) => {
    elements.stabilityVal.textContent = `${e.target.value}%`;
  });
  elements.similaritySlider.addEventListener('input', (e) => {
    elements.similarityVal.textContent = `${e.target.value}%`;
  });
  elements.styleSlider.addEventListener('input', (e) => {
    elements.styleVal.textContent = `${e.target.value}%`;
  });
  elements.resetSettingsBtn.addEventListener('click', resetTuningSliders);

  // Speech Generation Trigger
  elements.generateBtn.addEventListener('click', handleGenerateSpeech);

  // Keyboard shortcut: Ctrl + Enter
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerateSpeech();
    }
  });

  // Audio Player Event Listeners
  elements.playPauseBtn.addEventListener('click', togglePlayPause);
  elements.rewindBtn.addEventListener('click', () => seekRelative(-5));
  elements.forwardBtn.addEventListener('click', () => seekRelative(5));
  elements.speedBtn.addEventListener('click', cyclePlaybackSpeed);

  elements.mainAudioPlayer.addEventListener('timeupdate', updatePlayerProgress);
  elements.mainAudioPlayer.addEventListener('loadedmetadata', updatePlayerDuration);
  elements.mainAudioPlayer.addEventListener('ended', handleAudioEnded);
  elements.mainAudioPlayer.addEventListener('play', () => setPlayerVisualState(true));
  elements.mainAudioPlayer.addEventListener('pause', () => setPlayerVisualState(false));

  // Audio Scrubber Seeking
  elements.timelineBar.addEventListener('click', seekTimeline);

  // Volume & Mute
  elements.volumeSlider.addEventListener('input', (e) => {
    elements.mainAudioPlayer.volume = parseFloat(e.target.value);
    elements.mainAudioPlayer.muted = false;
  });
  elements.muteBtn.addEventListener('click', toggleMute);

  // Setup Guide Modal
  elements.openGuideBtn.addEventListener('click', () => openModal(true));
  elements.closeGuideBtn.addEventListener('click', () => openModal(false));
  elements.modalGotItBtn.addEventListener('click', () => openModal(false));
  elements.guideModal.addEventListener('click', (e) => {
    if (e.target === elements.guideModal) openModal(false);
  });

  // Alert Banner Close
  elements.alertCloseBtn.addEventListener('click', hideAlert);
}

/* ==============================================================================
   2. Voice Loading from Netlify Serverless Function
   ============================================================================== */

/**
 * Fetch voices list securely from Netlify Serverless Function.
 * Resolves endpoint with fallback between /api/voices and /.netlify/functions/voices.
 */
async function loadVoices(isManualRefresh = false) {
  setBackendStatus('loading', 'Connecting to ElevenLabs API...');
  elements.voiceSelect.disabled = true;
  elements.voiceSelect.innerHTML = '<option value="" disabled selected>Fetching available voices...</option>';

  const endpoints = ['/api/voices', '/.netlify/functions/voices'];
  let lastError = null;
  let successfulData = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, { method: 'GET' });
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok && data.success) {
          successfulData = data;
          break;
        } else {
          lastError = new Error(data.error || `HTTP ${response.status}: Failed to fetch voices`);
          lastError.code = data.code;
          lastError.status = response.status;
          break; // Server returned a JSON error response from Netlify function
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (successfulData && Array.isArray(successfulData.voices) && successfulData.voices.length > 0) {
    state.voices = successfulData.voices;
    populateVoiceSelect(state.voices);
    setBackendStatus('active', `Ready • ${state.voices.length} voices available`);
    hideAlert();
  } else {
    handleVoiceFetchError(lastError, isManualRefresh);
  }
}

function populateVoiceSelect(voices) {
  elements.voiceSelect.innerHTML = '';

  voices.forEach((voice, index) => {
    const option = document.createElement('option');
    option.value = voice.voice_id;

    // Display formatted name with category / accent hints
    const tags = [];
    if (voice.accent) tags.push(voice.accent);
    if (voice.gender) tags.push(voice.gender);
    const tagText = tags.length > 0 ? ` (${tags.join(', ')})` : '';

    option.textContent = `${voice.name}${tagText}`;
    if (index === 0) option.selected = true;

    elements.voiceSelect.appendChild(option);
  });

  elements.voiceSelect.disabled = false;
  handleVoiceChange();
}

function handleVoiceChange() {
  const selectedId = elements.voiceSelect.value;
  const voice = state.voices.find((v) => v.voice_id === selectedId);
  state.selectedVoice = voice;

  if (!voice) return;

  // Render metadata badges
  elements.voiceTags.innerHTML = '';

  if (voice.category) {
    const catBadge = document.createElement('span');
    catBadge.className = 'badge-tag';
    catBadge.textContent = voice.category.toUpperCase();
    elements.voiceTags.appendChild(catBadge);
  }

  if (voice.accent) {
    const accBadge = document.createElement('span');
    accBadge.className = 'badge-tag';
    accBadge.textContent = voice.accent;
    elements.voiceTags.appendChild(accBadge);
  }

  if (voice.gender) {
    const genBadge = document.createElement('span');
    genBadge.className = 'badge-tag';
    genBadge.textContent = voice.gender;
    elements.voiceTags.appendChild(genBadge);
  }

  if (voice.use_case) {
    const useBadge = document.createElement('span');
    useBadge.className = 'badge-tag';
    useBadge.textContent = voice.use_case;
    elements.voiceTags.appendChild(useBadge);
  }

  // Voice Preview button visibility
  if (voice.preview_url) {
    elements.previewVoiceBtn.classList.remove('hidden');
  } else {
    elements.previewVoiceBtn.classList.add('hidden');
  }
}

function handleVoiceFetchError(err, isManualRefresh) {
  const isKeyMissing = err?.code === 'API_KEY_MISSING' || (err?.message && err.message.includes('API_KEY_MISSING'));
  
  if (isKeyMissing) {
    setBackendStatus('error', 'API Key Required');
    elements.voiceSelect.innerHTML = '<option value="" disabled selected>API Key not configured in .env or Netlify</option>';
    showAlert(
      'warning',
      'ElevenLabs API Key Required',
      'The serverless backend cannot find ELEVENLABS_API_KEY. Click "Setup Guide" above to learn how to add it in your local .env file or Netlify Dashboard.'
    );
  } else {
    setBackendStatus('error', 'Connection Error');
    elements.voiceSelect.innerHTML = '<option value="" disabled selected>Could not load voices (Click Reload to retry)</option>';
    showAlert(
      'error',
      'Failed to Connect to ElevenLabs',
      err?.message || 'Please check your internet connection or verify your ELEVENLABS_API_KEY.'
    );
  }
}

/* ==============================================================================
   3. Voice Preview Playback
   ============================================================================== */
function toggleVoicePreview() {
  if (!state.selectedVoice?.preview_url) return;

  if (state.previewAudio && !state.previewAudio.paused) {
    state.previewAudio.pause();
    state.previewAudio = null;
    elements.previewVoiceBtn.classList.remove('playing');
    elements.previewVoiceBtn.querySelector('span').textContent = 'Preview';
    return;
  }

  if (state.previewAudio) {
    state.previewAudio.pause();
  }

  // Stop main player if playing
  elements.mainAudioPlayer.pause();

  state.previewAudio = new Audio(state.selectedVoice.preview_url);
  elements.previewVoiceBtn.classList.add('playing');
  elements.previewVoiceBtn.querySelector('span').textContent = 'Playing...';

  state.previewAudio.play().catch(() => {
    showAlert('warning', 'Audio Preview', 'Unable to play preview audio. Browser autoplay policy may require interaction.');
    elements.previewVoiceBtn.classList.remove('playing');
    elements.previewVoiceBtn.querySelector('span').textContent = 'Preview';
  });

  state.previewAudio.onended = () => {
    elements.previewVoiceBtn.classList.remove('playing');
    elements.previewVoiceBtn.querySelector('span').textContent = 'Preview';
  };
}

/* ==============================================================================
   4. Text Input & Character Counter
   ============================================================================== */
function updateCharCount() {
  const len = elements.speechText.value.length;
  elements.charCount.textContent = len.toLocaleString();

  elements.charCount.classList.remove('near-limit', 'at-limit');
  if (len >= 2500) {
    elements.charCount.classList.add('at-limit');
  } else if (len >= 2000) {
    elements.charCount.classList.add('near-limit');
  }
}

/* ==============================================================================
   5. Tuning Sliders Helper
   ============================================================================== */
function resetTuningSliders() {
  elements.stabilitySlider.value = 50;
  elements.stabilityVal.textContent = '50%';
  elements.similaritySlider.value = 75;
  elements.similarityVal.textContent = '75%';
  elements.styleSlider.value = 0;
  elements.styleVal.textContent = '0%';
}

/* ==============================================================================
   6. Speech Generation Workflow
   ============================================================================== */
async function handleGenerateSpeech() {
  if (state.isGenerating) return;

  const rawText = elements.speechText.value.trim();
  const voiceId = elements.voiceSelect.value;
  const modelId = elements.modelSelect.value;

  // Input Validations
  if (!rawText) {
    showAlert('warning', 'Missing Input', 'Please enter some text in the text area before generating speech.');
    elements.speechText.focus();
    return;
  }

  if (!voiceId) {
    showAlert('warning', 'Voice Required', 'Please wait for voices to load or select a voice from the dropdown.');
    return;
  }

  // Advanced Voice Settings Payload
  const voiceSettings = {
    stability: parseFloat(elements.stabilitySlider.value) / 100,
    similarity_boost: parseFloat(elements.similaritySlider.value) / 100,
    style: parseFloat(elements.styleSlider.value) / 100,
    use_speaker_boost: true,
  };

  // Start Generation UI state
  setGeneratingState(true);
  hideAlert();

  const payload = {
    text: rawText,
    voice_id: voiceId,
    model_id: modelId,
    voice_settings: voiceSettings,
  };

  const endpoints = ['/api/generate-speech', '/.netlify/functions/generate-speech'];
  let successBlob = null;
  let generationError = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';

      if (response.ok && contentType.includes('audio/')) {
        successBlob = await response.blob();
        break;
      } else {
        // Read JSON error message if provided by function
        let errorMsg = `Server error HTTP ${response.status}`;
        if (contentType.includes('application/json')) {
          const errData = await response.json();
          errorMsg = errData.error || errData.hint || errorMsg;
        } else {
          const textErr = await response.text().catch(() => '');
          if (textErr) errorMsg = textErr;
        }
        generationError = new Error(errorMsg);
        break;
      }
    } catch (networkErr) {
      generationError = networkErr;
    }
  }

  setGeneratingState(false);

  if (successBlob) {
    loadGeneratedAudio(successBlob);
  } else {
    showAlert(
      'error',
      'Voice Synthesis Failed',
      generationError?.message || 'Could not generate speech. Please verify your ElevenLabs API key and quota.'
    );
  }
}

function setGeneratingState(isGenerating) {
  state.isGenerating = isGenerating;
  elements.generateBtn.disabled = isGenerating;

  if (isGenerating) {
    elements.generateIcon.classList.add('hidden');
    elements.generateSpinner.classList.remove('hidden');
    elements.generateBtnText.textContent = 'Synthesizing voice...';
  } else {
    elements.generateIcon.classList.remove('hidden');
    elements.generateSpinner.classList.add('hidden');
    elements.generateBtnText.textContent = 'Generate Speech';
  }
}

/* ==============================================================================
   7. Audio Player Handling
   ============================================================================== */
function loadGeneratedAudio(blob) {
  // Revoke previous object URL to free memory
  if (state.audioBlobUrl) {
    URL.revokeObjectURL(state.audioBlobUrl);
  }

  state.audioBlobUrl = URL.createObjectURL(blob);
  elements.mainAudioPlayer.src = state.audioBlobUrl;

  // Update UI Result Card
  const selectedVoiceName = state.selectedVoice ? state.selectedVoice.name : 'Custom Voice';
  elements.resultVoiceBadge.textContent = selectedVoiceName;

  // Configure Download link
  const cleanVoiceSlug = selectedVoiceName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const filename = `elevenlabs-${cleanVoiceSlug}-${Date.now()}.mp3`;
  elements.downloadAudioBtn.href = state.audioBlobUrl;
  elements.downloadAudioBtn.download = filename;

  // Reveal player card
  elements.audioResultCard.classList.remove('hidden');

  // Scroll smoothly to player
  elements.audioResultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Play immediately
  elements.mainAudioPlayer.play().catch(() => {
    // Autoplay may be restricted without explicit click; handled gracefully
  });
}

function togglePlayPause() {
  if (!elements.mainAudioPlayer.src) return;

  if (elements.mainAudioPlayer.paused) {
    elements.mainAudioPlayer.play();
  } else {
    elements.mainAudioPlayer.pause();
  }
}

function setPlayerVisualState(isPlaying) {
  if (isPlaying) {
    elements.playIcon.classList.add('hidden');
    elements.pauseIcon.classList.remove('hidden');
    elements.customPlayer.classList.add('is-playing');
  } else {
    elements.playIcon.classList.remove('hidden');
    elements.pauseIcon.classList.add('hidden');
    elements.customPlayer.classList.remove('is-playing');
  }
}

function updatePlayerProgress() {
  const current = elements.mainAudioPlayer.currentTime || 0;
  const duration = elements.mainAudioPlayer.duration || 0;

  elements.timeCurrent.textContent = formatTime(current);

  if (duration > 0) {
    const percentage = (current / duration) * 100;
    elements.timelineProgress.style.width = `${percentage}%`;
    elements.timelineHandle.style.left = `${percentage}%`;
  }
}

function updatePlayerDuration() {
  const duration = elements.mainAudioPlayer.duration || 0;
  elements.timeDuration.textContent = formatTime(duration);
}

function handleAudioEnded() {
  setPlayerVisualState(false);
  elements.timelineProgress.style.width = '0%';
  elements.timelineHandle.style.left = '0%';
  elements.mainAudioPlayer.currentTime = 0;
}

function seekTimeline(e) {
  const rect = elements.timelineBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const ratio = Math.max(0, Math.min(1, clickX / width));

  if (elements.mainAudioPlayer.duration) {
    elements.mainAudioPlayer.currentTime = ratio * elements.mainAudioPlayer.duration;
  }
}

function seekRelative(seconds) {
  if (!elements.mainAudioPlayer.duration) return;
  const target = elements.mainAudioPlayer.currentTime + seconds;
  elements.mainAudioPlayer.currentTime = Math.max(0, Math.min(elements.mainAudioPlayer.duration, target));
}

function cyclePlaybackSpeed() {
  state.currentSpeedIndex = (state.currentSpeedIndex + 1) % state.speeds.length;
  const speed = state.speeds[state.currentSpeedIndex];
  elements.mainAudioPlayer.playbackRate = speed;
  elements.speedBtn.textContent = `${speed}x`;
}

function toggleMute() {
  elements.mainAudioPlayer.muted = !elements.mainAudioPlayer.muted;
  if (elements.mainAudioPlayer.muted) {
    elements.volumeSlider.value = 0;
  } else {
    elements.volumeSlider.value = elements.mainAudioPlayer.volume || 1;
  }
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/* ==============================================================================
   8. Status Pill & Alert Helpers
   ============================================================================== */
function setBackendStatus(type, text) {
  elements.backendStatusText.textContent = text;
  const dot = elements.backendStatusPill.querySelector('.status-dot');

  dot.classList.remove('pulsing', 'active', 'error');
  if (type === 'loading') {
    dot.classList.add('pulsing');
  } else if (type === 'active') {
    dot.classList.add('active');
  } else if (type === 'error') {
    dot.classList.add('error');
  }
}

function showAlert(type, title, message) {
  elements.alertBanner.classList.remove('hidden', 'warning', 'error', 'success');
  elements.alertBanner.classList.add(type);

  if (type === 'warning') {
    elements.alertIcon.textContent = '⚠️';
  } else if (type === 'error') {
    elements.alertIcon.textContent = '🛑';
  } else if (type === 'success') {
    elements.alertIcon.textContent = '✅';
  }

  elements.alertTitle.textContent = title;
  elements.alertMessage.textContent = message;
}

function hideAlert() {
  elements.alertBanner.classList.add('hidden');
}

function openModal(isOpen) {
  if (isOpen) {
    elements.guideModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } else {
    elements.guideModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}
