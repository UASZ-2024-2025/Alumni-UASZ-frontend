import { Component, computed, ElementRef, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Champ } from '../champ/champ';
import { EnregistreurVocal, enregistrementPossible, VocalEnregistre } from '../enregistreur-vocal/enregistreur-vocal';
import { SelecteurEmoji } from '../selecteur-emoji/selecteur-emoji';
import { SelecteurSticker } from '../selecteur-sticker/selecteur-sticker';

/** Fichier choisi avec le trombone : une photo ou un document. */
export interface FichierChoisi {
  fichier: File;
  kind: 'IMAGE' | 'FILE';
}

type Panneau = 'emojis' | 'stickers' | 'joindre' | null;

/**
 * Zone de saisie d'un message : champ multiligne et bouton rond à icône, comme WhatsApp (avion en papier, coche en modification).
 * Bouton émoji à gauche (ALUM-260) : l'émoji choisi s'insère à la position du curseur.
 * Stickers, trombone (photo, document) et micro (ALUM-262) : le micro remplace le bouton d'envoi tant que rien n'est saisi.
 * Entrée envoie, Maj+Entrée passe à la ligne ; le bouton est désactivé pendant l'envoi (la saisie reste libre pour ne pas perdre le focus).
 *   <app-zone-saisie-message [(texte)]="brouillon" [envoiEnCours]="envoi()" (envoyer)="envoyer()" />
 */
