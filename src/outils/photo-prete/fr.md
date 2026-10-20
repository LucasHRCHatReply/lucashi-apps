---
id: photo-prete
lang: fr
slug: photo-prete-a-envoyer
titre: "Photo prête à envoyer — sans GPS, sous 1 Mo"
h1: "Une photo prête à envoyer, sans votre position"
description: "Déposez une photo iPhone ou JPG : elle ressort tournée, sous 1 Mo, sans position GPS ni modèle d'appareil. Tout reste dans votre navigateur, sans compte."
nom_court: "Photo prête"
phrase: "Déposez une photo : elle ressort légère, droite et sans votre position."
categorie: images
icone: photo
en_avant: true
mots_cles: [photo trop lourde formulaire, supprimer gps photo, enlever exif photo, photo heic en jpg moins de 1 mo, photo pour leboncoin, retirer localisation photo]
faq:
  - q: "Pourquoi ma photo est-elle refusée par un formulaire ?"
    r: "Presque toujours à cause du poids (une photo de téléphone dépasse facilement 3 Mo) ou du format (le HEIC de l'iPhone n'est pas lu par beaucoup de sites). Déposez-la ici : elle ressort en JPG sous 1 Mo, le réglage « Formulaire » par défaut."
  - q: "Une photo dit-elle vraiment où j'habite ?"
    r: "Oui, si la localisation de l'appareil photo est active. Le fichier contient alors des coordonnées GPS précises à quelques mètres, la date et le modèle du téléphone. L'outil vous montre ce qu'il a retiré photo par photo, par exemple la position et l'appareil."
  - q: "Mes photos sont-elles envoyées sur un serveur ?"
    r: "Non. Le décodage et la compression se font dans votre navigateur, avec des programmes servis par ce site. Aucun service de carte n'est interrogé : le lien « Voir sur la carte » ne s'ouvre que si vous cliquez dessus."
  - q: "Quelle taille et quel poids pour Leboncoin ?"
    r: "Nous n'avons pas trouvé de plafond officiel publié par le site. Le réglage Leboncoin vise donc des valeurs prudentes, 2 Mo et 1 600 pixels sur le plus grand côté, qui laissent une photo nette à l'écran."
  - q: "La photo est-elle moins belle après compression ?"
    r: "Très peu : l'outil cherche la meilleure qualité qui tient sous le poids demandé et ne réduit les dimensions qu'en dernier recours, en vous le disant. La destination « Allégé » garde la qualité 85 sans plafond."
  - q: "Et si la photo est déjà petite ?"
    r: "Elle est tout de même ré-enregistrée pour effacer la position et l'appareil, et le résultat ne dépasse jamais son poids d'origine tant que c'est possible."
mis_a_jour: 2026-10-20
sources:
  - titre: "Spécification EXIF (CIPA DC-008) : étiquettes GPS, Make, Model, Orientation"
---
## Comment faire

1. Déposez une ou plusieurs photos : glissez-les, cliquez, ou collez avec Cmd+V. HEIC de l'iPhone, JPG, PNG et WebP sont acceptés.
2. Rien d'autre à régler : le JPG est prêt tout de suite, sous 1 Mo. Choisissez « Mail », « Leboncoin » ou « Allégé » seulement si la destination l'exige ; le résultat se refait tout seul.
3. Téléchargez : un bouton pour une photo, un zip pour plusieurs.

## Ce que l'outil retire, et vous le montre

Chaque photo affiche ce qui a été retiré, et seulement ce qu'elle contenait vraiment : la position GPS (avec un lien vers une carte que vous ouvrez vous-même), le modèle de l'appareil, la date de prise de vue, le logiciel, les blocs XMP. À côté, le poids avant et après et deux vignettes pour comparer. Le fichier produit est ensuite relu par l'outil : s'il restait la moindre métadonnée, il n'est pas proposé.

## Pourquoi c'est utile

Un smartphone écrit dans chaque photo des informations invisibles : où elle a été prise, quand, avec quel appareil. Envoyer une photo de son salon à un inconnu qui répond à une annonce, c'est parfois lui donner son adresse. Les messageries retirent souvent ces informations, pas les formulaires ni le courrier électronique.

## Ce qu'il garde

- **L'orientation.** La photo est tournée dans le bon sens, pas simplement marquée « à tourner » : elle s'affiche droite partout.
- **Le nom.** `IMG_0412.HEIC` devient `IMG_0412-prete.jpg`.
- **La netteté.** La compression cherche la qualité la plus haute qui passe sous le poids visé.

## Les destinations

- **Formulaire** (par défaut) : 1 Mo au plus.
- **Mail** : 2 Mo au plus.
- **Leboncoin** : 2 Mo et 1 600 px de côté. Ce sont des valeurs prudentes, le site ne publie pas de plafond que nous ayons pu vérifier.
- **Allégé** : qualité 85, sans limite de poids, pour garder une belle photo en la débarrassant de ses métadonnées.

## Limites à connaître

Une photo de plus de 100 mégapixels est refusée. Le profil de couleur n'est pas conservé : les couleurs restent fidèles à l'écran, mais un travail de retouche professionnel demande l'original. Les photos Live ne donnent que l'image fixe. Un fichier illisible est signalé sur sa ligne sans bloquer les autres.
