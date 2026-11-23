import { Component, ElementRef, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Champ } from '../champ/champ';
import { SelecteurEmoji } from '../selecteur-emoji/selecteur-emoji';

/**
 * Zone de saisie d'un message : champ multiligne et bouton rond à icône, comme WhatsApp (avion en papier, coche en modification).
 * Bouton émoji à gauche (ALUM-260) : l'émoji choisi s'insère à la position du curseur.
 * Entrée envoie, Maj+Entrée passe à la ligne ; le bouton est désactivé pendant l'envoi (la saisie reste libre pour ne pas perdre le focus).
 *   <app-zone-saisie-message [(texte)]="brouillon" [envoiEnCours]="envoi()" (envoyer)="envoyer()" />
 */
@Component({
  selector: 'app-zone-saisie-message',
  imports: [FormsModule, Champ, SelecteurEmoji],
  host: { '(document:click)': 'clicDocument($event)' },
  template: `
    <form (submit)="valider($event)">
      <button type="button" class="outil" [class.actif]="emojisOuverts()" aria-label="Émojis" title="Émojis"
        [attr.aria-expanded]="emojisOuverts()" (click)="emojisOuverts.set(!emojisOuverts())">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
          <circle class="plein" cx="9" cy="10" r="1.2" /><circle class="plein" cx="15" cy="10" r="1.2" />
        </svg>
      </button>
      @if (emojisOuverts()) {
        <app-selecteur-emoji class="emojis" (choisi)="insererEmoji($event)" (fermer)="fermerEmojis()" />
      }
      <app-champ type="textarea" [libelle]="libelle()" [libelleCache]="true" [placeholder]="placeholder()" [lignes]="lignes()"
        [longueurMax]="longueurMax()" [ngModel]="texte()" (ngModelChange)="texte.set($event)" [ngModelOptions]="{ standalone: true }"
        (keydown)="touche($event)" (focusout)="memoriserCurseur()" />
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
    </form>
  `,
  styles: `
    form { position: relative; display: flex; align-items: flex-end; gap: 6px; }
    .outil {
      flex: none; display: grid; place-items: center; width: 40px; height: 40px; margin-bottom: 4px;
      border: 0; border-radius: 50%; background: none; color: var(--mu); cursor: pointer;
    }
    .outil:hover, .outil.actif { background: var(--g0); color: var(--g8); }
    .outil:focus-visible { outline: 3px solid var(--ac); outline-offset: 1px; }
    .outil svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; }
    .outil .plein { fill: currentColor; stroke: none; }
    .emojis { position: absolute; bottom: calc(100% + 8px); left: 0; z-index: 20; }
    app-champ { flex: 1; }
    .envoi {
      flex: none; display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 2px;
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
  readonly envoyer = output<void>();

  protected readonly emojisOuverts = signal(false);
  /** Position du curseur quand la saisie a perdu le focus (clic sur le bouton ou sur un émoji). */
  private curseur: { debut: number; fin: number } | null = null;

  protected peutEnvoyer(): boolean {
    return this.texte().trim().length > 0 && !this.envoiEnCours();
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
    this.emojisOuverts.set(false);
    this.envoyer.emit();
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

  protected fermerEmojis(): void {
    this.emojisOuverts.set(false);
    this.zone()?.focus();
  }

  /** Un clic hors de la zone de saisie referme le panneau d'émojis. */
  protected clicDocument(e: MouseEvent): void {
    if (this.emojisOuverts() && !this.hote.nativeElement.contains(e.target as Node)) this.emojisOuverts.set(false);
  }

  private zone(): HTMLTextAreaElement | null {
    return this.hote.nativeElement.querySelector('textarea');
  }

  /** Redonne le focus à la saisie après un envoi. */
  focus(): void {
    this.hote.nativeElement.querySelector('textarea')?.focus();
  }
}
