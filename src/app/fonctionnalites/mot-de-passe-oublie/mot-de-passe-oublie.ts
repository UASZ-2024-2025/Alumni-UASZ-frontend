import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService as AuthApi } from '../../api/generes/utilisateurs/api/auth.service';
import { messageErreur } from '../../commun/utilitaires/erreurs';

@Component({
  selector: 'app-mot-de-passe-oublie',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="page">
      <section class="carte">
        <h1>Mot de passe oublié</h1>
        @if (message()) {
          <div class="succes" role="status">{{ message() }}</div>
        } @else {
          <p class="sous-titre">Saisissez votre email : vous recevrez un lien de réinitialisation.</p>
          <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
            @if (erreur()) { <div class="alerte" role="alert">{{ erreur() }}</div> }
            <label>Email <input type="email" formControlName="email" autocomplete="username" /></label>
            @if (formulaire.controls.email.touched && formulaire.controls.email.invalid) {
              <small class="invalide">Saisissez un email valide.</small>
            }
            <button class="btn" type="submit" [disabled]="chargement()">
              {{ chargement() ? 'Envoi…' : 'Envoyer le lien' }}
            </button>
          </form>
        }
        <div class="liens"><a routerLink="/connexion">Retour à la connexion</a></div>
      </section>
    </main>
  `,
})
export class MotDePasseOublie {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(AuthApi);

  protected readonly formulaire = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly message = signal<string | null>(null);
  protected readonly erreur = signal<string | null>(null);
  protected readonly chargement = signal(false);

  protected soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.chargement.set(true);
    this.api.forgotPassword({ email: this.formulaire.getRawValue().email }).subscribe({
      // le back répond pareil que le compte existe ou non : on affiche son message tel quel
      next: (r) => this.message.set(r.message ?? 'Si un compte correspond, un email a été envoyé.'),
      error: (e: unknown) => {
        this.chargement.set(false);
        this.erreur.set(messageErreur(e));
      },
    });
  }
}
