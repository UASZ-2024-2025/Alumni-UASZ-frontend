import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthentificationService } from '../authentification/services/authentification.service';

export const roleGuard: CanActivateFn = (route) => {
  const role = inject(AuthentificationService).role();
  const autorises = (route.data['roles'] as string[] | undefined) ?? [];
  return role && autorises.includes(role) ? true : inject(Router).createUrlTree(['/']);
};