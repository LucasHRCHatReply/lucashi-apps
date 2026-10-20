---
id: fuseaux
lang: fr
slug: fuseaux-horaires
titre: "Fuseaux horaires et décalage — convertisseur gratuit"
h1: "Convertir l’heure entre plusieurs villes"
description: "Quelle heure à Tokyo quand il est 14 h à Paris ? Ajoutez des villes, faites glisser la réglette et partagez le créneau. Heure d’été incluse, sans envoi."
nom_court: "Fuseaux horaires"
phrase: "14 h à Paris, et ailleurs ? Trouvez le bon créneau."
categorie: pratique
icone: clock
mots_cles: [fuseau horaire, décalage horaire, convertisseur d'heure, heure à New York, heure à Tokyo, réunion internationale, comparer les heures]
faq:
  - q: "Quel est le décalage horaire entre Paris et New York ?"
    r: "Six heures la plupart de l’année : quand il est 14 h à Paris, il est 8 h à New York. L’écart tombe à cinq heures pendant quelques semaines, parce que les États-Unis et l’Europe ne changent pas d’heure le même jour."
  - q: "Pourquoi l’écart avec New York change-t-il quelques semaines par an ?"
    r: "Les États-Unis passent à l’heure d’été le deuxième dimanche de mars et reviennent à l’heure d’hiver le premier dimanche de novembre ; l’Union européenne le fait le dernier dimanche de mars et le dernier dimanche d’octobre. Entre ces dates, l’écart est de cinq heures au lieu de six."
  - q: "Comment trouver une heure de réunion commune entre plusieurs pays ?"
    r: "Ajoutez toutes les villes, puis faites glisser la réglette : les heures de bureau (9 h à 18 h) sont en vert sur chaque ligne. Le bon créneau est la colonne où toutes les lignes sont vertes ; sinon, celle où le moins de monde est en pleine nuit."
  - q: "L’heure d’été est-elle prise en compte ?"
    r: "Oui. Le calcul utilise la base de fuseaux de votre navigateur (la base IANA), qui connaît les dates de changement d’heure de chaque région, y compris les pays qui n’en ont pas, comme le Japon, la Chine ou l’Inde."
  - q: "Que se passe-t-il si l’heure choisie n’existe pas, ou existe deux fois ?"
    r: "Le jour du passage à l’heure d’été, 2 h 30 n’existe pas à Paris : l’outil la décale à 3 h 30 et vous le dit. Le jour du retour à l’heure d’hiver, 2 h 30 existe deux fois : la première occurrence est retenue, et un avis le précise."
  - q: "Mes villes et mes heures sont-elles envoyées quelque part ?"
    r: "Non. Tout est calculé dans votre navigateur. Le lien à partager contient les villes et l’heure après le signe #, une partie de l’adresse que le navigateur ne transmet jamais au site."
sources:
  - titre: "Base de données des fuseaux horaires IANA"
    url: "https://www.iana.org/time-zones"
  - titre: "GeoNames, villes de plus de 15 000 habitants (licence CC-BY 4.0)"
    url: "https://www.geonames.org/"
  - titre: "Directive 2000/84/CE : dispositions relatives à l’heure d’été"
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=celex:32000L0084"
mis_a_jour: 2026-10-20
calcul: true
---
Organiser un appel avec un collègue à Montréal, une équipe à Singapour et un client à Paris suppose de répondre à une question simple : à quelle heure, chez chacun ? Cet outil affiche toutes les villes côte à côte et les fait avancer ensemble.

## Comment faire

1. **Ajoutez des villes.** Votre ville est déjà là, avec deux autres. Tapez un nom en français ou en anglais (Londres, Tokyo, Brésil) et validez avec Entrée.
2. **Fixez l’heure.** Modifiez l’heure d’une ligne, ou la date en haut : toutes les autres lignes suivent, avec le jour (+1 j, −1 j) quand il change.
3. **Cherchez le créneau.** Faites glisser la réglette (ou utilisez les flèches du clavier) : le trait bleu traverse les 24 heures de chaque ville.
4. **Partagez.** « Copier lien » garde les villes et l’heure dans l’adresse ; « Ajouter agenda » produit un fichier .ics d’une heure que Google Agenda, Outlook et Apple Calendrier ouvrent.

## Lire la réglette

Chaque ligne montre 24 cases alignées sur les mêmes instants. Le vert plein marque les heures de bureau (9 h à 18 h, heure locale), le vert pâle la soirée et le début de matinée, le gris la nuit. Les lignes ne commencent donc pas à la même heure : c’est normal, elles sont décalées comme les villes le sont.

## Pourquoi le décalage change

Un fuseau horaire n’est pas un chiffre fixe. Paris est à UTC+1 l’hiver et UTC+2 l’été ; New York à UTC−5 puis UTC−4. Comme les deux régions ne changent pas d’heure le même dimanche, l’écart de six heures devient cinq heures pendant quelques semaines au printemps et à l’automne. Le Japon, la Chine et l’Inde ne changent jamais d’heure. L’hémisphère sud fait l’inverse : Sydney avance ses horloges début octobre. Quelques régions ont un décalage en demi-heure (l’Inde est à UTC+5:30) ou en trois quarts d’heure (le Népal, UTC+5:45) : la réglette l’affiche.

Pour éviter les erreurs, indiquez toujours la ville avec l’heure dans vos invitations (« 14 h, heure de Paris ») plutôt qu’un décalage seul.

## Ce que l’outil ne fait pas

Il ne connaît pas les jours fériés ni les week-ends locaux : vérifiez qu’un créneau vert tombe bien un jour ouvré dans chaque pays. La liste couvre environ 400 villes (les capitales et les plus grandes villes de chaque pays), tirée de GeoNames ; si votre ville manque, choisissez-en une du même fuseau.
