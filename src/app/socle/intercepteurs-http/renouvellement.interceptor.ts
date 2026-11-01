import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthentificationService } from '../authentification/services/authentification.service';
import { estUrlApi, estUrlAuthPublique } from './utilitaires-api';

export const renouvellementInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthentificationService);

  return next(req).pipe(
    catchError((err: unknown) => {
      const doitRenouveler =
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        estUrlApi(req.url) &&
        !estUrlAuthPublique(req.url) &&
        auth.estConnecte();

      if (!doitRenouveler) return throwError(() => err);

      return auth.rafraichir().pipe(
        switchMap((session) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } })),
        ),
        catchError((e) => {
          auth.terminerSessionLocale(); // refresh refusé : retour à la connexion
          return throwError(() => e);
        }),
      );
    }),
  );
};