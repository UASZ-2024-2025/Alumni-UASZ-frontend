import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RolesService } from '../../api/generes/utilisateurs/api/roles.service';
import { UsersService } from '../../api/generes/utilisateurs/api/users.service';
import { UserStatus } from '../../api/generes/utilisateurs/model/userStatus';
import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { LIBELLE_ROLE, LIBELLE_STATUT, TOUS_LES_STATUTS } from '../../commun/modeles/libelles';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';

@Component({
  selector: 'app-accueil',
  imports: [DatePipe, RouterLink],
  template: `
    <h1>Bienvenue {{ auth.utilisateur()?.firstName }}</h1>

    <section class="grille">
      <article class="panneau">
        <h2>Mon compte</h2>
        <dl class="details">
          <dt>Nom</dt><dd>{{ auth.utilisateur()?.firstName }} {{ auth.utilisateur()?.lastName }}</dd>
          <dt>Email</dt><dd>{{ auth.utilisateur()?.email }}</dd>
          <dt>Rôle</dt><dd>{{ role() }}</dd>
          <dt>Statut</dt><dd>{{ statut() }}</dd>
          <dt>Inscrit le</dt><dd>{{ auth.utilisateur()?.createdAt | date: 'dd/MM/yyyy' }}</dd>
        </dl>
        <div class="actions">
          <a class="btn btn-secondaire" routerLink="/profil">Modifier mon profil</a>
          <a class="btn btn-secondaire" routerLink="/mot-de-passe">Changer mon mot de passe</a>
        </div>
      </article>

      <article class="panneau">
        <h2>Mes permissions</h2>
        @if (permissions().length) {
          <ul class="puces">
            @for (p of permissions(); track p) { <li><code>{{ p }}</code></li> }
          </ul>
        } @else { <p class="aide">Chargement…</p> }
      </article>
    </section>

    @if (auth.estAdministrateur()) {
      <h2>Comptes par statut</h2>
      <section class="grille">
        @for (s of statuts; track s) {
          <article class="panneau compteur">
            <span class="valeur">{{ compteurs()[s] ?? '…' }}</span>
            <span>{{ libelleStatut[s] }}</span>
          </article>
        }
      </section>
      <a class="btn" routerLink="/administration/utilisateurs">Gérer les utilisateurs</a>
    }

    <details class="panneau technique">
      <summary>Test technique de la session (jeton / renouvellement)</summary>
      <div class="actions">
        <button class="btn btn-secondaire" type="button" (click)="appeler()">Appeler une ressource protégée</button>
        <button class="btn btn-secondaire" type="button" (click)="appelerEnParallele()">3 appels en parallèle</button>
      </div>
      <pre>{{ resultat() }}</pre>
    </details>
  `,
})
export class Accueil implements OnInit {
  protected readonly auth = inject(AuthentificationService);
  private readonly usersApi = inject(UsersService);
  private readonly rolesApi = inject(RolesService);

  protected readonly statuts = TOUS_LES_STATUTS;
  protected readonly libelleStatut = LIBELLE_STATUT;
  protected readonly resultat = signal('—');
  protected readonly permissions = signal<string[]>([]);
  protected readonly compteurs = signal<Partial<Record<UserStatus, number>>>({});

  protected role(): string {
    const r = this.auth.role();
    return r ? LIBELLE_ROLE[r] : '';
  }
  protected statut(): string {
    const s = this.auth.utilisateur()?.status;
    return s ? LIBELLE_STATUT[s] : '';
  }

  ngOnInit(): void {
    const role = this.auth.role();
    this.rolesApi.listRoles().subscribe({
      next: (roles) => this.permissions.set(roles.find((r) => r.name === role)?.permissions ?? []),
      error: () => this.permissions.set([]),
    });

    if (this.auth.estAdministrateur()) {
      // size=1 : on ne lit que totalElements
      forkJoin(
        TOUS_LES_STATUTS.map((s) => this.usersApi.listUsers(undefined, s, 0, 1)),
      ).subscribe({
        next: (reponses) => {
          const c: Partial<Record<UserStatus, number>> = {};
          TOUS_LES_STATUTS.forEach((s, i) => (c[s] = reponses[i].totalElements ?? 0));
          this.compteurs.set(c);
        },
        error: () => this.compteurs.set({}),
      });
    }
  }

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
