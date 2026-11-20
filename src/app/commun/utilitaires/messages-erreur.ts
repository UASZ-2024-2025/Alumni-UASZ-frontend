import { ErreurApi } from '../modeles/erreur-api.model';

/** Codes dont le message du back est plus précis que le message générique de l'écran pour ce statut. */
const CODES_MESSAGE_DU_BACK = new Set(['ACCOUNT_NOT_LINKED']);

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