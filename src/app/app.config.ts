import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { BASE_PATH as BASE_PATH_UTILISATEURS } from './api/generes/utilisateurs/variables';
import { BASE_PATH as BASE_PATH_OFFRES } from './api/generes/offres-emploi/variables';
import { BASE_PATH as BASE_PATH_MESSAGERIE } from './api/generes/notifications-messagerie/variables';
import { environment } from '../environments/environment';
import { erreurInterceptor } from './socle/intercepteurs-http/erreur.interceptor';
import { jetonInterceptor } from './socle/intercepteurs-http/jeton.interceptor';
import { renouvellementInterceptor } from './socle/intercepteurs-http/renouvellement.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([erreurInterceptor, jetonInterceptor, renouvellementInterceptor]),
    ),
    { provide: BASE_PATH_UTILISATEURS, useValue: environment.urlsApi.utilisateurs },
    { provide: BASE_PATH_OFFRES, useValue: environment.urlsApi.offres },
    // La cloche de notifications vit dans la coquille : son client est donc configuré globalement.
    { provide: BASE_PATH_MESSAGERIE, useValue: environment.urlsApi.messagerie },
  ],
};