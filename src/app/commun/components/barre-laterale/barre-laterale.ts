import { Component, ElementRef, inject, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ElementNavigation {
  libelle: string;
  chemin: string;
}

/** Tracé SVG (viewBox 16x16) par chemin de menu ; un cercle sert d'icône par défaut. */
const ICONES: Record<string, string> = {
  '/administration': 'M2 14V8m4 6V3m4 11V6m4 8V9',
  '/etudiants': 'M5 6a2 2 0 100-4 2 2 0 000 4zM1 14c0-3 2-5 4-5s4 2 4 5M11 7a2 2 0 100-4M12 9c2 0 3 2 3 5',
  '/entreprises': 'M2 5h12v9H2zM6 5V3h4v2',
  '/offres-emploi': 'M2 5h12v9H2zM6 5V3h4v2',
  '/candidatures': 'M3 2h10v12H3zM6 6h4M6 9h4',
  '/correspondances': 'M2 8h12M9 4l4 4-4 4',
  '/statistiques': 'M2 14V8m4 6V3m4 11V6m4 8V9',
  '/messagerie': 'M2 3h12v8H6l-3 3v-3H2z',
  '/notifications': 'M8 2a4 4 0 00-4 4c0 4-2 5-2 5h12s-2-1-2-5a4 4 0 00-4-4zM6.5 13.5a1.5 1.5 0 003 0',
};
const ICONE_PAR_DEFAUT = 'M8 4a4 4 0 100 8 4 4 0 000-8z';

/** Menu latéral de la maquette : logo, navigation, carte utilisateur et déconnexion. */
@Component({
  selector: 'app-barre-laterale',
  imports: [RouterLink, RouterLinkActive],
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

  protected cliqueDehors(e: Event): void {
    if (!this.hote.nativeElement.querySelector('.bas')?.contains(e.target as Node)) this.menuOuvert.set(false);
  }

  protected icone(chemin: string): string {
    return ICONES[chemin] ?? ICONE_PAR_DEFAUT;
  }

  protected initiale(): string {
    return this.nom().trim().charAt(0).toUpperCase();
  }
}
