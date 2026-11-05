import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RoleName } from '../../../api/generes/utilisateurs/model/roleName';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { CompteService } from '../services/compte.service';
import { MiseEnPageAuth } from '../composants/mise-en-page-auth/mise-en-page-auth';

const motsDePasseIdentiques: ValidatorFn = (g) =>
  g.get('password')?.value === g.get('confirmation')?.value ? null : { different: true };

@Component({
  selector: 'app-inscription',
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive, MiseEnPageAuth],
  styleUrl: './connexion.scss',
  template: `
    <app-mise-en-page-auth>
      @if (emailInscrit(); as email) {
        <section class="carte">
          <h1>Vérifiez votre email</h1>
          <div class="succes">Votre compte est créé. Un email de confirmation a été envoyé à {{ email }}.</div>
          <p class="lien">Pas reçu ?
            <a routerLink="/renvoi-confirmation" [queryParams]="{ email }">Renvoyer l'email</a></p>
          <p class="lien"><a routerLink="/connexion">Retour à la connexion</a></p>
        </section>
      } @else {
        <form class="carte" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
          <nav class="onglets" aria-label="Authentification">
            <a routerLink="/connexion" routerLinkActive="actif">Connexion</a>
            <a routerLink="/inscription" routerLinkActive="actif">Inscription</a>
          </nav>
          <h1>Créer un compte</h1>
          @if (erreur()) { <div class="alerte" role="alert">{{ erreur() }}</div> }

          <div class="deux-colonnes">
            <label>Nom <input formControlName="lastName" autocomplete="family-name" /></label>
            <label>Prénom <input formControlName="firstName" autocomplete="given-name" /></label>
          </div>
          <label>Email <input type="email" formControlName="email" autocomplete="username" /></label>
          @if (formulaire.controls.email.touched && formulaire.controls.email.invalid) {
            <small class="invalide">Saisissez un email valide.</small>
          }
          <label>Vous êtes
            <select formControlName="role">
              @for (r of roles; track r.valeur) { <option [value]="r.valeur">{{ r.libelle }}</option> }
            </select>
          </label>
          <label>Mot de passe (8 caractères minimum)
            <input type="password" formControlName="password" autocomplete="new-password" /></label>
          @if (formulaire.controls.password.touched && formulaire.controls.password.invalid) {
            <small class="invalide">Au moins 8 caractères.</small>
          }
          <label>Confirmer le mot de passe
            <input type="password" formControlName="confirmation" autocomplete="new-password" /></label>
          @if (formulaire.controls.confirmation.touched && formulaire.hasError('different')) {
            <small class="invalide">Les mots de passe ne correspondent pas.</small>
          }

          <button type="submit" [disabled]="chargement()">
            {{ chargement() ? 'Création…' : "S'inscrire" }}</button>
          <p class="lien">Déjà inscrit ? <a routerLink="/connexion">Se connecter</a></p>
        </form>
      }
    </app-mise-en-page-auth>
  `,
})
export class Inscription {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly compte = inject(CompteService);

  protected readonly roles = [
    { valeur: RoleName.Etudiant, libelle: 'Étudiant' },
    { valeur: RoleName.Alumni, libelle: 'Alumni (ancien étudiant)' },
    { valeur: RoleName.Enseignant, libelle: 'Enseignant' },
  ];
  protected readonly formulaire = this.fb.group(
    {
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: [RoleName.Etudiant as RoleName, Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmation: ['', Validators.required],
    },
    { validators: motsDePasseIdentiques },
  );
  protected readonly erreur = signal<string | null>(null);
  protected readonly chargement = signal(false);
  protected readonly emailInscrit = signal<string | null>(null);

  protected soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.chargement.set(true);
    const { confirmation, ...donnees } = this.formulaire.getRawValue();

    this.compte.inscrire(donnees).subscribe({
      next: () => {
        this.chargement.set(false);
        this.emailInscrit.set(donnees.email);
      },
      error: (e) => {
        this.chargement.set(false);
        this.erreur.set(
          messageErreur(e, {
            400: 'Certaines informations sont invalides. Vérifiez les champs.',
            409: 'Cette adresse email est déjà utilisée. Connectez-vous ou réinitialisez votre mot de passe.',
            422: 'Le mot de passe ne respecte pas la politique de sécurité.',
          }),
        );
      },
    });
  }
}