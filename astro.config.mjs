import { defineConfig } from 'astro/config';

// SITE_URL : adresse publique (défaut : l'adresse de dev). INDEXABLE=true : la production.
const site = (process.env.SITE_URL ?? 'https://app.lucashirschauer.fr').replace(/\/$/, '');

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  outDir: process.env.OUT_DIR ?? 'dist', // le VPS construit dans dist.new puis l'échange
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
