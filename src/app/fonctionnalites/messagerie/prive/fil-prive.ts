import { PrivateMessage } from '../../../api/generes/notifications-messagerie/model/privateMessage';

/** Élément affiché dans le fil : un séparateur de jour ou une bulle. */
export type ElementFil =
  | { type: 'jour'; cle: string; libelle: string }
  | { type: 'message'; cle: string; message: PrivateMessage; moi: boolean };

const JOUR_MS = 86_400_000;
const debutJour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const formatDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatJourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const formatHeure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Identifiant stable d'un message (le contrat rend `id` facultatif). */
export const cleMessage = (m: PrivateMessage): string => m.id ?? `${m.senderId}-${m.createdAt}`;

/**
 * Fusionne deux lots de messages : sans doublon, du plus ancien au plus récent.
 * L'ordre renvoyé par le back n'est pas imposé par le contrat : on trie toujours côté écran.
 * En cas de doublon, la version la plus récente (second lot) l'emporte, par exemple pour `isRead`.
 */
export function fusionnerMessages(a: PrivateMessage[], b: PrivateMessage[]): PrivateMessage[] {
  const parCle = new Map<string, PrivateMessage>();
  for (const m of [...a, ...b]) parCle.set(cleMessage(m), m);
  return [...parCle.values()].sort((x, y) => (x.createdAt ?? '').localeCompare(y.createdAt ?? ''));
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

/** Horodatage de la liste des conversations : l'heure aujourd'hui, « Hier », sinon la date. */
export function horodatageListe(iso?: string, maintenant = new Date()): string {
  if (!iso) return '';
  const jour = libelleJour(iso, maintenant);
  if (jour === "Aujourd'hui") return heure(iso);
  return jour === 'Hier' ? jour : formatDate.format(new Date(iso));
}

/** Découpe le fil en jours et marque mes messages (`moi`) pour les aligner à droite. */
export function construireFil(messages: PrivateMessage[], moiId: string | undefined, maintenant = new Date()): ElementFil[] {
  const fil: ElementFil[] = [];
  let jourCourant = '';
  for (const message of messages) {
    const jour = message.createdAt ? libelleJour(message.createdAt, maintenant) : '';
    if (jour && jour !== jourCourant) {
      jourCourant = jour;
      fil.push({ type: 'jour', cle: `jour-${message.createdAt}`, libelle: jour });
    }
    fil.push({ type: 'message', cle: cleMessage(message), message, moi: !!moiId && message.senderId === moiId });
  }
  return fil;
}

const ROLES: Record<string, string> = {
  ALUMNI: 'Alumni',
  ETUDIANT: 'Étudiant',
  ENSEIGNANT: 'Enseignant',
  ENTREPRISE: 'Entreprise',
  ADMINISTRATEUR: 'Administrateur',
};

export const libelleRole = (role?: string): string => (role ? (ROLES[role] ?? role) : '');
