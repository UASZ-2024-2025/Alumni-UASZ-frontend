import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService as AuthApi } from '../../api/generes/utilisateurs/api/auth.service';
import { RoleName } from '../../api/generes/utilisateurs/model/roleName';
import { LIBELLE_ROLE, ROLES_INSCRIPTION } from '../../commun/modeles/libelles';
import { messageErreur } from '../../commun/utilitaires/erreurs';
import {
  confirmationIdentique,
  MESSAGE_POLITIQUE_MDP,
  validateurPolitiqueMotDePasse,
} from '../../commun/utilitaires/mot-de-passe';

@Component({
  selector: 'app-inscription',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="page">
      <section class="carte">
        <h1>Créer un compte</h1>
        @if (emailEnvoye(); as email) {
          <div class="succes" role="status">
            Compte créé. Un email de confirmation a été envoyé à <strong>{{ email }}</strong>.
            Ouvrez le lien qu'il contient pour activer votre compte.
          </div>
          <div class="liens"><a routerLink="/connexion">Aller à la connexion</a></div>
        } @else {
          <p class="sous-titre">Rejoignez la plateforme Alumni de l'UASZ</p>
          <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
            @if (erreur()) { <div class="alerte" role="alert">{{ erreur() }}</div> }

            <div class="rang">
              <label>Prénom <input formControlName="firstName" autocomplete="given-name" /></label>
              <label>Nom <input formControlName="lastName" autocomplete="family-name" /></label>
            </div>
            @if (touche('firstName') || touche('lastName')) {
              <small class="invalide">Prénom et nom sont obligatoires (100 caractères max).</small>
            }

            <label>Email <input type="email" formControlName="email" autocomplete="email" /></label>
            @if (touche('email')) { <small class="invalide">Saisissez un email valide.</small> }

            <label>
              Je suis
              <select formControlName="role">
                @for (r of roles; track r) { <option [value]="r">{{ libelle[r] }}</option> }
              </select>
            </label>

            <label>
              Mot de passe
              <input type="password" formControlName="password" autocomplete="new-password" />
            </label>
            <small class="aide">{{ politique }}</small>
            @if (touche('password')) { <small class="invalide">{{ politique }}</small> }

            <label>
              Confirmer le mot de passe
              <input type="password" formControlName="confirmation" autocomplete="new-password" />
            </label>
            @if (formulaire.errors?.['confirmation'] && formulaire.controls.confirmation.touched) {
              <small class="invalide">Les mots de passe ne correspondent pas.</small>
            }

            <button class="btn" type="submit" [disabled]="chargement()">
              {{ chargement() ? 'Création…' : 'Créer mon compte' }}
            </button>
          </form>
          <div class="liens"><a routerLink="/connexion">J'ai déjà un compte</a></div>
        }
      </section>
    </main>
  `,
})
export class Inscription {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(AuthApi);

  protected readonly roles = ROLES_INSCRIPTION;
  protected readonly libelle = LIBELLE_ROLE;
  protected readonly politique = MESSAGE_POLITIQUE_MDP;
  protected readonly erreur = signal<string | null>(null);
  protected readonly chargement = signal(false);
  protected readonly emailEnvoye = signal<string | null>(null);

  protected readonly formulaire = this.fb.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      role: ['ETUDIANT' as RoleName, Validators.required],
      password: ['', [Validators.required, validateurPolitiqueMotDePasse]],
      confirmation: ['', Validators.required],
    },
    { validators: confirmationIdentique('password', 'confirmation') },
  );

  protected touche(champ: 'firstName' | 'lastName' | 'email' | 'password'): boolean {
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
    const { firstName, lastName, email, role, password } = this.formulaire.getRawValue();

    this.api.registerUser({ firstName, lastName, email, role, password }).subscribe({
      next: (u) => this.emailEnvoye.set(u.email ?? email),
      error: (e: unknown) => {
        this.chargement.set(false);
        this.erreur.set(messageErreur(e));
      },
    });
  }
}
