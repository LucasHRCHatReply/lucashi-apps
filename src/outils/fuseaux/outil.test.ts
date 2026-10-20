import { describe, expect, it } from 'vitest';
import { casesDe, chercherVilles, composantes, debutFenetre, decalage, depuisFragment, ecartJour, genererIcs, heureLocale, instantLocal, libelleUtc, plage, resume, VILLES, villeParId, villesParDefaut, versFragment } from './outil';

const z = (s: string) => Date.parse(s);

describe('décalages réels (base de fuseaux, valeurs publiées)', () => {
  it('Paris : UTC+2 l’été, UTC+1 l’hiver', () => {
    expect(decalage(z('2025-07-01T12:00:00Z'), 'Europe/Paris')).toBe(120);
    expect(decalage(z('2025-12-01T12:00:00Z'), 'Europe/Paris')).toBe(60);
  });
  it('Kolkata UTC+5:30 et Tokyo UTC+9 toute l’année', () => {
    expect(decalage(z('2025-07-01T12:00:00Z'), 'Asia/Kolkata')).toBe(330);
    expect(decalage(z('2026-01-01T12:00:00Z'), 'Asia/Tokyo')).toBe(540);
    expect(libelleUtc(330)).toBe('UTC+5:30');
    expect(libelleUtc(-240)).toBe('UTC−4');
  });
  it('Sydney passe à l’heure d’été le 5/10/2025 (hémisphère sud)', () => {
    expect(decalage(z('2025-10-04T12:00:00Z'), 'Australia/Sydney')).toBe(600);
    expect(decalage(z('2025-10-05T12:00:00Z'), 'Australia/Sydney')).toBe(660);
  });
});

describe('changements d’heure : Paris le 26/10/2025, New York le 2/11/2025', () => {
  it('14 h à Paris = 8 h à New York avant le 26/10 (écart 6 h)', () => {
    const { ms } = instantLocal('2025-10-25', '14:00', 'Europe/Paris');
    expect(heureLocale(ms, 'America/New_York')).toBe('08:00');
  });
  it('entre le 26/10 et le 2/11, l’écart tombe à 5 h : 14 h à Paris = 9 h à New York', () => {
    const { ms } = instantLocal('2025-10-27', '14:00', 'Europe/Paris');
    expect(heureLocale(ms, 'America/New_York')).toBe('09:00');
  });
  it('après le 2/11, l’écart revient à 6 h', () => {
    const { ms } = instantLocal('2025-11-03', '14:00', 'Europe/Paris');
    expect(heureLocale(ms, 'America/New_York')).toBe('08:00');
  });
  it('retour de l’automne : 02:30 à Paris le 26/10/2025 existe deux fois, la première est retenue', () => {
    const r = instantLocal('2025-10-26', '02:30', 'Europe/Paris');
    expect(r.statut).toBe('ambigue');
    expect(new Date(r.ms).toISOString()).toBe('2025-10-26T00:30:00.000Z');
  });
  it('saut du printemps : 02:30 à Paris le 29/03/2026 n’existe pas, décalée à 03:30', () => {
    const r = instantLocal('2026-03-29', '02:30', 'Europe/Paris');
    expect(r.statut).toBe('inexistante');
    expect(heureLocale(r.ms, 'Europe/Paris')).toBe('03:30');
    expect(new Date(r.ms).toISOString()).toBe('2026-03-29T01:30:00.000Z');
  });
  it('New York : 01:30 le 2/11/2025 existe deux fois (EDT d’abord), 02:30 le 8/3/2026 n’existe pas', () => {
    const a = instantLocal('2025-11-02', '01:30', 'America/New_York');
    expect(a.statut).toBe('ambigue');
    expect(new Date(a.ms).toISOString()).toBe('2025-11-02T05:30:00.000Z');
    const b = instantLocal('2026-03-08', '02:30', 'America/New_York');
    expect(b.statut).toBe('inexistante');
    expect(new Date(b.ms).toISOString()).toBe('2026-03-08T07:30:00.000Z');
  });
  it('une heure ordinaire est « ok »', () => {
    expect(instantLocal('2026-06-15', '09:00', 'Asia/Tokyo').statut).toBe('ok');
  });
  it('aller-retour : l’heure locale relue est celle saisie', () => {
    const { ms } = instantLocal('2026-01-20', '23:15', 'Asia/Kolkata');
    const c = composantes(ms, 'Asia/Kolkata');
    expect([c.y, c.m, c.d, c.h, c.mi]).toEqual([2026, 1, 20, 23, 15]);
  });
});

