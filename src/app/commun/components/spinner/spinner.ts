import { Component, input } from '@angular/core';

/** Indicateur de chargement : <app-spinner libelle="Chargement des utilisateurs…" /> */
@Component({
  selector: 'app-spinner',
  template: '<div class="spinner" role="status"><span class="roue" aria-hidden="true"></span>{{ libelle() }}</div>',
  styles: `
    .spinner { display: flex; align-items: center; gap: 10px; padding: 1rem 0; color: var(--mu); }
    .roue { width: 18px; height: 18px; border: 3px solid var(--g1); border-top-color: var(--g8); border-radius: 50%; animation: tour 0.8s linear infinite; }
    @keyframes tour { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .roue { animation-duration: 2.5s; } }
  `,
})
export class Spinner {
  readonly libelle = input('Chargement…');
}
