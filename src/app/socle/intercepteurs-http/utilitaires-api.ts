import { environment } from '../../../environments/environment';

export const estUrlApi = (url: string) =>
  Object.values(environment.urlsApi).some((base) => url.startsWith(base));

/** Routes publiques du user-service : pas de Bearer, et un 401 n'y déclenche jamais de renouvellement. */
const ROUTES_PUBLIQUES = [
  '/auth/register',
  '/auth/login',
  '/auth/refresh-token',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/confirm-email',
  '/auth/resend-confirmation',
];

export const estUrlAuthPublique = (url: string) => {
  const chemin = url.split('?')[0];
  return ROUTES_PUBLIQUES.some((r) => chemin.endsWith(r));
};
