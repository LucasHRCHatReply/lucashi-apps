---
id: vocal-texte
lang: en
slug: voice-note-to-text
titre: "Voice note to text — free, nothing uploaded"
h1: "Turn a voice note into text"
description: "Drop a WhatsApp voice note, an iPhone memo or a video: the text comes out by itself, language detected. Transcribed in your browser, nothing is uploaded."
nom_court: "Voice to text"
phrase: "Drop a voice note, read it: the text comes out by itself."
categorie: pratique
icone: doc.text
en_avant: true
mots_cles: [voice note to text, transcribe whatsapp voice message, voice memo to text, audio to text free, audio transcription, convert opus to text]
faq:
  - q: "How do I transcribe a WhatsApp voice message?"
    r: "Save the voice message from WhatsApp (Share, then Save to Files on iPhone; Share to Files on Android), then drop the .opus or .ogg file on this page. The text appears when the transcription ends, with a Copy button. No account, nothing to install."
  - q: "Is my voice note uploaded to a server?"
    r: "No. The recognition model (Whisper, published by OpenAI under the MIT licence) is downloaded once from this site, then runs in your browser. The sound stays on your device: you can switch off Wi-Fi once the model is loaded."
  - q: "Why is the first voice note slower to start?"
    r: "The model weighs about 101 MB with its computing engine. It is loaded once, then kept by your browser: later voice notes start without downloading anything again. On a mobile connection, use Wi-Fi for the first time."
  - q: "Which files and how long?"
    r: "WhatsApp voice messages (.opus, .ogg), iPhone Voice Memos (.m4a), .mp3, .wav, .aac, .flac, and videos (.mp4, .mov, .webm) of which the tool keeps only the sound. Up to 30 minutes per file. Longer than that, split the recording in two."
  - q: "Is the transcription accurate?"
    r: "It is good on a clear voice close to the microphone, weaker with background noise, overlapping voices or rare proper names. Always proofread before sending or quoting: the tool uses a compact model, chosen to fit in a browser."
  - q: "Which languages are recognised?"
    r: "The language is detected automatically among about a hundred, including English, French, Spanish, German, Italian, Portuguese and Arabic. It is shown under the text. A recording that mixes two languages is transcribed in the dominant language of the start."
  - q: "What is the .srt file for?"
    r: "It is a subtitle file: each sentence comes with its start and end time. It helps to subtitle a video or to find when a sentence was said. It is under “Other formats”."
mis_a_jour: 2026-10-20
sources:
  - titre: "Whisper, speech recognition model (OpenAI, MIT licence)"
    url: "https://github.com/openai/whisper"
  - titre: "Transformers.js, in-browser inference (Hugging Face)"
    url: "https://github.com/huggingface/transformers.js"
---

A two-minute WhatsApp voice message, on the train, no headphones: you cannot listen to it. Drop it here and you can read it instead. The tool turns the voice into text, guesses the language by itself, and offers to copy the result or download it.

## How it works

1. **Drop the file**: a WhatsApp voice message (.opus), an iPhone Voice Memo (.m4a), an .mp3, a .wav, or even a video of which the tool keeps only the sound.
2. **Wait for the end**: a bar shows the real progress. The first use loads the model (about 101 MB), then it is kept on your device. A one-minute voice note usually takes under a minute.
3. **Copy or download**: the text appears with the detected language and the duration. One button copies it, another saves it as .txt. Under “Other formats”, an .srt file gives subtitles with the time of each sentence.

## What stays with you

Transcription happens in your browser, with OpenAI's Whisper model. The sound is not sent anywhere: not to this site, not to a transcription service. That makes the tool fit for a personal voice message, a family note or a work memo. Once the model is loaded, you can even go offline.

## For better results

- A voice close to the microphone, without music, gives the most accurate text.
- Rare proper names, acronyms and numbers need proofreading.
- A recording longer than 30 minutes must be split in two: the tool says so before starting.
- On a phone, keep the page open during transcription; a locked screen can interrupt it.

## Why a compact model

The model is the “base” version of Whisper, shrunk (quantised) to fit in a browser: about 80 MB against more than a gigabyte for the large models. It makes a few more mistakes than an online service, but it needs no account, no server and never sends your voice.

## Formats read

WhatsApp voice messages in Opus are decoded by the tool itself, including on Safari, which cannot play Opus in .ogg. Other formats (.m4a, .mp3, .wav, videos) are read by your browser: if a file is refused, try the original rather than a recompressed copy.
