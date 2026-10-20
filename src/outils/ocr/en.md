---
id: ocr
lang: en
slug: image-to-text
titre: "Image to text (OCR) — free, nothing uploaded"
h1: "Copy the text from an image"
description: "Paste a screenshot or open a photo: the text is read and ready to copy, in French or English. It all happens in your browser, and nothing is uploaded."
nom_court: "Image to text"
phrase: "Paste a screenshot, copy the text."
categorie: images
icone: text.viewfinder
mots_cles: [image to text, extract text from image, free online ocr, copy text from screenshot, convert image to text, ocr no upload]
faq:
  - q: "How do I copy text from an image?"
    r: "Paste the image with Cmd+V (Ctrl+V on Windows) or drag it into the box. The text appears next to it: click Copy and it is on your clipboard. You can also download it as a .txt file."
  - q: "How do I extract text from a screenshot?"
    r: "Take the screenshot (Cmd+Shift+4 on a Mac, Windows+Shift+S on Windows), come back to this page and paste it. The screenshot stays on the clipboard, so there is no file to save or send."
  - q: "Is my image uploaded to a server?"
    r: "No. The reading engine is loaded into the page and then works on your device. The image and the text never leave your browser. You can check in the Network tab of your developer tools: no request carries your image."
  - q: "Why does the text contain mistakes?"
    r: "Quality depends on the image. A blurry, tilted or low-resolution photo, very small text or a busy background cause errors. Words outlined with orange dashes on the image are the uncertain ones: check those first. Choosing the right language also helps a lot."
  - q: "Can it read handwriting?"
    r: "Poorly. The engine is built for printed or on-screen text. Very neat block capitals may work; everyday handwriting will not be read reliably."
  - q: "Can I read a PDF?"
    r: "Not directly: the tool reads images (PNG, JPEG, WebP, screenshots). For a PDF, take a screenshot of the page you need or export it as an image, then paste it here."
mis_a_jour: 2026-10-20
sources:
  - titre: "Tesseract OCR, open-source character recognition engine"
    url: "https://github.com/tesseract-ocr/tesseract"
  - titre: "tesseract.js, the browser version of the engine (WebAssembly)"
    url: "https://github.com/naptha/tesseract.js"
---
A screenshot of an invoice, a photographed book page, a message that arrived as a picture: the text is there, but you cannot select it. This tool reads it for you and gives it back as text you can copy, fix and reuse. The technique is called OCR, short for optical character recognition.

## How to

1. **Paste or drop the image.** Fastest: take a screenshot, come back to this page and press Cmd+V. You can also drag a file into the box, or click to choose one.
2. **Check the language.** French, English, or both if the text mixes them. The language tells the engine which words and accents to expect.
3. **Copy the text.** It appears as soon as reading finishes. Click Copy, or download a .txt file.

On the first reading, the page loads the engine and the language data, from 4 to 8 MB depending on the language. Later readings are immediate, and the browser keeps the loaded language in memory.

## What reads well, and what helps

The engine reads printed or on-screen text very well: screenshots, straight scanned documents, book pages, labels. A few habits improve results a lot:

- **Crop to the text.** Cut the image around the useful passage: less background, fewer mistakes.
- **A sharp, straight image.** A photo taken at an angle or in shadow reads worse than a screenshot. For a document, photograph it flat, in good light.
- **Enough size.** Below roughly 20 pixels of letter height, reading degrades; enlarge the screenshot before pasting if you can.
- **The right language.** French text read as "English" loses its accents.

On the image, each word read is outlined. An orange dashed outline marks an uncertain reading: that is where to proofread first. Hovering a zone shows the word that was read.

## Joining lines

A screenshot breaks lines at the window width, and the copied text keeps those breaks in the middle of sentences. The "Join lines" option merges the lines of one paragraph, rebuilds words split by a hyphen at the end of a line, and keeps a blank line between paragraphs. Bulleted and numbered lists keep one line per item.

## Why it is private

The image is processed in your browser by an engine compiled to WebAssembly and served by this site. Neither the image nor the text is sent anywhere: there is no reading server, no account and no daily page limit. That matters for an ID card, a contract or a statement you would rather not hand to an online service.

## Limits

Handwriting is not read reliably, complex tables come out as lines of text without their columns, and languages other than French and English are not offered. Very large images, such as a 12-megapixel photo, are scaled down before reading to spare a phone's memory; this does not change the result for text of normal size.
