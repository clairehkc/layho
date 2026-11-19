# Layho

Live speech translation app. Sign in with Google, configure languages, and start real-time translation.

**Live:** [https://layho.app](https://layho.app)

## Microsoft translation

Layho uses the [Azure AI Speech SDK](https://learn.microsoft.com/azure/ai-services/speech-service/) for real-time speech-to-text and translation. The SDK is loaded from Microsoft's CDN in the browser — no local install needed.

### Usage

1. Open **Settings** to choose source and target languages (see `LanguageOptions.json` for supported locales).
2. Click **Start** (or press `s`) to begin continuous translation from your microphone.
3. Detected speech appears on the left; the translation appears on the right.

### Modes

- **Voice output** — plays translated speech using Azure neural voices.
- **Conversation mode** — runs two recognizers and auto-switches between the source and target languages selected in Settings based on detected speech. Incompatible with voice output and transcription only.
- **Transcription only** — transcribes microphone audio and displays it without translating. Incompatible with conversation mode.
