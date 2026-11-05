import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { CompteService } from '../services/compte.service';
import { MiseEnPageAuth } from '../composants/mise-en-page-auth/mise-en-page-auth';

@Component({
  selector: 'app-renvoi-confirmation',
  imports: [ReactiveFormsModule, RouterLink, MiseEnPageAuth],
  styleUrl: './connexion.scss',
  template: `
    <app-mise-en-page-auth>
      <form class="carte" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
        <h1>Renvoyer l'email de confirmation</h1>
        @if (erreur()) { <div class="alerte" role="alert">{{ erreur() }}</div> }
        @if (succes()) { <div class="succes">{{ succes() }}</div> }
        <label>Email <input type="email" formControlName="email" autocomplete="username" /></label>
        @if (formulaire.controls.email.touched && formulaire.controls.email.invalid) {
          <small class="invalide">Saisissez un email valide.</small>
        }
        <button type="submit" [disabled]="chargement()">Renvoyer</button>
        <p class="lien"><a routerLink="/connexion">Retour à la connexion</a></p>
      </form>
    </app-mise-en-page-auth>
  `,
})
export class RenvoiConfirmation {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly compte = inject(CompteService);
  private readonly route = inject(ActivatedRoute);

  protected readonly formulaire = this.fb.group({
    email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
  });
  protected readonly erreur = signal<string | null>(null);
  protected readonly succes = signal<string | null>(null);
  protected readonly chargement = signal(false);

  protected soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.succes.set(null);
    this.chargement.set(true);
    const { email } = this.formulaire.getRawValue();

    this.compte.renvoyerConfirmation(email).subscribe({
      next: () => {
        this.chargement.set(false);
        this.succes.set("Si un compte en attente existe pour cette adresse, un nouvel email vient d'être envoyé.");
      },
      error: (e) => {
        this.chargement.set(false);
        this.erreur.set(messageErreur(e, { 409: 'Ce compte est déjà activé. Vous pouvez vous connecter.' }));
      },
    });
  }
}