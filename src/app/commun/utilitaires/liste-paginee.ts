import { computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ErreurApi } from '../modeles/erreur-api.model';
import { messageErreur } from './messages-erreur';

/** Forme commune des réponses paginées de l'API (UserPagedResponse, JobOfferPagedResponse, etc.). */
export interface PageApi<T> {
  content?: T[];
  totalElements?: number;
}

/**
 * État d'une liste paginée : éléments, page courante, chargement, erreur.
 * Usage : `liste = creerListePaginee((page, taille) => this.api.listerOffres(page, taille));`
 * puis `liste.charger()` au démarrage et `liste.aller(n)` depuis <app-pagination>.
 */
export function creerListePaginee<T>(
  appeler: (page: number, taille: number) => Observable<PageApi<T>>,
  taille = 10,
  messagesParStatut: Record<number, string> = {},
) {
  const elements = signal<T[]>([]);
  const total = signal(0);
  const page = signal(0);
  const chargement = signal(false);
  const erreur = signal<string | null>(null);
  const nbPages = computed(() => Math.max(1, Math.ceil(total() / taille)));

  function charger(): void {
    chargement.set(true);
    erreur.set(null);
    appeler(page(), taille).subscribe({
      next: (r) => {
        elements.set(r.content ?? []);
        total.set(r.totalElements ?? 0);
        chargement.set(false);
      },
      error: (e: unknown) => {
        erreur.set(messageErreur(e as ErreurApi, messagesParStatut));
        chargement.set(false);
      },
    });
  }

  /** Va à la page demandée (commence à 0) ; ignore une page hors limites. */
  function aller(n: number): void {
    if (n < 0 || n >= nbPages()) return;
    page.set(n);
    charger();
  }

  /** Revient à la première page, à appeler quand un filtre change. */
  function recommencer(): void {
    page.set(0);
    charger();
  }

  return {
    elements: elements.asReadonly(),
    total: total.asReadonly(),
    page: page.asReadonly(),
    nbPages,
    chargement: chargement.asReadonly(),
    erreur: erreur.asReadonly(),
    charger,
    aller,
    recommencer,
  };
}
