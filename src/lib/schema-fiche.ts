import { z } from 'astro/zod';

export const CATEGORIES = ['images', 'documents', 'argent', 'pratique'] as const;
export type Categorie = (typeof CATEGORIES)[number];

// Frontmatter d'une fiche d'outil (src/outils/<id>/fr.md ou en.md). Voir le contrat d'architecture.
export const schemaFiche = z.object({
  id: z.string().regex(/^_?[a-z0-9-]+$/, 'id : minuscules, chiffres, tirets (= nom du dossier)'),
  lang: z.enum(['fr', 'en']),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug : minuscules, chiffres, tirets'),
  titre: z.string().min(10).max(60),
  h1: z.string().min(5),
  description: z.string().min(140, 'description : 140 caractères au moins').max(160, 'description : 160 caractères au plus'),
  nom_court: z.string().min(2).max(32),
  phrase: z.string().min(5),
  categorie: z.enum(CATEGORIES),
  icone: z.string().min(1),
  mots_cles: z.array(z.string()).min(1),
  faq: z.array(z.object({ q: z.string(), r: z.string() })).default([]),
  mis_a_jour: z.coerce.date(),
  sources: z.array(z.union([z.string(), z.object({ titre: z.string(), url: z.string().url().optional() })])).default([]),
  // outil de calcul : la pastille dit « Calcul instantané, sans inscription » au lieu de « Traité sur votre appareil »
  calcul: z.boolean().default(false),
  // outil traité par le serveur du site (arnaque) : la pastille dit « Analysé par notre serveur, rien n'est conservé »
  serveur: z.boolean().default(false),
  // outil automatique (deuxième vague) : en tête de l'accueil et du hub
  en_avant: z.boolean().default(false),
});
export type DonneesFiche = z.infer<typeof schemaFiche>;
