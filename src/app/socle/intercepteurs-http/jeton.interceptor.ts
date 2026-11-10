import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthentificationService } from '../authentification/services/authentification.service';
import { JETON_IMPOSE } from './contexte-http';
import { estUrlApi, estUrlAuthPublique } from './utilitaires-api';

export const jetonInterceptor: HttpInterceptorFn = (req, next) => {
  if (!estUrlApi(req.url) || estUrlAuthPublique(req.url)) return next(req);
  const token = req.context.get(JETON_IMPOSE) ?? inject(AuthentificationService).accessToken;
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
