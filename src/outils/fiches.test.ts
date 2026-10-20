// Garde-fou : chaque dossier d'outil respecte le contrat (fichiers, frontmatter, icône, adresses uniques).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { schemaFiche } from '../lib/schema-fiche';
import { ICONES } from '../lib/icones';

const racine = __dirname;
const dossiers = readdirSync(racine, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

const lire = (dossier: string, lang: string) => {
  const brut = readFileSync(join(racine, dossier, `${lang}.md`), 'utf8');
  const m = brut.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error(`${dossier}/${lang}.md : pas de frontmatter`);
  return { data: parse(m[1]), corps: brut.slice(m[0].length) };
};

describe('dossiers d’outils', () => {
  it('il y a au moins le modèle', () => expect(dossiers).toContain('_modele'));
  for (const d of dossiers) {
    describe(d, () => {
      for (const f of ['Outil.astro', 'outil.ts', 'outil.test.ts', 'fr.md']) it(`contient ${f}`, () => expect(existsSync(join(racine, d, f))).toBe(true));
      for (const lang of ['fr', 'en'].filter((l) => existsSync(join(racine, d, `${l}.md`)))) {
        it(`${lang}.md : frontmatter valide`, () => {
          const { data } = lire(d, lang);
          const r = schemaFiche.safeParse(data);
          expect(r.success, r.success ? '' : JSON.stringify(r.error.issues)).toBe(true);
          expect(data.lang).toBe(lang);
          expect(data.id, 'id = nom du dossier').toBe(d);
          expect(ICONES[data.icone], `icône inconnue : ${data.icone}`).toBeDefined();
        });
      }
    });
  }
  it('les adresses (lang + slug) sont uniques', () => {
    const vues = new Set<string>();
    for (const d of dossiers) for (const lang of ['fr', 'en']) {
      if (!existsSync(join(racine, d, `${lang}.md`))) continue;
      const k = `${lang}/${lire(d, lang).data.slug}`;
      expect(vues.has(k), `adresse en double : ${k}`).toBe(false);
      vues.add(k);
    }
  });
});
