// Logique pure de l'outil « lettre de résiliation ou de rétractation » : aucun DOM, testable seule.
// Chaque cas = un destinataire, un objet, des mentions, une pièce à joindre, un mode d'envoi, un délai — et les articles de loi qui le fondent.
// Droit relu sur Légifrance le 20/10/2026 (versions en vigueur à cette date). Ce n'est pas un conseil juridique.
import { ajouterJours, ajouterMois, dateCourante, dateLongue, delaiRetractation, ecartJours, estDateValide, veilleOuvrable, type DateISO } from './dates';

export const DATE_VERIFICATION = '2026-10-20';

// ───────────────────────── Articles ─────────────────────────

export interface Article {
  ref: string;       // « L221-18 »
  code: string;      // « Code de la consommation »
  resume: string;    // ce que dit l'article, en une ligne
  url: string;       // page Légifrance
}

const LEGI = 'https://www.legifrance.gouv.fr/codes';
const art = (ref: string, code: string, resume: string, id: string): Article => ({ ref, code, resume, url: `${LEGI}/article_lc/${id}` });
const artSection = (ref: string, code: string, resume: string, texte: string, section: string): Article => ({ ref, code, resume, url: `${LEGI}/section_lc/${texte}/${section}/` });

const CONSO = 'Code de la consommation';
const ASSU = 'Code des assurances';
const MUTU = 'Code de la mutualité';
const CPC = 'Code de procédure civile';

export const ARTICLES: Record<string, Article> = {
  'L221-18': art('L221-18', CONSO, 'Quatorze jours pour se rétracter d’un contrat conclu à distance ou hors établissement, à compter de la conclusion (service) ou de la réception (bien).', 'LEGIARTI000032226842'),
  'L221-19': art('L221-19', CONSO, 'Calcul du délai : le jour de départ n’est pas compté ; si le dernier jour est un samedi, un dimanche ou un jour férié, le délai est prorogé au premier jour ouvrable.', 'LEGIARTI000032226840'),
  'L221-20': art('L221-20', CONSO, 'Si le vendeur n’a pas informé du droit de rétractation, le délai est prolongé de douze mois.', 'LEGIARTI000044563199'),
  'L221-21': art('L221-21', CONSO, 'Se rétracter : formulaire ou déclaration dénuée d’ambiguïté, envoyée avant la fin du délai ; fonctionnalité gratuite en ligne pour les contrats conclus sur une interface en ligne.', 'LEGIARTI000053310520'),
  'L221-22': art('L221-22', CONSO, 'La preuve de l’exercice de la rétractation pèse sur le consommateur.', 'LEGIARTI000032226832'),
  'L221-23': art('L221-23', CONSO, 'Le bien est renvoyé au plus tard dans les quatorze jours suivant la décision de se rétracter.', 'LEGIARTI000044563188'),
  'L221-24': art('L221-24', CONSO, 'Remboursement de la totalité des sommes versées dans les quatorze jours suivant l’information de la rétractation.', 'LEGIARTI000032226828'),
  'L221-25': art('L221-25', CONSO, 'Service commencé avant la fin du délai à la demande du client : seule la part déjà fournie est due.', 'LEGIARTI000044563179'),
  'L221-28': art('L221-28', CONSO, 'Contrats sans droit de rétractation : service pleinement exécuté, bien personnalisé, bien périssable ou descellé pour raison d’hygiène, etc.', 'LEGIARTI000044563170'),
  'L215-1': art('L215-1', CONSO, 'Reconduction tacite : le professionnel doit prévenir par écrit entre trois mois et un mois avant la date limite ; à défaut, résiliation gratuite à tout moment dès la reconduction.', 'LEGIARTI000046194176'),
  'L215-1-1': art('L215-1-1', CONSO, 'Résiliation en ligne : si l’on peut souscrire en ligne, le professionnel offre une fonctionnalité gratuite de résiliation et confirme la réception et la date de fin.', 'LEGIARTI000046190107'),
  'L224-33': art('L224-33', CONSO, 'Télécoms : si le fournisseur modifie le contrat, résiliation sans frais dans les quatre mois suivant la notification.', 'LEGIARTI000043545735'),
  'L224-35': artSection('L224-35', CONSO, 'Télécoms : les sommes versées d’avance sont restituées dans les dix jours suivant le paiement de la dernière facture.', 'LEGITEXT000006069565', 'LEGISCTA000032221543'),
  'L224-39': art('L224-39', CONSO, 'Télécoms : préavis de résiliation de dix jours au plus à compter de la réception de la demande.', 'LEGIARTI000032226641'),
  'L224-40': art('L224-40', CONSO, 'Télécoms : contrat prolongé automatiquement, résiliation à tout moment dès la prolongation, préavis de dix jours au plus.', 'LEGIARTI000043545721'),
  'L224-14': art('L224-14', CONSO, 'Énergie : changement de fournisseur en 21 jours au plus ; sinon résiliation à la date souhaitée, au plus tard trente jours après la notification.', 'LEGIARTI000043214814'),
  'L224-15': artSection('L224-15', CONSO, 'Énergie : facture de clôture sous quatre semaines, trop-perçu remboursé sous deux semaines, aucun frais au seul motif du changement de fournisseur.', 'LEGITEXT000006069565', 'LEGISCTA000032221483'),
  'L113-12': art('L113-12', ASSU, 'Après un an, résiliation à l’échéance en notifiant l’assureur au moins deux mois avant ; le délai court à partir du cachet de la poste.', 'LEGIARTI000054141689'),
  'L113-14': art('L113-14', ASSU, 'Façons de notifier la résiliation (lettre ou autre support durable, même mode que la souscription à distance) ; l’assureur confirme la réception ; résiliation en ligne gratuite.', 'LEGIARTI000046194186'),
  'L113-15-1': art('L113-15-1', ASSU, 'Si l’avis d’échéance ne rappelle pas la date limite de résiliation, résiliation sans pénalité à tout moment dès la reconduction, effet le lendemain de l’envoi.', 'LEGIARTI000038775145'),
  'L113-15-2': art('L113-15-2', ASSU, 'Après un an de contrat (auto, habitation, santé…), résiliation à tout moment, sans frais, effet un mois après réception ; solde de prime remboursé sous trente jours.', 'LEGIARTI000038775140'),
  'L113-16': art('L113-16', ASSU, 'Résiliation dans les trois mois d’un changement de domicile, de situation familiale ou professionnelle, ou de la retraite ; effet un mois après réception.', 'LEGIARTI000006792160'),
  'L221-10-2': art('L221-10-2', MUTU, 'Mutuelle : après un an d’adhésion, dénonciation à tout moment sans frais, effet un mois après réception ; le nouvel organisme fait les démarches.', 'LEGIARTI000038767779'),
  'L221-10-3': art('L221-10-3', MUTU, 'Mutuelle : façons de notifier la dénonciation ; confirmation écrite de la réception.', 'LEGIARTI000046194182'),
  '641-642': art('641 et 642', CPC, 'Calcul des délais : le jour de départ ne compte pas ; un délai qui expire un samedi, un dimanche ou un jour férié est prorogé au premier jour ouvrable.', 'LEGIARTI000006411003'),
};

