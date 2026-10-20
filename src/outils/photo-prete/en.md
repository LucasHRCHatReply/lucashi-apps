---
id: photo-prete
lang: en
slug: photo-ready-to-send
titre: "Photo ready to send — no GPS, under 1 MB"
h1: "A photo ready to send, without your location"
description: "Drop an iPhone or JPG photo: it comes out upright, under 1 MB, with no GPS position or camera model. Everything stays in your browser, no account needed."
nom_court: "Photo ready"
phrase: "Drop a photo: it comes out light, upright and without your location."
categorie: images
icone: photo
en_avant: true
mots_cles: [photo too large for form, remove gps from photo, strip exif data, heic to jpg under 1mb, resize photo for upload, remove location from photo]
faq:
  - q: "Why does a form reject my photo?"
    r: "Almost always because of weight (a phone photo easily exceeds 3 MB) or format (many sites cannot read the iPhone's HEIC). Drop it here: it comes out as a JPG under 1 MB, the default Form setting."
  - q: "Does a photo really say where I live?"
    r: "Yes, if the camera's location is on. The file then holds GPS coordinates accurate to a few meters, the date and the phone model. The tool shows what it removed, photo by photo, for example the position and the camera."
  - q: "Are my photos uploaded to a server?"
    r: "No. Decoding and compression run in your browser, with programs served by this site. No map service is queried: the See on the map link only opens if you click it."
  - q: "What size and weight does a classifieds site accept?"
    r: "We found no official limit published by such sites. The Classifieds setting therefore aims at cautious values, 2 MB and 1,600 pixels on the long side, which keeps a photo sharp on screen."
  - q: "Is the photo worse after compression?"
    r: "Very little: the tool looks for the best quality that fits the requested weight and only shrinks the dimensions as a last resort, and tells you so. The Light destination keeps quality 85 with no cap."
  - q: "What if the photo is already small?"
    r: "It is still re-saved to erase the position and the camera, and the result stays under its original weight whenever possible."
mis_a_jour: 2026-10-20
sources:
  - titre: "EXIF specification (CIPA DC-008): GPS, Make, Model and Orientation tags"
---
## How to use it

1. Drop one or more photos: drag them in, click, or paste with Cmd+V. iPhone HEIC, JPG, PNG and WebP are accepted.
2. Nothing else to set: the JPG is ready at once, under 1 MB. Pick Email, Classifieds or Light only if the destination needs it; the result is redone by itself.
3. Download: one button for one photo, a zip for several.

## What the tool removes, and shows you

Each photo lists what was removed, and only what it really contained: the GPS position (with a link to a map that you open yourself), the camera model, the date taken, the software, XMP blocks. Beside it, the weight before and after and two thumbnails to compare. The produced file is then re-read by the tool: if any metadata remained, it is not offered.

## Why it matters

A smartphone writes invisible information into every photo: where it was taken, when, with what device. Sending a picture of your living room to a stranger answering an ad can hand over your address. Messaging apps often strip this data; forms and email do not.

## What it keeps

- **Orientation.** The photo is actually rotated, not merely tagged as needing rotation, so it displays upright everywhere.
- **The name.** `IMG_0412.HEIC` becomes `IMG_0412-prete.jpg`.
- **Sharpness.** Compression looks for the highest quality that fits under the target weight.

## The destinations

- **Form** (default): 1 MB at most.
- **Email**: 2 MB at most.
- **Classifieds**: 2 MB and 1,600 px on the long side. These are cautious values; we could not verify a published limit.
- **Light**: quality 85 with no weight limit, to keep a fine photo while stripping its metadata.

## Limits

A photo above 100 megapixels is refused. The color profile is not kept: colors stay faithful on screen, but professional retouching needs the original. Live Photos yield only the still image. An unreadable file is flagged on its own row without blocking the others.
