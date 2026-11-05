import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { MiseEnPageAuth } from '../../../commun/components/mise-en-page-auth/mise-en-page-auth';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { CompteService } from '../services/compte.service';

const identiques: ValidatorFn = (g) =>
  g.get('newPassword')?.value === g.get('confirmation')?.value ? null : { different: true };

@Component({
  selector: 'app-reinitialisation-mot-de-passe',
  imports: [ReactiveFormsModule, RouterLink, MiseEnPageAuth, Alerte],
  template: `
    <app-mise-en-page-auth>
      @if (reussi()) {
        <section class="carte">
          <h1>Mot de passe modifié</h1>
          <app-alerte type="succes">Votre mot de passe a été réinitialisé.</app-alerte>
          <p class="lien"><a routerLink="/connexion">Se connecter</a></p>
        </section>
      } @else {
        <form class="carte" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
          <h1>Nouveau mot de passe</h1>
          @if (erreur()) { <app-alerte>{{ erreur() }}</app-alerte> }
          @if (lienInvalide()) {
            <p class="lien"><a routerLink="/mot-de-passe-oublie">Demander un nouveau lien</a></p>
          }
          <label>Nouveau mot de passe (8 caractères minimum)
            <input type="password" formControlName="newPassword" autocomplete="new-password" /></label>
          @if (formulaire.controls.newPassword.touched && formulaire.controls.newPassword.invalid) {
            <small class="invalide">Au moins 8 caractères.</small>
          }
          <label>Confirmer
            <input type="password" formControlName="confirmation" autocomplete="new-password" /></label>
          @if (formulaire.controls.confirmation.touched && formulaire.hasError('different')) {
            <small class="invalide">Les mots de passe ne correspondent pas.</small>
          }
          <button type="submit" [disabled]="chargement()">Réinitialiser</button>
        </form>
      }
    </app-mise-en-page-auth>
  `,
})
export class ReinitialisationMotDePasse {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly compte = inject(CompteService);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  protected readonly formulaire = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmation: ['', Validators.required],
    },
    { validators: identiques },
  );
  protected readonly erreur = signal<string | null>(
    this.token ? null : 'Lien de réinitialisation incomplet.',
  );
  protected readonly lienInvalide = signal(!this.token);
  protected readonly chargement = signal(false);
  protected readonly reussi = signal(false);

  protected soumettre(): void {
    if (!this.token) return;
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.chargement.set(true);

    this.compte.reinitialiserMotDePasse(this.token, this.formulaire.getRawValue().newPassword).subscribe({
      next: () => {
        this.chargement.set(false);
        this.reussi.set(true);
      },
      error: (e) => {
        this.chargement.set(false);
        this.lienInvalide.set(e.statut === 400);
        this.erreur.set(
          messageErreur(e, {
            400: 'Ce lien est invalide ou a expiré.',
            422: 'Le mot de passe ne respecte pas la politique de sécurité.',
          }),
        );
      },
    });
  }
}