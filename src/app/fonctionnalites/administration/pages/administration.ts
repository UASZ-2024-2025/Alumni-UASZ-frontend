import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-administration',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styleUrl: '../administration.scss',
  template: `
    <nav class="sous-menu" aria-label="Administration">
      <a routerLink="." routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">
        Tableau de bord
      </a>
      <a routerLink="utilisateurs" routerLinkActive="actif">Utilisateurs</a>
      <a routerLink="entreprises" routerLinkActive="actif">Entreprises</a>
    </nav>
    <router-outlet />
  `,
})
export class Administration {}
