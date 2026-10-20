import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { schemaFiche } from './lib/schema-fiche';

// Un dossier dont le nom commence par « _ » (le modèle) n'est pas publié ; OUTILS_MODELE=1 l'inclut pour l'essayer.
const motif = process.env.OUTILS_MODELE === '1' ? '*/{fr,en}.md' : '[!_]*/{fr,en}.md';

const outils = defineCollection({
  loader: glob({
    base: './src/outils',
    pattern: motif,
    generateId: ({ entry }) => entry.replace(/\.md$/, ''), // « heic-jpg/fr »
  }),
  schema: schemaFiche,
});

export const collections = { outils };
