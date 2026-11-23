import { ConversationSummary } from '../../../api/generes/notifications-messagerie/model/conversationSummary';
import { PrivateMessage } from '../../../api/generes/notifications-messagerie/model/privateMessage';
import { libelleJour } from '../groupes/fil';
import { texteDernierMessage } from '../pieces-jointes/format';

export { heure, horodatageListe, libelleJour, libelleSourdine } from '../groupes/fil';

/** Élément affiché dans le fil : un séparateur de jour ou une bulle. */
export type ElementFil =
  | { type: 'jour'; cle: string; libelle: string }
  | { type: 'message'; cle: string; message: PrivateMessage; moi: boolean; debutSerie: boolean };

/** Identifiant stable d'un message (le contrat rend `id` facultatif). */
export const cleMessage = (m: PrivateMessage): string => m.id ?? `${m.senderId}-${m.createdAt}`;

/**
 * Fusionne deux lots de messages : sans doublon, du plus ancien au plus récent.
 * L'ordre renvoyé par le back n'est pas imposé par le contrat : on trie toujours côté écran.
 * En cas de doublon, la version la plus récente (second lot) l'emporte : lecture, modification, suppression.
 */
export function fusionnerMessages(a: PrivateMessage[], b: PrivateMessage[]): PrivateMessage[] {
  const parCle = new Map<string, PrivateMessage>();
  for (const m of [...a, ...b]) parCle.set(cleMessage(m), m);
  return [...parCle.values()].sort((x, y) => (x.createdAt ?? '').localeCompare(y.createdAt ?? ''));
}

/** Découpe le fil en jours et en séries (pointe de bulle au premier message d'une série, comme sur WhatsApp). */
export function construireFil(messages: PrivateMessage[], moiId: string | undefined, maintenant = new Date()): ElementFil[] {
  const fil: ElementFil[] = [];
  let jourCourant = '';
  let auteurPrecedent: string | undefined;
  for (const message of messages) {
    const jour = message.createdAt ? libelleJour(message.createdAt, maintenant) : '';
    if (jour && jour !== jourCourant) {
      jourCourant = jour;
      auteurPrecedent = undefined;
      fil.push({ type: 'jour', cle: `jour-${message.createdAt}`, libelle: jour });
    }
    fil.push({
      type: 'message',
      cle: cleMessage(message),
      message,
      moi: !!moiId && message.senderId === moiId,
      debutSerie: message.senderId !== auteurPrecedent,
    });
    auteurPrecedent = message.senderId;
  }
  return fil;
}

/** Aperçu de la liste : « Vous : … » pour mon dernier message, mention du message supprimé. */
export function apercuConversation(c: ConversationSummary, moiId?: string): string {
  const deMoi = !!moiId && c.lastMessageSenderId === moiId;
  if (c.lastMessageDeleted) return deMoi ? 'Vous avez supprimé ce message' : 'Ce message a été supprimé';
  const texte = texteDernierMessage(c.lastMessageType, c.lastMessageAttachmentKind, c.lastMessage);
  return deMoi && texte ? `Vous : ${texte}` : texte;
}

const ROLES: Record<string, string> = {
  ALUMNI: 'Alumni',
  ETUDIANT: 'Étudiant',
  ENSEIGNANT: 'Enseignant',
  ENTREPRISE: 'Entreprise',
  ADMINISTRATEUR: 'Administrateur',
};

export const libelleRole = (role?: string): string => (role ? (ROLES[role] ?? role) : '');
