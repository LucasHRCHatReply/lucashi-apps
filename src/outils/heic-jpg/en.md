---
id: heic-jpg
lang: en
slug: heic-to-jpg
titre: "Convert HEIC to JPG — free, nothing uploaded"
h1: "Convert HEIC photos to JPG"
description: "Turn iPhone HEIC photos into JPG or PNG in batches without uploading them: the conversion runs in your browser. Free, no account, no watermark."
nom_court: "HEIC → JPG"
phrase: "iPhone photos to JPG or PNG, in batches, nothing uploaded."
categorie: images
icone: photo
mots_cles: [convert heic to jpg, heic to jpg, open heic file, iphone photo to jpg, heic converter free, heic to png]
faq:
  - q: "How do I open a HEIC file on Windows or on a site that rejects it?"
    r: "The simplest way is to convert it to JPG: drop the file in the tool above and download the JPG, which every program and website accepts. Windows can also read HEIC with a paid extension, but converting avoids installing anything."
  - q: "Are my photos uploaded to a server?"
    r: "No. HEIC decoding happens in your browser, with a small program (libheif) served by this site. You can check it yourself: turn off Wi-Fi after the page has loaded and the conversion still works."
  - q: "Do I lose quality converting HEIC to JPG?"
    r: "A little, because JPG compresses with loss. At quality 92, the default, the difference is invisible to the eye, but the file is often larger than the original HEIC. To lose nothing at all, choose PNG and accept much heavier files."
  - q: "Can I convert several HEIC photos at once?"
    r: "Yes. Drop a whole selection, a hundred photos for example: they are converted two at a time, a thumbnail appears as each finishes, and a single zip gathers everything. Each photo can also be downloaded on its own."
  - q: "How do I make my iPhone take JPG photos directly?"
    r: "Go to Settings, Camera, Formats and choose Most Compatible: new photos will be saved as JPG. Older ones stay HEIC, which is where this tool helps."
  - q: "Why did the date and location disappear from my JPG?"
    r: "By default the tool writes neither the date nor the GPS location into the JPG, so you can share an image that says nothing about you. Tick Date and place to copy them over."
mis_a_jour: 2026-10-20
sources: []
---
## How to convert

1. Drop your `.heic` photos in the area above, click to choose them, or paste them with Cmd+V.
2. Pick JPG or PNG, and the quality if you want to tune it. Photos convert on their own, two at a time.
3. Download each photo, or Download all: one zip file holds the whole selection.

Changing a setting converts the photos you already added again, so there is no need to drop them twice.

## Why this format causes trouble

Since iOS 11, the iPhone saves photos as HEIC (also spelled HEIF), a format that keeps the quality of a JPG in a file roughly half the size. The downside: plenty of programs, administrative websites, messaging apps and older systems cannot open or import it. The classic result is an attachment that the recipient cannot read. JPG works everywhere.

## What the tool does, and what it keeps

- **Full resolution.** Nothing is shrunk: a 12 megapixel photo stays a 12 megapixel photo.
- **Orientation.** A portrait photo stays a portrait, with no rotating to redo.
- **The file name.** `IMG_0412.HEIC` becomes `IMG_0412.jpg`.
- **Date and location, if you ask.** By default the JPG carries none, which is safer before posting an image. Tick Date and place to copy the shooting date, the GPS point and the camera.
- **Live Photos.** Only the still image is converted, not the short video that goes with it.

## Why it is private

Decoding uses libheif, a free library compiled to WebAssembly. It is downloaded once from this site when you drop your first photo, then runs in your browser. No photo is sent anywhere: not to a server, not to a third party. For a family photo, an ID or a document, it is the only sensible way to convert online.

## Limits worth knowing

Colours are written as the decoder returns them, without an embedded colour profile: on a wide-gamut screen, some very saturated tones may look slightly less vivid than on the iPhone. HEIC files that do not hold an ordinary photo, such as special HDR images, may be refused. The file is then flagged on its own row without blocking the others.
