import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { Resvg } from '@resvg/resvg-js';
import { PDFDocument } from 'pdf-lib';
import { chaineWifi, echapper, valider, compatiblePDF, nomFichier, messageErreur } from './outil';
import { matriceQR } from './qr';
import { fiche, pageA4, versSVG, versPDF, type ParamsFiche, type Modele } from './fiche';

const r = (o: Partial<Parameters<typeof chaineWifi>[0]> = {}) => ({ ssid: 'Maison', mdp: 'motdepasse1', securite: 'WPA' as const, masque: false, ...o });

describe('chaineWifi : format WIFI: de ZXing', () => {
  it('1. réseau WPA simple', () => {
    expect(chaineWifi(r())).toBe('WIFI:T:WPA;S:Maison;P:motdepasse1;H:false;;');
  });
  it('2. réseau masqué', () => {
    expect(chaineWifi(r({ masque: true }))).toBe('WIFI:T:WPA;S:Maison;P:motdepasse1;H:true;;');
  });
  it('3. réseau ouvert : pas de champ P, même si un mot de passe reste saisi', () => {
    expect(chaineWifi(r({ securite: 'nopass', mdp: 'oublie' }))).toBe('WIFI:T:nopass;S:Maison;H:false;;');
  });
  it('4. WEP', () => {
    expect(chaineWifi(r({ securite: 'WEP', mdp: 'abcde' }))).toBe('WIFI:T:WEP;S:Maison;P:abcde;H:false;;');
  });
  it('5. caractères spéciaux du nom : \\ ; , : " sont échappés', () => {
    expect(chaineWifi(r({ ssid: 'Chez "Jo"; box:2,4' }))).toBe(String.raw`WIFI:T:WPA;S:Chez \"Jo\"\; box\:2\,4;P:motdepasse1;H:false;;`);
  });
  it('6. caractères spéciaux du mot de passe, y compris la barre oblique inverse', () => {
    expect(chaineWifi(r({ mdp: 'a;b,c:d\\e"f12' }))).toBe(String.raw`WIFI:T:WPA;S:Maison;P:a\;b\,c\:d\\e\"f12;H:false;;`);
  });
  it('7. accents, espaces et émojis restent tels quels', () => {
    expect(chaineWifi(r({ ssid: 'Café du Port 📶' }))).toContain('S:Café du Port 📶;');
  });
  it('echapper ne touche pas aux autres signes', () => {
    expect(echapper("l'été-#!@")).toBe("l'été-#!@");
  });
});

describe('valider', () => {
  it('un réseau WPA correct est valide', () => expect(valider(r())).toEqual([]));
  it('nom vide', () => expect(valider(r({ ssid: '' }))).toEqual(['ssid-vide']));
  it('nom de plus de 32 octets (compté en octets, pas en caractères)', () => {
    expect(valider(r({ ssid: 'a'.repeat(32) }))).toEqual([]);
    expect(valider(r({ ssid: 'a'.repeat(33) }))).toEqual(['ssid-long']);
    expect(valider(r({ ssid: 'é'.repeat(17) }))).toEqual(['ssid-long']); // 34 octets
  });
  it('mot de passe WPA : 8 à 63 caractères, ou 64 chiffres hexadécimaux', () => {
    expect(valider(r({ mdp: '1234567' }))).toEqual(['mdp-court']);
    expect(valider(r({ mdp: '12345678' }))).toEqual([]);
    expect(valider(r({ mdp: 'a'.repeat(63) }))).toEqual([]);
    expect(valider(r({ mdp: 'a'.repeat(64) }))).toEqual([]); // 64 hexadécimaux = clé brute
    expect(valider(r({ mdp: 'z'.repeat(64) }))).toEqual(['mdp-long']);
  });
  it('WEP : 5 ou 13 caractères, ou 10 ou 26 hexadécimaux', () => {
    expect(valider(r({ securite: 'WEP', mdp: 'abcd' }))).toEqual(['wep-longueur']);
    expect(valider(r({ securite: 'WEP', mdp: '0123456789' }))).toEqual([]);
    expect(valider(r({ securite: 'WEP', mdp: 'zzzzzzzzzz' }))).toEqual(['wep-longueur']);
  });
  it('réseau ouvert : aucun mot de passe exigé', () => expect(valider(r({ securite: 'nopass', mdp: '' }))).toEqual([]));
  it('messages dans les deux langues', () => {
    expect(messageErreur('ssid-vide', 'fr')).toMatch(/nom du réseau/);
    expect(messageErreur('ssid-vide', 'en')).toMatch(/network name/);
  });
});

describe('divers', () => {
  it('nomFichier ne contient jamais le mot de passe et reste sûr', () => {
    expect(nomFichier('Café du Port !', 'carte', 'pdf')).toBe('qr-wifi-cafe-du-port-carte.pdf');
    expect(nomFichier('📶', 'code', 'png')).toBe('qr-wifi-reseau-code.png');
  });
  it('compatiblePDF repère ce que Helvetica ne sait pas écrire', () => {
    expect(compatiblePDF('Café — « Chez Jo » €')).toBe(true);
    expect(compatiblePDF('Wi-Fi 📶')).toBe(false);
    expect(compatiblePDF('日本')).toBe(false);
  });
});

