import { describe, expect, it } from 'vitest';
import { adresseApi, cheminHotes, dateFr, interroger, messageHttp, premierAvis, secondes } from './outil';
import { decouperDomaine, distance, extraireLiens, hoteUnicode, imitations, indicesTexte, marqueOfficielle, squelette } from '../../../serveur/arnaque/regles.mjs';

// Messages types : trois arnaques réalistes (domaines fictifs construits comme les vrais : mot de la marque + mot du prétexte),
// trois messages légitimes avec les liens officiels. Le verdict attendu est celui qu'un humain donnerait.
const ARNAQUES = [
  'Colissimo : votre colis est en attente. Reglez 1,99 EUR de frais de livraison sous 24h : https://colissimo.fr.suivi-colis-fr.top/pay',
  'Ameli : un remboursement de 214,80 EUR est disponible. Connectez-vous : ameli-remboursement.com/connexion',
  'Dernier avis : amende impayee, majoration sous 48h. Payez sur https://antai-gouv-paiement.xyz/amende',
];
const LEGITIMES = [
  'La Poste : votre colis 6A12345678901 sera livre demain. Suivi : https://www.laposte.fr/outils/suivre-vos-envois',
  'Assurance maladie : votre attestation de droits est disponible dans votre compte ameli.fr',
  'Votre avis d\'impot 2026 est disponible dans votre espace particulier sur impots.gouv.fr. Ne communiquez jamais votre mot de passe.',
];

describe('premier avis (sans réseau)', () => {
  it.each(ARNAQUES)('arnaque très probable : %s', (t) => expect(premierAvis(t).verdict.cle).toBe('tres_probable'));
  it.each(LEGITIMES)('rien de suspect : %s', (t) => expect(premierAvis(t).verdict.cle).toBe('rien'));
  it('ne dit jamais « sûr »', () => {
    for (const t of [...ARNAQUES, ...LEGITIMES, 'bonjour']) expect(premierAvis(t).verdict.phrase).not.toMatch(/100 ?%|certain|sûr/i);
  });
  it('des indices du texte seuls ne suffisent jamais pour « très probable »', () => {
    const t = 'URGENT dernier avis : votre colis est en attente, reglez 1,99 EUR sous 24h, envoyez votre code recu, votre compte sera bloque, remboursement offert';
    const a = premierAvis(t);
    expect(a.nbLiens).toBe(0);
    expect(a.verdict.cle).not.toBe('tres_probable');
    expect(a.verdict.cle).toBe('douteux');
  });
  it('un message banal sans lien est sans suspect', () => expect(premierAvis('Rendez-vous demain a 18h, apporte le gateau !').verdict.cle).toBe('rien'));
});

describe('extraction des liens', () => {
  it('trouve les liens avec ou sans http, les raccourcis, ignore les e-mails et les phrases collées', () => {
    const { liens, adresses } = extraireLiens('Voir bit.ly/3xYzAb, www.exemple-colis.com/x?a=1 et https://laposte.fr. Ecrivez a contact@exemple.fr. Fin.Merci beaucoup');
    expect(liens.map((l) => l.hote)).toEqual(['bit.ly', 'www.exemple-colis.com', 'laposte.fr']);
    expect(adresses).toEqual(['exemple.fr']);
  });
  it('lit l\'arobase trompeuse', () => {
    const { liens } = extraireLiens('https://www.laposte.fr@evil-livraison.top/x');
    expect(liens[0].hote).toBe('evil-livraison.top');
    expect(liens[0].arobase).toBe('www.laposte.fr');
    expect(premierAvis('https://www.laposte.fr@evil-livraison.top/x').verdict.cle).toBe('tres_probable');
  });
  it('ignore les numéros de version et les nombres à virgule', () => expect(extraireLiens('version 1.2.3 et 12.50 euros').liens).toEqual([]));
  it('plafonne à 8 liens', () => expect(extraireLiens(Array.from({ length: 20 }, (_, i) => `a${i}.com`).join(' ')).liens.length).toBe(8));
});

describe('domaines', () => {
  it('découpe domaine, nom et sous-domaines', () => {
    expect(decouperDomaine('laposte.fr.suivi-colis.com')).toMatchObject({ domaine: 'suivi-colis.com', nom: 'suivi-colis', sous: ['laposte', 'fr'] });
    expect(decouperDomaine('www.service.gov.uk').domaine).toBe('service.gov.uk');
    expect(decouperDomaine('impots.gouv.fr').domaine).toBe('impots.gouv.fr');
    expect(decouperDomaine('monsite.github.io').domaine).toBe('monsite.github.io');
    // relevé en ligne le 21/10 : roblox.com.ml donnait « le nom com est celui de Amazon »
    expect(decouperDomaine('roblox.com.ml')).toMatchObject({ domaine: 'roblox.com.ml', nom: 'roblox', suffixe: 'com.ml' });
    expect(imitations('roblox.com.ml').some((r) => /Amazon/.test(JSON.stringify(r)))).toBe(false);
  });
  it('lit le punycode', () => {
    expect(hoteUnicode('xn--bcher-kva.example')).toBe('bücher.example');
    expect(hoteUnicode('xn--80ak6aa92e.com')).toBe('аррӏе.com'); // « apple » écrit en cyrillique
  });
  it('distance d\'édition et squelette', () => {
    expect(distance('laposte', 'laposta')).toBe(1);
    expect(squelette('l4poste')).not.toBe(squelette('laposte'));
    expect(squelette('iaposte')).toBe(squelette('laposte'));
    expect(squelette('amel1')).toBe(squelette('ameli'));
    expect(squelette('rnicrosoft')).toBe(squelette('microsoft'));
  });
  it('reconnaît les sites officiels', () => {
    for (const d of ['laposte.fr', 'www.ameli.fr', 'impots.gouv.fr', 'amazon.fr', 'ca-paris.fr', 'mabanque.bnpparibas', 'www.credit-agricole.fr', 'caf.fr']) expect(marqueOfficielle(d), d).not.toBeNull();
    for (const d of ['laposte.com.fr', 'ameli.top', 'ca-paris.com']) expect(marqueOfficielle(d), d).toBeNull();
  });
});

