---
id: compresseur
lang: en
slug: compress-image
titre: "Compress an image — free, nothing uploaded"
h1: "Compress images without uploading them"
description: "Shrink JPG, PNG, WebP or AVIF photos: target size in KB, before/after slider, resizing. Everything stays in your browser, no account, nothing sent anywhere."
nom_court: "Image compressor"
phrase: "Shrink photos to the size you need, without uploading them."
categorie: images
icone: arrow.down.right.and.arrow.up.left
mots_cles: [compress image, reduce photo size, compress jpg, compress png, image under 1mb, compress photo for email]
faq:
  - q: "How do I reduce a photo's file size without visible quality loss?"
    r: "Keep quality between 70 and 80 and, for phone photos, cap the longest side at 2000 pixels. The eye sees almost no difference and the file is often 5 to 10 times lighter. The before/after slider lets you check on your own image."
  - q: "How do I compress an image to under 1 MB, 500 KB or 200 KB?"
    r: "Pick Target size and a shortcut (200 KB, 500 KB, 1 MB, 2 MB). The tool tries several qualities and keeps the highest one that fits. If the lowest quality still isn't enough, it shrinks the dimensions in 15% steps and tells you so."
  - q: "Are my images uploaded to a server?"
    r: "No. Compression runs in your browser, with encoders loaded from this site. You can switch off Wi-Fi after the page has loaded and the tool still works."
  - q: "Why does my PNG barely get smaller?"
    r: "PNG is lossless: the tool can only pack the same pixels better, which typically saves 10 to 30%. For a photo, switch the format to WebP or JPG, or use a target size so the image is scaled down."
  - q: "What is the size difference between JPG, PNG and WebP?"
    r: "JPG suits photos and works everywhere. PNG suits screenshots, logos and transparent images. WebP is usually 25 to 35% lighter than a JPG of similar quality and opens in all current browsers."
  - q: "Does compressing remove photo information such as location?"
    r: "Yes: EXIF metadata (GPS position, camera model, date) is not copied into the new image. Handy before posting a photo online, but keep the original if you need that information."
mis_a_jour: 2026-10-20
sources:
  - titre: "mozjpeg, optimised JPEG encoder (Mozilla)"
    url: "https://github.com/mozilla/mozjpeg"
  - titre: "oxipng, lossless PNG optimiser"
    url: "https://github.com/shssoichiro/oxipng"
  - titre: "libwebp, WebP encoder (Google)"
    url: "https://developers.google.com/speed/webp"
---
A phone photo easily weighs 3 to 8 MB: too much for most online forms, for email attachments with a size cap, or for a website that has to load fast. This tool brings it down to the size you want and shows you the difference before you download.

## How to

1. Drop one or more images in the box, click to choose them, or paste a screenshot with Cmd+V.
2. Pick a mode: **Quality** (you move the slider) or **Target size** (you say "under 500 KB").
3. Compare before and after with the slider, then download the image, or all images in a single zip.

Every setting change recalculates the result straight away, no button to press.

## Target size, so you stop guessing

Many services enforce a precise limit: 1 MB for an ID upload, 500 KB for a profile picture. Nudging a slider by trial and error is tedious. With a target size, the tool encodes the image at several quality levels, uses a binary search to find the highest quality that fits under the limit, and keeps only that one. If the limit is too low for the original dimensions, it shrinks the image in 15% steps and tells you the new dimensions. If it can't make it at all, it says so instead of showing a false success.

## Which format to choose

- **JPG**: photos, maximum compatibility. No transparency (a white background is added).
- **WebP**: usually 25 to 35% lighter than a JPG at the same look; supports transparency.
- **PNG**: screenshots, logos, flat colours. Compression is lossless, so the gain is modest.
- **AVIF**: accepted as input; the image comes out as WebP, which is more widely readable.

"Same" keeps the original format. If an image is already well compressed and the result would be larger, the tool keeps your original rather than handing you a heavier file.

## Resizing

The "Max side" field caps the longest side of the image, width or height. For a screen, 1600 to 2000 pixels is plenty; for a website, 1200. An image is never enlarged. Reducing dimensions is the most powerful lever: halving the side divides the pixel count by four.

## Privacy

Nothing is uploaded. The encoders (mozjpeg for JPG, oxipng for PNG, libwebp for WebP) run in a background thread of your browser, which keeps the page responsive. They are served by this site, with no third-party service, and loaded only when you drop a first image. Metadata (GPS position, camera, shooting date) is not kept: useful before posting a photo, but keep the original if you need it.

Very large images (over 100 megapixels) are refused, because the browser would run out of memory.