@Component({
  selector: 'app-zone-saisie-message',
  imports: [FormsModule, Champ, EnregistreurVocal, SelecteurEmoji, SelecteurSticker],
  host: { '(document:click)': 'clicDocument($event)' },
  template: `
    @if (enregistrement()) {
      <app-enregistreur-vocal [dureeMax]="dureeVocalMax()" (termine)="vocalTermine($event)" (annule)="enregistrement.set(false)"
        (erreur)="vocalImpossible($event)" />
    } @else {
      <form (submit)="valider($event)">
        <button type="button" class="outil" [class.actif]="panneau() === 'emojis'" aria-label="Émojis" title="Émojis"
          [attr.aria-expanded]="panneau() === 'emojis'" (click)="basculer('emojis')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
            <circle class="plein" cx="9" cy="10" r="1.2" /><circle class="plein" cx="15" cy="10" r="1.2" />
          </svg>
        </button>
        @if (stickers() && !edition()) {
          <button type="button" class="outil" [class.actif]="panneau() === 'stickers'" aria-label="Stickers" title="Stickers"
            [attr.aria-expanded]="panneau() === 'stickers'" (click)="basculer('stickers')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 13V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h6zM13 20v-4a3 3 0 0 1 3-3h4" />
              <circle class="plein" cx="9" cy="10" r="1.1" /><circle class="plein" cx="14" cy="10" r="1.1" />
            </svg>
          </button>
        }
        @if (piecesJointes() && !edition()) {
          <button type="button" class="outil" [class.actif]="panneau() === 'joindre'" aria-label="Joindre une photo ou un document"
            title="Joindre" [attr.aria-expanded]="panneau() === 'joindre'" (click)="basculer('joindre')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.5 11.5l-8.2 8.2a5 5 0 0 1-7-7l8.5-8.5a3.4 3.4 0 0 1 4.8 4.8l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
            </svg>
          </button>
        }
        <input #photo type="file" hidden [accept]="acceptImages()" (change)="fichierChoisi($event, 'IMAGE')" />
        <input #doc type="file" hidden [accept]="acceptDocuments()" (change)="fichierChoisi($event, 'FILE')" />
        @switch (panneau()) {
          @case ('emojis') {
            <app-selecteur-emoji class="panneau" (choisi)="insererEmoji($event)" (fermer)="fermerPanneau()" />
          }
          @case ('stickers') {
            <app-selecteur-sticker class="panneau" (choisi)="choisirSticker($event)" (fermer)="fermerPanneau()" />
          }
          @case ('joindre') {
            <ul class="panneau joindre" aria-label="Joindre" (keydown.escape)="fermerPanneau()">
              <li>
                <button type="button" (click)="photo.click(); fermerPanneau()">
                  <span class="pastille photo" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M4 7h3l2-2h6l2 2h3v12H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" /></svg>
                  </span>
                  Photo
                </button>
              </li>
              <li>
                <button type="button" (click)="doc.click(); fermerPanneau()">
                  <span class="pastille doc" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" /></svg>
                  </span>
                  Document
                </button>
              </li>
            </ul>
          }
        }
        <app-champ type="textarea" [libelle]="libelle()" [libelleCache]="true" [placeholder]="placeholder()" [lignes]="lignes()"
          [longueurMax]="longueurMax()" [ngModel]="texte()" (ngModelChange)="texte.set($event)" [ngModelOptions]="{ standalone: true }"
          (keydown)="touche($event)" (focusout)="memoriserCurseur()" />
        @if (micro()) {
          <button type="button" class="envoi" aria-label="Enregistrer un message vocal" title="Message vocal" [disabled]="envoiEnCours()"
            (click)="demarrerVocal()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
            </svg>
          </button>
        } @else {
          <button type="submit" class="envoi" [disabled]="!peutEnvoyer()" [attr.aria-busy]="envoiEnCours()"
            [attr.aria-label]="edition() ? 'Enregistrer la modification' : 'Envoyer'" [title]="edition() ? 'Enregistrer' : 'Envoyer'">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              @if (edition()) {
                <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              } @else {
                <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
              }
            </svg>
          </button>
        }
      </form>
    }
  `,
  styles: `
    form { position: relative; display: flex; align-items: flex-end; gap: 2px; }
    .outil {
      flex: none; display: grid; place-items: center; width: 40px; height: 40px; margin-bottom: 4px;
      border: 0; border-radius: 50%; background: none; color: var(--mu); cursor: pointer;
    }
    .outil:hover, .outil.actif { background: var(--g0); color: var(--g8); }
    .outil:focus-visible { outline: 3px solid var(--ac); outline-offset: 1px; }
    .outil svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .outil .plein { fill: currentColor; stroke: none; }
    .panneau { position: absolute; bottom: calc(100% + 8px); left: 0; z-index: 20; }
    .joindre {
      margin: 0; padding: 6px; list-style: none; min-width: 190px;
      border: 1px solid var(--bd); border-radius: var(--rayon-l); background: var(--sf); box-shadow: var(--ombre-flottante);
    }
    .joindre button {
      display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px 10px; border: 0; border-radius: var(--rayon-m);
      background: none; color: inherit; font: inherit; text-align: left; cursor: pointer;
    }
    .joindre button:hover, .joindre button:focus-visible { background: var(--g0); outline: none; }
    .pastille { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; color: #fff; }
    .pastille svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round; }
    .pastille.photo { background: #c2185b; }
    .pastille.doc { background: #5b4fc7; }
    app-champ { flex: 1; margin-left: 4px; }
    .envoi {
      flex: none; display: grid; place-items: center; width: 44px; height: 44px; margin: 0 0 2px 4px;
      border: 0; border-radius: 50%; background: var(--g8); color: #fff; cursor: pointer;
      transition: background-color 0.15s, opacity 0.15s;
    }
    .envoi:hover:not(:disabled) { background: var(--g9); }
    .envoi:focus-visible { outline: 3px solid var(--ac); outline-offset: 2px; }
    .envoi:disabled { opacity: 0.45; cursor: default; }
    .envoi svg { width: 22px; height: 22px; fill: currentColor; }
    .envoi[aria-busy='true'] svg { opacity: 0.6; }
  `,
})
export class ZoneSaisieMessage {
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly texte = model('');
  readonly libelle = input('Votre message');
  readonly placeholder = input('Écrire un message');
  /** Modification d'un message déjà envoyé : coche « Enregistrer » au lieu de l'avion en papier. */
  readonly edition = input(false);
  readonly lignes = input(2);
  readonly longueurMax = input<number | null>(null);
  readonly envoiEnCours = input(false);
  /** Bouton stickers (ALUM-262). */
  readonly stickers = input(false);
  /** Trombone et micro : seulement si le stockage des pièces jointes est actif. */
  readonly piecesJointes = input(false);
  readonly acceptImages = input('image/*');
  readonly acceptDocuments = input('');
  readonly dureeVocalMax = input(120);
  /** Une pièce jointe attend au-dessus de la saisie : on peut envoyer sans texte (la saisie devient sa légende). */
  readonly pieceEnAttente = input(false);
  readonly envoyer = output<void>();
  readonly fichier = output<FichierChoisi>();
  readonly sticker = output<string>();
  readonly vocal = output<VocalEnregistre>();
  /** Problème à signaler à l'utilisateur (micro refusé...). */
  readonly erreur = output<string>();

