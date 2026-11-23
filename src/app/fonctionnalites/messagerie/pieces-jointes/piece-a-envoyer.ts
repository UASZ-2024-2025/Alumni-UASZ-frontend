import { Component, computed, input, output } from '@angular/core';
import { duree, extension, taille } from './format';
import { PieceEnPreparation } from './pieces-jointes.service';

/**
 * ALUM-262 : pièce jointe en attente au-dessus de la saisie (photo en miniature, document, vocal), avec la progression
 * de l'envoi. Le texte saisi devient la légende ; la croix retire la pièce (ou annule l'envoi en cours).
 */
@Component({
  selector: 'app-piece-a-envoyer',
  template: `
    <div class="piece">
      @if (piece().apercu) {
        <img class="miniature" [src]="piece().apercu" alt="" />
      } @else {
        <span class="icone" aria-hidden="true">{{ piece().kind === 'AUDIO' ? '🎤' : format() }}</span>
      }
      <span class="infos">
        <strong>{{ titre() }}</strong>
        <small>{{ detail() }}</small>
        @if (progression() !== null) {
          <span class="barre" role="progressbar" aria-label="Envoi du fichier" aria-valuemin="0" aria-valuemax="100"
            [attr.aria-valuenow]="progression()"><span [style.width.%]="progression()"></span></span>
        }
      </span>
      <button type="button" class="retirer" [attr.aria-label]="progression() !== null ? 'Annuler l\\'envoi' : 'Retirer la pièce jointe'"
        (click)="retirer.emit()">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </div>
  `,
  styles: `
    .piece {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 8px 10px;
      border: 1px solid var(--bd); border-left: 4px solid var(--g8); border-radius: var(--rayon-m); background: var(--sf);
    }
    .miniature { flex: none; width: 48px; height: 48px; border-radius: var(--rayon-s); object-fit: cover; background: var(--g0); }
    .icone {
      flex: none; display: grid; place-items: center; width: 40px; height: 48px; border-radius: 4px;
      background: var(--g8); color: #fff; font-size: 0.7rem; font-weight: 800;
    }
    .infos { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .infos strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--t-s); }
    .infos small { color: var(--mu); font-size: var(--t-xs); }
    .barre { display: block; height: 4px; margin-top: 4px; border-radius: 2px; background: var(--g0); overflow: hidden; }
    .barre span { display: block; height: 100%; background: var(--g8); transition: width 0.2s; }
    .retirer {
      flex: none; display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 50%;
      background: none; color: var(--mu); cursor: pointer;
    }
    .retirer:hover { background: var(--g0); color: var(--tx, inherit); }
    .retirer:focus-visible { outline: 3px solid var(--ac); }
    .retirer svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
  `,
})
export class PieceAEnvoyer {
  readonly piece = input.required<PieceEnPreparation>();
  /** Progression de l'envoi (0 à 100), null avant l'envoi. */
  readonly progression = input<number | null>(null);
  readonly retirer = output<void>();

  protected readonly format = computed(() => (extension(this.piece().fichier.name) || 'doc').toUpperCase().slice(0, 4));
  protected readonly titre = computed(() => {
    const p = this.piece();
    return p.kind === 'AUDIO' ? 'Message vocal' : p.fichier.name;
  });
  protected readonly detail = computed(() => {
    const p = this.piece();
    if (this.progression() !== null) return `Envoi… ${this.progression()} %`;
    if (p.kind === 'AUDIO') return duree(p.duree);
    return `${p.kind === 'IMAGE' ? 'Photo' : 'Document'} · ${taille(p.fichier.size)} · ajoutez une légende si vous le souhaitez`;
  });
}
