import { describe, expect, it } from 'vitest';
import { DONNEES_EXEMPLE, MODELES, LARGEUR_MAX, construireHtml, construireTexte, couleurSure, echapper, emailValide, imageSure, poidsImageIntegree, telHref, urlSure, documentHtml, type Donnees } from './outil';

const complet: Donnees = { ...DONNEES_EXEMPLE, x: 'x.com/camille', instagram: 'https://instagram.com/camille', facebook: 'facebook.com/atelier', youtube: 'youtube.com/@atelier', photo: 'https://exemple.fr/photo.jpg' };

describe('echapper', () => {
  it('neutralise les caractères du HTML', () => {
    expect(echapper(`<script>alert("x")</script> & l'a`)).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; l&#39;a');
  });
});

describe.each(MODELES)('modèle %s', (modele) => {
  const html = construireHtml({ ...complet, modele });
  it('ne contient ni <style>, ni classe, ni script, ni lien externe de feuille', () => {
    expect(html).not.toMatch(/<style|<script|<link|\sclass=|\sid=/i);
  });
  it('est un tableau avec des styles en ligne', () => {
    expect(html).toMatch(/^<table /);
    expect(html).toContain('style="');
  });
  it('reste sous 600 px de large', () => {
    for (const m of html.matchAll(/width(?:="|:)(\d+)/g)) expect(Number(m[1])).toBeLessThanOrEqual(LARGEUR_MAX);
  });
  it('porte le nom, le courriel cliquable et le téléphone cliquable', () => {
    expect(html).toContain('Camille Martin');
    expect(html).toContain('href="mailto:camille.martin@exemple.fr"');
    expect(html).toContain('href="tel:+33612345678"');
  });
  it('échappe un nom piégé', () => {
    const h = construireHtml({ ...complet, modele, nom: '<img src=x onerror=alert(1)>', poste: 'R&D "chef"' });
    expect(h).not.toContain('<img src=x');
    expect(h).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(h).toContain('R&amp;D &quot;chef&quot;');
  });
  it('n’émet aucun lien javascript:', () => {
    const h = construireHtml({ ...complet, modele, site: 'javascript:alert(1)', linkedin: 'data:text/html,x' });
    expect(h).not.toMatch(/href="(javascript|data):/i); // le texte saisi reste affiché, mais jamais cliquable
  });
  it('affiche les cinq réseaux saisis', () => {
    for (const r of ['LinkedIn', 'X', 'Instagram', 'Facebook', 'YouTube']) expect(html).toContain(`>${r}</a>`);
  });
});

describe('construireHtml', () => {
  it('donne une chaîne vide quand rien n’est saisi', () => {
    expect(construireHtml({ ...DONNEES_EXEMPLE, nom: '', poste: '', entreprise: '', telephone: '', email: '', site: '', adresse: '', linkedin: '' })).toBe('');
  });
  it('omet les lignes vides (pas de téléphone, pas de ligne T)', () => {
    const h = construireHtml({ ...DONNEES_EXEMPLE, telephone: '' });
    expect(h).not.toContain('tel:');
  });
  it('insère la photo avec dimensions et texte alternatif', () => {
    const h = construireHtml(complet);
    expect(h).toContain('<img src="https://exemple.fr/photo.jpg" width="88" height="88" alt="Camille Martin"');
  });
  it('refuse un SVG intégré et une couleur invalide', () => {
    expect(imageSure('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe('');
    expect(construireHtml({ ...DONNEES_EXEMPLE, couleur: 'red; background:url(x)' })).toContain('#0067b3');
  });
  it('le bandeau passe les liens en blanc sur la couleur choisie', () => {
    const h = construireHtml({ ...DONNEES_EXEMPLE, modele: 'bandeau', couleur: '#aa2200' });
    expect(h).toContain('bgcolor="#aa2200"');
    expect(h).toContain('href="mailto:camille.martin@exemple.fr" style="color:#ffffff');
  });
});

describe('aides', () => {
  it('urlSure ajoute https et refuse les autres schémas', () => {
    expect(urlSure('www.exemple.fr')).toBe('https://www.exemple.fr/');
    expect(urlSure('http://exemple.fr/a?b=1')).toBe('http://exemple.fr/a?b=1');
    expect(urlSure('ftp://exemple.fr')).toBe('');
    expect(urlSure('mailto:a@exemple.fr')).toBe('');
    expect(urlSure('localhost')).toBe('');
  });
  it('couleurSure accepte #abc et #aabbcc', () => {
    expect(couleurSure('#ABC')).toBe('#aabbcc');
    expect(couleurSure('#12345')).toBe('#0067b3');
  });
  it('emailValide / telHref', () => {
    expect(emailValide('camille@exemple.fr')).toBe(true);
    expect(emailValide('camille@')).toBe(false);
    expect(telHref('06 12 34 56 78')).toBe('tel:0612345678');
    expect(telHref('12')).toBe('');
  });
  it('poidsImageIntegree estime les octets', () => {
    expect(poidsImageIntegree('data:image/png;base64,AAAA')).toBe(3);
    expect(poidsImageIntegree('https://exemple.fr/a.png')).toBe(0);
  });
  it('texte brut et document complet', () => {
    expect(construireTexte(DONNEES_EXEMPLE)).toContain('E camille.martin@exemple.fr');
    expect(documentHtml('<table></table>', 'en')).toContain('<html lang="en">');
  });
});