// ───────────────────────── Cas ─────────────────────────

export type CasId = 'retractation' | 'internet' | 'mobile' | 'auto' | 'habitation' | 'mutuelle' | 'salle' | 'abonnement' | 'presse' | 'energie';

export interface Option { id: string; libelle: string; aide: string }
export interface CasDef { id: CasId; libelle: string; aide: string; variantes: Option[] }

const V_ASSURANCE: Option[] = [
  { id: 'un-an', libelle: 'Après un an', aide: 'Contrat souscrit depuis plus d’un an : résiliation à tout moment, effet un mois après réception (art. L113-15-2).' },
  { id: 'echeance', libelle: 'À l’échéance', aide: 'Résiliation à la date anniversaire, en prévenant au moins deux mois avant (art. L113-12).' },
  { id: 'sans-avis', libelle: 'Avis incomplet', aide: 'L’avis d’échéance ne rappelait pas la date limite de résiliation : résiliation libre dès la reconduction (art. L113-15-1).' },
  { id: 'evenement', libelle: 'Événement', aide: 'Déménagement, changement de situation familiale ou professionnelle, retraite : trois mois pour résilier (art. L113-16).' },
];
const V_SERVICE: Option[] = [
  { id: 'echeance', libelle: 'À l’échéance', aide: 'Fin de la période d’engagement, dans le respect du préavis prévu par le contrat.' },
  { id: 'reconduction', libelle: 'Sans rappel', aide: 'Le professionnel ne vous a pas prévenu de la reconduction entre trois mois et un mois avant : résiliation gratuite à tout moment (art. L215-1).' },
];
const V_TELECOM: Option[] = [
  { id: 'fin', libelle: 'Fin d’engagement', aide: 'Hors engagement ou engagement terminé : préavis de dix jours au plus (art. L224-39).' },
  { id: 'reconduction', libelle: 'Prolongé', aide: 'Contrat à durée déterminée prolongé automatiquement : résiliation à tout moment (art. L224-40).' },
  { id: 'modification', libelle: 'Tarif modifié', aide: 'L’opérateur a modifié les conditions du contrat : quatre mois pour résilier sans frais (art. L224-33).' },
];

export const CAS: CasDef[] = [
  { id: 'retractation', libelle: 'Rétractation d’achat', aide: 'Achat en ligne, par téléphone ou à domicile : quatorze jours pour changer d’avis (art. L221-18).',
    variantes: [
      { id: 'bien', libelle: 'Un bien', aide: 'Un objet livré : le délai court à partir de la réception.' },
      { id: 'service', libelle: 'Un service', aide: 'Un abonnement ou une prestation : le délai court à partir de la conclusion du contrat.' },
    ] },
  { id: 'internet', libelle: 'Internet, box', aide: 'Abonnement fixe : fibre, ADSL, box.', variantes: V_TELECOM },
  { id: 'mobile', libelle: 'Forfait mobile', aide: 'Abonnement téléphonique mobile.', variantes: V_TELECOM },
  { id: 'auto', libelle: 'Assurance auto', aide: 'Loi Hamon puis loi du 14/07/2019 : résiliation libre après un an.', variantes: V_ASSURANCE },
  { id: 'habitation', libelle: 'Assurance logement', aide: 'Multirisque habitation, assurance du locataire.', variantes: V_ASSURANCE },
  { id: 'mutuelle', libelle: 'Mutuelle santé', aide: 'Complémentaire santé individuelle : résiliation infra-annuelle après un an (loi du 14/07/2019).',
    variantes: [
      { id: 'mutuelle', libelle: 'Mutuelle', aide: 'Organisme régi par le Code de la mutualité (art. L221-10-2).' },
      { id: 'assureur', libelle: 'Assureur', aide: 'Compagnie d’assurance régie par le Code des assurances (art. L113-15-2).' },
    ] },
  { id: 'salle', libelle: 'Salle de sport', aide: 'Abonnement de salle de sport ou de club.', variantes: V_SERVICE },
  { id: 'abonnement', libelle: 'Abonnement en ligne', aide: 'Streaming, application, box repas, logiciel : tout abonnement souscrit sur internet.', variantes: V_SERVICE },
  { id: 'presse', libelle: 'Presse, magazine', aide: 'Abonnement à un journal ou à un magazine.', variantes: V_SERVICE },
  { id: 'energie', libelle: 'Énergie', aide: 'Fourniture d’électricité ou de gaz, sans changer de fournisseur (déménagement, fin de contrat).',
    variantes: [
      { id: 'electricite', libelle: 'Électricité', aide: 'Contrat de fourniture d’électricité.' },
      { id: 'gaz', libelle: 'Gaz', aide: 'Contrat de fourniture de gaz.' },
    ] },
];

