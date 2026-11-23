import { ErreurApi } from '../modeles/erreur-api.model';

/** Codes dont le message du back est plus précis que le message générique de l'écran pour ce statut. */
const CODES_MESSAGE_DU_BACK = new Set([
  'ACCOUNT_NOT_LINKED',
  // Pièces jointes (ALUM-262) : le service et l'écran disent précisément ce qui ne va pas avec le fichier.
  'ATTACHMENT_TOO_LARGE', 'UNSUPPORTED_FILE_TYPE', 'INVALID_ATTACHMENT', 'ATTACHMENTS_DISABLED', 'FICHIER_REFUSE', 'STOCKAGE',
]);

/**
 * Message à afficher pour une erreur de l'API.
 * `parStatut` donne le message clair propre à l'écran ; à défaut, le message du back.
 */
export function messageErreur(e: unknown, parStatut: Record<number, string> = {}): string {
  if (!(e instanceof ErreurApi)) return 'Une erreur est survenue.';
  if (e.statut === 0) return e.message; // serveur injoignable
  if (CODES_MESSAGE_DU_BACK.has(e.code)) return e.message;
  return parStatut[e.statut] ?? e.message;
}