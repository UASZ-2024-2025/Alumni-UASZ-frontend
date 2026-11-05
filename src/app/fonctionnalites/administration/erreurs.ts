import { ErreurApi } from '../../commun/modeles/erreur-api.model';

/** Message affichable pour une erreur d'API ; `parStatut` permet de surcharger un statut précis. */
export function messageErreur(e: unknown, parStatut: Record<number, string> = {}): string {
  if (!(e instanceof ErreurApi)) return 'Une erreur inattendue est survenue.';
  if (parStatut[e.statut]) return parStatut[e.statut];
  switch (e.statut) {
    case 403:
      return "Action réservée à l'administrateur.";
    case 400:
    case 422:
      return `Données invalides : ${e.message}`;
    default:
      return e.message;
  }
}
