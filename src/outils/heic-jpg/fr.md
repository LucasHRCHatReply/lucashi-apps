---
id: heic-jpg
lang: fr
slug: heic-en-jpg
titre: "Convertir HEIC en JPG — gratuit, sans envoi"
h1: "Convertir des photos HEIC en JPG"
description: "Transformez vos photos iPhone HEIC en JPG ou PNG, par lots, sans les envoyer : la conversion se fait dans votre navigateur. Gratuit, sans compte."
nom_court: "HEIC → JPG"
phrase: "Photos iPhone en JPG ou PNG, par lots, sans envoi."
categorie: images
icone: photo
mots_cles: [convertir heic en jpg, heic en jpg, ouvrir fichier heic, convertir photo iphone en jpg, heic vers jpg gratuit, heic en png]
faq:
  - q: "Comment ouvrir un fichier HEIC sur Windows ou sur un site qui le refuse ?"
    r: "Le plus simple est de le convertir en JPG : déposez le fichier dans l'outil ci-dessus, puis téléchargez le JPG, que tous les logiciels et tous les sites acceptent. Windows peut aussi lire le HEIC avec une extension payante, mais la conversion évite d'installer quoi que ce soit."
  - q: "Mes photos sont-elles envoyées sur un serveur ?"
    r: "Non. Le décodage HEIC se fait dans votre navigateur, avec un petit programme (libheif) servi par ce site. Vous pouvez le vérifier : coupez le Wi-Fi après avoir ouvert la page, la conversion fonctionne toujours."
  - q: "Perd-on en qualité en passant de HEIC à JPG ?"
    r: "Un peu, car le JPG compresse avec perte. À la qualité 92, réglage par défaut, la différence ne se voit pas à l'œil, mais le fichier est souvent plus gros que le HEIC d'origine. Pour ne rien perdre du tout, choisissez PNG, en acceptant des fichiers bien plus lourds."
  - q: "Peut-on convertir plusieurs photos HEIC d'un coup ?"
    r: "Oui. Glissez toute une sélection, une centaine de photos par exemple : elles sont converties deux par deux, une vignette s'affiche à mesure, puis un seul zip rassemble le tout. Chaque photo reste aussi téléchargeable seule."
  - q: "Comment faire pour que l'iPhone prenne directement des photos en JPG ?"
    r: "Dans Réglages, Appareil photo, Formats, choisissez « Le plus compatible » : les nouvelles photos seront enregistrées en JPG. Les anciennes restent en HEIC, d'où l'intérêt de cet outil."
  - q: "Pourquoi la date et le lieu de ma photo ont-ils disparu du JPG ?"
    r: "Par défaut, l'outil n'écrit ni la date, ni le lieu GPS dans le JPG, pour que vous puissiez partager une image qui ne dit rien de vous. Cochez « Date et lieu » pour les recopier."
mis_a_jour: 2026-10-20
sources: []
---
## Comment faire

1. Glissez vos photos `.heic` dans la zone ci-dessus, ou cliquez pour les choisir, ou collez-les avec Cmd+V.
2. Choisissez JPG ou PNG, et la qualité si vous voulez la régler. Les photos se convertissent seules, deux à la fois.
3. Téléchargez chaque photo, ou « Tout télécharger » : un seul fichier zip contient la sélection.

Changer un réglage reconvertit les photos déjà ajoutées : inutile de les redéposer.

## Pourquoi ce format pose problème

Depuis iOS 11, l'iPhone enregistre ses photos en HEIC (aussi écrit HEIF), un format qui garde la même qualité qu'un JPG dans un fichier à peu près deux fois plus léger. Le revers : un grand nombre de logiciels, de sites d'administration, de messageries et de vieux systèmes ne savent pas l'ouvrir ni l'importer. Résultat classique : on envoie une pièce jointe, et le destinataire reçoit un fichier illisible. Le JPG, lui, passe partout.

## Ce que fait l'outil, et ce qu'il garde

- **La photo en pleine définition.** Rien n'est réduit : une photo de 12 mégapixels reste une photo de 12 mégapixels.
- **L'orientation.** Une photo prise en portrait reste en portrait, sans rotation à refaire.
- **Le nom du fichier.** `IMG_0412.HEIC` devient `IMG_0412.jpg`.
- **La date et le lieu, si vous le demandez.** Par défaut le JPG n'en porte aucun : c'est plus prudent avant de publier une image. Cochez « Date et lieu » pour recopier la date de prise de vue, le point GPS et l'appareil.
- **Les photos Live.** Seule l'image fixe est convertie, pas la courte vidéo qui l'accompagne.

## Pourquoi c'est privé

Le décodage utilise libheif, une bibliothèque libre, compilée en WebAssembly. Elle est téléchargée une fois depuis ce site, au moment où vous déposez votre première photo, puis tourne dans votre navigateur. Aucune photo n'est envoyée, nulle part : ni sur un serveur, ni chez un tiers. Pour une photo de famille, de pièce d'identité ou de document, c'est la seule manière sérieuse de convertir en ligne.

## Limites à connaître

Les couleurs sont écrites telles que le décodeur les restitue, sans profil de couleur intégré : sur un écran très étendu, certaines teintes très saturées peuvent paraître légèrement moins vives que sur l'iPhone. Les fichiers HEIC qui ne contiennent pas une photo classique, par exemple des images HDR spéciales, peuvent être refusés. Le fichier est alors signalé sur sa ligne, sans bloquer les autres.
