import { Component, computed, output, signal } from '@angular/core';
import { CATEGORIES_EMOJI, CategorieEmoji, CLE_RECENTS, MAX_RECENTS } from './emojis';

function lireRecents(): string[] {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_RECENTS) ?? '[]');
    return Array.isArray(brut) ? brut.filter((e): e is string => typeof e === 'string').slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

/**
 * ALUM-260 : panneau d'émojis par catégories, comme WhatsApp (onglet « Récents » mémorisé dans le navigateur).
 * Le parent l'affiche et le place ; `choisi` émet l'émoji cliqué, `fermer` sur Échap.
 *   <app-selecteur-emoji (choisi)="inserer($event)" (fermer)="ouvert.set(false)" />
 */
@Component({
  selector: 'app-selecteur-emoji',
  template: `
    <div class="panneau" role="dialog" aria-label="Émojis" (keydown.escape)="fermer.emit(); $event.stopPropagation()">
      <div class="onglets" role="tablist" aria-label="Catégories d'émojis">
        @for (c of categories(); track c.cle) {
          <button type="button" role="tab" class="onglet" [attr.aria-selected]="c.cle === active().cle"
            [attr.aria-label]="c.libelle" [title]="c.libelle" (click)="actif.set(c.cle)">{{ c.icone }}</button>
        }
      </div>
      <p class="titre">{{ active().libelle }}</p>
      <div class="grille" role="tabpanel" [attr.aria-label]="active().libelle">
        @for (e of active().emojis; track e) {
          <button type="button" class="emoji" [attr.aria-label]="e" (click)="choisir(e)">{{ e }}</button>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .panneau {
      display: flex; flex-direction: column; width: min(340px, calc(100vw - 24px)); height: 320px;
      border: 1px solid var(--bd); border-radius: var(--rayon-l); background: var(--sf); box-shadow: var(--ombre-flottante);
      overflow: hidden;
    }
    .onglets { display: flex; gap: 2px; padding: 6px 6px 0; border-bottom: 1px solid var(--bd); overflow-x: auto; }
    .onglet {
      flex: none; width: 36px; height: 34px; border: 0; border-bottom: 3px solid transparent; background: none;
      font-size: 1.15rem; line-height: 1; cursor: pointer; filter: grayscale(0.6); opacity: 0.75;
    }
    .onglet[aria-selected='true'] { border-bottom-color: var(--g8); filter: none; opacity: 1; }
    .onglet:hover { filter: none; opacity: 1; }
    .titre { margin: 8px 10px 4px; color: var(--mu); font-size: var(--t-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
    .grille {
      flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(36px, 1fr)); align-content: start;
      gap: 2px; padding: 0 6px 8px; overflow-y: auto;
    }
    .emoji {
      width: 100%; aspect-ratio: 1; border: 0; border-radius: var(--rayon-s); background: none;
      font-size: 1.45rem; line-height: 1; cursor: pointer;
      font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
    }
    .emoji:hover, .emoji:focus-visible { background: var(--g0); outline: none; }
    .onglet:focus-visible, .emoji:focus-visible { box-shadow: inset 0 0 0 2px var(--g8); }
  `,
})
export class SelecteurEmoji {
  readonly choisi = output<string>();
  readonly fermer = output<void>();

  private readonly recents = signal<string[]>(lireRecents());
  protected readonly categories = computed<CategorieEmoji[]>(() => {
    const recents = this.recents();
    return recents.length
      ? [{ cle: 'recents', libelle: 'Récents', icone: '🕘', emojis: recents }, ...CATEGORIES_EMOJI]
      : [...CATEGORIES_EMOJI];
  });
  /** Ouvert sur « Récents » quand il y en a, sinon sur les smileys. */
  protected readonly actif = signal(this.recents().length ? 'recents' : 'smileys');
  protected readonly active = computed(() => this.categories().find((c) => c.cle === this.actif()) ?? this.categories()[0]);

  protected choisir(emoji: string): void {
    const recents = [emoji, ...this.recents().filter((e) => e !== emoji)].slice(0, MAX_RECENTS);
    // la catégorie affichée ne bouge pas pendant qu'on clique : « Récents » est mis à jour à la prochaine ouverture
    try {
      localStorage.setItem(CLE_RECENTS, JSON.stringify(recents));
    } catch {
      // stockage plein ou interdit : l'émoji est quand même inséré
    }
    this.choisi.emit(emoji);
  }
}
