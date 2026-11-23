import { Component, computed, input } from '@angular/core';
import { GroupMessageType } from '../../../api/generes/notifications-messagerie/model/groupMessageType';
import { MessageAttachment } from '../../../api/generes/notifications-messagerie/model/messageAttachment';
import { imageSticker, stickerParCode } from '../../../commun/components/selecteur-sticker/stickers';
import { duree, extension, taille } from './format';

/** Partie commune d'un message de groupe et d'un message privé. */
export interface MessageAvecPiece {
  type?: GroupMessageType;
  sticker?: string;
  attachment?: MessageAttachment;
}

/**
 * ALUM-262 : sticker ou pièce jointe d'une bulle (la légende et l'heure restent affichées par le fil).
 * Photo : aperçu réduit, ouvert en grand dans un nouvel onglet. Document : carte à télécharger. Vocal : lecteur audio.
 */
@Component({
  selector: 'app-contenu-piece',
  template: `
    @if (message().type === 'STICKER') {
      @if (sticker(); as s) {
        <img class="sticker" [src]="image(s.code)" [alt]="'Sticker ' + s.libelle" width="132" height="132" />
      } @else {
        <span class="sticker-inconnu">Sticker</span>
      }
    } @else if (message().attachment; as a) {
      @switch (a.kind) {
        @case ('IMAGE') {
          <a class="photo" [href]="a.url" target="_blank" rel="noopener" [attr.aria-label]="'Ouvrir la photo ' + (a.fileName ?? '')">
            <img [src]="a.previewUrl ?? a.url" [alt]="a.fileName ?? 'Photo'" loading="lazy"
              [style.aspect-ratio]="a.width && a.height ? a.width + ' / ' + a.height : null" />
          </a>
        }
        @case ('AUDIO') {
          <div class="vocal">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            <audio controls preload="metadata" [src]="a.url" [attr.aria-label]="'Message vocal de ' + duree(a.durationSeconds)"></audio>
            <span class="duree">{{ duree(a.durationSeconds) }}</span>
          </div>
        }
        @default {
          <a class="document" [href]="a.url" target="_blank" rel="noopener" [attr.download]="a.fileName"
            [attr.aria-label]="'Télécharger ' + (a.fileName ?? 'le document')">
            <span class="type" aria-hidden="true">{{ formatDocument(a) }}</span>
            <span class="infos">
              <strong>{{ a.fileName ?? 'Document' }}</strong>
              <small>{{ formatDocument(a) }}@if (a.sizeBytes) { · {{ taille(a.sizeBytes) }} }</small>
            </span>
            <svg class="telecharger" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14" /></svg>
          </a>
        }
      }
    }
  `,
  styles: `
    :host { display: block; }
    .sticker { display: block; width: 132px; height: 132px; }
    .sticker-inconnu { display: inline-block; padding: 6px 10px; color: var(--mu); font-style: italic; }
    .photo { display: block; margin: -2px -4px 4px; border-radius: var(--rayon-m); overflow: hidden; background: var(--g0); }
    .photo img { display: block; width: min(280px, 62vw); max-height: 360px; object-fit: cover; }
    .photo:focus-visible { outline: 3px solid var(--ac); outline-offset: 2px; }
    .vocal { display: flex; align-items: center; gap: 8px; min-width: min(260px, 60vw); }
    .vocal svg { flex: none; width: 22px; height: 22px; fill: none; stroke: var(--g8); stroke-width: 1.8; stroke-linecap: round; }
    .vocal audio { flex: 1; min-width: 0; height: 36px; }
    .duree { color: var(--mu); font-size: var(--t-xs); font-variant-numeric: tabular-nums; }
    .document {
      display: flex; align-items: center; gap: 10px; min-width: min(240px, 60vw); margin-bottom: 4px; padding: 8px 10px;
      border-radius: var(--rayon-m); background: rgb(0 0 0 / 5%); color: inherit; text-decoration: none;
    }
    .document:hover { background: rgb(0 0 0 / 9%); }
    .document:focus-visible { outline: 3px solid var(--ac); outline-offset: 2px; }
    .type {
      flex: none; display: grid; place-items: center; width: 38px; height: 46px; border-radius: 4px;
      background: var(--g8); color: #fff; font-size: 0.65rem; font-weight: 800; letter-spacing: .02em;
    }
    .infos { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .infos strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .infos small { color: var(--mu); font-size: var(--t-xs); }
    .telecharger { flex: none; width: 22px; height: 22px; fill: none; stroke: var(--mu); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  `,
})
export class ContenuPiece {
  readonly message = input.required<MessageAvecPiece>();

  protected readonly sticker = computed(() => stickerParCode(this.message().sticker));
  protected readonly image = imageSticker;
  protected readonly duree = duree;
  protected readonly taille = taille;

  protected formatDocument(a: MessageAttachment): string {
    return (a.format || extension(a.fileName) || 'fichier').toUpperCase();
  }
}
