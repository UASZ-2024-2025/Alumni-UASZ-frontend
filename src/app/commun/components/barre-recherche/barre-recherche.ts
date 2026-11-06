import { Component, input, OnDestroy, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Bouton } from '../bouton/bouton';
import { Champ } from '../champ/champ';

/**
 * Barre de recherche avec filtres. `recherche` est émis 300 ms après la dernière frappe.
 * Les filtres (liste, année…) se placent à l'intérieur, et `reinitialiser` efface tout.
 *   <app-barre-recherche libelle="Rechercher une offre" (recherche)="texte.set($event)" (reinitialiser)="effacer()">
 *     <app-champ libelle="Contrat" type="select" [options]="contrats" (ngModelChange)="…" />
 *   </app-barre-recherche>
 */
@Component({
  selector: 'app-barre-recherche',
  imports: [Bouton, Champ, FormsModule],
  templateUrl: './barre-recherche.html',
  styles: `
    .barre { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
    .recherche { flex: 1 1 240px; }
  `,
})
export class BarreRecherche implements OnDestroy {
  readonly libelle = input('Rechercher');
  readonly placeholder = input('Rechercher…');
  readonly delai = input(300);
  readonly recherche = output<string>();
  readonly reinitialiser = output<void>();
  private minuteur?: ReturnType<typeof setTimeout>;
  protected valeur = '';

  protected saisie(texte: string): void {
    this.valeur = texte;
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => this.recherche.emit(texte.trim()), this.delai());
  }

  protected effacer(): void {
    clearTimeout(this.minuteur);
    this.valeur = '';
    this.recherche.emit('');
    this.reinitialiser.emit();
  }

  ngOnDestroy(): void {
    clearTimeout(this.minuteur);
  }
}
