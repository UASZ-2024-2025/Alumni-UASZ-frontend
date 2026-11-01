import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthentificationService } from '../authentification/services/authentification.service';

export const authentificationGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthentificationService);
  return auth.estConnecte()
    ? true
    : inject(Router).createUrlTree(['/connexion'], { queryParams: { redirection: state.url } });
};