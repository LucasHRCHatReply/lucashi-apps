---
id: compresseur
lang: fr
slug: compresser-image
titre: "Compresser une image — gratuit, sans envoi"
h1: "Compresser des images sans les envoyer"
description: "Réduisez le poids de vos photos JPG, PNG, WebP ou AVIF : poids cible en Ko, avant/après, redimensionnement. Tout reste dans votre navigateur, sans compte."
nom_court: "Compresseur d'images"
phrase: "Allégez vos photos jusqu'au poids voulu, sans les envoyer."
categorie: images
icone: arrow.down.right.and.arrow.up.left
mots_cles: [compresser image, réduire poids photo, compresser jpg, compresser png, réduire image en ko, compresser photo pour mail]
faq:
  - q: "Comment réduire le poids d'une photo sans perdre en qualité visible ?"
    r: "Gardez la qualité entre 70 et 80 et, si la photo vient d'un téléphone, limitez le plus grand côté à 2000 pixels : l'œil ne voit presque aucune différence, le fichier est souvent 5 à 10 fois plus léger. Le curseur avant/après permet de le vérifier sur votre image."
  - q: "Comment compresser une image à moins de 1 Mo, 500 Ko ou 200 Ko ?"
    r: "Choisissez « Poids cible » et un raccourci (200 Ko, 500 Ko, 1 Mo, 2 Mo). L'outil essaie plusieurs qualités et garde la plus haute qui tient sous la taille voulue. Si la qualité minimale ne suffit pas, il réduit les dimensions par paliers de 15 % et vous le dit."
  - q: "Mes images sont-elles envoyées sur un serveur ?"
    r: "Non. La compression se fait dans votre navigateur, avec des encodeurs chargés depuis ce site. Vous pouvez couper le Wi-Fi après le chargement de la page : l'outil fonctionne encore."
  - q: "Pourquoi mon PNG ne diminue-t-il presque pas ?"
    r: "Le PNG est un format sans perte : on ne peut que mieux ranger les mêmes pixels, ce qui gagne souvent 10 à 30 %. Pour une photo, passez le format en WebP ou JPG, ou utilisez un poids cible : l'outil réduira alors l'image."
  - q: "Quelle différence entre JPG, PNG et WebP pour le poids ?"
    r: "JPG convient aux photos et passe partout. PNG convient aux captures d'écran, logos et images à fond transparent. WebP fait en général 25 à 35 % plus léger qu'un JPG de qualité équivalente et se lit dans tous les navigateurs récents."
  - q: "La compression supprime-t-elle les informations de la photo (lieu, appareil) ?"
    r: "Oui : les métadonnées EXIF (position GPS, modèle d'appareil, date) ne sont pas recopiées dans l'image produite. C'est pratique avant de publier une photo, mais conservez l'original si vous avez besoin de ces informations."
mis_a_jour: 2026-10-20
sources:
  - titre: "mozjpeg, encodeur JPEG optimisé (Mozilla)"
    url: "https://github.com/mozilla/mozjpeg"
  - titre: "oxipng, optimiseur PNG sans perte"
    url: "https://github.com/shssoichiro/oxipng"
  - titre: "libwebp, encodeur WebP (Google)"
    url: "https://developers.google.com/speed/webp"
---
Une photo de téléphone pèse facilement 3 à 8 Mo : trop pour la plupart des formulaires en ligne, des pièces jointes limitées à quelques Mo ou d'un site qui doit s'afficher vite. Cet outil la ramène à la taille que vous voulez, et vous montre ce que ça change avant que vous la téléchargiez.

## Comment faire

1. Glissez une ou plusieurs images dans la zone, cliquez pour les choisir, ou collez une capture avec Cmd+V.
2. Choisissez un réglage : **Qualité** (vous placez le curseur) ou **Poids cible** (vous dites « moins de 500 Ko »).
3. Comparez avant et après avec le curseur, puis téléchargez l'image, ou toutes les images dans un seul zip.

Chaque modification de réglage recalcule le résultat tout de suite, sans bouton à presser.

## Le poids cible, pour ne plus tâtonner

Beaucoup de services imposent une limite précise : 1 Mo pour une pièce d'identité en ligne, 500 Ko pour une photo de profil. Régler un curseur d'essai en essai est fastidieux. Avec le poids cible, l'outil encode l'image à plusieurs niveaux de qualité, cherche par dichotomie la qualité la plus haute qui passe sous la limite, et ne garde que celle-là. Si la limite est trop basse pour les dimensions d'origine, il réduit l'image par paliers de 15 % et vous indique les nouvelles dimensions. S'il n'y arrive pas du tout, il le dit au lieu d'afficher un faux succès.

## Quel format choisir

- **JPG** : photos, compatibilité maximale. Pas de transparence (un fond blanc est ajouté).
- **WebP** : en général 25 à 35 % plus léger qu'un JPG au même rendu ; accepte la transparence.
- **PNG** : captures d'écran, logos, aplats. La compression est sans perte, donc le gain est modeste.
- **AVIF** : accepté en entrée ; l'image sort en WebP, plus largement lisible.

« Identique » garde le format d'origine. Si une image est déjà bien compressée et que le résultat serait plus gros, l'outil garde votre original plutôt que de vous donner un fichier plus lourd.

## Redimensionner

Le champ « Côté max » limite le plus grand côté de l'image, largeur ou hauteur. Pour un écran, 1600 à 2000 pixels suffisent largement ; pour un site, 1200. Une image n'est jamais agrandie. Réduire les dimensions est le levier le plus puissant : diviser le côté par deux divise le nombre de pixels par quatre.

## Vie privée

Rien n'est envoyé. Les encodeurs (mozjpeg pour le JPG, oxipng pour le PNG, libwebp pour le WebP) tournent dans un processus d'arrière-plan de votre navigateur, ce qui garde la page fluide. Ils sont servis par ce site, sans service tiers, et chargés seulement quand vous déposez une première image. Les métadonnées (position GPS, appareil, date de prise de vue) ne sont pas conservées : c'est utile avant de publier une photo, mais gardez l'original si vous en avez besoin.

Les images très grandes (plus de 100 mégapixels) sont refusées, car le navigateur manquerait de mémoire.
