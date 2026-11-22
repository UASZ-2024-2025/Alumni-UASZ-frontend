import { Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { LogoUasz } from '../logo-uasz/logo-uasz';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ElementNavigation {
  libelle: string;
  chemin: string;
}

/** Tracé SVG (viewBox 16x16) par chemin de menu ; un cercle sert d'icône par défaut. */
const ICONES: Record<string, string> = {
  // administration : engrenage simplifié (curseurs de réglage)
  '/administration': 'M2 4h7M12 4h2M2 12h2M7 12h7M10.5 4a1.5 1.5 0 100 .01M5.5 12a1.5 1.5 0 100 .01',
  '/annuaire': 'M3 2h9a1 1 0 011 1v11H4a1 1 0 01-1-1zM6 6h4M6 9h4M3 12h10',
  '/profil': 'M8 8a3 3 0 100-6 3 3 0 000 6zM2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5',
  '/mon-espace/profil': 'M8 8a3 3 0 100-6 3 3 0 000 6zM2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5',
  '/espace-alumni/profil': 'M8 2l6 3-6 3-6-3zM4 7v3c0 1.2 1.8 2.5 4 2.5s4-1.3 4-2.5V7',
  '/mon-espace/cv': 'M4 2h6l3 3v9H4zM10 2v3h3M6 8h5M6 11h5',
  '/entreprise/ma-fiche': 'M3 14V3h7v11M10 7h3v7M5.5 5.5h2M5.5 8h2M5.5 10.5h2M2 14h12',
  '/administration/entreprises': 'M3 14V3h7v11M10 7h3v7M5.5 5.5h2M5.5 8h2M5.5 10.5h2M2 14h12',
  '/offres-emploi': 'M2 5h12v9H2zM6 5V3h4v2M2 9h12',
  '/offres-emploi/mes-offres': 'M3 4h10M3 8h10M3 12h10',
  '/offres-emploi/publier': 'M8 3v10M3 8h10',
  '/candidatures': 'M3 2h10v12H3zM6 6h4M6 9h4',
  '/propositions': 'M14 2L2 7l5 2 2 5zM7 9l7-7',
  '/correspondances': 'M2 5h10M9 2l3 3-3 3M14 11H4M7 8l-3 3 3 3',
  '/statistiques': 'M2 14V8m4 6V3m4 11V6m4 8V9',
  '/messagerie': 'M2 3h12v8H6l-3 3v-3H2z',
  '/groupes': 'M1 2h9v6H5L3 10V8H1zM12 5h3v6h-1v2l-2-2H7V10',
  '/notifications': 'M8 2a4 4 0 00-4 4c0 4-2 5-2 5h12s-2-1-2-5a4 4 0 00-4-4zM6.5 13.5a1.5 1.5 0 003 0',
};
const ICONE_PAR_DEFAUT = 'M8 4a4 4 0 100 8 4 4 0 000-8z';

/** Menu latéral de la maquette : logo, navigation, carte utilisateur et déconnexion. */
@Component({
  selector: 'app-barre-laterale',
  imports: [Avatar, LogoUasz, RouterLink, RouterLinkActive],
  host: {
    '(document:click)': 'cliqueDehors($event)',
    '(document:keydown.escape)': 'menuOuvert.set(false)',
  },
  templateUrl: './barre-laterale.html',
  styleUrl: './barre-laterale.scss',
})
export class BarreLaterale {
  readonly elements = input.required<ElementNavigation[]>();
  readonly nom = input<string>('');
  readonly role = input<string>('');
  readonly deconnexion = output<void>();
  protected readonly menuOuvert = signal(false);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Chemins qui ont des sous-entrées dans le menu : ils ne sont actifs que sur leur URL exacte. */
  protected readonly exacts = computed(() => {
    const chemins = this.elements().map((e) => e.chemin);
    return new Set(chemins.filter((c) => chemins.some((autre) => autre !== c && autre.startsWith(c + '/'))));
  });

  protected cliqueDehors(e: Event): void {
    if (!this.hote.nativeElement.querySelector('.bas')?.contains(e.target as Node)) this.menuOuvert.set(false);
  }

  protected icone(chemin: string): string {
    return ICONES[chemin] ?? ICONE_PAR_DEFAUT;
  }

}