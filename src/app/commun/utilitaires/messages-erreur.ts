import { ErreurApi } from '../modeles/erreur-api.model';

/**
 * Message à afficher pour une erreur de l'API.
 * `parStatut` donne le message clair propre à l'écran ; à défaut, le message du back.
 */
export function messageErreur(e: unknown, parStatut: Record<number, string> = {}): string {
  if (!(e instanceof ErreurApi)) return 'Une erreur est survenue.';
  if (e.statut === 0) return e.message; // serveur injoignable
  return parStatut[e.statut] ?? e.message;
}