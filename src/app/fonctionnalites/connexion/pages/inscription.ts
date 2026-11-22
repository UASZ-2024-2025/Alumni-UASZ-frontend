import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RoleName } from '../../../api/generes/utilisateurs/model/roleName';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { MESSAGE_POLITIQUE_MDP, validateurPolitiqueMotDePasse } from '../../../commun/utilitaires/mot-de-passe';
import { MiseEnPageAuth } from '../../../commun/components/mise-en-page-auth/mise-en-page-auth';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { OngletsAuth } from '../../../commun/components/onglets-auth/onglets-auth';
import { Champ } from '../../../commun/components/champ/champ';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { CompteService } from '../services/compte.service';

const motsDePasseIdentiques: ValidatorFn = (g) =>
  g.get('password')?.value === g.get('confirmation')?.value ? null : { different: true };

@Component({
  selector: 'app-inscription',
  imports: [ReactiveFormsModule, RouterLink, MiseEnPageAuth, Alerte, OngletsAuth, Champ, Bouton],
  template: `
    <app-mise-en-page-auth>
      @if (emailInscrit(); as email) {
        <section class="carte">
          <h1>Vérifiez votre email</h1>
          <app-alerte type="succes">Votre compte est créé. Un email de confirmation a été envoyé à {{ email }}.</app-alerte>
          <p class="lien">Pas reçu ?
            <a routerLink="/renvoi-confirmation" [queryParams]="{ email }">Renvoyer l'email</a></p>
          <p class="lien"><a routerLink="/connexion">Retour à la connexion</a></p>
        </section>
      } @else {
        <form class="carte" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
          <app-onglets-auth />
          <h1>Créer un compte</h1>
          @if (erreur()) { <app-alerte>{{ erreur() }}</app-alerte> }

          <div class="deux-colonnes">
            <app-champ libelle="Nom" formControlName="lastName" autocomplete="family-name" />
            <app-champ libelle="Prénom" formControlName="firstName" autocomplete="given-name" />
          </div>
          <app-champ libelle="Email" type="email" formControlName="email" autocomplete="username"
            [erreur]="formulaire.controls.email.touched && formulaire.controls.email.invalid ? 'Saisissez un email valide.' : null" />
          <app-champ libelle="Vous êtes" type="select" formControlName="role" [options]="roles" />
          <app-champ libelle="Mot de passe" type="password" formControlName="password" autocomplete="new-password"
            [erreur]="formulaire.controls.password.touched && formulaire.controls.password.invalid ? politique : null" />
          <app-champ libelle="Confirmer le mot de passe" type="password" formControlName="confirmation" autocomplete="new-password"
            [erreur]="formulaire.controls.confirmation.touched && formulaire.hasError('different') ? 'Les mots de passe ne correspondent pas.' : null" />

          <app-bouton type="submit" [pleineLargeur]="true" [chargement]="chargement()">
            {{ chargement() ? 'Création…' : "S'inscrire" }}</app-bouton>
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
    { valeur: RoleName.Entreprise, libelle: 'Entreprise' },
  ];
  protected readonly formulaire = this.fb.group(
    {
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: [RoleName.Etudiant as RoleName, Validators.required],
      password: ['', [Validators.required, validateurPolitiqueMotDePasse]],
      confirmation: ['', Validators.required],
    },
    { validators: motsDePasseIdentiques },
  );
  protected readonly erreur = signal<string | null>(null);
  protected readonly chargement = signal(false);
  protected readonly emailInscrit = signal<string | null>(null);
  protected readonly politique = MESSAGE_POLITIQUE_MDP;

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