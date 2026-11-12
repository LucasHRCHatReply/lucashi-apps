// Corrections éditoriales à réappliquer après la reconstruction d'une page source.
import fs from 'node:fs';
const titres = {
 pince:'Tout ce que vous copiez, retrouvé en trois touches.',
 jauge:'Arrêtez la charge à 80 %. Ou là où vous voulez.',
 penombre:'Une fenêtre dans la lumière. Le reste dans l’ombre.',
 filoir:'Secouez un fichier : une étagère apparaît.',
 autofoldericon:'Vos dossiers s’habillent tout seuls.',
 glisse:'Deux doigts sur la barre de titre : la fenêtre est rangée.',
 veillon:'Voyez ce qui ralentit votre Mac. Nettoyez-le d’un clic.',
 lueur:'Le clavier s’éclaire comme vous l’avez décidé.',
 corolle:'Glissez un fichier, appuyez sur Maj : la roue fait le reste.',
 paupiere:'Votre Mac reste éveillé. Même capot fermé.',
 releve:'Toutes vos apps à jour d’un clic. Avec un retour en arrière.',
 relais:'Votre Mac pose une question. Vous répondez de l’iPhone.',
 relief:'Votre montre Garmin, lue par câble. Sans compte.',
 tadis:'Parlez. Le texte s’écrit là où est le curseur.',
 glose:'Vos notes au bord de l’écran, jamais dans le chemin.',
 ocruroeil:'Un scan redevient un vrai document.',
 cliche:'Capturez, annotez, filmez l’écran. Au même endroit.',
 orchestrateur:'Une tâche, plusieurs sessions Claude Code. Le bon modèle pour chacune.'
};
const replacements = {
 filoir: [["Filoir — filoirs flottants pour Mac", "Filoir — une étagère temporaire pour vos fichiers"],["Une image : <b>Cliché</b> (en développement) l'annotera.","Une image : <b>Cliché</b>, disponible en préversion, peut l’annoter."],["Cliché (en développement, pas encore téléchargeable)",'<a href="../cliche/">Cliché (préversion)</a>'],["Cliché n'est pas encore publiée.","Cliché est disponible en préversion."]],
 releve: [["repère les apps en retard et les remplace toutes, sans jamais casser l'ancienne version.","repère les apps de la collection à mettre à jour. Elle conserve l’ancienne version pour permettre un retour en arrière si la nouvelle ne démarre pas."],["Si quoi que ce soit cloche, l'ancienne reste.","L’ancienne version est conservée pour revenir en arrière."],["l'ancienne version reste si quoi que ce soit échoue", "l’ancienne version est conservée pour permettre un retour en arrière"]],
 glose: [["synchro privée avec le téléphone, recherche par mots et par le sens sans envoyer vos notes nulle part", "synchronisation choisie avec le téléphone et recherche locale par mots ou par le sens"],["Une synchro privée avec le téléphone, et une recherche par mots et par le sens, sans envoyer vos notes nulle part.","La recherche par mots et par le sens se fait sur le Mac. Vous pouvez choisir de synchroniser certains projets avec votre téléphone via votre serveur."]],
 orchestrateur: [["−16 % sur une vraie facture de dix jours", "−16 % dans une simulation de sessions passées"],["Sur une vraie facture", "Simulation de sessions passées"],["Facture réelle<small>", "Estimation initiale<small>"],["v2.0 · gratuit","v2.0.3 · gratuit"],["Claude confie chaque tâche au modèle le moins cher qui la réussit : Haiku pour lire et extraire, Sonnet pour coder et vérifier, Opus seulement pour diriger. Chaque lancement s’annonce, avec la raison. Mesuré sur 206 essais et 786 sessions réelles.","Ce skill pour Claude Code aide à répartir une tâche entre plusieurs sessions et à choisir un modèle adapté. Par exemple, une session peut explorer le code pendant qu’une autre prépare les tests. Il annonce les lancements et demande des preuves avant de conclure."],["sur dix jours de vraie facture, rejouée avec deux règles","sur dix jours de sessions passées, simulées avec deux règles"],["et il se retrouve sur une vraie facture, plus bas.","; une simulation de sessions passées figure plus bas."],["Sources : banc du 20/10/2026", "Ces estimations ne garantissent aucune économie sur un abonnement. Sources : banc du 20/10/2026"]]
};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(titres);
for (const id of ids) {
 if (!titres[id]) continue;
 const path = `public/${id}/index.html`;
 if (!fs.existsSync(path)) throw new Error(`Page absente : ${path}`);
 let html = fs.readFileSync(path,'utf8');
 const feuille = '<link rel="stylesheet" href="../assets/presentation.css">';
 if (!html.includes(feuille)) html = html.replace('</head>', feuille + '\n</head>');
 if (!/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html)) throw new Error(`Titre absent : ${id}`);
 html = html.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i, `$1${titres[id]}$2`);
 for (const [avant,apres] of replacements[id] ?? []) if (!html.includes(apres)) html = html.split(avant).join(apres);
 fs.writeFileSync(path,html);
 console.log(`${id} : présentation mise à jour`);
}
