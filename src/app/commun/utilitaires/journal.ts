import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ErreurApi } from '../modeles/erreur-api.model';

/** Le diagnostic n'est actif que hors production (`environment.production === false`). */
export const MODE_DIAGNOSTIC = !environment.production;

/** Journal de diagnostic : à filtrer dans la console du navigateur avec le nom de la portée (ex. `offres/`). */
export const journal = {
  info: (portee: string, ...details: unknown[]): void => {
    if (MODE_DIAGNOSTIC) console.log(`[${portee}]`, ...details);
  },
  erreur: (portee: string, ...details: unknown[]): void => {
    if (MODE_DIAGNOSTIC) console.error(`[${portee}]`, ...details);
  },
};

/** Description technique lisible d'une erreur, quelle que soit sa forme. */
export function decrireErreur(e: unknown): string {
  if (e instanceof ErreurApi) {
    return `ErreurApi · statut ${e.statut} · code ${e.code} · « ${e.message} »`;
  }
  if (e instanceof HttpErrorResponse) {
    return `HttpErrorResponse brute · statut ${e.status} · ${e.url ?? 'URL inconnue'} (l'intercepteur d'erreur n'a pas converti l'erreur : URL non reconnue comme URL d'API ?)`;
  }
  if (e instanceof TimeoutError) {
    return 'Délai dépassé : aucune réponse du serveur (requête annulée côté front)';
  }
  if (e instanceof Error) {
    return `${e.name} : ${e.message}`;
  }
  return `Valeur inattendue : ${String(e)}`;
}
