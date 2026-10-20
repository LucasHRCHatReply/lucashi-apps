---
id: qr-wifi
lang: fr
slug: qr-code-wifi
titre: "QR code Wi-Fi à imprimer — gratuit, sans envoi"
h1: "Créer un QR code Wi-Fi à imprimer"
description: "Saisissez le nom et le mot de passe de votre Wi-Fi : QR code et fiche à imprimer (carte, affiche A4) en PNG, SVG ou PDF. Rien n'est envoyé ni enregistré."
nom_court: "QR code Wi-Fi"
phrase: "Vos invités se connectent en scannant, sans taper le mot de passe."
categorie: pratique
icone: qrcode
mots_cles: [qr code wifi, générateur qr code wifi, partager wifi qr code, fiche wifi à imprimer, affiche wifi invités, qr code wifi pdf]
faq:
  - q: "Comment créer un QR code pour partager son Wi-Fi ?"
    r: "Saisissez le nom exact du réseau et son mot de passe, choisissez la sécurité (WPA dans presque tous les cas), puis un modèle. Le code apparaît tout de suite ; téléchargez-le en PNG, SVG ou PDF, ou imprimez la fiche."
  - q: "Comment scanner un QR code Wi-Fi sur iPhone et sur Android ?"
    r: "Sur iPhone, ouvrez l'appareil photo, visez le code et touchez la bulle « Rejoindre le réseau ». Sur Android, l'appareil photo ou Google Lens propose de se connecter ; sur les versions récentes, le scanneur de code QR des réglages rapides fait de même."
  - q: "Mon mot de passe Wi-Fi est-il envoyé à un serveur ?"
    r: "Non. Le code est calculé dans votre navigateur, rien n'est transmis ni enregistré. Attention toutefois : le code contient le mot de passe, donc quiconque le scanne ou le photographie peut se connecter."
  - q: "Quelle sécurité choisir : WPA, WPA2, WPA3 ou WEP ?"
    r: "Choisissez WPA : le code s'applique aux réseaux WPA, WPA2 et WPA3 en mode mixte, soit la quasi-totalité des box. WEP n'existe que pour du très vieux matériel, et « Aucune » sert aux réseaux ouverts, sans mot de passe."
  - q: "Que faire si je change le mot de passe du Wi-Fi ?"
    r: "Il faut refaire le code et réimprimer la fiche : le mot de passe est écrit dans le QR code, qui ne se met pas à jour tout seul."
  - q: "Mon réseau est masqué : que faut-il régler ?"
    r: "Passez « Réseau masqué » sur Oui dans les options. L'appareil cherchera alors le réseau par son nom, même s'il n'est pas diffusé."
mis_a_jour: 2026-10-20
sources:
  - titre: "Format de code-barres Wi-Fi (ZXing, projet open source)"
    url: "https://github.com/zxing/zxing/wiki/Barcode-Contents#wi-fi-network-config-android-ios-11"
  - titre: "Apple : scanner un code QR avec l'appareil photo de l'iPhone"
    url: "https://support.apple.com/fr-fr/guide/iphone/iph14a73a8b0/ios"
---
Un code QR Wi-Fi contient le nom de votre réseau, son mot de passe et son type de sécurité. L'appareil photo d'un téléphone le lit et propose de rejoindre le réseau en un geste : plus de mot de passe à épeler, ni de confusion entre le « l » minuscule et le « I » majuscule. Cette page le fabrique, puis le met en page pour l'imprimer.

## Comment faire

1. Saisissez le **nom du réseau** exactement comme il apparaît sur vos appareils, et son **mot de passe**.
2. Choisissez un **modèle** : le code seul, une fiche minimale, une carte encadrée ou une affiche A4. L'aperçu se met à jour à chaque frappe.
3. Téléchargez en **PDF** pour imprimer, en **PNG** pour un document ou un message, en **SVG** pour un logiciel de mise en page, ou lancez l'impression directement.

## Les trois fiches

- **Minimal** : un format A6 très sobre, idéal pour glisser sous une vitre ou dans un cadre.
- **Carte** : un A6 encadré avec un titre (« Bienvenue » par défaut, modifiable), le code, le nom du réseau et le mot de passe en caractères à chasse fixe, qui distinguent bien le 0 de la lettre O.
- **Affiche** : un A4 avec un grand code et les trois gestes pour rejoindre le réseau, à placer à l'accueil, dans un gîte, une salle d'attente ou un bureau.

Le nom du réseau et le mot de passe peuvent s'écrire en clair sur la fiche, pour les personnes qui ne peuvent pas scanner ; vous pouvez aussi ne les écrire ni l'un ni l'autre, ou n'écrire que le réseau. À l'impression, la carte et la fiche minimale sont posées à taille réelle au centre d'une page A4, avec des repères de coupe ; l'affiche occupe toute la page. Les mêmes dessins servent à l'aperçu, à l'impression et au PDF, qui est vectoriel : le code reste net à n'importe quelle taille.

## Pourquoi c'est privé

Un mot de passe de Wi-Fi est une information sensible, et beaucoup de générateurs en ligne l'envoient à leur serveur pour fabriquer l'image. Ici, tout se passe dans votre navigateur : le code, l'aperçu, le PDF et le PNG sont calculés sur votre appareil, aucune requête ne part avec votre mot de passe, et rien n'est mémorisé quand vous fermez la page.

Le code contient bien le mot de passe, en clair pour qui sait le lire. Affichez-le donc là où vous accepteriez de donner le mot de passe. Pour un lieu public ou des visiteurs de passage, le plus prudent est de créer un **réseau invité** sur votre box, distinct de votre réseau principal, et de n'imprimer que celui-là.

## Cas particuliers

- **Caractères spéciaux** : le point-virgule, la virgule, les deux-points, les guillemets et la barre oblique inverse sont protégés par une barre oblique inverse dans le code, comme l'exige le format ; vous n'avez rien à faire.
- **Nom très long** : un nom de réseau fait 32 octets au plus ; au-delà, l'outil le signale. Sur la fiche, la taille du texte s'adapte à la place disponible.
- **Accents et émojis** : ils sont conservés dans le code. Dans le texte du PDF, seuls les caractères de l'alphabet latin sont dessinés ; les autres apparaissent comme « ? » et l'outil vous prévient. Le PNG et l'impression, eux, gardent tous les caractères.
- **Mot de passe modifié** : le code est figé. Après un changement de mot de passe, refaites-le.
