import { Component, ElementRef, inject, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Bouton } from '../bouton/bouton';
import { Champ } from '../champ/champ';

/**
 * Zone de saisie d'un message : champ multiligne et bouton Envoyer.
 * Entrée envoie, Maj+Entrée passe à la ligne ; le bouton est désactivé pendant l'envoi (la saisie reste libre pour ne pas perdre le focus).
 *   <app-zone-saisie-message [(texte)]="brouillon" [envoiEnCours]="envoi()" (envoyer)="envoyer()" />
 */
@Component({
  selector: 'app-zone-saisie-message',
  imports: [FormsModule, Bouton, Champ],
  template: `
    <form (submit)="valider($event)">
      <app-champ type="textarea" [libelle]="libelle()" [libelleCache]="true" [placeholder]="placeholder()" [lignes]="lignes()"
        [longueurMax]="longueurMax()" [ngModel]="texte()" (ngModelChange)="texte.set($event)" [ngModelOptions]="{ standalone: true }"
        (keydown)="touche($event)" />
      <app-bouton type="submit" [desactive]="!peutEnvoyer()" [chargement]="envoiEnCours()">{{ libelleBouton() }}</app-bouton>
    </form>
  `,
  styles: `
    form { display: flex; align-items: flex-end; gap: 8px; }
    app-champ { flex: 1; }
  `,
})
export class ZoneSaisieMessage {
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly texte = model('');
  readonly libelle = input('Votre message');
  readonly placeholder = input('Écrire un message');
  /** « Enregistrer » pendant la modification d'un message déjà envoyé. */
  readonly libelleBouton = input('Envoyer');
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