describe('autres cas', () => {
  it('14 h à Paris l’été = 21 h à Tokyo, 17 h 30 à Kolkata, et le lendemain à Sydney', () => {
    const { ms } = instantLocal('2025-07-01', '14:00', 'Europe/Paris');
    expect(heureLocale(ms, 'Asia/Tokyo')).toBe('21:00');
    expect(heureLocale(ms, 'Asia/Kolkata')).toBe('17:30');
    const t = instantLocal('2025-07-01', '20:00', 'Europe/Paris').ms;
    expect(ecartJour(t, 'Australia/Sydney', 'Europe/Paris')).toBe(1);
    expect(ecartJour(t, 'America/New_York', 'Europe/Paris')).toBe(0);
  });
  it('la réglette commence à minuit local de la ville de référence', () => {
    expect(new Date(debutFenetre('2025-07-01', 'Europe/Paris')).toISOString()).toBe('2025-06-30T22:00:00.000Z');
  });
  it('plages : bureau 9-18 h, bord 7-9 et 18-22 h, nuit le reste', () => {
    expect([plage(8.5), plage(9), plage(17.5), plage(18), plage(21.9), plage(22), plage(3)]).toEqual(['bord', 'bureau', 'bureau', 'bord', 'bord', 'nuit', 'nuit']);
  });
  it('24 cases : la case de 14 h à Paris est « bureau », celle de 14 h à Tokyo (= 7 h Paris) est « bord »', () => {
    const debut = debutFenetre('2025-07-01', 'Europe/Paris');
    expect(casesDe(debut, 'Europe/Paris')[14]).toEqual({ h: 14, mi: 0, plage: 'bureau' });
    const t = casesDe(debut, 'Asia/Tokyo');
    expect(t).toHaveLength(24);
    expect(t[0]).toMatchObject({ h: 7, plage: 'bord' });
  });
  it('les cases d’un fuseau en demi-heure portent les minutes', () => {
    const c = casesDe(debutFenetre('2025-07-01', 'Europe/Paris'), 'Asia/Kolkata');
    expect(c[0]).toMatchObject({ h: 3, mi: 30 });
  });
});

describe('villes', () => {
  it('la liste a 300 à 500 villes, identifiants uniques, fuseaux valides', () => {
    expect(VILLES.length).toBeGreaterThanOrEqual(300);
    expect(VILLES.length).toBeLessThanOrEqual(500);
    expect(new Set(VILLES.map((v) => v.id)).size).toBe(VILLES.length);
    for (const v of VILLES) expect(() => decalage(0, v.tz), v.id).not.toThrow();
  });
  it('recherche par nom français ou anglais, sans accents', () => {
    expect(chercherVilles('londres', 'fr')[0].id).toBe('london');
    expect(chercherVilles('london', 'en')[0].id).toBe('london');
    expect(chercherVilles('new y', 'en')[0].id).toBe('new-york');
    expect(chercherVilles('pekin', 'fr')[0].id).toBe('beijing');
    expect(chercherVilles('zzzz', 'fr')).toEqual([]);
  });
  it('la recherche écarte les villes déjà choisies', () => {
    expect(chercherVilles('paris', 'fr', ['paris']).map((v) => v.id)).not.toContain('paris');
  });
  it('par défaut : la ville du visiteur puis deux autres, dans des décalages différents', () => {
    const maintenant = z('2026-06-01T12:00:00Z');
    const fr = villesParDefaut('Europe/Paris', 'fr', maintenant);
    expect(fr.map((v) => v.id)).toEqual(['paris', 'new-york', 'tokyo']);
    const ny = villesParDefaut('America/New_York', 'en', maintenant);
    expect(ny.map((v) => v.id)).toEqual(['new-york', 'london', 'tokyo']);
  });
  it('un fuseau absent de la liste devient une ville libre', () => {
    const v = villesParDefaut('Atlantic/Azores', 'fr', z('2026-06-01T12:00:00Z'))[0];
    expect(v.tz).toBe('Atlantic/Azores');
    expect(v.id).toBe('tz:Atlantic/Azores');
  });
  it('un identifiant tz: invalide est refusé', () => {
    expect(villeParId('tz:Pas/Un_Fuseau')).toBeUndefined();
    expect(villeParId('tz:<script>')).toBeUndefined();
  });
});

