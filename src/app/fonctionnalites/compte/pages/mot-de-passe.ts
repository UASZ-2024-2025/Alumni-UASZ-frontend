import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ } from '../../../commun/components/champ/champ';
import {
  confirmationIdentique,
  MESSAGE_POLITIQUE_MDP,
  validateurPolitiqueMotDePasse,
} from '../../../commun/utilitaires/mot-de-passe';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';

const differentDeLActuel: ValidatorFn = (g) => {
  const actuel = g.get('currentPassword')?.value;
  const nouveau = g.get('newPassword')?.value;
  return actuel && nouveau && actuel === nouveau ? { identique: true } : null;
};

@Component({
  selector: 'app-mot-de-passe',
  imports: [ReactiveFormsModule, Alerte, Bouton, Carte, Champ],
  styleUrl: '../compte.scss',
  template: `
    <h1>Changer mon mot de passe</h1>
    <app-carte>
      <p class="aide">Toutes vos sessions seront fermées : vous devrez vous reconnecter.</p>
      <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
        @if (erreur(); as message) { <app-alerte>{{ message }}</app-alerte> }
        <app-champ libelle="Mot de passe actuel" type="password" [requis]="true" formControlName="currentPassword"
          [erreur]="touche('currentPassword') ? 'Le mot de passe actuel est obligatoire.' : null" />
        <app-champ libelle="Nouveau mot de passe" type="password" [requis]="true" formControlName="newPassword"
          [erreur]="touche('newPassword') ? politique : formulaire.hasError('identique') ? 'Le nouveau mot de passe doit être différent de l’actuel.' : null" />
        <p class="aide">{{ politique }}</p>
        <app-champ libelle="Confirmer le nouveau mot de passe" type="password" [requis]="true" formControlName="confirmation"
          [erreur]="formulaire.controls.confirmation.touched && formulaire.hasError('confirmation') ? 'Les mots de passe ne correspondent pas.' : null" />
        <div class="pied">
          <app-bouton type="submit" [chargement]="chargement()">Modifier le mot de passe</app-bouton>
        </div>
      </form>
    </app-carte>
  `,
})
export class MotDePasse {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthentificationService);

  protected readonly politique = MESSAGE_POLITIQUE_MDP;
  protected readonly erreur = signal<string | null>(null);
  protected readonly chargement = signal(false);

  protected readonly formulaire = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, validateurPolitiqueMotDePasse]],
      confirmation: ['', Validators.required],
    },
    { validators: [confirmationIdentique('newPassword', 'confirmation'), differentDeLActuel] },
  );

  protected touche(champ: 'currentPassword' | 'newPassword'): boolean {
    const c = this.formulaire.controls[champ];
    return c.touched && c.invalid;
  }

  protected soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.chargement.set(true);
    const { currentPassword, newPassword } = this.formulaire.getRawValue();
    // succès : la session locale est fermée et l'utilisateur est renvoyé vers /connexion
    this.auth.changerMotDePasse(currentPassword, newPassword).subscribe({
      error: (e) => {
        this.chargement.set(false);
        this.erreur.set(messageErreur(e, { 422: MESSAGE_POLITIQUE_MDP }));
      },
    });
  }
}
