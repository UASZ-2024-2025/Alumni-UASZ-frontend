import { Component, ElementRef, inject, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Champ } from '../champ/champ';

/**
 * Zone de saisie d'un message : champ multiligne et bouton rond à icône, comme WhatsApp (avion en papier, coche en modification).
 * Entrée envoie, Maj+Entrée passe à la ligne ; le bouton est désactivé pendant l'envoi (la saisie reste libre pour ne pas perdre le focus).
 *   <app-zone-saisie-message [(texte)]="brouillon" [envoiEnCours]="envoi()" (envoyer)="envoyer()" />
 */
@Component({
  selector: 'app-zone-saisie-message',
  imports: [FormsModule, Champ],
  template: `
    <form (submit)="valider($event)">
      <app-champ type="textarea" [libelle]="libelle()" [libelleCache]="true" [placeholder]="placeholder()" [lignes]="lignes()"
        [longueurMax]="longueurMax()" [ngModel]="texte()" (ngModelChange)="texte.set($event)" [ngModelOptions]="{ standalone: true }"
        (keydown)="touche($event)" />
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
    form { display: flex; align-items: flex-end; gap: 8px; }
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
    if (this.peutEnvoyer()) this.envoyer.emit();
  }

  /** Redonne le focus à la saisie après un envoi. */
  focus(): void {
    this.hote.nativeElement.querySelector('textarea')?.focus();
  }
}
