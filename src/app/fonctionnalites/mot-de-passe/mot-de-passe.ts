import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { messageErreur } from '../../commun/utilitaires/erreurs';
import {
  confirmationIdentique,
  MESSAGE_POLITIQUE_MDP,
  validateurPolitiqueMotDePasse,
} from '../../commun/utilitaires/mot-de-passe';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';

const differentDeLActuel = (g: AbstractControl): ValidationErrors | null => {
  const actuel = g.get('currentPassword')?.value;
  const nouveau = g.get('newPassword')?.value;
  return actuel && nouveau && actuel === nouveau ? { identique: true } : null;
};

@Component({
  selector: 'app-mot-de-passe',
  imports: [ReactiveFormsModule],
  template: `
    <section class="panneau etroit">
      <h1>Changer mon mot de passe</h1>
      <p class="aide">Toutes vos sessions seront fermées : vous devrez vous reconnecter.</p>
      <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
        @if (erreur()) { <div class="alerte" role="alert">{{ erreur() }}</div> }

        <label>
          Mot de passe actuel
          <input type="password" formControlName="currentPassword" autocomplete="current-password" />
        </label>
        <label>
          Nouveau mot de passe
          <input type="password" formControlName="newPassword" autocomplete="new-password" />
        </label>
        <small class="aide">{{ politique }}</small>
        @if (formulaire.controls.newPassword.touched && formulaire.controls.newPassword.invalid) {
          <small class="invalide">{{ politique }}</small>
        }
        @if (formulaire.errors?.['identique']) {
          <small class="invalide">Le nouveau mot de passe doit être différent de l'actuel.</small>
        }
        <label>
          Confirmer le nouveau mot de passe
          <input type="password" formControlName="confirmation" autocomplete="new-password" />
        </label>
        @if (formulaire.errors?.['confirmation'] && formulaire.controls.confirmation.touched) {
          <small class="invalide">Les mots de passe ne correspondent pas.</small>
        }

        <button class="btn" type="submit" [disabled]="chargement()">
          {{ chargement() ? 'Modification…' : 'Modifier le mot de passe' }}
        </button>
      </form>
    </section>
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
      error: (e: unknown) => {
        this.chargement.set(false);
        this.erreur.set(messageErreur(e));
      },
    });
  }
}
