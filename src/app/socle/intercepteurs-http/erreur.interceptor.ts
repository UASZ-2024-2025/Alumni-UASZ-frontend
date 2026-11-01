import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ErreurApi } from '../../commun/modeles/erreur-api.model';

export const erreurInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);

      const corps = err.error as { code?: string; message?: string; timestamp?: string } | null;
      const erreur =
        err.status === 0
          ? new ErreurApi(0, 'RESEAU', 'Serveur injoignable. Vérifiez votre connexion.')
          : new ErreurApi(
              err.status,
              corps?.code ?? 'ERREUR_INCONNUE',
              corps?.message ?? 'Une erreur est survenue.',
              corps?.timestamp,
            );
      return throwError(() => erreur);
    }),
  );