import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';

/** Fine barre en haut de l'écran pendant les changements de page. À placer une fois dans le composant racine. */
@Component({
  selector: 'app-barre-progression',
  templateUrl: './barre-progression.html',
  styleUrl: './barre-progression.scss',
})
export class BarreProgression {
  protected readonly etat = signal<'repos' | 'charge' | 'fini'>('repos');
  private minuteur?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(Router)
      .events.pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((e) => {
        if (e instanceof NavigationStart) {
          clearTimeout(this.minuteur);
          this.etat.set('charge');
        } else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
          this.etat.set('fini');
          this.minuteur = setTimeout(() => this.etat.set('repos'), 700);
        }
      });
  }
}
