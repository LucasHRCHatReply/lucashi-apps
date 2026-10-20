---
id: arnaque
lang: fr
slug: arnaque-ou-pas
titre: "Arnaque ou pas ? Vérifiez un SMS, un mail, un lien"
h1: "Ce SMS ou ce mail est-il une arnaque ?"
description: "Collez un SMS, un mail ou un lien suspect : le vrai site derrière le lien, son âge et les imitations de marque sont vérifiés, avec les raisons. Gratuit."
nom_court: "Arnaque ou pas ?"
phrase: "Collez un SMS ou un lien suspect : verdict et raisons, en quelques secondes."
categorie: pratique
icone: envelope
serveur: true
en_avant: true
mots_cles: [arnaque sms, faux sms colissimo, vérifier un lien, est-ce une arnaque, phishing vérifier lien, faux mail ameli, faux sms impots, lien suspect]
faq:
  - q: "Comment savoir si un SMS de colis ou d'impôts est une arnaque ?"
    r: "Regardez d'abord le nom de domaine du lien, c'est-à-dire ce qui précède le premier « / » : il doit être exactement celui de l'organisme (laposte.fr, ameli.fr, impots.gouv.fr). Collez le message ici : l'outil lit ce nom, suit le lien jusqu'à sa destination réelle et dit si le site imite une marque, s'il est très récent ou s'il figure sur une liste d'hameçonnage."
  - q: "L'outil peut-il affirmer qu'un message est sûr ?"
    r: "Non, et il ne le dit jamais. « Rien de suspect trouvé » signifie que les contrôles n'ont rien relevé ; une arnaque très récente peut ne figurer nulle part. Dans le doute, ouvrez l'application ou tapez vous-même l'adresse du site de l'organisme."
  - q: "Mon message est-il conservé ou transmis à quelqu'un ?"
    r: "Le texte part vers notre serveur pour qu'il puisse suivre les liens, puis il est oublié : rien n'est écrit sur disque, ni le texte, ni votre adresse IP, qui sert seulement à limiter le nombre de demandes à la minute, en mémoire. Si le message ne contient aucun lien, l'analyse reste sur votre appareil."
  - q: "Que faire si le message est une arnaque ?"
    r: "Ne cliquez pas, ne répondez pas, ne donnez aucun code. Transférez le SMS au 33700 ou le mail à signal-spam.fr, et signalez le site sur internet-signalement.gouv.fr. Si vous avez saisi un numéro de carte, faites opposition tout de suite auprès de votre banque. En cas de perte d'argent, déposez plainte."
  - q: "Pourquoi le serveur suit-il le lien à ma place ?"
    r: "Un faux site se cache souvent derrière un lien raccourci ou une série de redirections. Le serveur les suit sans exécuter le moindre programme du site, pour voir où l'on atterrit sans rien risquer pour votre téléphone. Il refuse d'ailleurs toute adresse interne ou réservée."
  - q: "D'où viennent les listes et l'âge du domaine ?"
    r: "L'âge vient des registres officiels des noms de domaine (protocole RDAP, via l'annuaire de l'IANA, et celui de l'AFNIC pour les .fr). Les listes sont celles d'OpenPhish (flux communautaire, usage non commercial) et d'URLhaus (abuse.ch), copiées toutes les douze heures. Leur date de copie s'affiche sous chaque résultat."
sources:
  - titre: "OpenPhish : flux communautaire (usage non commercial)"
    url: "https://openphish.com/phishing_feeds.html"
  - titre: "URLhaus, projet abuse.ch"
    url: "https://urlhaus.abuse.ch/"
  - titre: "RDAP : annuaire IANA des serveurs par extension"
    url: "https://data.iana.org/rdap/dns.json"
  - titre: "Signal Spam, pour signaler un mail"
    url: "https://www.signal-spam.fr/"
  - titre: "Internet-signalement.gouv.fr (PHAROS)"
    url: "https://www.internet-signalement.gouv.fr/"
