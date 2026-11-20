import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    const splash = document.getElementById('splash');
    if (!splash) return;
    // Deux frames : on laisse Angular dessiner la première page avant de lever le rideau.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        splash.classList.add('masque');
        setTimeout(() => splash.remove(), 600);
      }),
    );
  })
  .catch((err) => console.error(err));