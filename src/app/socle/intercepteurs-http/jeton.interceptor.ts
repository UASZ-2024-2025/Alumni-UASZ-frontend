import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthentificationService } from '../authentification/services/authentification.service';
import { estUrlApi, estUrlAuthPublique } from './utilitaires-api';

export const jetonInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthentificationService).accessToken;
  if (!token || !estUrlApi(req.url) || estUrlAuthPublique(req.url)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};