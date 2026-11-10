import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService as AuthApi } from '../../api/generes/utilisateurs/api/auth.service';
import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { messageErreur } from '../../commun/utilitaires/erreurs';
import {
  confirmationIdentique,
  MESSAGE_POLITIQUE_MDP,
  validateurPolitiqueMotDePasse,
} from '../../commun/utilitaires/mot-de-passe';

/**
 * Cible des liens « mot de passe oublié » ET « invitation » (compte créé par un administrateur) :
 * /reinitialisation-mot-de-passe?token=... Pour une invitation, le back active aussi le compte.
 */
@Component({
  selector: 'app-reinitialisation-mot-de-passe',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="page">
      <section class="carte">
        <h1>Choisir un mot de passe</h1>

        @if (!token) {
          <div class="alerte" role="alert">Lien invalide : aucun jeton fourni.</div>
          <div class="liens"><a routerLink="/mot-de-passe-oublie">Demander un nouveau lien</a></div>
        } @else if (termine()) {
          <div class="succes" role="status">Mot de passe enregistré. Vous pouvez vous connecter.</div>
          <a class="btn" routerLink="/connexion">Se connecter</a>
        } @else {
          <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
            @if (erreur(); as e) {
              <div class="alerte" role="alert">
                {{ e.message }}
                @if (e.code === 'INVALID_OR_EXPIRED_TOKEN') {
                  <br /><a routerLink="/mot-de-passe-oublie">Demander un nouveau lien</a>
                }
              </div>
            }
            <label>
              Nouveau mot de passe
              <input type="password" formControlName="newPassword" autocomplete="new-password" />
            </label>
            <small class="aide">{{ politique }}</small>
            @if (formulaire.controls.newPassword.touched && formulaire.controls.newPassword.invalid) {
              <small class="invalide">{{ politique }}</small>
            }
            <label>
              Confirmer
              <input type="password" formControlName="confirmation" autocomplete="new-password" />
            </label>
            @if (formulaire.errors?.['confirmation'] && formulaire.controls.confirmation.touched) {
              <small class="invalide">Les mots de passe ne correspondent pas.</small>
            }
            <button class="btn" type="submit" [disabled]="chargement()">
              {{ chargement() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </form>
        }
      </section>
    </main>
  `,
})
export class ReinitialisationMotDePasse {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(AuthApi);
  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  protected readonly politique = MESSAGE_POLITIQUE_MDP;
  protected readonly erreur = signal<ErreurApi | null>(null);
  protected readonly chargement = signal(false);
  protected readonly termine = signal(false);

  protected readonly formulaire = this.fb.group(
    {
      newPassword: ['', [Validators.required, validateurPolitiqueMotDePasse]],
      confirmation: ['', Validators.required],
    },
    { validators: confirmationIdentique('newPassword', 'confirmation') },
  );

  protected soumettre(): void {
    if (!this.token) return;
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.chargement.set(true);
    this.api
      .resetPassword({ token: this.token, newPassword: this.formulaire.getRawValue().newPassword })
      .subscribe({
        next: () => this.termine.set(true),
        error: (e: unknown) => {
          this.chargement.set(false);
          this.erreur.set(
            e instanceof ErreurApi ? e : new ErreurApi(0, 'ERREUR_INCONNUE', messageErreur(e)),
          );
        },
      });
  }
}