  protected readonly panneau = signal<Panneau>(null);
  protected readonly enregistrement = signal(false);
  /** Le micro remplace l'envoi tant que rien n'est saisi, comme sur WhatsApp. */
  protected readonly micro = computed(
    () => this.piecesJointes() && !this.edition() && !this.pieceEnAttente() && !this.texte().trim() && enregistrementPossible(),
  );
  /** Position du curseur quand la saisie a perdu le focus (clic sur le bouton ou sur un émoji). */
  private curseur: { debut: number; fin: number } | null = null;

  protected peutEnvoyer(): boolean {
    return (this.texte().trim().length > 0 || (this.pieceEnAttente() && !this.edition())) && !this.envoiEnCours();
  }

  protected touche(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this.valider(e);
    }
  }

  protected valider(e: Event): void {
    e.preventDefault();
    if (!this.peutEnvoyer()) return;
    this.panneau.set(null);
    this.envoyer.emit();
  }

  protected basculer(p: Panneau): void {
    this.panneau.update((actuel) => (actuel === p ? null : p));
  }

  protected choisirSticker(code: string): void {
    this.panneau.set(null);
    this.sticker.emit(code);
  }

  protected fichierChoisi(e: Event, kind: 'IMAGE' | 'FILE'): void {
    const champ = e.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = ''; // rechoisir le même fichier redéclenche l'événement
    if (!fichier) return;
    this.fichier.emit({ fichier, kind });
    this.focus();
  }

  protected demarrerVocal(): void {
    this.panneau.set(null);
    this.enregistrement.set(true);
  }

  protected vocalTermine(v: VocalEnregistre): void {
    this.enregistrement.set(false);
    this.vocal.emit(v);
  }

  protected vocalImpossible(message: string): void {
    this.enregistrement.set(false);
    this.erreur.emit(message);
  }

  /** Insère l'émoji à la place de la sélection (ou au curseur) et replace le curseur juste après. */
  protected insererEmoji(emoji: string): void {
    const zone = this.zone();
    const texte = this.texte();
    const actif = zone !== null && document.activeElement === zone;
    const debut = Math.min(actif ? zone.selectionStart : (this.curseur?.debut ?? texte.length), texte.length);
    const fin = Math.min(actif ? zone.selectionEnd : (this.curseur?.fin ?? texte.length), texte.length);
    const nouveau = texte.slice(0, debut) + emoji + texte.slice(fin);
    const max = this.longueurMax();
    if (max !== null && nouveau.length > max) return;
    this.texte.set(nouveau);
    const curseur = debut + emoji.length;
    this.curseur = { debut: curseur, fin: curseur }; // émojis enchaînés : chacun après le précédent
    // le champ reçoit la nouvelle valeur au prochain cycle : on attend avant de replacer le curseur
    setTimeout(() => {
      zone?.focus();
      zone?.setSelectionRange(curseur, curseur);
    });
  }

  protected memoriserCurseur(): void {
    const zone = this.zone();
    if (zone) this.curseur = { debut: zone.selectionStart, fin: zone.selectionEnd };
  }

  protected fermerPanneau(): void {
    this.panneau.set(null);
    this.zone()?.focus();
  }

  /** Un clic hors de la zone de saisie referme le panneau ouvert (émojis, stickers, menu du trombone). */
  protected clicDocument(e: MouseEvent): void {
    if (this.panneau() && !this.hote.nativeElement.contains(e.target as Node)) this.panneau.set(null);
  }

  private zone(): HTMLTextAreaElement | null {
    return this.hote.nativeElement.querySelector('textarea');
  }

  /** Redonne le focus à la saisie après un envoi. */
  focus(): void {
    this.zone()?.focus();
  }
}
