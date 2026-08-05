# Layho

Live speech translation app. Sign in with Google, configure languages, and start real-time translation.

## Prerequisites

- A modern browser (Chrome recommended)
- Python 3 (for local development server)

## Local development

```bash
python3 -m http.server 8765
```

Open [http://localhost:8765](http://localhost:8765), sign in, and click **START** to begin translating.

## Microsoft translation

Layho uses the [Azure AI Speech SDK](https://learn.microsoft.com/azure/ai-services/speech-service/) for real-time speech-to-text and translation. The SDK is loaded from Microsoft's CDN in the browser — no local install needed.

### Usage

1. Open **Settings** to choose source and target languages (see `LanguageOptions.json` for supported locales).
2. Click **Start** (or press `s`) to begin continuous translation from your microphone.
3. Detected speech appears on the left; the translation appears on the right.

### Modes

- **Voice output** — plays translated speech using Azure neural voices.
- **Conversation mode** — runs two recognizers and auto-switches between English and Cantonese based on detected language. Incompatible with voice output.
- **Switch** — manually swaps source and target languages mid-session (hidden in conversation mode).