// --- Relecture : le QR produit se décode, jusque dans la fiche complète ---
function decoderSVG(svg: string, largeur: number): string | null {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: largeur }, background: '#ffffff' }).render();
  const code = jsQR(new Uint8ClampedArray(png.pixels), png.width, png.height);
  return code ? code.data : null;
}
const MODELES: Modele[] = ['code', 'minimal', 'carte', 'affiche'];
const base: ParamsFiche = { modele: 'code', ssid: 'Maison', mdp: 'motdepasse1', securite: 'WPA', titre: 'Bienvenue', visible: 'tout', lang: 'fr' };

describe('le QR se relit', () => {
  const cas = [
    r(),
    r({ ssid: 'Chez "Jo"; box:2,4', mdp: 'a;b,c:d\\e"f12' }),
    r({ ssid: 'Café du Port', mdp: 'très-secrète-é-ü-12' }),
    r({ securite: 'nopass', mdp: '', masque: true }),
    r({ mdp: 'x'.repeat(63) }),
  ];
  for (const reseau of cas) {
    const texte = chaineWifi(reseau);
    it(`matrice brute : ${texte.slice(0, 40)}…`, () => {
      const m = matriceQR(texte);
      const e = 8, n = m.taille, tot = n + 2 * 4;
      const px = new Uint8ClampedArray(tot * e * tot * e * 4).fill(255);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m.sombre(x, y)) {
        for (let j = 0; j < e; j++) for (let i = 0; i < e; i++) { const o = (((y + 4) * e + j) * tot * e + (x + 4) * e + i) * 4; px[o] = px[o + 1] = px[o + 2] = 0; }
      }
      expect(jsQR(px, tot * e, tot * e)?.data).toBe(texte);
    });
  }
  for (const modele of MODELES) {
    it(`fiche « ${modele} » : le code lu dans l’image rendue est la chaîne WIFI`, () => {
      const texte = chaineWifi(cas[1]);
      const f = fiche({ ...base, modele, ssid: cas[1].ssid, mdp: cas[1].mdp }, matriceQR(texte));
      expect(decoderSVG(versSVG(f), 1400)).toBe(texte);
    });
    it(`page A4 « ${modele} » : même relecture`, () => {
      const texte = chaineWifi(cas[2]);
      const f = pageA4(fiche({ ...base, modele, ssid: cas[2].ssid, mdp: cas[2].mdp }, matriceQR(texte)));
      expect(f.largeur).toBe(210);
      expect(decoderSVG(versSVG(f), 1600)).toBe(texte);
    });
  }
});

describe('fiche', () => {
  const m = matriceQR(chaineWifi(r()));
  it('tailles réelles : code carré, minimal et carte en A6, affiche en A4', () => {
    const dim = (mod: Modele) => { const f = fiche({ ...base, modele: mod }, m); return [f.largeur, f.hauteur]; };
    expect(dim('code')).toEqual([100, 100]);
    expect(dim('minimal')).toEqual([105, 148]);
    expect(dim('carte')).toEqual([105, 148]);
    expect(dim('affiche')).toEqual([210, 297]);
  });
  it('le mot de passe n’apparaît dans la fiche que si « tout » est choisi', () => {
    const txt = (visible: ParamsFiche['visible']) => versSVG(fiche({ ...base, modele: 'carte', mdp: 'secretissime', visible }, m));
    expect(txt('tout')).toContain('secretissime');
    expect(txt('reseau')).not.toContain('secretissime');
    expect(txt('reseau')).toContain('Maison');
    expect(txt('rien')).not.toContain('Maison');
  });
  it('un réseau ouvert n’affiche jamais de mot de passe', () => {
    const svg = versSVG(fiche({ ...base, modele: 'affiche', securite: 'nopass', mdp: 'oublie' }, m));
    expect(svg).not.toContain('oublie');
    expect(svg).toContain('Réseau ouvert');
  });
  it('un nom très long est réduit pour tenir dans la fiche', () => {
    const f = fiche({ ...base, modele: 'carte', ssid: 'W'.repeat(32) }, m);
    const t = f.elements.find((e) => e.t === 'texte' && e.texte === 'W'.repeat(32));
    expect(t && t.t === 'texte' && t.s).toBeLessThan(6.2);
  });
  it('le texte est échappé dans le SVG', () => {
    const svg = versSVG(fiche({ ...base, modele: 'carte', ssid: '<b>&"x"' }, m));
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('&lt;b&gt;&amp;&quot;x&quot;');
  });
  it('en anglais, les libellés changent', () => {
    expect(versSVG(fiche({ ...base, modele: 'affiche', lang: 'en', titre: 'Welcome' }, m))).toContain('Connect to the Wi-Fi');
  });
});

describe('PDF', () => {
  const m = matriceQR(chaineWifi(r()));
  it('une page A4 pour chaque modèle, texte lisible', async () => {
    for (const modele of MODELES) {
      const octets = await versPDF(pageA4(fiche({ ...base, modele }, m)));
      expect(new TextDecoder().decode(octets.slice(0, 5))).toBe('%PDF-');
      const doc = await PDFDocument.load(octets);
      expect(doc.getPageCount()).toBe(1);
      const { width, height } = doc.getPage(0).getSize();
      expect(Math.round(width)).toBe(595);
      expect(Math.round(height)).toBe(842);
    }
  });
  it('un nom avec un émoji ne casse pas le PDF (remplacé par ?)', async () => {
    const octets = await versPDF(pageA4(fiche({ ...base, modele: 'carte', ssid: 'Wi-Fi 📶' }, m)));
    expect(octets.length).toBeGreaterThan(1000);
  });
});
