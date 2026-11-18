import { GroupMessage } from '../../../api/generes/notifications-messagerie/model/groupMessage';

/** Élément affiché dans le fil : un séparateur de jour, ou une bulle. */
export type ElementFil =
  | { type: 'jour'; cle: string; libelle: string }
  | { type: 'message'; cle: string; message: GroupMessage; moi: boolean; debutSerie: boolean };

const JOUR_MS = 86_400_000;
const debutJour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const formatDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatJourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const formatHeure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Fusionne deux pages de messages : sans doublon, du plus ancien au plus récent (l'ordre du back n'est pas imposé par le contrat). */
export function fusionnerMessages(a: GroupMessage[], b: GroupMessage[]): GroupMessage[] {
  const parId = new Map<string, GroupMessage>();
  for (const m of [...a, ...b]) parId.set(m.id ?? `${m.senderId}-${m.createdAt}`, m);
  return [...parId.values()].sort((x, y) => (x.createdAt ?? '').localeCompare(y.createdAt ?? ''));
}

export function heure(iso?: string): string {
  return iso ? formatHeure.format(new Date(iso)) : '';
}

/** Séparateur du fil : « Aujourd'hui », « Hier », « mardi 12 novembre », puis la date complète au-delà d'une semaine. */
export function libelleJour(iso: string, maintenant = new Date()): string {
  const ecart = Math.round((debutJour(maintenant) - debutJour(new Date(iso))) / JOUR_MS);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return 'Hier';
  if (ecart > 1 && ecart < 7) return formatJourLong.format(new Date(iso));
  return formatDate.format(new Date(iso));
}

/** Horodatage de la liste des groupes : l'heure aujourd'hui, « Hier », sinon la date. */
export function horodatageListe(iso?: string, maintenant = new Date()): string {
  if (!iso) return '';
  const jour = libelleJour(iso, maintenant);
  if (jour === "Aujourd'hui") return heure(iso);
  return jour === 'Hier' ? jour : formatDate.format(new Date(iso));
}

/** Découpe le fil en jours et en séries : le nom de l'auteur n'apparaît qu'au début d'une série, comme sur WhatsApp. */
export function construireFil(messages: GroupMessage[], moiId: string | undefined, maintenant = new Date()): ElementFil[] {
  const fil: ElementFil[] = [];
  let jourCourant = '';
  let auteurPrecedent: string | undefined;
  for (const message of messages) {
    const jour = message.createdAt ? libelleJour(message.createdAt, maintenant) : '';
    if (jour !== jourCourant) {
      jourCourant = jour;
      auteurPrecedent = undefined;
      if (jour) fil.push({ type: 'jour', cle: `jour-${message.createdAt}`, libelle: jour });
    }
    fil.push({
      type: 'message',
      cle: message.id ?? `${message.senderId}-${message.createdAt}`,
      message,
      moi: !!moiId && message.senderId === moiId,
      debutSerie: message.senderId !== auteurPrecedent,
    });
    auteurPrecedent = message.senderId;
  }
  return fil;
}

/** Couleurs des noms d'auteurs (contraste AA sur fond blanc), stables pour un même utilisateur. */
const COULEURS_AUTEURS = ['#0b5d3b', '#8a5a00', '#1d5f8a', '#7a3e9d', '#a1332b', '#336b1e', '#5c4b99', '#9c3d6b'];

export function couleurAuteur(id = ''): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COULEURS_AUTEURS[h % COULEURS_AUTEURS.length];
}