export const casDef = (id: string): CasDef => CAS.find((c) => c.id === id) ?? CAS[0];
export function varianteValide(cas: string, variante: string): string {
  const c = casDef(cas);
  return c.variantes.some((v) => v.id === variante) ? variante : c.variantes[0].id;
}

// ───────────────────────── Champs ─────────────────────────

export interface Donnees {
  cas: string;
  variante: string;
  nom: string;
  adresse: string;
  ville: string;          // code postal et ville de l'expéditeur
  lieu: string;           // ville où la lettre est écrite
  organisme: string;
  adresseOrganisme: string;
  reference: string;
  dateEnvoi: DateISO;     // date de la lettre
  dateRef: DateISO;       // la date qui déclenche le calcul (livraison, échéance, souscription…)
  preavis: number;        // jours de préavis du contrat (services à l’échéance)
  evenement: string;      // pour la résiliation d'assurance après un événement
  objetAchat: string;     // ce qu'on a acheté (rétractation)
  pdl: string;            // point de livraison (énergie)
}

export const DONNEES_VIDES: Donnees = {
  cas: 'retractation', variante: 'bien', nom: '', adresse: '', ville: '', lieu: '', organisme: '', adresseOrganisme: '', reference: '',
  dateEnvoi: '', dateRef: '', preavis: 0, evenement: 'domicile', objetAchat: '', pdl: '',
};

export const EVENEMENTS: Record<string, string> = {
  domicile: 'changement de domicile',
  matrimoniale: 'changement de situation matrimoniale',
  regime: 'changement de régime matrimonial',
  profession: 'changement de profession',
  retraite: 'départ à la retraite ou cessation définitive d’activité professionnelle',
};

export interface ChampsActifs {
  dateRef: { label: string; aide: string; requis: boolean } | null;
  preavis: boolean;
  evenement: boolean;
  objetAchat: boolean;
  pdl: boolean;
  reference: { label: string; aide: string };
}

/** Quels champs montrer, avec quel libellé, selon le cas et la situation. */
export function champsActifs(cas: string, variante: string): ChampsActifs {
  const v = varianteValide(cas, variante);
  const base: ChampsActifs = { dateRef: null, preavis: false, evenement: false, objetAchat: false, pdl: false,
    reference: { label: 'N° contrat', aide: 'Le numéro de contrat ou de client, tel qu’il figure sur votre facture ou votre espace client.' } };
  switch (cas) {
    case 'retractation':
      return { ...base, objetAchat: true,
        reference: { label: 'N° commande', aide: 'Le numéro de commande figurant sur la confirmation reçue par e-mail ou sur la facture.' },
        dateRef: v === 'bien'
          ? { label: 'Livré le', aide: 'Date de réception du bien (par vous ou par une personne que vous avez désignée, transporteur exclu). Le jour de départ n’est pas compté.', requis: true }
          : { label: 'Conclu le', aide: 'Date de la conclusion du contrat, c’est-à-dire de la commande acceptée. Le jour de départ n’est pas compté.', requis: true } };
    case 'internet': case 'mobile':
      if (v === 'reconduction') return { ...base, dateRef: { label: 'Prolongé le', aide: 'Date à laquelle le contrat a été prolongé automatiquement.', requis: true } };
      if (v === 'modification') return { ...base, dateRef: { label: 'Notifié le', aide: 'Date de réception de l’annonce de la modification. Vous avez quatre mois à partir de là.', requis: true } };
      return { ...base, dateRef: { label: 'Fin souhaitée', aide: 'Facultatif : la date à laquelle vous voulez que le contrat s’arrête. Sans date, il s’arrête dix jours au plus après réception.', requis: false } };
    case 'auto': case 'habitation':
      if (v === 'un-an') return { ...base, dateRef: { label: 'Souscrit le', aide: 'Date de la toute première souscription du contrat (pas de la dernière reconduction). Le droit s’ouvre après un an.', requis: true } };
      if (v === 'echeance') return { ...base, dateRef: { label: 'Échéance le', aide: 'Date anniversaire du contrat, indiquée sur l’avis d’échéance ou les conditions particulières.', requis: true } };
      if (v === 'sans-avis') return { ...base, dateRef: { label: 'Reconduit le', aide: 'Date de la dernière reconduction du contrat.', requis: true } };
      return { ...base, evenement: true, dateRef: { label: 'Survenu le', aide: 'Date de l’événement. Le droit de résilier dure trois mois à partir de là.', requis: true } };
    case 'mutuelle':
      return { ...base, dateRef: { label: 'Adhéré le', aide: 'Date de la première adhésion ou souscription. Le droit s’ouvre après un an.', requis: true } };
    case 'salle': case 'abonnement': case 'presse':
      if (v === 'reconduction') return { ...base, dateRef: { label: 'Reconduit le', aide: 'Date à laquelle le contrat a été reconduit tacitement.', requis: true } };
      return { ...base, preavis: true, dateRef: { label: 'Échéance le', aide: 'Date de fin de la période d’engagement en cours, d’après votre contrat.', requis: true } };
    case 'energie':
      return { ...base, pdl: true, dateRef: { label: 'Fin souhaitée', aide: 'Date à laquelle la fourniture doit s’arrêter, trente jours au plus après l’envoi de la lettre.', requis: true } };
    default:
      return base;
  }
}

// ───────────────────────── Résultat ─────────────────────────

export type Niveau = 'ok' | 'info' | 'attention' | 'depasse';
export interface Repere { libelle: string; valeur: string; niveau: Niveau; detail?: string }

export interface Lettre {
  expediteur: string[];
  destinataire: string[];
  lieuDate: string;
  objet: string;
  mentionEnvoi: string | null;
  paragraphes: string[];
  formuleFin: string;
  signature: string;
  piecesJointes: string[];
  texte: string;
}

