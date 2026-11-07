import { Component, computed, input } from '@angular/core';

/** Score de correspondance (0 à 100) : <app-barre-score [valeur]="offre.score" libelle="Compatibilité" /> */
@Component({
  selector: 'app-barre-score',
  template: `
    <label class="score">
      <span>{{ libelle() }} : <b>{{ pourcentage() }} %</b></span>
      <meter min="0" max="100" low="40" high="70" optimum="100" [value]="pourcentage()">{{ pourcentage() }} %</meter>
    </label>
  `,
  styles: `
    .score { display: flex; flex-direction: column; gap: 4px; font-size: 0.8125rem; }
    meter { width: 100%; height: 0.75rem; }
  `,
})
export class BarreScore {
  readonly valeur = input.required<number>();
  readonly libelle = input('Score');
  protected readonly pourcentage = computed(() => Math.round(Math.min(100, Math.max(0, this.valeur() || 0))));
}
