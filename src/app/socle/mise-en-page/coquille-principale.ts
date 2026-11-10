import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BarreLaterale } from '../../commun/components/barre-laterale/barre-laterale';
import { EnteteApplication } from '../../commun/components/entete-application/entete-application';
import { DialogueConfirmation } from '../../commun/components/dialogue-confirmation/dialogue-confirmation';
import { Toasts } from '../../commun/components/toasts/toasts';
import { PiedDePage } from '../../commun/components/pied-de-page/pied-de-page';
import { AuthentificationService } from '../authentification/services/authentification.service';
import { MENUS } from './menus.config';

@Component({
  selector: 'app-coquille-principale',
  imports: [RouterOutlet, BarreLaterale, EnteteApplication, PiedDePage, Toasts, DialogueConfirmation],
  template: `
    <div class="cadre">
      <div class="lateral" [class.ouvert]="menuOuvert()" (click)="menuOuvert.set(false)">
        <app-barre-laterale [elements]="menu()" [nom]="nomComplet()" [role]="auth.role() ?? ''" (deconnexion)="auth.deconnecter()" (click)="$event.stopPropagation()" />
      </div>
      <div class="voile" [class.ouvert]="menuOuvert()" (click)="menuOuvert.set(false)"></div>
      <div class="colonne">
        <app-entete-application [nom]="nomComplet()" [role]="auth.role() ?? ''" (menu)="menuOuvert.set(true)" />
        <main class="contenu"><router-outlet /></main>
        <app-pied-de-page />
      </div>
    </div>
    <app-toasts />
    <app-dialogue-confirmation />
  `,
  styles: `
    :host { display: block; }
    .cadre { display: grid; grid-template-columns: 260px minmax(0, 1fr); height: 100dvh; background: var(--g0); }
    .lateral { height: 100dvh; overflow: hidden; }
    .colonne { display: flex; flex-direction: column; height: 100dvh; min-width: 0; }
    .contenu { flex: 1; overflow-y: auto; padding: 28px; }
    .voile { display: none; }
    @media (max-width: 800px) {
      .cadre { grid-template-columns: minmax(0, 1fr); }
      .lateral { position: fixed; inset: 0 auto 0 0; z-index: 20; width: 280px; max-width: 85vw; transform: translateX(-100%); transition: transform 0.2s ease; }
      .lateral.ouvert { transform: none; box-shadow: 0 0 40px rgba(0, 0, 0, 0.3); }
      .voile.ouvert { display: block; position: fixed; inset: 0; z-index: 10; background: rgba(7, 61, 39, 0.45); }
      .contenu { padding: 16px 14px; }
    }
  `,
})
export class CoquillePrincipale {
  protected readonly menuOuvert = signal(false);
  protected readonly auth = inject(AuthentificationService);

  constructor() {
    // Sur mobile, le tiroir se referme dès qu'une navigation aboutit.
    inject(Router).events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOuvert.set(false));
  }

  protected readonly menu = computed(() => {
    const role = this.auth.role();
    return role ? (MENUS[role] ?? []) : [];
  });
  protected readonly nomComplet = computed(() => {
    const u = this.auth.utilisateur();
    return u ? `${u.firstName} ${u.lastName}` : '';
  });
}
