---
id: qr-wifi
lang: en
slug: wifi-qr-code
titre: "Wi-Fi QR code to print — free, nothing uploaded"
h1: "Make a printable Wi-Fi QR code"
description: "Enter your Wi-Fi name and password to get a QR code and a printable sheet (card, A4 poster) as PNG, SVG or PDF. Nothing is uploaded or saved."
nom_court: "Wi-Fi QR code"
phrase: "Guests join by scanning, with no password to type."
categorie: pratique
icone: qrcode
mots_cles: [wifi qr code generator, wifi qr code, share wifi with qr code, printable wifi sign, guest wifi poster, wifi qr code pdf]
faq:
  - q: "How do I make a QR code to share my Wi-Fi?"
    r: "Enter the exact network name and its password, pick the security type (WPA in almost every case), then a layout. The code appears at once; download it as PNG, SVG or PDF, or print the sheet."
  - q: "How do I scan a Wi-Fi QR code on iPhone and Android?"
    r: "On iPhone, open the camera, point it at the code and tap the “Join network” banner. On Android, the camera or Google Lens offers to connect; recent versions also have a QR scanner in quick settings."
  - q: "Is my Wi-Fi password sent to a server?"
    r: "No. The code is computed in your browser and nothing is sent or saved. Note that the code contains the password, so anyone who scans or photographs it can join the network."
  - q: "Which security should I choose: WPA, WPA2, WPA3 or WEP?"
    r: "Choose WPA: the code applies to WPA, WPA2 and mixed WPA3 networks, which covers nearly every router. WEP is only for very old equipment, and “None” is for open networks without a password."
  - q: "What if I change my Wi-Fi password?"
    r: "Make the code again and reprint the sheet: the password is written inside the QR code, which does not update by itself."
  - q: "My network is hidden: what should I set?"
    r: "Set “Hidden network” to Yes in the options. The device will then look for the network by name even though it is not broadcast."
mis_a_jour: 2026-10-20
sources:
  - titre: "Wi-Fi barcode format (ZXing, open source project)"
    url: "https://github.com/zxing/zxing/wiki/Barcode-Contents#wi-fi-network-config-android-ios-11"
  - titre: "Apple: scan a QR code with the iPhone camera"
    url: "https://support.apple.com/guide/iphone/iph14a73a8b0/ios"
---
A Wi-Fi QR code holds your network name, its password and its security type. A phone camera reads it and offers to join the network in one tap: no password to spell out, no mix-up between a lowercase “l” and a capital “I”. This page builds the code, then lays it out for printing.

## How to

1. Enter the **network name** exactly as it appears on your devices, and its **password**.
2. Pick a **layout**: the code alone, a minimal sheet, a framed card or an A4 poster. The preview updates as you type.
3. Download the **PDF** to print, the **PNG** for a document or a message, the **SVG** for layout software, or print straight away.

## The three sheets

- **Minimal**: a very plain A6 sheet, handy to slip under glass or into a frame.
- **Card**: a framed A6 with a title (“Welcome” by default, editable), the code, the network name and the password in a fixed-width typeface that tells a zero from a letter O.
- **Poster**: an A4 with a large code and the three steps to join, for a front desk, a guest house, a waiting room or an office.

The network name and password can be printed in clear text for people who cannot scan; you can also print neither, or only the network. When printing, the card and the minimal sheet sit at their real size in the middle of an A4 page with cutting marks, and the poster fills the page. The same drawing feeds the preview, the printout and the PDF, which is vector: the code stays sharp at any size.

## Why it is private

A Wi-Fi password is sensitive, and many online generators send it to their server to draw the image. Here everything happens in your browser: the code, the preview, the PDF and the PNG are computed on your device, no request leaves with your password, and nothing is remembered when you close the page.

The code does contain the password, readable by anyone who scans it. Display it only where you would be happy to give the password out. For a public place or passing visitors, the safest option is to create a **guest network** on your router, separate from your main one, and print only that.

## Special cases

- **Special characters**: semicolons, commas, colons, quotes and backslashes are protected with a backslash inside the code, as the format requires; you do nothing.
- **Very long name**: a network name is 32 bytes at most; beyond that the tool says so. On the sheet, the text size adapts to the room available.
- **Accents and emoji**: they are kept in the code. In the PDF text only Latin-alphabet characters are drawn; others appear as “?” and the tool warns you. The PNG and the printout keep every character.
- **Changed password**: the code is fixed. After a password change, make it again.
