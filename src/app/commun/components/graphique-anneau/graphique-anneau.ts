import { Component, computed, input } from '@angular/core';

export interface SegmentAnneau {
  libelle: string;
  valeur: number;
  /** couleur CSS (ex. `var(--ac)`) ; sinon une teinte de la palette */
  couleur?: string;
}

const PALETTE = ['var(--g8)', 'var(--ac)', 'var(--mu)', 'var(--g7)', 'var(--wa)', 'var(--dg)'];

/** Anneau de répartition en CSS pur (conic-gradient) avec sa légende. */
@Component({
  selector: 'app-graphique-anneau',
  templateUrl: './graphique-anneau.html',
  styleUrl: './graphique-anneau.scss',
})
export class GraphiqueAnneau {
  readonly segments = input.required<SegmentAnneau[]>();
  /** texte au centre ; par défaut, le total */
  readonly centre = input<string>();

  protected readonly lignes = computed(() => {
    const total = this.total();
    return this.segments().map((s, i) => ({
      ...s,
      couleur: s.couleur ?? PALETTE[i % PALETTE.length],
      pourcentage: total > 0 ? Math.round((Math.max(0, s.valeur) / total) * 100) : 0,
    }));
  });

  protected readonly total = computed(() => this.segments().reduce((t, s) => t + Math.max(0, s.valeur), 0));

  protected readonly fond = computed(() => {
    const total = this.total();
    if (total <= 0) return 'var(--g1)';
    let debut = 0;
    const arcs = this.lignes().map((l) => {
      const fin = debut + (Math.max(0, l.valeur) / total) * 100;
      const arc = `${l.couleur} ${debut}% ${fin}%`;
      debut = fin;
      return arc;
    });
    return `conic-gradient(${arcs.join(', ')})`;
  });

  protected readonly resume = computed(() =>
    this.lignes().map((l) => `${l.libelle} : ${l.valeur}`).join(', '),
  );
}
