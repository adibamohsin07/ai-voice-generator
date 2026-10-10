# AI Voice Generator using ElevenLabs API & Netlify Serverless

A complete, beginner-friendly web application that converts text into ultra-realistic AI speech using **ElevenLabs Text-to-Speech API** and **Netlify Serverless Functions**.

Built with pure **HTML5, CSS3, and Vanilla JavaScript** on the frontend, with zero frameworks (no React, no Bootstrap, no Tailwind).

---

## 🏛️ Architecture & Security Overview

```
┌─────────────────────────────────┐
│     User Browser (Frontend)     │
│   index.html • style.css • JS   │
└────────────────┬────────────────┘
                 │
                 │ 1. POST /api/generate-speech
                 │    (NO API KEY SENT IN BROWSER)
                 ▼
┌─────────────────────────────────┐
│   Netlify Serverless Functions  │
│      (Secure Backend Cloud)     │
│  Reads process.env.ELEVENLABS_KEY│
└────────────────┬────────────────┘
                 │
                 │ 2. POST https://api.elevenlabs.io/v1/text-to-speech
                 │    Header: xi-api-key: [SECRET_KEY]
                 ▼
┌─────────────────────────────────┐
│         ElevenLabs API          │
│   (Neural Speech Synthesis Engine)│
└─────────────────────────────────┘
```

### 🔒 Why is this secure?
If an API key is placed directly in frontend HTML or JavaScript files, anyone can press `F12` (Inspect Element), open the Network or Sources tab, and steal your ElevenLabs credits. 

In this application:
- The frontend **only** communicates with your own Netlify Serverless Functions (`/api/voices` and `/api/generate-speech`).
- The Netlify functions read `process.env.ELEVENLABS_API_KEY` on the server.
- The secret key is **never** sent to the client browser.

---

## 📂 Project Directory Structure

```text
├── index.html                     # Semantic HTML structure & accessible UI
├── style.css                      # Modern glassmorphism dark theme & responsive styles
├── script.js                      # Vanilla JavaScript logic, audio player, & API client
├── netlify.toml                   # Netlify build configuration & clean /api/* redirects
├── package.json                   # Project metadata & convenience scripts
├── .env.example                   # Template file showing how to format your API key
├── .gitignore                     # Prevents sensitive .env and node_modules from being pushed
├── README.md                      # Comprehensive guide for B.Tech students
└── netlify/
    └── functions/
        ├── voices.js              # Serverless function to fetch available ElevenLabs voices
        └── generate-speech.js     # Serverless function to synthesize audio stream safely
```

---

## 🚀 Beginner Step-by-Step Setup Guide

### Step 1: Get Your Free ElevenLabs API Key

1. Go to [https://elevenlabs.io](https://elevenlabs.io) and create a free account.
2. In the bottom-left corner of the dashboard, click on your **Profile** icon.
3. Select **API Keys** (or Profile Settings).
4. Click **Create API Key** (or view your default key).
5. Copy your API key to a safe place. Keep it private!

---

### Step 2: Configure Your Local Environment

1. In the project folder, locate the file named `.env.example`.
2. Make a copy of it or create a new file named exactly `.env` (no extension):
   ```bash
   cp .env.example .env
   ```
3. Open `.env` in your text editor (VS Code, Notepad, etc.) and paste your key:
   ```env
   ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here
   ```
4. Save the file. (Notice that `.gitignore` is already configured so your `.env` file will **never** be committed to GitHub).

---

### Step 3: Run the Application Locally

To test both the frontend and the Netlify serverless functions on your computer:

#### Option A: Using Netlify CLI (Recommended)
1. Install [Node.js](https://nodejs.org) if not already installed.
2. Install the Netlify CLI globally:
   ```bash
   npm install -g netlify-cli
   ```
3. Run the local development server in this directory:
   ```bash
   netlify dev
   ```
4. Netlify will read your `.env` file, start the serverless backend functions, and open:
   ```
   http://localhost:8888
   ```

#### Option B: Previewing Static Frontend with Python
If you want to view the UI design before setting up Node.js or Netlify CLI:
```bash
python -m http.server 8000
```
Open `http://localhost:8000` in your browser. (Note: Generating real speech requires the Netlify serverless functions to run via `netlify dev` or when deployed live on Netlify).

---

### Step 4: Push Your Code to GitHub

1. Open your terminal in the project directory:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: AI Voice Generator with ElevenLabs API & Netlify Functions"
   ```
2. Go to [GitHub](https://github.com) and click **New Repository**. Name it `ai-voice-generator`.
3. Link your local project to your GitHub repository and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ai-voice-generator.git
   git push -u origin main
   ```

---

### Step 5: Deploy Live on Netlify (100% Free)

1. Log in to [Netlify](https://app.netlify.com).
2. Click **Add new site** &rarr; **Import an existing project**.
3. Select **GitHub** and authorize access to your `ai-voice-generator` repository.
4. Netlify will automatically detect `netlify.toml`:
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions`
5. **Crucial Security Step — Add Your Environment Variable**:
   - In Netlify before clicking deploy (or under **Site configuration** &rarr; **Environment variables**):
   - Click **Add a variable**.
   - **Key:** `ELEVENLABS_API_KEY`
   - **Value:** Paste your real ElevenLabs API key.
6. Click **Deploy site**.
7. In approximately 30 seconds, Netlify will generate a live HTTPS URL (e.g., `https://your-app-name.netlify.app`).

---

## 🧪 Testing Voice Generation & Troubleshooting

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **"API Key Required" Banner** | `ELEVENLABS_API_KEY` is missing in `.env` or Netlify environment settings. | Set `ELEVENLABS_API_KEY` in Netlify Site Configuration &rarr; Environment variables and trigger a redeploy. |
| **HTTP 401 Unauthorized** | The API key entered is incorrect or expired. | Double check your API key on elevenlabs.io profile settings and copy it again. |
| **HTTP 429 Quota Exceeded** | You have used up your free monthly character quota (usually 10,000 characters). | Check your usage dashboard at elevenlabs.io or wait for the monthly renewal. |
| **Dropdown says "Loading..."** | Serverless function cannot reach ElevenLabs or is starting up. | Click the **Reload** button next to "Select Voice". |

---

## 💡 Key Features Implemented

- **Dynamic Voice List:** Voices are retrieved directly from `https://api.elevenlabs.io/v1/voices` via the backend function.
- **Model Switching:** Supports `eleven_multilingual_v2`, `eleven_turbo_v2_5`, `eleven_flash_v2_5`, and `eleven_monolingual_v1`.
- **Live Character Counter:** Validates input in real time with visual alerts near the 2,500 character limit.
- **Voice Preview Audio:** Allows auditioning sample audio from ElevenLabs voice previews before generating.
- **Interactive Audio Player:** Features animated sound wave bars, clickable progress scrubber, 5-second seek buttons, playback speed multiplier, and MP3 download.
- **Advanced Tuning Controls:** Sliders for stability, similarity boost, and style exaggeration.

---

## 📜 License & Academic Integrity

This project is open-source under the MIT License. Created as an educational guide and project foundation for computer science and engineering students.
