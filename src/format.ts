// L'API renvoie le prix comme chaîne décimale ("15000"), et l'heure de départ
// comme date epoch ("1970-01-01T08:00:00.000Z") — on n'en garde que HH:mm.
//
// Toutes les fonctions ci-dessous prennent un `locale` optionnel (`useLangue().locale`,
// "fr-FR" par défaut) pour que les dates/heures et les quelques mots relatifs
// ("Aujourd'hui", "il y a…") suivent la langue choisie dans l'app.

export type Locale = 'fr-FR' | 'en-US';

const MOTS: Record<Locale, {
  aujourdhui: string;
  demain: string;
  hier: string;
  instant: string;
  ilYaMin: (n: number) => string;
  ilYaH: (n: number) => string;
  ilYaJ: (n: number) => string;
}> = {
  'fr-FR': {
    aujourdhui: "Aujourd'hui",
    demain: 'Demain',
    hier: 'hier',
    instant: "à l'instant",
    ilYaMin: (n) => `il y a ${n} min`,
    ilYaH: (n) => `il y a ${n} h`,
    ilYaJ: (n) => `il y a ${n} j`,
  },
  'en-US': {
    aujourdhui: 'Today',
    demain: 'Tomorrow',
    hier: 'yesterday',
    instant: 'just now',
    ilYaMin: (n) => `${n} min ago`,
    ilYaH: (n) => `${n} h ago`,
    ilYaJ: (n) => `${n} d ago`,
  },
};

export function montant(prix: string | number): number {
  return typeof prix === 'number' ? prix : Number(prix);
}

export function formatPrix(prix: string | number, locale: Locale = 'fr-FR'): string {
  const n = montant(prix);
  return `${n.toLocaleString(locale)} FCFA`;
}

export function formatHeure(iso: string, locale: Locale = 'fr-FR'): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string, locale: Locale = 'fr-FR'): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function versDate(date: string): Date {
  return date.includes('T') ? new Date(date) : new Date(`${date}T00:00:00`);
}

function ecartJours(d: Date): number {
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const j = new Date(d);
  j.setHours(0, 0, 0, 0);
  return Math.round((j.getTime() - auj.getTime()) / 86400000);
}

// "AAAA-MM-JJ" (ou ISO complet) → libellé court et parlant.
export function formatDateCourt(date: string, locale: Locale = 'fr-FR'): string {
  const d = versDate(date);
  const jours = ecartJours(d);
  const m = MOTS[locale];
  if (jours === 0) return m.aujourdhui;
  if (jours === 1) return m.demain;
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

// En-tête de section : « Aujourd'hui · jeu. 10 sept. », « Samedi 12 septembre ».
export function formatJourSection(date: string, locale: Locale = 'fr-FR'): string {
  const d = versDate(date);
  const jours = ecartJours(d);
  const m = MOTS[locale];
  const long = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const cap = long.charAt(0).toUpperCase() + long.slice(1);
  if (jours === 0) return `${m.aujourdhui} · ${cap}`;
  if (jours === 1) return `${m.demain} · ${cap}`;
  return cap;
}

// Date → "AAAA-MM-JJ" (fuseau local, pas UTC).
export function versYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "AAAA-MM-JJ" + n jours → "AAAA-MM-JJ".
export function ajouterJours(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + n);
  return versYmd(d);
}

// "il y a 3 min", "il y a 2 h", "hier", "12 sept."
export function formatRelatif(iso: string, locale: Locale = 'fr-FR'): string {
  const m = MOTS[locale];
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return m.instant;
  if (min < 60) return m.ilYaMin(min);
  const h = Math.floor(min / 60);
  if (h < 24) return m.ilYaH(h);
  const j = Math.floor(h / 24);
  if (j === 1) return m.hier;
  if (j < 7) return m.ilYaJ(j);
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
