import { ErreurApi } from '../modeles/erreur-api.model';

/** Message lisible à afficher à partir de n'importe quelle erreur reçue d'un appel HTTP. */
export const messageErreur = (e: unknown): string =>
  e instanceof ErreurApi ? e.message : 'Une erreur est survenue. Réessayez.';
