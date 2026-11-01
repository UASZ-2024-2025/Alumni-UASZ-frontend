import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { BASE_PATH } from './api/generes/utilisateurs/variables';
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
    { provide: BASE_PATH, useValue: environment.urlsApi.utilisateurs },
  ],
};