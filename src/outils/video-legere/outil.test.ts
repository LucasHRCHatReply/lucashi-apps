import { describe, expect, it } from 'vitest';
import { CIBLES, debitMinimal, dimensions, formaterDuree, formaterPoids, nomSortie, planifier, repasse, tempsEstime, type Source } from './outil';

// Cas réel : la vidéo d'essai du dépôt de mesure (70 s, 1080p30, 104 Mo, avec voix).
const essai: Source = { duree: 70, largeur: 1920, hauteur: 1080, fps: 30, octets: 104_088_059, aAudio: true };

describe('planifier', () => {
  it('WhatsApp 16 Mo sur 70 s : débit total sous la cible, définition réduite', () => {
    const p = planifier(essai, CIBLES.whatsapp);
    expect(p.octetsEstimes).toBeLessThanOrEqual(CIBLES.whatsapp);
    // (16 Mio × 8 × 0,95 / 70 s) = 1 736 kb/s au total, moins 96 kb/s d'audio
    expect(p.debitVideo + p.debitAudio).toBeLessThanOrEqual(Math.floor((CIBLES.whatsapp * 8 * 0.95) / 70) + 1);
    expect(p.petitCote).toBe(720);
    expect(p.reduit).toBe(true);
  });
  it('une courte vidéo garde sa définition', () => {
    const p = planifier({ ...essai, duree: 10, octets: 15_000_000 }, CIBLES.whatsapp);
    expect(p.petitCote).toBe(1080);
    expect(p.reduit).toBe(false);
  });
  it('une longue vidéo descend à 480 puis 360', () => {
    expect(planifier({ ...essai, duree: 150 }, CIBLES.whatsapp).petitCote).toBe(480);
    expect(planifier({ ...essai, duree: 900 }, CIBLES.whatsapp).petitCote).toBe(360);
  });
  it('le mail (25 Mo) laisse plus de définition que WhatsApp', () => {
    const w = planifier(essai, CIBLES.whatsapp), m = planifier(essai, CIBLES.mail);
    expect(m.debitVideo).toBeGreaterThan(w.debitVideo);
    expect(m.petitCote).toBeGreaterThanOrEqual(w.petitCote);
  });
  it('un fichier déjà léger n’est pas gonflé', () => {
    const p = planifier({ ...essai, duree: 20, octets: 2_000_000 }, CIBLES.whatsapp);
    expect(p.octetsEstimes).toBeLessThan(2_000_000);
  });
  it('sans piste audio : pas de budget audio', () => {
    expect(planifier({ ...essai, aAudio: false }, CIBLES.whatsapp).debitAudio).toBe(0);
  });
  it('plafonne à 30 images par seconde', () => {
    expect(planifier({ ...essai, fps: 60 }, CIBLES.whatsapp).fps).toBe(30);
  });
  it('vidéo verticale (iPhone) : le petit côté est la largeur', () => {
    const p = planifier({ ...essai, largeur: 1080, hauteur: 1920 }, CIBLES.whatsapp);
    expect(p.largeur).toBe(720);
    expect(p.hauteur).toBe(1280);
  });
});

describe('repasse', () => {
  it('baisse le budget quand le fichier dépasse', () => {
    const p1 = planifier(essai, CIBLES.whatsapp);
    const r = repasse(essai, CIBLES.whatsapp, p1, CIBLES.whatsapp * 1.15, 1);
    expect(r.plan.debitVideo).toBeLessThan(p1.debitVideo * 0.9);
    expect(r.plan.petitCote).toBeLessThanOrEqual(p1.petitCote);
  });
});

describe('repasse, encodeur qui ne tient pas le débit', () => {
  it('descend d’un palier de définition sans rogner le débit', () => {
    const p1 = planifier(essai, CIBLES.mail); // 1080p
    expect(p1.petitCote).toBe(1080);
    // cas réel mesuré : 95,7 Mo obtenus pour 2,75 Mb/s demandés (essai bruité, encodeur matériel)
    const r = repasse(essai, CIBLES.mail, p1, 95_743_378, 1);
    expect(r.plan.petitCote).toBe(720);
    expect(r.plan.debitVideo).toBeGreaterThan(p1.debitVideo * 0.9);
  });
});

describe('formats', () => {
  it('dimensions paires, jamais agrandies', () => {
    expect(dimensions(1920, 1080, 720)).toEqual({ largeur: 1280, hauteur: 720 });
    expect(dimensions(640, 360, 720)).toEqual({ largeur: 640, hauteur: 360 });
    expect(dimensions(1920, 1080, 480).largeur % 2).toBe(0);
  });
  it('débit minimal 1080p30 ≈ 1,9 Mb/s', () => {
    expect(debitMinimal(1920, 1080, 30)).toBe(1_866_240);
  });
  it('durée et poids', () => {
    expect(formaterDuree(70)).toBe('1 min 10 s');
    expect(formaterDuree(8)).toBe('8 s');
    expect(formaterPoids(104_088_059)).toBe('99,3 Mo');
    expect(formaterPoids(104_088_059, false)).toBe('99.3 MB');
    expect(formaterPoids(16 * 1048576)).toBe('16,0 Mo');
  });
  it('nom de sortie', () => {
    expect(nomSortie('IMG_0042.MOV', false)).toBe('IMG_0042-leger.mp4');
    expect(nomSortie('IMG_0042.MOV', true)).toBe('IMG_0042-son.m4a');
  });
  it('temps estimé : l’ordre de grandeur, plus long en ffmpeg', () => {
    const p = planifier(essai, CIBLES.whatsapp);
    expect(tempsEstime(essai, p, 'ffmpeg')).toBeGreaterThan(tempsEstime(essai, p, 'webcodecs') * 3);
  });
});