export interface Preparation {
  lettre: Lettre;
  articles: Article[];
  envoi: string;
  pieces: string[];
  avertissements: string[];
  reperes: Repere[];
  manquants: string[];
  complet: boolean;
}

const nettoyer = (s: string) => s.replace(/\r\n?/g, '\n').trim();
const ou = (valeur: string, repere: string) => (nettoyer(valeur) ? nettoyer(valeur) : `[${repere}]`);

const POLITESSE = 'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.';
const CONFIRMATION = 'Je vous prie de bien vouloir me confirmer par écrit la réception de la présente et la date à laquelle le contrat prend fin.';

interface Contenu {
  objet: string;
  recommande: boolean;
  paragraphes: string[];
  articles: string[];
  envoi: string;
  pieces: string[];
  jointes?: string[];   // ce qui figure sous « Pièces jointes » dans la lettre
  avertissements: string[];
  reperes: Repere[];
}

/** Repère « envoyer au plus tard le … » : dépassé si la date d'envoi prévue est après la limite. */
function repereLimite(libelle: string, limite: DateISO, envoi: DateISO, note?: string): Repere {
  const reste = ecartJours(envoi, limite);
  const jour = (n: number) => `${n} jour${n > 1 ? 's' : ''}`;
  if (reste < 0) return { libelle, valeur: dateLongue(limite), niveau: 'depasse', detail: `Dépassée de ${jour(-reste)} à la date d’envoi choisie.${note ? ' ' + note : ''}` };
  return { libelle, valeur: dateLongue(limite), niveau: reste <= 3 ? 'attention' : 'ok', detail: reste === 0 ? 'C’est le dernier jour utile.' : `Il reste ${jour(reste)} à partir de la date d’envoi choisie.` };
}

const ENVOI_RECOMMANDE = 'Lettre recommandée avec accusé de réception : elle donne une date certaine et une preuve de remise.';

