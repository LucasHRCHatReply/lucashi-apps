---
id: scanner
lang: fr
slug: scanner-un-document
titre: "Scanner un document avec son téléphone — sans envoi"
h1: "Scanner un document avec une simple photo"
description: "Photographiez ou déposez une feuille : les bords sont trouvés seuls, la page redressée et blanchie, le PDF prêt à envoyer. Tout reste sur votre appareil."
nom_court: "Scanner un document"
phrase: "Une photo de feuille devient un PDF net, redressé, prêt à envoyer."
categorie: documents
icone: doc.text
en_avant: true
mots_cles: [scanner un document avec son téléphone, scanner une feuille en pdf, photo de document en pdf, scanner gratuit en ligne, redresser une photo de document, scanner sans scanner]
faq:
  - q: "Comment scanner un document sans scanner, avec mon téléphone ?"
    r: "Posez la feuille sur une table, prenez-la en photo en entier, de préférence sous une lumière claire, puis déposez la photo dans l'outil (sur téléphone, le bouton « Prendre en photo » ouvre l'appareil). Les bords de la feuille sont trouvés seuls, la page est redressée au format A4, le fond est blanchi et le texte rendu net. Le PDF est prêt à télécharger, sans réglage."
  - q: "Mes documents sont-ils envoyés sur un serveur ?"
    r: "Non. La recherche des bords, le redressement et la fabrication du PDF se font dans votre navigateur, avec un petit programme servi par ce site. Pour un bulletin de paie, une pièce d'identité ou un contrat, rien ne quitte votre appareil : vous pouvez couper le Wi-Fi après l'ouverture de la page, l'outil fonctionne encore."
  - q: "Que faire si les bords ne sont pas trouvés ou sont mal placés ?"
    r: "Quand la détection n'est pas sûre, l'outil le dit et affiche la photo avec quatre points : glissez-les sur les quatre coins de la feuille, ou sélectionnez un point et utilisez les flèches du clavier (Maj : pas de 10). Vous pouvez aussi cliquer sur « Ajuster » sur n'importe quelle page. Une feuille posée sur un fond de la même couleur qu'elle est le cas le plus difficile."
  - q: "Comment faire un PDF de plusieurs pages ?"
    r: "Déposez ou prenez toutes les photos, l'une après l'autre ou ensemble. Chaque feuille devient une page, dans l'ordre d'arrivée. Les boutons flèche montent ou descendent une page, « Supprimer » l'enlève, « Pivoter » la tourne d'un quart de tour. Le PDF est refait à chaque changement et son poids total est affiché."
  - q: "Quel est le poids du PDF obtenu ?"
    r: "Une page de texte pèse en général entre 100 et 300 Ko : le fond blanchi se compresse très bien. L'outil vise moins d'un mégaoctet par page et affiche le poids du PDF et le poids moyen par page. Le rendu « Noir et blanc » ou « Net » est le plus léger ; « Couleur » garde les tampons et les encres colorées."
  - q: "Peut-on scanner une photo HEIC d'iPhone ?"
    r: "Oui. Les photos HEIC sont converties sur place avant d'être redressées, avec le même programme que l'outil HEIC vers JPG de ce site. Les JPG, PNG et WebP sont acceptés aussi."
mis_a_jour: 2026-10-21
sources:
  - titre: "Zhang et He, « Whiteboard scanning and image enhancement » (Microsoft Research, 2007) : rapport réel d'une feuille vue en perspective"
  - titre: "jscanify, détection de feuille en JavaScript"
    url: "https://github.com/puffinsoft/jscanify"
  - titre: "OpenCV, findContours et approxPolyDP"
    url: "https://docs.opencv.org/4.x/dd/d49/tutorial_py_contour_features.html"
---
## Comment faire

1. Sur téléphone, touchez « Prendre en photo » et photographiez la feuille entière, posée sur une table. Sur ordinateur, déposez une ou plusieurs photos dans la zone ci-dessus, ou collez-les avec Cmd+V.
2. Attendez quelques secondes par page : la barre d'avancement suit le travail réel (recherche des bords, redressement, fond blanchi, compression).
3. Téléchargez le PDF. Les pages en JPG sont dans le bloc replié sous le bouton.

Rien d'autre à régler. Si les bords d'une page sont mal trouvés, l'outil ouvre tout seul l'écran d'ajustement des quatre coins.

## Ce que fait l'outil, étape par étape

**Les bords de la feuille.** L'outil cherche la plus grande forme à quatre côtés de la photo. Il essaie plusieurs façons de séparer la feuille du fond (plus claire, plus sombre, de couleur différente du bord de la photo, ou cernée par des contours), garde la forme dont les quatre côtés portent le plus net contour, puis ajuste chaque côté sur les contours de l'image pour placer les coins au pixel près.

**Le redressement.** Les quatre coins définissent une perspective : la photo prise de biais est ramenée à un rectangle. Le rapport hauteur sur largeur d'une feuille vue de biais est faussé ; l'outil le recalcule à partir de la perspective et reconnaît le format A4 à 8 % près. Sinon, il garde le rapport mesuré.

**Le fond blanchi.** Chaque point est divisé par la couleur du papier tout autour de lui, estimée sans le texte : l'éclairage inégal et les ombres disparaissent, le papier devient blanc et l'encre reste noire.

**Le PDF.** Chaque page devient une page A4 d'un PDF, assemblée dans votre navigateur.

## Pourquoi c'est privé

Aucun document n'est envoyé : la détection, le redressement et le PDF sont du code qui tourne dans votre navigateur. Le fichier de travail fait une quinzaine de kilooctets et vient de ce site.

## Limites à connaître

Une feuille posée sur un fond presque identique, très froissée ou en partie hors cadre est plus dure à trouver : l'ajustement manuel sert à cela. Une feuille gondolée n'est redressée que comme un plan : les lignes courbes de texte restent légèrement courbes. Pour un texte à relire par un logiciel de reconnaissance, photographiez de face et de près.
