---
id: video-legere
lang: en
slug: light-video
titre: "Light video for WhatsApp and email — free"
h1: "Make a video light enough for WhatsApp"
description: "Drop a video that is too big (iPhone, MP4, WebM): an MP4 under 16 MB for WhatsApp or 25 MB for email comes out on its own, with no settings and no upload."
nom_court: "Light video"
phrase: "A video that is too heavy becomes an MP4 ready for WhatsApp or email."
categorie: images
icone: arrow.down.right.and.arrow.up.left
en_avant: true
mots_cles: [shrink video, reduce video size, compress video for whatsapp, video too large for email, compress iphone mov, convert hevc to mp4]
faq:
  - q: "What is the maximum video size on WhatsApp?"
    r: "WhatsApp accepts about 16 MB for a video sent as a message. Beyond that the app recompresses it heavily or refuses it. The tool aims at 95% of 16 MB to keep a margin, and checks the size of the file it produced: if it is over, it runs a lighter pass."
  - q: "How long does it take?"
    r: "Before starting, the tool shows an estimate. On a recent Mac, a 70-second 1080p video (99 MB) became a 15 MB MP4 in 38 seconds. The browser uses the device's hardware encoder when there is one; otherwise a slower fallback method takes over and says so."
  - q: "Are iPhone HEVC videos supported?"
    r: "Yes. iPhone .MOV files in HEVC (H.265) are read by the browser when it can decode them, otherwise by the fallback method. The result is always H.264 MP4 with AAC sound, playable everywhere, including older phones and PCs."
  - q: "What picture quality do I get?"
    r: "The tool computes the bitrate from the length and the size you want. A short video keeps its original resolution; a long one is brought down to 720p, then 480p or 360p if the size requires it. The longer the video, the more the picture is reduced: that is the price of the size limit."
  - q: "Is my video uploaded to a server?"
    r: "No. Everything happens in your browser, on your device. The only file downloaded from this site is the fallback engine (about 32 MB), and only if your browser cannot do the job by itself."
  - q: "How do I keep only the sound of a video?"
    r: "Open “Options” and choose “Audio only”: the tool extracts the audio track to .m4a (AAC, 128 kb/s), without the picture. An hour of audio weighs about 55 MB."
mis_a_jour: 2026-10-21
sources:
  - titre: "mediabunny, MP4 demuxer and muxer on WebCodecs"
    url: "https://github.com/Vanilagy/mediabunny"
  - titre: "WebCodecs, W3C specification"
    url: "https://www.w3.org/TR/webcodecs/"
  - titre: "ffmpeg.wasm, FFmpeg compiled to WebAssembly"
    url: "https://github.com/ffmpegwasm/ffmpeg.wasm"
---
A two-minute holiday video in 4K easily weighs 600 MB: impossible to send on WhatsApp, refused by most email services. This tool turns it into an MP4 light enough to send, **without any setting**: you drop the video, the work starts by itself, and the lighter video shows in the page and can be downloaded.

## What happens when you drop the video

1. The tool reads the **length** and resolution of the video, then immediately shows the estimated size of the result and how long it will take.
2. It computes the **bitrate** (the amount of data per second of video) that makes the file fit under the limit: 16 MB for WhatsApp, 25 MB for email. The formula is simple: target size × 8 × 0.95, divided by the length, minus the audio bitrate.
3. If that bitrate is too low for a sharp full-resolution picture, the video is reduced to **720p**, then 480p or 360p.
4. The video is re-encoded as **H.264 MP4 with AAC sound**, the format that plays everywhere.
5. The final size is **measured**. If the file is over the limit, a new lighter pass runs, up to three times.

One example followed end to end: a 70-second 1080p iPhone video, 99 MB. For WhatsApp, the available bitrate is about 1.6 Mb/s: the picture goes to 720p and the final file is 15.1 MB. For email (25 MB) it goes to 720p at a more generous bitrate and weighs 23 MB.

## Two methods, the fastest first

Your browser can usually read and write video itself thanks to **WebCodecs**: it is fast because it relies on the device's video chip. If that is not possible (old browser, a format the browser cannot decode), the tool loads a fallback engine, **ffmpeg compiled to WebAssembly**. It is slower, roughly twice the video length at 1080p, but it reads almost anything. The screen tells you which of the two methods was used.

## Options (collapsed)

- **Target**: WhatsApp (16 MB) or Email (25 MB).
- **Content**: “Audio only” extracts the audio track to .m4a.

Changing an option restarts the work on the same video.

## Good to know

- The **time** shown is an order of magnitude: it depends on your device and the video.
- A very long video cannot fit in 16 MB with a nice picture: the tool says so and suggests trimming it or choosing email.
- You can **cancel** at any time; the progress shown is the real number of frames already encoded.
- Videos never leave your device.
