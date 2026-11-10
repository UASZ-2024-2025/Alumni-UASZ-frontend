import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../authentification/services/authentification.service';
import { SANS_RENOUVELLEMENT } from './contexte-http';
import { estUrlApi, estUrlAuthPublique } from './utilitaires-api';

/**
 * Sur un 401 d'une route protégée : renouvelle le jeton (un seul refresh partagé) puis rejoue la requête.
 * La session n'est fermée que si le REFRESH est refusé : un échec du rejeu, une panne réseau ou une
 * erreur 5xx pendant le refresh ne déconnectent pas l'utilisateur.
 */
export const renouvellementInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthentificationService);

  return next(req).pipe(
    catchError((err: unknown) => {
      const doitRenouveler =
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        estUrlApi(req.url) &&
        !estUrlAuthPublique(req.url) &&
        !req.context.get(SANS_RENOUVELLEMENT) &&
        auth.estConnecte();

      if (!doitRenouveler) return throwError(() => err);

      // Un autre appel a déjà renouvelé le jeton pendant que celui-ci était en vol : on rejoue simplement.
      const courant = auth.accessToken;
      if (courant && req.headers.get('Authorization') !== `Bearer ${courant}`) {
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${courant}` } }));
      }

      return auth.rafraichir().pipe(
        catchError((e: unknown) => {
          const panneTemporaire = e instanceof ErreurApi && (e.statut === 0 || e.statut >= 500);
          if (!panneTemporaire) auth.terminerSessionLocale('session-expiree');
          return throwError(() => err);
        }),
        switchMap((session) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } })),
        ),
      );
    }),
  );
};