function contenu(d: Donnees, c: string, v: string): Contenu {
  const ref = ou(d.reference, 'numéro de contrat');
  const envoi = d.dateEnvoi;
  const dateRef = d.dateRef && estDateValide(d.dateRef) ? d.dateRef : '';
  const refDate = dateRef ? dateCourante(dateRef) : '[date]';
  const fournisseur = (c === 'internet' ? 'internet' : 'mobile');

  // ── Rétractation ──
  if (c === 'retractation') {
    const bien = v === 'bien';
    const objet = ou(d.objetAchat, 'objet de la commande');
    const fin = dateRef ? delaiRetractation(dateRef) : null;
    const reperes: Repere[] = [];
    if (fin) {
      if (fin.proroge) reperes.push({ libelle: 'Quatorzième jour', valeur: dateLongue(fin.brute), niveau: 'info', detail: `Il tombe un jour non ouvrable (${fin.raison}) : le délai est prorogé au premier jour ouvrable suivant.` });
      reperes.push(repereLimite('Envoi au plus tard le', fin.date, envoi,
        'Si le vendeur ne vous a pas informé de votre droit de rétractation, le délai est prolongé de douze mois (art. L221-20).'));
    }
    return {
      objet: `Rétractation de la commande n° ${ref}`,
      recommande: true,
      paragraphes: [
        `Je vous notifie par la présente ma décision de me rétracter du contrat n° ${ref}, conclu à distance, portant sur : ${objet}, conformément aux articles L221-18 et suivants du Code de la consommation.`,
        bien
          ? `Ce bien m’a été livré le ${refDate}. Je vous le renverrai dans un délai de quatorze jours à compter de l’envoi de la présente (art. L221-23), sauf si vous proposez de le récupérer vous-même.`
          : `Le contrat a été conclu le ${refDate}. Si l’exécution de la prestation a commencé avant la fin du délai de rétractation à ma demande expresse, je ne suis redevable que d’un montant proportionné au service déjà fourni (art. L221-25).`,
        'Je vous demande de me rembourser la totalité des sommes versées' + (bien ? ', y compris les frais de livraison standard,' : '') + ' sans retard injustifié et au plus tard dans les quatorze jours suivant la réception de la présente (art. L221-24), par le moyen de paiement utilisé lors de la commande.',
        'Je vous prie de bien vouloir me confirmer par écrit la réception de la présente.',
      ],
      articles: ['L221-18', 'L221-19', 'L221-21', bien ? 'L221-23' : 'L221-25', 'L221-24', 'L221-22', 'L221-20', 'L221-28'],
      envoi: 'Recommandé avec accusé de réception (la preuve de la rétractation pèse sur vous, art. L221-22). Si le site propose un bouton ou un formulaire de rétractation, vous pouvez aussi l’utiliser : gardez la capture et l’accusé de réception (art. L221-21).',
      jointes: ['copie de la confirmation de commande'],
      pieces: ['Copie de la confirmation de commande ou de la facture', 'Le formulaire type de rétractation du vendeur, s’il vous en a remis un (facultatif : toute déclaration claire suffit)'],
      avertissements: [
        'Pas de rétractation pour un achat fait en magasin, ni entre particuliers.',
        'Exclus de la rétractation (art. L221-28) : services pleinement exécutés avant la fin du délai avec votre accord exprès, biens faits sur mesure ou nettement personnalisés, biens périssables, biens descellés ne pouvant être renvoyés pour raison d’hygiène, billets de spectacle datés, entre autres.',
        ...(bien ? ['Le vendeur peut retarder le remboursement jusqu’à la récupération du bien ou la preuve de son expédition (art. L221-24).'] : []),
      ],
      reperes,
    };
  }

  // ── Télécoms ──
  if (c === 'internet' || c === 'mobile') {
    const nature = c === 'internet' ? 'mon abonnement internet' : 'mon forfait mobile';
    const reperes: Repere[] = [];
    let paragraphes: string[];
    let articles: string[];
    const demandeFinale = [
      'Je vous demande de me restituer toute somme versée d’avance dans un délai de dix jours à compter du paiement de la dernière facture (art. L224-35), et de m’indiquer les modalités de restitution du matériel éventuel.',
      CONFIRMATION,
    ];
    if (v === 'reconduction') {
      paragraphes = [
        `Je vous notifie par la présente la résiliation de ${nature}, contrat n° ${ref}.`,
        `Ce contrat à durée déterminée a été prolongé automatiquement le ${refDate}. Conformément à l’article L224-40 du Code de la consommation, je le résilie à tout moment à compter de la prolongation, avec un préavis qui ne peut excéder dix jours, et sans frais autres que les charges liées à la réception du service pendant ce préavis.`,
        ...demandeFinale];
      articles = ['L224-40', 'L224-39', 'L215-1-1', 'L224-35'];
    } else if (v === 'modification') {
      const limite = dateRef ? ajouterMois(dateRef, 4) : '';
      if (limite) reperes.push(repereLimite('Envoi au plus tard le', veilleOuvrable(limite), envoi, `Quatre mois pleins : ${dateLongue(limite)} ; envoyez avant si ce jour n’est pas ouvrable.`));
      paragraphes = [
        `Je vous notifie par la présente la résiliation de ${nature}, contrat n° ${ref}.`,
        `Vous m’avez notifié le ${refDate} un projet de modification des conditions contractuelles que je n’accepte pas. Conformément à l’article L224-33 du Code de la consommation, je résilie le contrat sans aucun frais et sans droit à dédommagement, dans le délai de quatre mois suivant cette notification.`,
        ...demandeFinale];
      articles = ['L224-33', 'L224-39', 'L215-1-1', 'L224-35'];
    } else {
      const souhaitee = dateRef ? `Je souhaite que la résiliation prenne effet le ${refDate}.` : 'Je souhaite que la résiliation prenne effet dans le délai le plus court.';
      paragraphes = [
        `Je vous notifie par la présente la résiliation de ${nature}, contrat n° ${ref}.`,
        `Conformément à l’article L224-39 du Code de la consommation, le préavis de résiliation ne peut excéder dix jours à compter de la réception de la présente. ${souhaitee}`,
        ...demandeFinale];
      articles = ['L224-39', 'L215-1-1', 'L224-40', 'L224-35'];
    }
    reperes.push({ libelle: 'Fin du contrat', valeur: dateRef && v === 'fin' ? dateLongue(dateRef) : `10 jours au plus après réception (dès le ${dateLongue(ajouterJours(envoi, 10))} si la lettre arrive le jour de l’envoi)`, niveau: 'info', detail: 'Le préavis ne peut pas dépasser dix jours ; vous pouvez demander une date plus lointaine.' });
    return {
      objet: `Résiliation de ${nature} — contrat n° ${ref}`,
      recommande: true,
      paragraphes, articles,
      envoi: `${ENVOI_RECOMMANDE} Si l’opérateur propose la résiliation en ligne (art. L215-1-1), vous pouvez l’utiliser à la place : il doit confirmer par écrit la date de fin.`,
      pieces: ['Rien n’est exigé par la loi ; une copie de votre dernière facture aide l’opérateur à retrouver le contrat'],
      avertissements: [
        'Pendant la durée d’engagement, l’opérateur peut demander des frais de résiliation anticipée prévus au contrat : cette lettre ne les supprime pas.',
        `Si vous gardez votre numéro en changeant d’opérateur, vérifiez la portabilité avec le nouvel opérateur avant d’envoyer cette lettre (${fournisseur === 'mobile' ? 'forfait mobile' : 'ligne fixe'}).`,
      ],
      reperes,
    };
  }

  // ── Assurance auto / logement, mutuelle ──
  if (c === 'auto' || c === 'habitation' || c === 'mutuelle') {
    const mut = c === 'mutuelle';
    const nature = c === 'auto' ? 'mon contrat d’assurance automobile' : c === 'habitation' ? 'mon contrat d’assurance habitation' : 'ma complémentaire santé';
    const verbe = mut && v === 'mutuelle' ? 'dénoncer mon adhésion à' : 'résilier';
    const reperes: Repere[] = [];
    const remboursement = 'Je ne suis redevable que de la partie de cotisation correspondant à la période pendant laquelle le risque est couvert, calculée jusqu’à la date d’effet. Je vous demande de me rembourser le solde dans un délai de trente jours à compter de cette date, faute de quoi les sommes dues porteront intérêts au taux légal.';
    const objetVerbe = mut && v === 'mutuelle' ? 'Dénonciation d’adhésion' : 'Résiliation';
    const objet = `${objetVerbe} — ${nature.replace(/^mon |^ma /, '')} n° ${ref}`;
    const piecesAssu = ['Rien n’est exigé par la loi ; indiquez le numéro de contrat et joignez, si vous l’avez, le dernier avis d’échéance'];
    const alertesCommunes: string[] = [];
    if (c === 'auto') alertesCommunes.push('L’assurance responsabilité civile est obligatoire pour rouler : ne résiliez qu’avec une nouvelle assurance prête à prendre le relais. Le nouvel assureur peut faire la résiliation à votre place (art. L113-15-2).');
    if (c === 'habitation') alertesCommunes.push('Pour l’assurance du locataire, le nouvel assureur peut faire la résiliation à votre place (art. L113-15-2). Un locataire doit rester assuré.');
    if (mut) alertesCommunes.push('Si vous changez de complémentaire santé, c’est le nouvel organisme qui fait les démarches pour vous : ne résiliez pas avant d’avoir une nouvelle couverture. Le droit n’existe pas pour une mutuelle obligatoire imposée par votre employeur.');
    alertesCommunes.push('Les contrats souscrits pour une activité professionnelle relèvent d’autres règles : cette lettre vise les particuliers.');

    const cadre = mut && v === 'mutuelle' ? ['L221-10-2', 'L221-10-3'] : ['L113-14'];

    if (v === 'echeance' && !mut) {
      const limite = dateRef ? ajouterMois(dateRef, -2) : '';
      if (limite) reperes.push(repereLimite('Envoi au plus tard le', veilleOuvrable(limite), envoi,
        'Deux mois pleins avant l’échéance : trop tard pour cette échéance. Un contrat de plus d’un an se résilie « après un an » à tout moment.'));
      if (limite && veilleOuvrable(limite) !== limite) reperes.push({ libelle: 'Deux mois avant l’échéance', valeur: dateLongue(limite), niveau: 'info', detail: 'Ce jour n’est pas ouvrable : par prudence, la date proposée ci-dessus est la veille ouvrable.' });
      return {
        objet, recommande: true,
        paragraphes: [
          `Je vous notifie par la présente la résiliation de ${nature}, n° ${ref}, à la date d’échéance du ${refDate}, conformément à l’article L113-12 du Code des assurances.`,
          'Je vous prie de prendre acte de cette résiliation, notifiée au moins deux mois avant l’échéance (le délai court à partir de la date figurant sur le cachet de la poste).',
          CONFIRMATION],
        articles: ['L113-12', ...cadre, 'L113-15-2'],
        envoi: `${ENVOI_RECOMMANDE} Le cachet de la poste fait foi pour le délai de deux mois (art. L113-12). Si l’assureur propose la résiliation en ligne, elle est possible aussi (art. L113-14).`,
        pieces: piecesAssu, avertissements: alertesCommunes, reperes,
      };
    }

    if (v === 'sans-avis' && !mut) {
      reperes.push({ libelle: 'Effet', valeur: dateLongue(ajouterJours(envoi, 1)), niveau: 'info', detail: 'Le lendemain de la date figurant sur le cachet de la poste (art. L113-15-1).' });
      return {
        objet, recommande: true,
        paragraphes: [
          `Je vous notifie par la présente la résiliation de ${nature}, n° ${ref}, reconduit le ${refDate}.`,
          'L’avis d’échéance que vous m’avez adressé ne rappelait pas la date limite d’exercice de mon droit à dénonciation du contrat, comme le prévoit l’article L113-15-1 du Code des assurances. Je mets donc un terme au contrat, sans pénalités, à compter de la date de reconduction ; la résiliation prend effet le lendemain de la date figurant sur le cachet de la poste.',
          remboursement, CONFIRMATION],
        articles: ['L113-15-1', ...cadre],
        envoi: ENVOI_RECOMMANDE,
        pieces: ['Copie de l’avis d’échéance qui ne rappelle pas la date limite de résiliation'],
        jointes: ['copie de l’avis d’échéance'],
        avertissements: ['Vérifiez que l’avis d’échéance ne mentionnait vraiment pas la date limite avant d’invoquer ce motif.', ...alertesCommunes],
        reperes,
      };
    }

    if (v === 'evenement' && !mut) {
      const ev = EVENEMENTS[d.evenement] ?? EVENEMENTS.domicile;
      const limite = dateRef ? ajouterMois(dateRef, 3) : '';
      if (limite) reperes.push(repereLimite('Envoi au plus tard le', veilleOuvrable(limite), envoi, 'Trois mois à partir de l’événement : au-delà, le droit de résilier pour ce motif est perdu.'));
      reperes.push({ libelle: 'Effet', valeur: `un mois après réception (dès le ${dateLongue(ajouterMois(envoi, 1))} si la lettre arrive le jour de l’envoi)`, niveau: 'info' });
      return {
        objet, recommande: true,
        paragraphes: [
          `Je vous notifie par la présente la résiliation de ${nature}, n° ${ref}.`,
          `Je suis concerné(e) par un ${ev}, survenu le ${refDate}. Les risques garantis par le contrat étant en relation directe avec ma situation antérieure et ne se retrouvant pas dans ma situation nouvelle, je résilie le contrat dans les trois mois de cet événement, conformément à l’article L113-16 du Code des assurances. La résiliation prend effet un mois après votre réception de la présente.`,
          'Je vous demande de me rembourser la partie de prime correspondant à la période pendant laquelle le risque n’a pas couru, calculée à compter de la date d’effet de la résiliation.',
          CONFIRMATION],
        articles: ['L113-16', 'L113-14'],
        envoi: ENVOI_RECOMMANDE,
        pieces: ['Un justificatif de l’événement (nouveau bail ou titre de propriété, acte de mariage, attestation de retraite…) : l’assureur peut le demander'],
        jointes: ['justificatif de l’événement'],
        avertissements: ['L’assureur peut refuser si le contrat garantit un risque qui existe toujours après l’événement (par exemple, une assurance habitation pour un logement conservé).', ...alertesCommunes],
        reperes,
      };
    }

    // « après un an » : auto, logement, mutuelle
    const ouvre = dateRef ? ajouterMois(dateRef, 12) : '';
    if (ouvre) {
      if (ecartJours(ouvre, envoi) < 0) reperes.push({ libelle: 'Droit ouvert le', valeur: dateLongue(ouvre), niveau: 'depasse', detail: 'Avant cette date, le contrat a moins d’un an : cette lettre serait prématurée. Envoyez-la à partir de ce jour.' });
      else reperes.push({ libelle: 'Droit ouvert depuis', valeur: dateLongue(ouvre), niveau: 'ok', detail: 'Un an s’est écoulé depuis la première souscription.' });
    }
    reperes.push({ libelle: 'Effet', valeur: `un mois après réception (dès le ${dateLongue(ajouterMois(envoi, 1))} si la lettre arrive le jour de l’envoi)`, niveau: 'info', detail: 'Plus le courrier met de temps à arriver, plus la date recule.' });
    const texteArt = mut && v === 'mutuelle' ? 'L221-10-2 du Code de la mutualité' : 'L113-15-2 du Code des assurances';
    return {
      objet, recommande: true,
      paragraphes: [
        mut && v === 'mutuelle'
          ? `Je vous notifie par la présente la dénonciation de mon adhésion n° ${ref}, souscrite pour la première fois le ${refDate}.`
          : `Je vous notifie par la présente la résiliation de ${nature}, n° ${ref}, souscrit(e) pour la première fois le ${refDate}.`,
        `Un an s’étant écoulé depuis la première souscription, j’exerce mon droit de ${verbe === 'résilier' ? 'résiliation' : 'dénonciation'} sans frais ni pénalités prévu par l’article ${texteArt}. Conformément à cet article, la ${mut && v === 'mutuelle' ? 'dénonciation' : 'résiliation'} prend effet un mois après votre réception de la présente.`,
        remboursement, CONFIRMATION],
      articles: [mut && v === 'mutuelle' ? 'L221-10-2' : 'L113-15-2', ...cadre, ...(mut ? [] : ['L113-12'])].filter((x, i, a) => a.indexOf(x) === i),
      envoi: `${ENVOI_RECOMMANDE} La notification peut aussi se faire par tout autre support durable ou par le même moyen que la souscription à distance (art. ${mut && v === 'mutuelle' ? 'L221-10-3' : 'L113-14'}), y compris la résiliation en ligne si l’organisme la propose.`,
      pieces: piecesAssu, avertissements: alertesCommunes, reperes,
    };
  }

  // ── Salle de sport, abonnement en ligne, presse ──
  if (c === 'salle' || c === 'abonnement' || c === 'presse') {
    const nature = c === 'salle' ? 'mon abonnement à votre salle de sport' : c === 'presse' ? 'mon abonnement à votre titre de presse' : 'mon abonnement à votre service en ligne';
    const reperes: Repere[] = [];
    const pieces = c === 'salle'
      ? ['Rien n’est exigé par la loi ; un justificatif (certificat médical, justificatif de déménagement) n’est utile que si le contrat prévoit une résiliation anticipée pour ce motif']
      : ['Rien n’est exigé par la loi ; indiquez le numéro d’abonné ou l’adresse e-mail du compte'];
    const envoi_ = `${ENVOI_RECOMMANDE} Si vous avez souscrit en ligne, le professionnel doit vous offrir une résiliation en ligne gratuite (art. L215-1-1) et confirmer la fin du contrat sur un support durable.`;
    if (v === 'reconduction') {
      reperes.push({ libelle: 'Effet', valeur: 'à la réception de la lettre', niveau: 'info', detail: 'Résiliation possible à tout moment à compter de la date de reconduction (art. L215-1).' });
      return {
        objet: `Résiliation de l’abonnement n° ${ref}`, recommande: true,
        paragraphes: [
          `Je vous notifie par la présente la résiliation de ${nature}, n° ${ref}, reconduit tacitement le ${refDate}.`,
          'Je n’ai reçu aucune information écrite, par lettre nominative ou courrier électronique dédiés, m’indiquant entre trois mois et un mois avant le terme la possibilité de ne pas reconduire le contrat et la date limite de non-reconduction. Conformément à l’article L215-1 du Code de la consommation, je mets donc gratuitement un terme au contrat, à tout moment à compter de la date de reconduction.',
          'Je vous demande de me rembourser, dans un délai de trente jours à compter de la résiliation, les avances effectuées après la dernière date de reconduction, déduction faite des sommes correspondant à l’exécution du contrat jusqu’à celle-ci.',
          CONFIRMATION],
        articles: ['L215-1', 'L215-1-1'],
        envoi: envoi_, pieces,
        avertissements: ['Ce motif suppose que vous n’avez réellement pas reçu l’information préalable : vérifiez vos courriers et vos messages indésirables.', 'Les règles de l’article L215-1 ne s’appliquent pas à tous les contrats (assurance, services d’eau, par exemple : règles propres).'],
        reperes,
      };
    }
    const preavis = Math.max(0, Math.round(Number(d.preavis) || 0));
    const limite = dateRef ? ajouterJours(dateRef, -preavis) : '';
    if (limite) {
      reperes.push(repereLimite('Envoi au plus tard le', veilleOuvrable(limite), envoi,
        preavis ? `Échéance ${dateLongue(dateRef)} moins ${preavis} jour${preavis > 1 ? 's' : ''} de préavis, d’après le contrat.` : undefined));
    }
    return {
      objet: `Résiliation de l’abonnement n° ${ref}`, recommande: true,
      paragraphes: [
        `Je vous notifie par la présente la résiliation de ${nature}, n° ${ref}.`,
        `Cette résiliation prend effet à la date d’échéance du ${refDate}${preavis ? `, dans le respect du préavis de ${preavis} jour${preavis > 1 ? 's' : ''} prévu au contrat` : ''}. Je vous demande de ne pas reconduire le contrat et de cesser tout prélèvement à compter de cette date.`,
        CONFIRMATION],
      articles: ['L215-1-1', 'L215-1'],
      envoi: envoi_, pieces,
      avertissements: [
        'La date et le préavis viennent de votre contrat et de ses conditions générales : relisez-les, la loi ne fixe pas de préavis général pour ces abonnements.',
        'Le professionnel doit vous prévenir de la reconduction entre trois mois et un mois avant la date limite ; s’il ne l’a pas fait, choisissez la situation « Sans rappel » (art. L215-1).',
      ],
      reperes,
    };
  }

  // ── Énergie ──
  const gaz = v === 'gaz';
  const energie = gaz ? 'gaz' : 'électricité';
  const pdl = ou(d.pdl, gaz ? 'numéro PCE' : 'numéro PDL / PRM');
  const maxi = ajouterJours(envoi, 30);
  const reperes: Repere[] = [];
  if (dateRef) {
    const reste = ecartJours(maxi, dateRef);
    reperes.push(reste > 0
      ? { libelle: 'Date de fin souhaitée', valeur: dateLongue(dateRef), niveau: 'depasse', detail: `Elle dépasse de ${reste} jour${reste > 1 ? 's' : ''} le maximum de trente jours après notification (${dateLongue(maxi)}). Envoyez la lettre plus tard.` }
      : { libelle: 'Date de fin souhaitée', valeur: dateLongue(dateRef), niveau: 'ok', detail: `Le fournisseur doit l’appliquer, au plus tard ${dateLongue(maxi)} (trente jours après l’envoi).` });
  }
  return {
    objet: `Résiliation de mon contrat de ${energie} — n° ${ref}`, recommande: true,
    paragraphes: [
      `Je vous notifie par la présente la résiliation de mon contrat de fourniture de ${energie}, n° ${ref}, pour le point de livraison n° ${pdl}.`,
      `Conformément à l’article L224-14 du Code de la consommation, je vous demande de faire prendre effet cette résiliation le ${refDate}, et au plus tard trente jours après la notification de la présente.`,
      'Je vous demande de m’adresser ma facture de clôture dans un délai de quatre semaines à compter de la résiliation et de me rembourser tout trop-perçu dans un délai de deux semaines après son émission (art. L224-15). Aucun frais ne peut m’être réclamé en dehors des coûts effectivement supportés, justifiés et explicitement prévus dans l’offre.',
      CONFIRMATION],
    articles: ['L224-14', 'L224-15', 'L215-1-1'],
    envoi: `${ENVOI_RECOMMANDE} Beaucoup de fournisseurs proposent aussi la résiliation depuis l’espace client (art. L215-1-1) : gardez l’accusé de réception.`,
    jointes: ['relevé de l’index du compteur'],
    pieces: [`Le dernier relevé de compteur (index à la date de fin), le numéro de point de livraison (${gaz ? 'PCE, sur la facture' : 'PDL ou PRM, sur la facture'}) et la nouvelle adresse pour la facture de clôture`],
    avertissements: [
      'Si vous changez de fournisseur, ne résiliez pas : le nouveau fournisseur s’en charge et l’ancien contrat est résilié de plein droit à la date de prise d’effet du nouveau, au plus tard 21 jours après votre demande (art. L224-14).',
      'En cas de déménagement, relevez le compteur le jour du départ et conservez la photo de l’index.',
    ],
    reperes,
  };
}

