import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { ajouterJours, ajouterMois, dateLongue, delaiRetractation, joursFeries, paques, proroger, raisonNonOuvrable, veilleOuvrable } from './dates';
import { ARTICLES, CAS, DONNEES_VIDES, champsActifs, champsManquants, nomFichier, preparer, type Donnees } from './outil';
import { fabriquerPdf, pourHelvetica } from './pdf';

const base: Donnees = {
  ...DONNEES_VIDES, nom: 'Camille Durand', adresse: '12 rue des Lilas', ville: '69003 Lyon', lieu: 'Lyon',
  organisme: 'Société Exemple', adresseOrganisme: 'Service résiliation\nTSA 12345\n75001 Paris', reference: 'AB-2026-1234', dateEnvoi: '2026-10-20',
};
const faire = (surcharge: Partial<Donnees>) => preparer({ ...base, ...surcharge }, '2026-10-20');
const refs = (p: ReturnType<typeof preparer>) => p.articles.map((a) => a.ref);

describe('Pâques et jours fériés', () => {
  it('Pâques : dates de référence du calendrier grégorien', () => {
    expect(paques(2024)).toBe('2024-03-31');
    expect(paques(2025)).toBe('2025-04-20');
    expect(paques(2026)).toBe('2026-04-05');
    expect(paques(2027)).toBe('2027-03-28');
  });
  it('2026 : lundi de Pâques le 6 avril, Ascension le 14 mai, lundi de Pentecôte le 25 mai', () => {
    const f = joursFeries(2026);
    expect(f.get('2026-04-06')).toBe('Lundi de Pâques');
    expect(f.get('2026-05-14')).toBe('Ascension');
    expect(f.get('2026-05-25')).toBe('Lundi de Pentecôte');
    expect(f.size).toBe(11);
  });
});

describe('délais et prorogation', () => {
  it('ajouter des mois garde le quantième, sinon le dernier jour du mois', () => {
    expect(ajouterMois('2026-01-31', 1)).toBe('2026-02-28');
    expect(ajouterMois('2026-12-15', 2)).toBe('2027-02-15');
    expect(ajouterMois('2026-03-10', -2)).toBe('2026-01-10');
  });
  it('rétractation : 14 jours, jour de départ exclu (livré le 1er → expire le 15)', () => {
    const e = delaiRetractation('2026-10-01');
    expect(e.brute).toBe('2026-10-15');
    expect(e.date).toBe('2026-10-15'); // jeudi
    expect(e.proroge).toBe(false);
  });
  it('délai qui expire un samedi : prorogé au lundi (livré le samedi 17/10 → 31/10, samedi, puis lundi 2/11)', () => {
    const e = delaiRetractation('2026-10-17');
    expect(e.brute).toBe('2026-10-31');
    expect(e.raison).toBe('samedi');
    expect(e.date).toBe('2026-11-02');
  });
  it('délai qui expire un dimanche férié (1er novembre) : prorogé au lundi 2 novembre', () => {
    const e = delaiRetractation('2026-10-18');
    expect(e.brute).toBe('2026-11-01');
    expect(e.date).toBe('2026-11-02');
  });
  it('délai qui expire un jour férié en semaine (11 novembre 2026, mercredi) : prorogé au 12', () => {
    const e = delaiRetractation('2026-10-28');
    expect(e.brute).toBe('2026-11-11');
    expect(e.raison).toBe('Armistice 1918');
    expect(e.date).toBe('2026-11-12');
  });
  it('délai qui expire le lundi de Pâques 2026 : prorogé au mardi 7 avril', () => {
    const e = delaiRetractation('2026-03-23');
    expect(e.brute).toBe('2026-04-06');
    expect(e.date).toBe('2026-04-07');
  });
  it('plusieurs jours non ouvrables de suite : le pont du 25 décembre 2026 (vendredi) mène au lundi 28', () => {
    const e = proroger('2026-12-25');
    expect(e.date).toBe('2026-12-28');
  });
  it('veille ouvrable : dimanche 1er novembre 2026 → vendredi 30 octobre', () => {
    expect(veilleOuvrable('2026-11-01')).toBe('2026-10-30');
    expect(raisonNonOuvrable('2026-10-20')).toBeNull();
  });
  it('date lisible', () => {
    expect(dateLongue('2026-11-02')).toBe('lundi 2 novembre 2026');
    expect(dateLongue('2026-12-01')).toBe('mardi 1er décembre 2026');
    expect(ajouterJours('2026-02-27', 2)).toBe('2026-03-01');
  });
});

