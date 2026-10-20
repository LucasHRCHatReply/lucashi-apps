---
id: scanner
lang: en
slug: scan-a-document
titre: "Scan a document with your phone — nothing uploaded"
h1: "Scan a document with a simple photo"
description: "Take or drop a photo of a sheet: edges found automatically, page straightened and whitened, PDF ready to send. Everything stays on your device."
nom_court: "Document scanner"
phrase: "A photo of a sheet becomes a clean, straightened PDF, ready to send."
categorie: documents
icone: doc.text
en_avant: true
mots_cles: [scan a document with phone, scan paper to pdf, photo of document to pdf, free online document scanner, straighten document photo, scan without scanner]
faq:
  - q: "How do I scan a document without a scanner, using my phone?"
    r: "Lay the sheet on a table, photograph all of it in good light, then drop the photo into the tool (on a phone, the “Take a photo” button opens the camera). The sheet’s edges are found automatically, the page is straightened to A4, the background whitened and the text made sharp. The PDF is ready to download, with no setting to touch."
  - q: "Are my documents uploaded to a server?"
    r: "No. Finding the edges, straightening and building the PDF all happen in your browser, with a small program served by this site. For a payslip, an ID or a contract nothing leaves your device: you can switch the Wi-Fi off after the page has loaded and the tool still works."
  - q: "What if the edges are not found or are misplaced?"
    r: "When detection is not sure, the tool says so and shows the photo with four dots: drag them onto the four corners of the sheet, or select a dot and use the arrow keys (Shift: steps of 10). You can also click “Adjust” on any page. A sheet lying on a background of the same colour is the hardest case."
  - q: "How do I make a multi-page PDF?"
    r: "Drop or take all the photos, one after the other or together. Each sheet becomes a page, in the order received. The arrow buttons move a page up or down, “Delete” removes it, “Rotate” turns it a quarter turn. The PDF is rebuilt after every change and its total size is shown."
  - q: "How heavy is the PDF?"
    r: "A page of text usually weighs 100 to 300 KB: a whitened background compresses very well. The tool aims for under one megabyte per page and shows the PDF size and the average per page. “Clean” and “Black and white” are the lightest; “Colour” keeps stamps and coloured ink."
  - q: "Can I scan an iPhone HEIC photo?"
    r: "Yes. HEIC photos are converted on the spot before being straightened, using the same program as this site’s HEIC to JPG tool. JPG, PNG and WebP are accepted too."
mis_a_jour: 2026-10-21
sources:
  - titre: "Zhang and He, “Whiteboard scanning and image enhancement” (Microsoft Research, 2007): true aspect ratio of a sheet seen in perspective"
  - titre: "jscanify, paper detection in JavaScript"
    url: "https://github.com/puffinsoft/jscanify"
  - titre: "OpenCV, findContours and approxPolyDP"
    url: "https://docs.opencv.org/4.x/dd/d49/tutorial_py_contour_features.html"
---
## How to do it

1. On a phone, tap “Take a photo” and photograph the whole sheet lying on a table. On a computer, drop one or more photos into the area above, or paste them with Cmd+V.
2. Wait a few seconds per page: the progress bar follows the real work (finding edges, straightening, whitening the background, compressing).
3. Download the PDF. The pages as JPG are in the collapsed block under the button.

Nothing else to set. If the edges of a page are badly found, the tool opens the four-corner adjustment screen by itself.

## What the tool does, step by step

**The sheet’s edges.** The tool looks for the largest four-sided shape in the photo. It tries several ways of separating the sheet from the background (lighter, darker, a different colour from the photo’s border, or enclosed by contours), keeps the shape whose four sides carry the sharpest edge, then fits each side to the image’s contours to place the corners to the pixel.

**Straightening.** The four corners define a perspective: the photo taken at an angle is brought back to a rectangle. The height-to-width ratio of a sheet seen at an angle is distorted; the tool recomputes it from the perspective and recognises A4 within 8%. Otherwise it keeps the measured ratio.

**The whitened background.** Every point is divided by the colour of the paper all around it, estimated without the text: uneven lighting and shadows disappear, the paper turns white and the ink stays black.

**The PDF.** Each page becomes an A4 page of a PDF, assembled in your browser.

## Why it is private

No document is uploaded: detection, straightening and the PDF are code running in your browser. The working file is about fifteen kilobytes and comes from this site.

## Limits to know

A sheet lying on an almost identical background, badly crumpled or partly out of frame is harder to find: the manual adjustment is for that. A curled sheet is straightened only as a flat plane: curved lines of text stay slightly curved. For text that software will read back, photograph straight on and close up.
