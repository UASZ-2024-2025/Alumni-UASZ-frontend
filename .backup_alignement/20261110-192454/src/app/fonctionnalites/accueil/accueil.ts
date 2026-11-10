import { Component, inject, signal } from '@angular/core';
import { UsersService } from '../../api/generes/utilisateurs/api/users.service';
import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';

@Component({
  selector: 'app-accueil',
  template: `
    <h1>Bienvenue {{ auth.utilisateur()?.firstName }}</h1>
    <p>Rôle : <strong>{{ auth.role() }}</strong></p>
    <button type="button" (click)="appeler()">Appeler une ressource protégée</button>
    <button type="button" (click)="appelerEnParallele()">3 appels en parallèle</button>
    <pre>{{ resultat() }}</pre>
  `,
})
export class Accueil {
  protected readonly auth = inject(AuthentificationService);
  private readonly usersApi = inject(UsersService);
  protected readonly resultat = signal('—');

  protected appeler(): void {
    const id = this.auth.utilisateur()?.id;
    if (!id) return;
    this.usersApi.getUserById(id).subscribe({
      next: (u) => this.resultat.set(`OK : ${u.email} (${new Date().toLocaleTimeString()})`),
      error: (e: ErreurApi) => this.resultat.set(`Erreur ${e.statut} ${e.code} : ${e.message}`),
    });
  }

  protected appelerEnParallele(): void {
    for (let i = 0; i < 3; i++) this.appeler();
  }
}