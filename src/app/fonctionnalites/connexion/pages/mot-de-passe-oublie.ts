import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { MiseEnPageAuth } from '../../../commun/components/mise-en-page-auth/mise-en-page-auth';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { CompteService } from '../services/compte.service';

@Component({
  selector: 'app-mot-de-passe-oublie',
  imports: [ReactiveFormsModule, RouterLink, MiseEnPageAuth, Alerte],
  template: `
    <app-mise-en-page-auth>
      <form class="carte" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
        <h1>Mot de passe oublié</h1>
        @if (erreur()) { <app-alerte>{{ erreur() }}</app-alerte> }
        @if (envoye()) {
          <app-alerte type="succes">Si un compte existe pour cette adresse, un email de réinitialisation vient d'être envoyé.</app-alerte>
        }
        <label>Email <input type="email" formControlName="email" autocomplete="username" /></label>
        @if (formulaire.controls.email.touched && formulaire.controls.email.invalid) {
          <small class="invalide">Saisissez un email valide.</small>
        }
        <button type="submit" [disabled]="chargement()">Envoyer le lien</button>
        <p class="lien"><a routerLink="/connexion">Retour à la connexion</a></p>
      </form>
    </app-mise-en-page-auth>
  `,
})
export class MotDePasseOublie {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly compte = inject(CompteService);

  protected readonly formulaire = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly erreur = signal<string | null>(null);
  protected readonly envoye = signal(false);
  protected readonly chargement = signal(false);

  protected soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.envoye.set(false);
    this.chargement.set(true);

    this.compte.motDePasseOublie(this.formulaire.getRawValue().email).subscribe({
      next: () => {
        this.chargement.set(false);
        this.envoye.set(true); // réponse volontairement générique côté back
      },
      error: (e) => {
        this.chargement.set(false);
        this.erreur.set(messageErreur(e));
      },
    });
  }
}