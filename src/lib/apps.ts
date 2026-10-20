import apps from '../../public/apps.json';

export interface AppSite { id: string; nom: string; phrase: string; icone: string; page: string }
export const toutesLesApps = (apps as { apps: AppSite[] }).apps;
/** Trois icônes pour l'encart App Store. */
export const troisApps = () => toutesLesApps.slice(0, 3);
export const srcIcone = (a: AppSite) => '/' + a.icone;