describe('chaque cas produit sa lettre avec ses articles', () => {
  it('rétractation d’un bien : L221-18, remboursement L221-24, renvoi L221-23, délai calculé', () => {
    const p = faire({ cas: 'retractation', variante: 'bien', objetAchat: 'une paire de chaussures', dateRef: '2026-10-17', dateEnvoi: '2026-10-20' });
    expect(p.lettre.texte).toContain('articles L221-18 et suivants du Code de la consommation');
    expect(p.lettre.texte).toContain('art. L221-23');
    expect(p.lettre.texte).toContain('art. L221-24');
    expect(refs(p)).toEqual(expect.arrayContaining(['L221-18', 'L221-19', 'L221-21', 'L221-22', 'L221-23', 'L221-24', 'L221-28']));
    expect(p.reperes.find((r) => r.libelle === 'Envoi au plus tard le')?.valeur).toBe('lundi 2 novembre 2026');
    expect(p.envoi).toMatch(/Recommandé avec accusé de réception/);
    expect(p.avertissements.join(' ')).toMatch(/L221-28/);
    expect(p.complet).toBe(true);
  });
  it('rétractation d’un service : point de départ à la conclusion, L221-25', () => {
    const p = faire({ cas: 'retractation', variante: 'service', objetAchat: 'un abonnement annuel', dateRef: '2026-10-10' });
    expect(p.lettre.texte).toContain('Le contrat a été conclu le 10 octobre 2026');
    expect(p.lettre.texte).toContain('art. L221-25');
    expect(p.lettre.texte).not.toContain('L221-23');
    expect(p.reperes.find((r) => r.libelle === 'Envoi au plus tard le')?.valeur).toBe('lundi 26 octobre 2026');
  });
  it('rétractation : délai dépassé signalé, avec la prolongation de douze mois', () => {
    const p = faire({ cas: 'retractation', variante: 'bien', objetAchat: 'un lave-linge', dateRef: '2026-09-01', dateEnvoi: '2026-10-20' });
    const r = p.reperes.find((x) => x.libelle === 'Envoi au plus tard le')!;
    expect(r.niveau).toBe('depasse');
    expect(r.detail).toContain('L221-20');
  });
  it('internet : préavis de dix jours (L224-39), restitution des avances (L224-35)', () => {
    const p = faire({ cas: 'internet', variante: 'fin' });
    expect(p.lettre.texte).toContain('article L224-39 du Code de la consommation');
    expect(p.lettre.texte).toContain('dix jours');
    expect(refs(p)).toEqual(expect.arrayContaining(['L224-39', 'L215-1-1', 'L224-35']));
    expect(p.lettre.objet).toContain('abonnement internet');
  });
  it('mobile prolongé : L224-40 ; tarif modifié : L224-33 avec limite à quatre mois', () => {
    const a = faire({ cas: 'mobile', variante: 'reconduction', dateRef: '2026-09-15' });
    expect(a.lettre.texte).toContain('L224-40');
    expect(a.lettre.objet).toContain('forfait mobile');
    const b = faire({ cas: 'mobile', variante: 'modification', dateRef: '2026-08-31' });
    expect(b.lettre.texte).toContain('L224-33');
    expect(b.reperes.find((r) => r.libelle === 'Envoi au plus tard le')?.valeur).toBe('jeudi 31 décembre 2026');
  });
  it('assurance auto après un an : L113-15-2, effet un mois après réception, remboursement sous trente jours', () => {
    const p = faire({ cas: 'auto', variante: 'un-an', dateRef: '2024-05-12' });
    expect(p.lettre.texte).toContain('article L113-15-2 du Code des assurances');
    expect(p.lettre.texte).toContain('un mois après votre réception');
    expect(p.lettre.texte).toContain('trente jours');
    expect(refs(p)).toEqual(expect.arrayContaining(['L113-15-2', 'L113-14']));
    expect(p.avertissements.join(' ')).toMatch(/obligatoire/);
    expect(p.reperes.some((r) => r.libelle.startsWith('Droit ouvert') && r.niveau === 'ok')).toBe(true);
  });
  it('assurance : moins d’un an, le droit n’est pas encore ouvert', () => {
    const p = faire({ cas: 'habitation', variante: 'un-an', dateRef: '2026-03-01' });
    const r = p.reperes.find((x) => x.libelle === 'Droit ouvert le')!;
    expect(r.valeur).toBe('lundi 1er mars 2027');
    expect(r.niveau).toBe('depasse');
  });
  it('assurance à l’échéance : L113-12, deux mois avant ; échéance un dimanche → limite la veille ouvrable', () => {
    const p = faire({ cas: 'habitation', variante: 'echeance', dateRef: '2027-01-02', dateEnvoi: '2026-10-20' });
    expect(p.lettre.texte).toContain('L113-12');
    // 2 mois avant le 2/1/2027 = 2/11/2026 (lundi) → ouvrable
    expect(p.reperes.find((r) => r.libelle === 'Envoi au plus tard le')?.valeur).toBe('lundi 2 novembre 2026');
    const q = faire({ cas: 'auto', variante: 'echeance', dateRef: '2027-01-01', dateEnvoi: '2026-10-20' });
    // 1/11/2026 est un dimanche férié → vendredi 30 octobre
    expect(q.reperes.find((r) => r.libelle === 'Envoi au plus tard le')?.valeur).toBe('vendredi 30 octobre 2026');
  });
  it('assurance à l’échéance : trop tard est signalé', () => {
    const p = faire({ cas: 'auto', variante: 'echeance', dateRef: '2026-12-01', dateEnvoi: '2026-10-20' });
    expect(p.reperes.find((r) => r.libelle === 'Envoi au plus tard le')?.niveau).toBe('depasse');
  });
  it('assurance avis incomplet : L113-15-1, effet le lendemain', () => {
    const p = faire({ cas: 'auto', variante: 'sans-avis', dateRef: '2026-09-01' });
    expect(p.lettre.texte).toContain('L113-15-1');
    expect(p.reperes.find((r) => r.libelle === 'Effet')?.valeur).toBe('mercredi 21 octobre 2026');
  });
  it('assurance après un événement : L113-16, trois mois', () => {
    const p = faire({ cas: 'habitation', variante: 'evenement', evenement: 'domicile', dateRef: '2026-08-31', dateEnvoi: '2026-10-20' });
    expect(p.lettre.texte).toContain('changement de domicile');
    expect(p.lettre.texte).toContain('L113-16');
    expect(p.reperes.find((r) => r.libelle === 'Envoi au plus tard le')?.valeur).toBe('lundi 30 novembre 2026');
  });
  it('mutuelle : Code de la mutualité L221-10-2 ou Code des assurances L113-15-2', () => {
    const m = faire({ cas: 'mutuelle', variante: 'mutuelle', dateRef: '2023-02-01' });
    expect(m.lettre.texte).toContain('article L221-10-2 du Code de la mutualité');
    expect(m.lettre.objet).toContain('Dénonciation');
    expect(refs(m)).toEqual(expect.arrayContaining(['L221-10-2', 'L221-10-3']));
    expect(m.avertissements.join(' ')).toMatch(/nouvel organisme/);
    const a = faire({ cas: 'mutuelle', variante: 'assureur', dateRef: '2023-02-01' });
    expect(a.lettre.texte).toContain('L113-15-2 du Code des assurances');
    expect(a.lettre.texte).not.toContain('Code de la mutualité');
  });
  it('salle de sport à l’échéance : préavis du contrat retiré de l’échéance ; sans rappel : L215-1', () => {
    const p = faire({ cas: 'salle', variante: 'echeance', dateRef: '2026-12-31', preavis: 30, dateEnvoi: '2026-10-20' });
    expect(p.lettre.texte).toContain('préavis de 30 jours');
    expect(p.reperes.find((r) => r.libelle === 'Envoi au plus tard le')?.valeur).toBe('mardi 1er décembre 2026');
    expect(p.lettre.objet).toContain('abonnement');
    const q = faire({ cas: 'salle', variante: 'reconduction', dateRef: '2026-09-01' });
    expect(q.lettre.texte).toContain('article L215-1 du Code de la consommation');
    expect(refs(q)).toEqual(expect.arrayContaining(['L215-1', 'L215-1-1']));
  });
  it('abonnement en ligne et presse : L215-1-1 (résiliation en ligne) cité', () => {
    for (const cas of ['abonnement', 'presse']) {
      const p = faire({ cas, variante: 'echeance', dateRef: '2027-02-01', preavis: 0 });
      expect(refs(p)).toContain('L215-1-1');
      expect(p.envoi).toContain('L215-1-1');
    }
  });
  it('énergie : L224-14 et L224-15, limite de trente jours', () => {
    const p = faire({ cas: 'energie', variante: 'electricite', dateRef: '2026-11-15', pdl: '12345678901234' });
    expect(p.lettre.texte).toContain('L224-14');
    expect(p.lettre.texte).toContain('L224-15');
    expect(p.lettre.texte).toContain('12345678901234');
    expect(p.reperes.find((r) => r.libelle === 'Date de fin souhaitée')?.niveau).toBe('ok');
    const loin = faire({ cas: 'energie', variante: 'gaz', dateRef: '2026-12-31', pdl: '99' });
    expect(loin.reperes.find((r) => r.libelle === 'Date de fin souhaitée')?.niveau).toBe('depasse');
    expect(loin.lettre.objet).toContain('gaz');
  });
});

