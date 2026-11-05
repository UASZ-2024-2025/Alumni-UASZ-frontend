import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { CompteService } from '../services/compte.service';
import { MiseEnPageAuth } from '../composants/mise-en-page-auth/mise-en-page-auth';

@Component({
  selector: 'app-confirmation-email',
  imports: [RouterLink, MiseEnPageAuth],
  styleUrl: './connexion.scss',
  template: `
    <app-mise-en-page-auth><section class="carte">
      <h1>Confirmation de l'email</h1>
      @switch (etat()) {
        @case ('chargement') { <p>Vérification en cours…</p> }
        @case ('succes') {
          <div class="succes">Votre compte est activé. Vous pouvez vous connecter.</div>
          <p class="lien"><a routerLink="/connexion">Se connecter</a></p>
        }
        @case ('erreur') {
          <div class="alerte" role="alert">{{ message() }}</div>
          <p class="lien"><a routerLink="/renvoi-confirmation">Renvoyer l'email de confirmation</a></p>
        }
      }
    </section></app-mise-en-page-auth>
  `,
})
export class ConfirmationEmail implements OnInit {
  private readonly compte = inject(CompteService);
  private readonly route = inject(ActivatedRoute);

  protected readonly etat = signal<'chargement' | 'succes' | 'erreur'>('chargement');
  protected readonly message = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.message.set('Lien de confirmation incomplet.');
      this.etat.set('erreur');
      return;
    }
    this.compte.confirmerEmail(token).subscribe({
      next: () => this.etat.set('succes'),
      error: (e) => {
        this.message.set(messageErreur(e, { 400: 'Ce lien est invalide ou a expiré.' }));
        this.etat.set('erreur');
      },
    });
  }
}