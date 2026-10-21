---
id: video-legere
lang: fr
slug: video-legere
titre: "Vidéo légère pour WhatsApp et mail — gratuit"
h1: "Rendre une vidéo assez légère pour WhatsApp"
description: "Déposez une vidéo trop lourde (iPhone, MP4, WebM) : un MP4 sous 16 Mo pour WhatsApp ou 25 Mo pour le mail sort tout seul, sans réglage ni envoi."
nom_court: "Vidéo légère"
phrase: "Une vidéo trop lourde devient un MP4 prêt pour WhatsApp ou le mail."
categorie: images
icone: arrow.down.right.and.arrow.up.left
en_avant: true
mots_cles: [alléger une vidéo, réduire poids vidéo, compresser vidéo whatsapp, vidéo trop lourde mail, compresser mov iphone, convertir hevc en mp4]
faq:
  - q: "Quelle est la taille maximale d'une vidéo sur WhatsApp ?"
    r: "WhatsApp accepte 16 Mo environ pour une vidéo envoyée en message. Au-delà, l'application la recompresse très fort ou refuse l'envoi. L'outil vise 95 % de 16 Mo pour garder une marge, et vérifie le poids du fichier produit : s'il dépasse, il refait une passe plus légère."
  - q: "Combien de temps dure le calcul ?"
    r: "Avant de commencer, l'outil affiche une estimation. Sur un Mac récent, une vidéo de 70 secondes en 1080p (99 Mo) est devenue un MP4 de 15 Mo en 38 secondes. Le navigateur utilise l'encodeur matériel de l'appareil quand il existe ; sinon une méthode de secours, plus lente, prend le relais et le dit."
  - q: "Ma vidéo d'iPhone en HEVC est-elle prise en charge ?"
    r: "Oui. Les fichiers .MOV de l'iPhone en HEVC (H.265) sont lus par le navigateur quand il sait les décoder, sinon par la méthode de secours. Le résultat est toujours du MP4 H.264 et son AAC, lisible partout, y compris sur un vieux téléphone ou un PC."
  - q: "Quelle qualité d'image obtient-on ?"
    r: "L'outil calcule le débit à partir de la durée et du poids voulu. Une vidéo courte garde sa définition d'origine ; une vidéo longue est ramenée à 720p, puis 480p ou 360p si le poids l'exige. Plus la vidéo est longue, plus l'image est réduite : c'est le prix de la limite de poids."
  - q: "Ma vidéo est-elle envoyée sur un serveur ?"
    r: "Non. Tout se passe dans votre navigateur, sur votre appareil. Le seul fichier téléchargé depuis ce site est le moteur de secours (environ 32 Mo), et seulement si votre navigateur ne sait pas faire le travail seul."
  - q: "Comment ne garder que le son d'une vidéo ?"
    r: "Ouvrez « Options » et choisissez « Son seul » : l'outil extrait la piste audio en .m4a (AAC, 128 kb/s), sans l'image. Un fichier audio d'une heure pèse environ 55 Mo."
mis_a_jour: 2026-10-21
sources:
  - titre: "mediabunny, démuxeur et muxeur MP4 sur WebCodecs"
    url: "https://github.com/Vanilagy/mediabunny"
  - titre: "WebCodecs, spécification du W3C"
    url: "https://www.w3.org/TR/webcodecs/"
  - titre: "ffmpeg.wasm, FFmpeg compilé en WebAssembly"
    url: "https://github.com/ffmpegwasm/ffmpeg.wasm"
---
Une vidéo de vacances de deux minutes en 4K pèse facilement 600 Mo : impossible à envoyer sur WhatsApp, refusée par la plupart des messageries mail. Cet outil la transforme en un MP4 assez léger, **sans rien régler** : on dépose la vidéo, le calcul part tout seul, la vidéo allégée s'affiche dans la page et se télécharge.

## Ce qui se passe quand on dépose la vidéo

1. L'outil lit la **durée** et la définition de la vidéo, puis affiche tout de suite le poids estimé du résultat et le temps que cela prendra.
2. Il calcule le **débit** (la quantité de données par seconde de vidéo) qui fait tenir le fichier sous la limite : 16 Mo pour WhatsApp, 25 Mo pour le mail. La formule est simple : poids visé × 8 × 0,95, divisé par la durée, moins le débit du son.
3. Si ce débit est trop bas pour une image nette en pleine définition, la vidéo est réduite à **720p**, puis 480p ou 360p.
4. La vidéo est ré-encodée en **MP4 H.264 avec son AAC**, le format lisible partout.
5. Le poids final est **mesuré**. Si le fichier dépasse la limite, une nouvelle passe plus légère est lancée, jusqu'à trois fois.

Un exemple suivi de bout en bout : une vidéo iPhone de 70 secondes en 1080p, 99 Mo. Pour WhatsApp, le débit disponible est d'environ 1,6 Mb/s : l'image passe en 720p, le fichier final fait 15,1 Mo. Pour le mail (25 Mo), il passe en 720p à un débit plus généreux et pèse 23 Mo.

## Deux méthodes, la plus rapide d'abord

Votre navigateur sait en général lire et écrire de la vidéo lui-même grâce à **WebCodecs** : c'est rapide, car il s'appuie sur la puce vidéo de l'appareil. Si ce n'est pas possible (navigateur ancien, format que le navigateur ne décode pas), l'outil charge un moteur de secours, **ffmpeg compilé en WebAssembly**. Il est plus lent, environ 2 fois plus que la durée de la vidéo en 1080p, mais il lit presque tout. L'écran vous dit laquelle des deux méthodes a servi.

## Options (repliées)

- **Destination** : WhatsApp (16 Mo) ou Mail (25 Mo).
- **Contenu** : « Son seul » extrait la piste audio en .m4a.

Changer une option relance le calcul sur la même vidéo.

## Bon à savoir

- Le **temps** annoncé est un ordre de grandeur : il dépend de votre appareil et de la vidéo.
- Une vidéo très longue ne peut pas tenir en 16 Mo avec une belle image : l'outil le dit et propose de la couper ou de choisir le mail.
- Vous pouvez **annuler** à tout moment ; la progression affichée est le nombre réel d'images déjà encodées.
- Les vidéos ne quittent jamais votre appareil.