describe('imitation de marque', () => {
  const marque = (h: string) => imitations(h).filter((i) => i.niveau === 'fort').map((i) => i.marque);
  it('marque dans un sous-domaine', () => expect(marque('laposte.fr.suivi-colis.com')).toEqual(['laposte']));
  it('nom de la marque dans le domaine', () => {
    expect(marque('ameli-remboursement.com')).toEqual(['ameli']);
    expect(marque('colissimo-suivi.net')).toEqual(['laposte']);
    expect(marque('connexion-boursorama.fr')).toEqual(['boursorama']);
    expect(marque('societegenerale-secure.com')).toEqual(['sg']);
    expect(marque('chronopost-livraison.info')).toEqual(['chronopost']);
    expect(marque('netflix-facturation.top')).toEqual(['netflix']);
    expect(marque('vinted-paiement.fr')).toEqual(['vinted']);
    expect(marque('leboncoin-securise.com')).toEqual(['leboncoin']);
  });
  it('faute de frappe, homoglyphe, même nom autre extension', () => {
    expect(marque('l4poste.fr')).toEqual(['laposte']);
    expect(marque('laposta.fr')).toEqual(['laposte']);
    expect(marque('amel1.fr')).toEqual(['ameli']);
    expect(marque('аmeli.fr')).toEqual(['ameli']); // « а » cyrillique
    expect(marque('xn--meli-9ve.fr')).toEqual(['ameli']);
    expect(marque('laposte.xyz')).toEqual(['laposte']);
    expect(marque('bnpparibas.top')).toEqual(['bnp']);
  });
  it('mots courts : seulement en mot entier', () => {
    expect(marque('caf-allocations.com')).toEqual(['caf']);
    expect(marque('cafe-du-coin.fr')).toEqual([]);
    expect(marque('lcl-secure.com')).toEqual(['lcl']);
    expect(marque('calcul-lcl.fr')).toEqual(['lcl']);
    expect(marque('chocolat.fr')).toEqual([]);
  });
  it('ne s\'en prend pas aux sites officiels ni à des sites sans rapport', () => {
    for (const h of ['www.laposte.fr', 'colissimo.fr', 'ameli.fr', 'espace.impots.gouv.fr', 'www.amazon.fr', 'ca-normandie.fr', 'lemonde.fr', 'wikipedia.org', 'google.com', 'service-public.fr']) expect(imitations(h), h).toEqual([]);
  });
});

describe('indices du texte', () => {
  const codes = (t: string) => indicesTexte(t).map((i) => i.code);
  it('urgence, petit montant, colis, surtaxe, demande de code', () => {
    expect(codes('Reglez 1,99 EUR de frais avant ce soir')).toEqual(expect.arrayContaining(['urgence', 'petit-montant']));
    expect(codes('Votre colis est bloque')).toContain('colis-attente');
    expect(codes('Rappelez le 0892 12 34 56')).toContain('surtaxe');
    expect(codes('Rappelez le 0800 12 34 56')).not.toContain('surtaxe');
    expect(codes('Envoyez-nous le code recu par SMS')).toContain('demande-code');
  });
  it('« ne communiquez jamais votre code » n\'est pas une demande de code', () => expect(codes('Ne communiquez jamais votre code a personne')).not.toContain('demande-code'));
});

describe('échanges avec le serveur', () => {
  it('adresse de l\'API', () => {
    expect(adresseApi(undefined)).toBe('/api/arnaque');
    expect(adresseApi('http://127.0.0.1:8241/api/arnaque')).toBe('http://127.0.0.1:8241/api/arnaque');
  });
  it('messages d\'erreur humains', () => {
    expect(messageHttp(429).message).toMatch(/minute/);
    expect(messageHttp(503).message).toMatch(/occupé/);
    expect(messageHttp(500).message).not.toMatch(/500|exception/i);
  });
  it('interroger : réponse, panne réseau, 429', async () => {
    const ok = (async () => new Response(JSON.stringify({ verdict: { cle: 'rien' }, raisons: [], liens: [], listes: [], duree_ms: 5 }))) as unknown as typeof fetch;
    expect((await interroger('x', '/api/arnaque', undefined, ok)).duree_ms).toBe(5);
    const panne = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    await expect(interroger('x', '/api/arnaque', undefined, panne)).rejects.toMatchObject({ code: 'reseau' });
    const trop = (async () => new Response('{}', { status: 429 })) as unknown as typeof fetch;
    await expect(interroger('x', '/api/arnaque', undefined, trop)).rejects.toMatchObject({ code: 'limite' });
  });
  it('chemin d\'un lien, dates et durées', () => {
    expect(cheminHotes({ hote: 'bit.ly', chaine: [{ url: 'https://bit.ly/a', statut: 301, via: 'http' }, { url: 'https://faux.example.org/', statut: 200, via: null }, { url: 'https://faux.example.org/x', statut: 200, via: null }] }).map((c) => c.hote)).toEqual(['bit.ly', 'faux.example.org']);
    expect(cheminHotes({ hote: 'a.fr', chaine: [] })).toEqual([{ hote: 'a.fr', statut: null }]);
    expect(dateFr(null)).toBe('n/a');
    expect(secondes(2340)).toMatch(/^2,3 s$/);
  });
});
