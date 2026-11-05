import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { messageErreur as messageCommun } from '../../commun/utilitaires/messages-erreur';

/** Messages propres à l'administration (403, 400/422) ; le reste passe par l'utilitaire commun. */
export function messageErreur(e: unknown, parStatut: Record<number, string> = {}): string {
  if (e instanceof ErreurApi && !parStatut[e.statut]) {
    if (e.statut === 403) return "Action réservée à l'administrateur.";
    if (e.statut === 400 || e.statut === 422) return `Données invalides : ${e.message}`;
  }
  return messageCommun(e, parStatut);
}
