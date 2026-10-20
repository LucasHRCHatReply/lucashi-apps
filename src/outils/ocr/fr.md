---
id: ocr
lang: fr
slug: image-en-texte
titre: "Image en texte (OCR) — gratuit, sans envoi"
h1: "Copier le texte d'une image"
description: "Collez une capture ou ouvrez une photo : le texte est lu et copiable, en français ou en anglais. Tout se passe dans votre navigateur, rien n'est envoyé."
nom_court: "Image en texte"
phrase: "Collez une capture, copiez le texte."
categorie: images
icone: text.viewfinder
mots_cles: [image en texte, extraire le texte d'une image, ocr en ligne gratuit, copier le texte d'une capture d'écran, convertir image en texte, ocr français]
faq:
  - q: "Comment copier le texte d'une image ?"
    r: "Collez l'image avec Cmd+V (Ctrl+V sous Windows), ou glissez-la dans la zone. Le texte lu apparaît à droite : un clic sur Copier et il est dans votre presse-papiers. Vous pouvez aussi le télécharger en fichier .txt."
  - q: "Comment extraire le texte d'une capture d'écran ?"
    r: "Faites la capture (Cmd+Maj+4 sur Mac, Windows+Maj+S sous Windows), puis revenez sur cette page et collez-la. La capture reste dans le presse-papiers : il n'y a pas de fichier à enregistrer ni à envoyer."
  - q: "Mon image est-elle envoyée sur un serveur ?"
    r: "Non. Le moteur de lecture est chargé dans la page, puis il travaille sur votre appareil. L'image et le texte ne quittent jamais votre navigateur. Vous pouvez le vérifier dans l'onglet Réseau des outils de développement : aucune requête ne part avec votre image."
  - q: "Pourquoi le texte contient-il des erreurs ?"
    r: "La qualité dépend de l'image. Une photo floue, penchée, en basse résolution, un texte très petit ou un fond chargé donnent des fautes. Les mots entourés en pointillés orange sur l'image sont ceux dont la lecture est incertaine : relisez-les en priorité. Choisir la bonne langue améliore aussi nettement le résultat."
  - q: "L'outil lit-il l'écriture manuscrite ?"
    r: "Mal. Le moteur est fait pour du texte imprimé ou affiché à l'écran. Une écriture manuscrite très soignée en capitales peut passer, une écriture courante ne sera pas lue de façon fiable."
  - q: "Peut-on lire un PDF ?"
    r: "Pas directement : l'outil lit des images (PNG, JPEG, WebP, capture d'écran). Pour un PDF, faites une capture de la page voulue ou exportez-la en image, puis collez-la ici."
mis_a_jour: 2026-10-20
sources:
  - titre: "Tesseract OCR, moteur de reconnaissance de caractères open source"
    url: "https://github.com/tesseract-ocr/tesseract"
  - titre: "tesseract.js, version du moteur pour le navigateur (WebAssembly)"
    url: "https://github.com/naptha/tesseract.js"
---
Une capture d'écran de facture, une page de livre photographiée, un message reçu sous forme d'image : le texte y est, mais impossible de le sélectionner. Cet outil le lit pour vous et le rend sous forme de texte que l'on peut copier, corriger et réutiliser. On parle d'OCR, pour « reconnaissance optique de caractères ».

## Comment faire

1. **Collez ou déposez l'image.** Le plus rapide : faites une capture, revenez sur la page et appuyez sur Cmd+V. On peut aussi glisser un fichier dans la zone, ou cliquer pour le choisir.
2. **Vérifiez la langue.** Français, anglais, ou les deux si le texte mélange les deux. La langue indique au moteur quels mots et quels accents attendre.
3. **Copiez le texte.** Il s'affiche à mesure que la lecture se termine. Cliquez sur Copier, ou téléchargez un fichier .txt.

À la première lecture, la page charge le moteur et les données de langue, de 4 à 8 Mo selon la langue. Les lectures suivantes sont immédiates, et la langue déjà chargée est gardée en mémoire par le navigateur.

## Ce qui est lu, et ce qui aide

Le moteur lit très bien du texte imprimé ou affiché à l'écran : captures, documents scannés bien droits, pages de livre, étiquettes. Quelques gestes améliorent beaucoup le résultat :

- **Cadrer le texte seul.** Découpez l'image autour du passage utile : moins de décor, moins de fautes.
- **Une image nette et droite.** Une photo prise de biais ou dans l'ombre se lit moins bien qu'une capture. Pour un document, photographiez-le à plat, en pleine lumière.
- **Une taille suffisante.** Sous environ 20 pixels de hauteur de lettre, la lecture se dégrade ; agrandissez la capture avant de la coller si vous le pouvez.
- **La bonne langue.** Un texte français lu en « anglais » perd ses accents.

Sur l'image, chaque mot lu est entouré. Un contour en pointillés orange signale une lecture incertaine : c'est là qu'il faut relire en priorité. Le survol d'une zone affiche le mot lu.

## Recoller les lignes

Une capture coupe les lignes à la largeur de la fenêtre, et le texte copié garde ces coupures au milieu des phrases. L'option « Recoller lignes » réunit les lignes d'un même paragraphe, reforme les mots coupés par un trait d'union en fin de ligne, et garde une ligne vide entre deux paragraphes. Les listes à puces ou numérotées gardent une ligne par élément.

## Pourquoi c'est privé

L'image est traitée dans votre navigateur, par un moteur écrit en WebAssembly servi par ce site. Ni l'image ni le texte ne sont envoyés : il n'y a pas de serveur de lecture, pas de compte, pas de limite de pages par jour. C'est utile pour une pièce d'identité, un contrat ou un relevé, qu'on ne veut pas confier à un service en ligne.

## Limites

L'écriture manuscrite n'est pas lue de façon fiable, les tableaux complexes sortent en lignes de texte sans leurs colonnes, et les langues autres que le français et l'anglais ne sont pas proposées. Les images énormes, comme une photo de 12 mégapixels, sont réduites avant lecture pour ménager la mémoire du téléphone ; cela ne change pas le résultat pour un texte de taille normale.