mis_a_jour: 2026-10-20
---
Un SMS annonce un colis bloqué, un mail promet un remboursement des impôts, un message prétend venir de votre banque : le lien est le plus souvent le seul indice fiable. Cet outil le lit à votre place. Collez le message tel quel : le verdict arrive seul, en une phrase, avec les raisons que vous pouvez vérifier vous-même.

## Comment faire

1. Copiez le SMS, le mail ou simplement le lien, puis collez-le dans la zone ci-dessus. L'analyse part au collage, sans bouton à presser.
2. Lisez le verdict : **Arnaque très probable**, **Douteux** ou **Rien de suspect trouvé**. L'outil ne dit jamais « sûr à 100 % ».
3. Lisez les raisons, de la plus grave à la plus légère, et le chemin du lien : chaque site traversé, de ce que vous lisez à ce que vous atteignez.

## Ce qui est vérifié

- **Les liens du message**, même sans « http » (un nom de site collé au texte) ou raccourcis (`bit.ly`).
- **Le vrai site derrière le lien.** Le serveur suit les redirections (HTTP, balise de rafraîchissement, redirection simple écrite dans la page) jusqu'à huit sauts, sans exécuter de programme du site.
- **L'imitation d'une marque.** Le domaine trouvé est comparé au domaine officiel de La Poste et Colissimo, Chronopost, Ameli, des impôts, de l'ANTAI (amendes), de la CAF, de France Travail, de plusieurs banques, de Netflix, Amazon, Vinted, Leboncoin et des opérateurs. Sont repérés le nom de la marque dans le début de l'adresse, la faute de frappe (`l4poste.fr`), la lettre déguisée (un « а » cyrillique à la place du « a »), le même nom avec une autre extension et les caractères spéciaux (`xn--`).
- **L'âge du domaine**, lu chez le registre officiel : « créé il y a 3 jours » est un signe très fréquent des faux sites, « créé en 1996 » est rassurant.
- **Les listes publiques** d'hameçonnage et de sites malveillants, copiées toutes les douze heures.
- **Le ton du message**, en complément seulement : urgence, petit montant à payer, colis en attente, numéro surtaxé, demande de code. Ces indices ne suffisent jamais à conclure à une arnaque.

## Un exemple de bout en bout

Le message « Colissimo : votre colis est en attente, réglez 1,99 € sous 24 h » avec un lien dont l'adresse commence par colissimo.fr mais finit par `suivi-colis.top` donne : **Arnaque très probable**. Raison principale : le nom Colissimo apparaît au début de l'adresse, mais le vrai site est `suivi-colis.top`. Viennent ensuite l'âge du domaine et les indices du texte (urgence, petit montant, colis en attente). Avec un lien qui mène à `laposte.fr`, le résultat est **Rien de suspect trouvé** : le lien mène à un site officiel de La Poste, domaine créé en 1996.

## Ce que l'outil ne fait pas

Il ne lit pas le contenu des pages (ni mots de passe demandés, ni formulaires) et n'exécute aucun programme du site : un faux site qui n'affiche son piège qu'après un script reste visible par son adresse, pas par sa page. Il ne remplace pas la prudence : un site tout neuf sans imitation évidente peut sortir en « Douteux » ou en « Rien de suspect trouvé ».

## Vie privée

Le texte est envoyé à notre serveur uniquement pour suivre les liens, puis oublié : il n'est écrit ni dans un fichier, ni dans un journal. L'adresse IP sert à limiter à vingt analyses par minute, en mémoire, sans trace. Un message sans lien n'est même pas envoyé.

## Que faire d'une arnaque

Ne cliquez pas, ne répondez pas. Faites suivre le SMS au 33700, le mail à signal-spam.fr, et signalez le site sur internet-signalement.gouv.fr. Si vous avez donné un numéro de carte ou un code, appelez votre banque sans attendre.