describe('fragment ⇄ état', () => {
  it('aller-retour : villes, ville de référence et heure locale', () => {
    const ms = instantLocal('2026-10-21', '14:00', 'Europe/Paris').ms;
    const f = versFragment({ villes: ['paris', 'tokyo', 'new-york'], ref: 'paris', ms });
    expect(f).toBe('#v=paris,tokyo,new-york&r=paris&t=2026-10-21T14:00');
    expect(depuisFragment(f)).toEqual({ villes: ['paris', 'tokyo', 'new-york'], ref: 'paris', ms });
  });
  it('la référence peut être une autre ville : 14 h à Tokyo', () => {
    const lu = depuisFragment('#v=paris,tokyo&r=tokyo&t=2026-10-21T14:00');
    expect(heureLocale(lu.ms!, 'Asia/Tokyo')).toBe('14:00');
    expect(heureLocale(lu.ms!, 'Europe/Paris')).toBe('07:00');
  });
  it('ignore les villes inconnues, les doublons et les heures absurdes', () => {
    const lu = depuisFragment('#v=paris,atlantide,paris,tokyo&t=2026-13-45T25:99');
    expect(lu.villes).toEqual(['paris', 'tokyo']);
    expect(lu.ms).toBeUndefined();
  });
  it('plafonne à 8 villes et accepte un fuseau libre', () => {
    const ids = VILLES.slice(0, 12).map((v) => v.id).join(',');
    expect(depuisFragment(`#v=${ids}`).villes).toHaveLength(8);
    expect(depuisFragment('#v=tz:Atlantic/Azores,paris').villes).toEqual(['tz:Atlantic/Azores', 'paris']);
  });
  it('fragment vide : rien', () => {
    expect(depuisFragment('')).toEqual({ villes: [], ref: undefined, ms: undefined });
  });
});

describe('résumé et calendrier', () => {
  const ms = instantLocal('2025-07-01', '20:00', 'Europe/Paris').ms;
  it('résumé : une ligne par ville avec le décalage de jour', () => {
    const r = resume(ms, ['paris', 'sydney'].map((i) => villeParId(i)!), 'Europe/Paris', 'fr');
    expect(r).toContain('20:00');
    expect(r).toContain('Paris (UTC+2)');
    expect(r).toContain('(+1 j)');
    expect(r).toContain('04:00');
  });
  it('.ics : heure en UTC, durée 1 h, fins de ligne CRLF, caractères échappés', () => {
    const ics = genererIcs({ debutMs: ms, titre: 'Point; équipe, ok', description: 'a\nb', maintenantMs: z('2025-06-01T00:00:00Z') });
    expect(ics).toContain('DTSTART:20250701T180000Z');
    expect(ics).toContain('DTEND:20250701T190000Z');
    expect(ics).toContain('SUMMARY:Point\\; équipe\\, ok');
    expect(ics).toContain('DESCRIPTION:a\\nb');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
  it('.ics : les longues descriptions sont pliées à 75 octets', () => {
    const ics = genererIcs({ debutMs: ms, titre: 't', description: 'é'.repeat(200) });
    const lignes = ics.split('\r\n');
    expect(lignes.some((l) => l.startsWith(' '))).toBe(true);
    expect(lignes.every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
