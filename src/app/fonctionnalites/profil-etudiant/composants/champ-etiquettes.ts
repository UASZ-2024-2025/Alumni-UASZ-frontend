import { Component, input, model, signal } from '@angular/core';

/** Saisie d'une liste de mots (compétences, centres d'intérêt) : Entrée ou virgule pour ajouter. */
@Component({
  selector: 'app-champ-etiquettes',
  template: `
    <div class="etiquettes">
      @for (e of valeur(); track e; let i = $index) {
        <span class="puce">
          {{ e }}
          <button type="button" (click)="retirer(i)" [attr.aria-label]="'Retirer ' + e">×</button>
        </span>
      }
    </div>
    <div class="saisie">
      <input
        type="text"
        [value]="texte()"
        [placeholder]="placeholder()"
        [attr.aria-label]="libelle()"
        maxlength="80"
        (input)="texte.set($any($event.target).value)"
        (keydown)="touche($event)"
        (blur)="ajouter()"
      />
      <button type="button" class="secondaire" (click)="ajouter()" [disabled]="!texte().trim()">Ajouter</button>
    </div>
  `,
  styles: `
    :host { display: block; }
    .etiquettes { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
    .puce { display: inline-flex; align-items: center; gap: 0.25rem; padding: 3px 4px 3px 10px; border-radius: 999px; background: var(--g1); color: var(--g9); font-size: 0.8125rem; font-weight: 600; }
    .puce button { border: 0; background: transparent; color: var(--g9); font-size: 1rem; line-height: 1; cursor: pointer; padding: 0 6px; border-radius: 999px; }
    .puce button:hover { background: var(--g7); color: #fff; }
    .saisie { display: flex; gap: 0.5rem; }
    .saisie input { flex: 1; min-width: 0; box-sizing: border-box; padding: 9px 12px; border: 1px solid var(--bord-champ); border-radius: var(--rayon); font: 400 0.9375rem var(--police); }
    .saisie input:focus { border-color: var(--g7); outline: 2px solid var(--g1); }
    .secondaire { padding: 8px 14px; border: 1px solid var(--g8); border-radius: var(--rayon); background: #fff; color: var(--g8); font: 600 0.8125rem var(--police); cursor: pointer; }
    .secondaire:disabled { opacity: 0.5; cursor: default; }
  `,
})
export class ChampEtiquettes {
  readonly valeur = model<string[]>([]);
  readonly libelle = input('Ajouter un élément');
  readonly placeholder = input('Tapez puis appuyez sur Entrée');
  readonly max = input(30);

  protected readonly texte = signal('');

  protected touche(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      this.ajouter();
    } else if (e.key === 'Backspace' && !this.texte() && this.valeur().length) {
      this.retirer(this.valeur().length - 1);
    }
  }

  protected ajouter(): void {
    const mot = this.texte().trim().replace(/,+$/, '');
    this.texte.set('');
    if (!mot) return;
    const existe = this.valeur().some((v) => v.toLowerCase() === mot.toLowerCase());
    if (existe || this.valeur().length >= this.max()) return;
    this.valeur.set([...this.valeur(), mot]);
  }

  protected retirer(index: number): void {
    this.valeur.set(this.valeur().filter((_, i) => i !== index));
  }
}
