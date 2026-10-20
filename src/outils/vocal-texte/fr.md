---
id: vocal-texte
lang: fr
slug: vocal-en-texte
titre: "Vocal en texte — transcrire WhatsApp, gratuit, sans envoi"
h1: "Transformer un vocal en texte"
description: "Déposez un vocal WhatsApp, un mémo iPhone ou une vidéo : le texte sort tout seul, langue détectée. Transcription dans votre navigateur, rien n'est envoyé."
nom_court: "Vocal en texte"
phrase: "Déposez un vocal, lisez-le : le texte sort tout seul."
categorie: pratique
icone: doc.text
en_avant: true
mots_cles: [vocal en texte, transcrire vocal whatsapp, mémo vocal en texte, audio en texte gratuit, transcription audio, convertir opus en texte]
faq:
  - q: "Comment transcrire un vocal WhatsApp en texte ?"
    r: "Enregistrez le vocal depuis WhatsApp (Partager, puis Enregistrer dans Fichiers sur iPhone ; Partager vers Fichiers sur Android), puis déposez le fichier .opus ou .ogg sur cette page. Le texte s'affiche à la fin de la transcription, avec un bouton Copier. Il n'y a ni compte ni installation."
  - q: "Mon vocal est-il envoyé sur un serveur ?"
    r: "Non. Le modèle de reconnaissance (Whisper, publié par OpenAI sous licence MIT) est téléchargé une fois depuis ce site, puis tourne dans votre navigateur. Le son reste sur votre appareil : vous pouvez couper le Wi-Fi une fois le modèle chargé."
  - q: "Pourquoi le premier vocal est-il plus long à démarrer ?"
    r: "Le modèle pèse environ 101 Mo avec son moteur de calcul. Il est chargé une seule fois, puis conservé par votre navigateur : les vocaux suivants démarrent sans nouveau téléchargement. Sur une connexion mobile, préférez le Wi-Fi pour le premier usage."
  - q: "Quels fichiers et quelle durée sont acceptés ?"
    r: "Les vocaux WhatsApp (.opus, .ogg), les mémos vocaux de l'iPhone (.m4a), les .mp3, .wav, .aac, .flac, et les vidéos (.mp4, .mov, .webm) dont l'outil garde seulement le son. Jusqu'à 30 minutes par fichier. Au-delà, découpez le vocal en deux."
  - q: "La transcription est-elle exacte ?"
    r: "Elle est bonne sur une voix claire et proche du micro, moins sur un bruit de fond, plusieurs voix qui se coupent ou des noms propres rares. Relisez toujours avant d'envoyer ou de citer : l'outil utilise un modèle compact, choisi pour tenir dans un navigateur."
  - q: "Quelles langues sont reconnues ?"
    r: "La langue est détectée toute seule parmi une centaine, dont le français, l'anglais, l'espagnol, l'allemand, l'italien, le portugais et l'arabe. Elle est affichée sous le texte. Un vocal qui mélange deux langues est transcrit dans la langue dominante du début."
  - q: "À quoi sert le fichier .srt ?"
    r: "C'est un fichier de sous-titres : chaque phrase est accompagnée de son heure de début et de fin. Il est utile pour sous-titrer une vidéo ou retrouver à quel moment une phrase a été dite. Il se trouve sous « Autres formats »."
mis_a_jour: 2026-10-20
sources:
  - titre: "Whisper, modèle de reconnaissance vocale (OpenAI, licence MIT)"
    url: "https://github.com/openai/whisper"
  - titre: "Transformers.js, exécution dans le navigateur (Hugging Face)"
    url: "https://github.com/huggingface/transformers.js"
---

Un vocal WhatsApp de deux minutes, dans le métro, sans casque : impossible de l'écouter. Déposez-le ici, et il se lit. L'outil transforme la voix en texte, devine seul la langue, et propose de copier le résultat ou de le télécharger.

## Comment ça marche

1. **Déposez le fichier** : un vocal WhatsApp (.opus), un mémo vocal de l'iPhone (.m4a), un .mp3, un .wav, ou même une vidéo dont l'outil ne garde que le son.
2. **Attendez la fin** : une barre indique l'avancement réel. Le premier usage charge le modèle (environ 101 Mo), ensuite il est gardé sur votre appareil. Un vocal d'une minute se transcrit en général en moins d'une minute.
3. **Copiez ou téléchargez** : le texte s'affiche avec la langue détectée et la durée. Un bouton le copie, un autre l'enregistre en .txt. Sous « Autres formats », un fichier .srt donne les sous-titres avec l'heure de chaque phrase.

## Ce qui reste chez vous

La transcription se fait dans votre navigateur, avec le modèle Whisper d'OpenAI. Le son n'est envoyé nulle part : ni à ce site, ni à un service de transcription. C'est ce qui rend l'outil utilisable pour un vocal personnel, un message de famille ou une note de travail. Une fois le modèle chargé, vous pouvez même couper la connexion.

## Pour de meilleurs résultats

- Une voix proche du micro, sans musique, donne le texte le plus juste.
- Les noms propres rares, les sigles et les chiffres demandent une relecture.
- Un vocal de plus de 30 minutes doit être coupé en deux : l'outil le dit avant de commencer.
- Sur téléphone, gardez la page ouverte pendant la transcription ; l'écran qui se verrouille peut l'interrompre.

## Pourquoi un modèle compact

Le modèle utilisé est la version « base » de Whisper, réduite (quantifiée) pour tenir dans un navigateur : environ 80 Mo contre plus d'un gigaoctet pour les grands modèles. Il fait un peu plus d'erreurs qu'un service en ligne, mais il n'a besoin ni de compte, ni de serveur, ni d'envoyer votre voix.

## Formats lus

Les vocaux WhatsApp au format Opus sont décodés par l'outil lui-même, y compris sur Safari qui ne sait pas lire l'Opus en .ogg. Les autres formats (.m4a, .mp3, .wav, vidéos) sont lus par votre navigateur : si un fichier est refusé, essayez la version d'origine plutôt qu'une copie recompressée.
