// Fabrique villes.json depuis GeoNames cities15000 (CC-BY 4.0, https://www.geonames.org/).
// Usage : node construire-villes.mjs <cities15000.txt>  — sélection : capitales + plus grandes villes, plafonnées par pays.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FR = {
  'London': 'Londres', 'Moscow': 'Moscou', 'Beijing': 'Pékin', 'Brussels': 'Bruxelles', 'Geneva': 'Genève', 'Prague': 'Prague',
  'Rome': 'Rome', 'Vienna': 'Vienne', 'Warsaw': 'Varsovie', 'Lisbon': 'Lisbonne', 'Athens': 'Athènes', 'Copenhagen': 'Copenhague',
  'Cairo': 'Le Caire', 'Algiers': 'Alger', 'Tunis': 'Tunis', 'Kyiv': 'Kiev', 'Bucharest': 'Bucarest', 'Belgrade': 'Belgrade',
  'Saint Petersburg': 'Saint-Pétersbourg', 'Mexico City': 'Mexico', 'New Delhi': 'New Delhi', 'Tehran': 'Téhéran', 'Baghdad': 'Bagdad',
  'Damascus': 'Damas', 'Jerusalem': 'Jérusalem', 'Kuwait City': 'Koweït', 'Doha': 'Doha', 'Riyadh': 'Riyad', 'Muscat': 'Mascate',
  'Hanoi': 'Hanoï', 'Ho Chi Minh City': 'Hô Chi Minh-Ville', 'Kathmandu': 'Katmandou', 'Seoul': 'Séoul', 'Taipei': 'Taipei',
  'Singapore': 'Singapour', 'Kuala Lumpur': 'Kuala Lumpur', 'Wellington': 'Wellington', 'Havana': 'La Havane', 'New York': 'New York', 'Panama City': 'Panama',
  'Brasilia': 'Brasilia', 'Sao Paulo': 'São Paulo', 'Cologne': 'Cologne', 'Munich': 'Munich', 'Milan': 'Milan', 'Naples': 'Naples',
  'Turin': 'Turin', 'Florence': 'Florence', 'Venice': 'Venise', 'Seville': 'Séville', 'Zurich': 'Zurich', 'Luxembourg': 'Luxembourg',
  'The Hague': 'La Haye', 'Marseille': 'Marseille', 'Nuremberg': 'Nuremberg', 'Edinburgh': 'Édimbourg', 'Dublin': 'Dublin',
  'Reykjavik': 'Reykjavik', 'Helsinki': 'Helsinki', 'Tallinn': 'Tallinn', 'Riga': 'Riga', 'Vilnius': 'Vilnius', 'Sofia': 'Sofia',
  'Ankara': 'Ankara', 'Istanbul': 'Istanbul', 'Addis Ababa': 'Addis-Abeba', 'Nairobi': 'Nairobi', 'Kinshasa': 'Kinshasa',
  'Casablanca': 'Casablanca', 'Marrakesh': 'Marrakech', 'Rabat': 'Rabat', 'Tangier': 'Tanger', 'Alexandria': 'Alexandrie',
  'Mogadishu': 'Mogadiscio', 'Khartoum': 'Khartoum', 'Cape Town': 'Le Cap', 'Johannesburg': 'Johannesburg', 'Dakar': 'Dakar',
  'Abidjan': 'Abidjan', 'Lagos': 'Lagos', 'Tashkent': 'Tachkent', 'Astana': 'Astana', 'Almaty': 'Almaty', 'Baku': 'Bakou', 'Tbilisi': 'Tbilissi',
  'Yerevan': 'Erevan', 'Colombo': 'Colombo', 'Dhaka': 'Dacca', 'Yangon': 'Rangoun', 'Phnom Penh': 'Phnom Penh', 'Vientiane': 'Vientiane',
  'Ulaanbaatar': 'Oulan-Bator', 'Honolulu': 'Honolulu', 'Anchorage': 'Anchorage', 'Montreal': 'Montréal', 'Quebec': 'Québec',
  'Lima': 'Lima', 'Bogota': 'Bogota', 'Santiago': 'Santiago', 'Buenos Aires': 'Buenos Aires', 'Montevideo': 'Montevideo',
  'Asuncion': 'Asunción', 'Caracas': 'Caracas', 'La Paz': 'La Paz', 'Quito': 'Quito', 'Port-au-Prince': 'Port-au-Prince',
  'Papeete': 'Papeete', 'Noumea': 'Nouméa', 'Saint-Denis': 'Saint-Denis (La Réunion)', 'Fort-de-France': 'Fort-de-France',
};
// villes françaises d'outre-mer et d'ailleurs à garder même si petites
const dossier = dirname(fileURLToPath(import.meta.url));
const lignes = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'));
const villes = lignes.map((c) => ({ nom: c[1], ascii: c[2], cc: c[8], classe: c[7], pop: +c[14], tz: c[17] }));
const capitales = villes.filter((v) => v.classe === 'PPLC');
const plafond = (cc) => ({ US: 22, CN: 18, IN: 14, BR: 10, RU: 10, CA: 9, JP: 8, AU: 8, FR: 10, DE: 8, GB: 6, MX: 6, ES: 6, IT: 6, ID: 6, TR: 4, NG: 4, ZA: 4, AR: 4, PK: 4 }[cc] ?? 2);
const choix = new Map();
const cle = (v) => `${v.cc}/${v.ascii}`;
for (const v of capitales) choix.set(cle(v), v);
const compte = {};
for (const v of choix.values()) compte[v.cc] = (compte[v.cc] ?? 0) + 1;
for (const v of [...villes].sort((a, b) => b.pop - a.pop)) {
  if (choix.size >= 400) break;
  if (choix.has(cle(v))) continue;
  if ((compte[v.cc] ?? 0) >= plafond(v.cc)) continue;
  choix.set(cle(v), v);
  compte[v.cc] = (compte[v.cc] ?? 0) + 1;
}
// villes toujours présentes (Paris, fuseaux de référence des réunions)
for (const [asc, cc] of [['Paris', 'FR'], ['London', 'GB'], ['New York City', 'US'], ['Tokyo', 'JP'], ['Sydney', 'AU'], ['Los Angeles', 'US'], ['Dubai', 'AE'], ['Singapore', 'SG'], ['Honolulu', 'US'], ['Anchorage', 'US'], ['Noumea', 'NC'], ['Papeete', 'PF'], ['Saint-Denis', 'RE'], ['Fort-de-France', 'MQ']]) {
  const v = villes.find((x) => x.ascii === asc && x.cc === cc);
  if (v) choix.set(cle(v), v);
}
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sortie = [...choix.values()].map((v) => {
  const en = { 'New York City': 'New York', 'Koeln': 'Cologne' }[v.ascii] ?? v.ascii;
  return [slug(en) + (en === 'Saint-Denis' ? '-re' : ''), en, FR[en] ?? v.nom, v.cc, v.tz];
}).sort((a, b) => a[1].localeCompare(b[1]));
const vus = {};
for (const s of sortie) vus[s[0]] = (vus[s[0]] ?? 0) + 1;
for (const s of sortie) if (vus[s[0]] > 1) s[0] += '-' + s[3].toLowerCase();
if (new Set(sortie.map((s) => s[0])).size !== sortie.length) throw new Error('identifiants en double');
writeFileSync(join(dossier, 'villes.json'), JSON.stringify(sortie));
console.log(sortie.length, 'villes', new Set(sortie.map((s) => s[4])).size, 'fuseaux');
