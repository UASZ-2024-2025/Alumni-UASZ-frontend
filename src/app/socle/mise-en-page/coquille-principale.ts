import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LIBELLE_ROLE } from '../../commun/modeles/libelles';
import { AuthentificationService } from '../authentification/services/authentification.service';
import { MENUS } from './menus.config';

@Component({
  selector: 'app-coquille-principale',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="barre">
      <a class="logo" routerLink="/">Alumni UASZ</a>
      <nav>
        @for (element of menu(); track element.chemin) {
          <a
            [routerLink]="element.chemin"
            routerLinkActive="actif"
            [routerLinkActiveOptions]="{ exact: element.chemin === '/' }"
            >{{ element.libelle }}</a
          >
        }
      </nav>
      <div class="utilisateur">
        <span>
          {{ auth.utilisateur()?.firstName }} {{ auth.utilisateur()?.lastName }}
          <em>({{ libelleRole() }})</em>
        </span>
        <button type="button" (click)="auth.deconnecter()">Déconnexion</button>
      </div>
    </header>
    <main class="contenu"><router-outlet /></main>
  `,
  styles: `
    .barre { display: flex; align-items: center; gap: 1.5rem; padding: .75rem 1.5rem; background: #166534; color: #fff; flex-wrap: wrap; }
    .logo { color: #fff; font-weight: 700; text-decoration: none; }
    nav { display: flex; gap: 1rem; flex: 1; flex-wrap: wrap; }
    nav a { color: #dcfce7; text-decoration: none; padding: .25rem .5rem; border-radius: 6px; }
    nav a.actif { background: #15803d; color: #fff; }
    .utilisateur { display: flex; align-items: center; gap: .75rem; }
    .utilisateur button { background: #fff; color: #166534; border: 0; padding: .4rem .8rem; border-radius: 6px; cursor: pointer; }
    .contenu { padding: 1.5rem; max-width: 1100px; margin: 0 auto; }
  `,
})
export class CoquillePrincipale {
  protected readonly auth = inject(AuthentificationService);
  protected readonly menu = computed(() => {
    const role = this.auth.role();
    return role ? (MENUS[role] ?? []) : [];
  });
  protected readonly libelleRole = computed(() => {
    const role = this.auth.role();
    return role ? LIBELLE_ROLE[role] : '';
  });
}