// ───────────────────────── Assemblage ─────────────────────────

/** Les champs sans lesquels la lettre contiendrait encore des crochets. */
export function champsManquants(d: Donnees): string[] {
  const cas = casDef(d.cas).id;
  const v = varianteValide(cas, d.variante);
  const a = champsActifs(cas, v);
  const m: string[] = [];
  if (!nettoyer(d.nom)) m.push('Nom');
  if (!nettoyer(d.adresse)) m.push('Adresse');
  if (!nettoyer(d.ville)) m.push('Code postal et ville');
  if (!nettoyer(d.organisme)) m.push('Société');
  if (!nettoyer(d.adresseOrganisme)) m.push('Adresse de la société');
  if (!nettoyer(d.reference)) m.push(a.reference.label);
  if (a.objetAchat && !nettoyer(d.objetAchat)) m.push('Achat');
  if (a.pdl && !nettoyer(d.pdl)) m.push('Point de livraison');
  if (a.dateRef?.requis && !(d.dateRef && estDateValide(d.dateRef))) m.push(a.dateRef.label);
  if (!nettoyer(d.lieu)) m.push('Lieu');
  if (!(d.dateEnvoi && estDateValide(d.dateEnvoi))) m.push('Date d’envoi');
  return m;
}

export function preparer(brut: Donnees, aujourdhuiISO: DateISO): Preparation {
  const cas = casDef(brut.cas).id;
  const variante = varianteValide(cas, brut.variante);
  const d: Donnees = { ...brut, cas, variante, dateEnvoi: brut.dateEnvoi && estDateValide(brut.dateEnvoi) ? brut.dateEnvoi : aujourdhuiISO };
  const k = contenu(d, cas, variante);

  const expediteur = [ou(d.nom, 'Nom Prénom'), ou(d.adresse, 'adresse'), ou(d.ville, 'code postal, ville')];
  const destinataire = [nettoyer(d.organisme) || '[Société]', ...(nettoyer(d.adresseOrganisme) ? nettoyer(d.adresseOrganisme).split('\n').map((l) => l.trim()).filter(Boolean) : ['[adresse de la société]'])];
  const lieuDate = `${nettoyer(d.lieu) || '[Lieu]'}, le ${dateCourante(d.dateEnvoi)}`;
  const mentionEnvoi = k.recommande ? 'Lettre recommandée avec accusé de réception' : null;
  const piecesJointes = k.jointes ?? [];
  const signature = ou(d.nom, 'Nom Prénom');

  const bloc = [
    expediteur.join('\n'),
    destinataire.join('\n'),
    lieuDate,
    `Objet : ${k.objet}${mentionEnvoi ? '\n' + mentionEnvoi : ''}`,
    'Madame, Monsieur,',
    ...k.paragraphes,
    POLITESSE,
    signature,
    ...(piecesJointes.length ? [`Pièce${piecesJointes.length > 1 ? 's' : ''} jointe${piecesJointes.length > 1 ? 's' : ''} : ${piecesJointes.join(' ; ')}.`] : []),
  ];
  const lettre: Lettre = { expediteur, destinataire, lieuDate, objet: k.objet, mentionEnvoi, paragraphes: k.paragraphes, formuleFin: POLITESSE, signature, piecesJointes, texte: bloc.join('\n\n') };
  const manquants = champsManquants(d);
  return {
    lettre,
    articles: k.articles.map((r) => ARTICLES[r]).filter(Boolean),
    envoi: k.envoi,
    pieces: k.pieces,
    avertissements: k.avertissements,
    reperes: k.reperes,
    manquants,
    complet: manquants.length === 0,
  };
}

/** Nom de fichier stable, sans accents ni espaces. */
export function nomFichier(cas: string, variante: string): string {
  return `lettre-${casDef(cas).id}-${varianteValide(cas, variante)}.pdf`;
}