describe('structure et champs', () => {
  it('chaque article cité existe dans le registre, avec un lien Légifrance', () => {
    for (const a of Object.values(ARTICLES)) expect(a.url).toMatch(/^https:\/\/www\.legifrance\.gouv\.fr\/codes\/(article_lc|section_lc)\//);
  });
  it('toutes les combinaisons cas × situation produisent une lettre sans article inconnu', () => {
    for (const c of CAS) for (const v of c.variantes) {
      const p = faire({ cas: c.id, variante: v.id, dateRef: '2026-12-01', objetAchat: 'x', pdl: '1', preavis: 15 });
      expect(p.articles.length, `${c.id}/${v.id}`).toBeGreaterThan(0);
      expect(p.lettre.texte, `${c.id}/${v.id}`).not.toContain('undefined');
      expect(p.lettre.texte).toContain('Madame, Monsieur,');
      expect(p.lettre.texte).toContain('salutations distinguées');
      expect(p.lettre.texte).not.toMatch(/\[[^\]]+\]/);
      expect(p.envoi.length).toBeGreaterThan(20);
      expect(p.pieces.length).toBeGreaterThan(0);
    }
  });
  it('champs manquants : la lettre garde des crochets visibles et dit quoi remplir', () => {
    const p = preparer({ ...DONNEES_VIDES, cas: 'auto', variante: 'un-an' }, '2026-10-20');
    expect(p.complet).toBe(false);
    expect(p.manquants).toEqual(expect.arrayContaining(['Nom', 'Adresse', 'Société', 'Souscrit le']));
    expect(p.lettre.texte).toContain('[Nom Prénom]');
  });
  it('les champs affichés suivent la situation', () => {
    expect(champsActifs('retractation', 'bien').dateRef?.label).toBe('Livré le');
    expect(champsActifs('retractation', 'service').dateRef?.label).toBe('Conclu le');
    expect(champsActifs('salle', 'echeance').preavis).toBe(true);
    expect(champsActifs('salle', 'reconduction').preavis).toBe(false);
    expect(champsActifs('internet', 'fin').dateRef?.requis).toBe(false);
    expect(champsManquants({ ...base, cas: 'internet', variante: 'fin' })).toEqual([]);
  });
  it('une date d’envoi vide prend la date du jour ; une situation inconnue retombe sur la première', () => {
    const p = preparer({ ...base, cas: 'internet', variante: 'zzz', dateEnvoi: '' }, '2026-10-20');
    expect(p.lettre.lieuDate).toBe('Lyon, le 20 octobre 2026');
    expect(nomFichier('internet', 'zzz')).toBe('lettre-internet-fin.pdf');
  });
});

describe('PDF', () => {
  it('produit un PDF lisible, A4, avec les accents (œ, é, ç, ’) dans le jeu Helvetica', async () => {
    const p = faire({ cas: 'retractation', variante: 'bien', objetAchat: 'un œuf à la coque ’déjà’ très cher — 12 €', dateRef: '2026-10-17' });
    const octets = await fabriquerPdf(p.lettre);
    expect(new TextDecoder().decode(octets.slice(0, 5))).toBe('%PDF-');
    const doc = await PDFDocument.load(octets);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });
  it('un caractère hors Helvetica devient « ? » au lieu de faire échouer le PDF', async () => {
    const { StandardFonts } = await import('pdf-lib');
    const d = await PDFDocument.create();
    const f = await d.embedFont(StandardFonts.Helvetica);
    const connus = new Set(f.getCharacterSet());
    expect(pourHelvetica('Été à Paris → œ ≤ 12 €', connus)).toBe('Été à Paris -> œ ? 12 €');
    const p = faire({ objetAchat: 'x', dateRef: '2026-10-17', cas: 'retractation', variante: 'bien', nom: 'Zoë ≤ Naïm' });
    await expect(fabriquerPdf(p.lettre)).resolves.toBeInstanceOf(Uint8Array);
  });
});
