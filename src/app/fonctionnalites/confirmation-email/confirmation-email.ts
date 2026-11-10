import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService as AuthApi } from '../../api/generes/utilisateurs/api/auth.service';
import { messageErreur } from '../../commun/utilitaires/erreurs';

/**
 * Cible du lien envoyé par email (/confirmation-email?token=...). Sans token, la page propose de
 * renvoyer l'email de confirmation (POST /auth/resend-confirmation).
 */
@Component({
  selector: 'app-confirmation-email',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="page">
      <section class="carte">
        <h1>Confirmation de l'email</h1>

        @switch (etat()) {
          @case ('chargement') { <p>Activation de votre compte…</p> }
          @case ('succes') {
            <div class="succes" role="status">Compte activé. Vous pouvez vous connecter.</div>
            <a class="btn" routerLink="/connexion">Se connecter</a>
          }
          @case ('erreur') {
            <div class="alerte" role="alert">{{ message() }}</div>
          }
        }

        @if (etat() !== 'chargement' && etat() !== 'succes') {
          <p class="sous-titre">Recevoir un nouveau lien de confirmation :</p>
          <form class="formulaire" (submit)="renvoyer($event)">
            <input type="email" [formControl]="email" placeholder="Votre email" autocomplete="email" />
            <button class="btn" type="submit" [disabled]="envoi() || email.invalid">
              {{ envoi() ? 'Envoi…' : 'Renvoyer le lien' }}
            </button>
          </form>
          @if (retour()) { <div class="info" role="status">{{ retour() }}</div> }
          <div class="liens"><a routerLink="/connexion">Retour à la connexion</a></div>
        }
      </section>
    </main>
  `,
})
export class ConfirmationEmail {
  private readonly api = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly etat = signal<'chargement' | 'succes' | 'erreur' | 'saisie'>('saisie');
  protected readonly message = signal('');
  protected readonly retour = signal<string | null>(null);
  protected readonly envoi = signal(false);
  protected readonly email = new FormControl(this.route.snapshot.queryParamMap.get('email') ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) return;
    // le jeton est à usage unique : un seul appel, déclenché à la création de la page
    this.etat.set('chargement');
    this.api.confirmEmail({ token }).subscribe({
      next: () => this.etat.set('succes'),
      error: (e: unknown) => {
        this.message.set(messageErreur(e));
        this.etat.set('erreur');
      },
    });
  }

  protected renvoyer(evenement: Event): void {
    evenement.preventDefault();
    if (this.email.invalid) return;
    this.envoi.set(true);
    this.retour.set(null);
    this.api.resendConfirmation({ email: this.email.value }).subscribe({
      next: (r) => { this.envoi.set(false); this.retour.set(r.message ?? 'Email envoyé.'); },
      error: (e: unknown) => { this.envoi.set(false); this.retour.set(messageErreur(e)); },
    });
  }
}
