import { Component, output } from '@angular/core';
import { imageSticker, STICKERS } from './stickers';

/**
 * ALUM-262 : panneau de stickers, comme WhatsApp. Un clic envoie le sticker (`choisi` émet son code), Échap ferme.
 *   <app-selecteur-sticker (choisi)="envoyerSticker($event)" (fermer)="ouvert.set(false)" />
 */
@Component({
  selector: 'app-selecteur-sticker',
  template: `
    <div class="panneau" role="dialog" aria-label="Stickers" (keydown.escape)="fermer.emit(); $event.stopPropagation()">
      <p class="titre">Stickers</p>
      <div class="grille">
        @for (s of stickers; track s.code) {
          <button type="button" class="sticker" [attr.aria-label]="'Envoyer le sticker ' + s.libelle" [title]="s.libelle"
            (click)="choisi.emit(s.code)">
            <img [src]="image(s.code)" alt="" width="72" height="72" loading="lazy" />
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .panneau {
      display: flex; flex-direction: column; width: min(340px, calc(100vw - 24px)); max-height: 320px;
      border: 1px solid var(--bd); border-radius: var(--rayon-l); background: var(--sf); box-shadow: var(--ombre-flottante);
      overflow: hidden;
    }
    .titre { margin: 10px 12px 4px; color: var(--mu); font-size: var(--t-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
    .grille { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 0 8px 10px; overflow-y: auto; }
    .sticker { display: grid; place-items: center; aspect-ratio: 1; border: 0; border-radius: var(--rayon-m); background: none; cursor: pointer; }
    .sticker img { width: 100%; max-width: 72px; height: auto; transition: transform 0.12s; }
    .sticker:hover, .sticker:focus-visible { background: var(--g0); outline: none; }
    .sticker:hover img { transform: scale(1.08); }
    .sticker:focus-visible { box-shadow: inset 0 0 0 2px var(--g8); }
  `,
})
export class SelecteurSticker {
  readonly choisi = output<string>();
  readonly fermer = output<void>();
  protected readonly stickers = STICKERS;
  protected readonly image = imageSticker;
}
