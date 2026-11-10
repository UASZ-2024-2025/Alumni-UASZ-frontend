import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '../../api/generes/utilisateurs/api/users.service';
import { RoleName } from '../../api/generes/utilisateurs/model/roleName';
import { User } from '../../api/generes/utilisateurs/model/user';
import { UserStatus } from '../../api/generes/utilisateurs/model/userStatus';
import {
  LIBELLE_ROLE,
  LIBELLE_STATUT,
  STATUTS_ATTRIBUABLES,
  TOUS_LES_ROLES,
  TOUS_LES_STATUTS,
} from '../../commun/modeles/libelles';
import { messageErreur } from '../../commun/utilitaires/erreurs';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';

type Panneau = { type: 'creation' } | { type: 'edition'; utilisateur: User } | null;

@Component({
  selector: 'app-administration-utilisateurs',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="barre-outils">
      <h1>Utilisateurs</h1>
      <button class="btn" type="button" (click)="ouvrirCreation()">+ Créer un utilisateur</button>
    </div>

    @if (message()) { <div class="succes" role="status">{{ message() }}</div> }
    @if (erreur()) { <div class="alerte" role="alert">{{ erreur() }}</div> }

    @if (panneau(); as p) {
      <section class="panneau">
        @if (p.type === 'creation') {
          <h2>Créer un utilisateur</h2>
          <p class="aide">
            Le compte est créé « en attente » : l'utilisateur reçoit un email pour choisir son mot de passe.
          </p>
        } @else {
          <h2>Modifier {{ p.utilisateur.firstName }} {{ p.utilisateur.lastName }}</h2>
        }
        <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="enregistrer()" novalidate>
          <div class="rang">
            <label>Prénom <input formControlName="firstName" /></label>
            <label>Nom <input formControlName="lastName" /></label>
          </div>
          <div class="rang">
            <label>Email <input type="email" formControlName="email" /></label>
            <label>Téléphone <input formControlName="phone" maxlength="30" /></label>
          </div>
          @if (p.type === 'creation') {
            <label>
              Rôle
              <select formControlName="role">
                @for (r of roles; track r) { <option [value]="r">{{ libelleRole[r] }}</option> }
              </select>
            </label>
          } @else {
            <small class="aide">
              Le rôle n'est pas modifiable : le contrat user-service n'expose pas cette opération.
            </small>
          }
          @if (formulaire.invalid && formulaire.touched) {
            <small class="invalide">Prénom, nom et email valide sont obligatoires.</small>
          }
          <div class="actions">
            <button class="btn" type="submit" [disabled]="envoi()">
              {{ envoi() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <button class="btn btn-secondaire" type="button" (click)="panneau.set(null)">Annuler</button>
          </div>
        </form>
      </section>
    }

    <div class="filtres">
      <label>
        Rôle
        <select [value]="filtreRole()" (change)="changerFiltre('role', $any($event.target).value)">
          <option value="">Tous</option>
          @for (r of roles; track r) { <option [value]="r">{{ libelleRole[r] }}</option> }
        </select>
      </label>
      <label>
        Statut
        <select [value]="filtreStatut()" (change)="changerFiltre('statut', $any($event.target).value)">
          <option value="">Tous</option>
          @for (s of statutsFiltre; track s) { <option [value]="s">{{ libelleStatut[s] }}</option> }
        </select>
      </label>
    </div>

    <div class="defilement">
      <table class="tableau">
        <thead>
          <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Créé le</th><th>Actions</th></tr>
        </thead>
        <tbody>
          @for (u of utilisateurs(); track u.id) {
            <tr>
              <td>{{ u.firstName }} {{ u.lastName }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.role ? libelleRole[u.role] : '' }}</td>
              <td><span class="badge statut-{{ u.status }}">{{ u.status ? libelleStatut[u.status] : '' }}</span></td>
              <td>{{ u.createdAt | date: 'dd/MM/yyyy' }}</td>
              <td class="actions">
                <select
                  [value]="u.status"
                  [disabled]="estMoi(u)"
                  [title]="estMoi(u) ? 'Vous ne pouvez pas modifier votre propre compte' : 'Changer le statut'"
                  (change)="changerStatut(u, $any($event.target).value)"
                >
                  @if (u.status === 'EN_ATTENTE') { <option value="EN_ATTENTE" disabled>En attente</option> }
                  @for (s of statutsAttribuables; track s) {
                    <option [value]="s">{{ libelleStatut[s] }}</option>
                  }
                </select>
                <button class="btn btn-secondaire" type="button" (click)="ouvrirEdition(u)">Modifier</button>
                <button class="btn btn-danger" type="button" [disabled]="estMoi(u)" (click)="supprimer(u)">
                  Supprimer
                </button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="aide">{{ chargement() ? 'Chargement…' : 'Aucun utilisateur.' }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button class="btn btn-secondaire" type="button" [disabled]="page() === 0" (click)="aller(page() - 1)">
        ← Précédent
      </button>
      <span>Page {{ page() + 1 }} / {{ nbPages() }} · {{ total() }} utilisateur(s)</span>
      <button class="btn btn-secondaire" type="button" [disabled]="page() + 1 >= nbPages()" (click)="aller(page() + 1)">
        Suivant →
      </button>
    </div>
  `,
})
export class AdministrationUtilisateurs implements OnInit {
  private readonly api = inject(UsersService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthentificationService);

  protected readonly roles = TOUS_LES_ROLES;
  protected readonly statutsFiltre = TOUS_LES_STATUTS;
  protected readonly statutsAttribuables = STATUTS_ATTRIBUABLES;
  protected readonly libelleRole = LIBELLE_ROLE;
  protected readonly libelleStatut = LIBELLE_STATUT;
  private readonly taille = 10;

  protected readonly utilisateurs = signal<User[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly nbPages = computed(() => Math.max(1, Math.ceil(this.total() / this.taille)));
  protected readonly filtreRole = signal<RoleName | ''>('');
  protected readonly filtreStatut = signal<UserStatus | ''>('');
  protected readonly chargement = signal(false);
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly panneau = signal<Panneau>(null);

  protected readonly formulaire = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    role: ['ETUDIANT' as RoleName],
  });

  ngOnInit(): void {
    this.charger();
  }

  protected estMoi(u: User): boolean {
    return u.id === this.auth.utilisateur()?.id;
  }

  protected charger(): void {
    this.chargement.set(true);
    this.api
      .listUsers(this.filtreRole() || undefined, this.filtreStatut() || undefined, this.page(), this.taille)
      .subscribe({
        next: (r) => {
          this.utilisateurs.set(r.content ?? []);
          this.total.set(r.totalElements ?? 0);
          this.chargement.set(false);
        },
        error: (e: unknown) => {
          this.erreur.set(messageErreur(e));
          this.chargement.set(false);
        },
      });
  }

  protected changerFiltre(type: 'role' | 'statut', valeur: string): void {
    if (type === 'role') this.filtreRole.set(valeur as RoleName | '');
    else this.filtreStatut.set(valeur as UserStatus | '');
    this.aller(0);
  }

  protected aller(page: number): void {
    this.page.set(page);
    this.charger();
  }

  protected ouvrirCreation(): void {
    this.reinitialiserMessages();
    this.formulaire.reset({ firstName: '', lastName: '', email: '', phone: '', role: 'ETUDIANT' });
    this.panneau.set({ type: 'creation' });
  }

  protected ouvrirEdition(u: User): void {
    this.reinitialiserMessages();
    this.formulaire.reset({
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      email: u.email ?? '',
      phone: u.phone ?? '',
      role: u.role ?? 'ETUDIANT',
    });
    this.panneau.set({ type: 'edition', utilisateur: u });
  }

  protected enregistrer(): void {
    const p = this.panneau();
    if (!p) return;
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.reinitialiserMessages();
    this.envoi.set(true);
    const v = this.formulaire.getRawValue();
    const phone = v.phone.trim() || undefined;

    if (p.type === 'creation') {
      this.api
        .createUser({
          firstName: v.firstName.trim(),
          lastName: v.lastName.trim(),
          email: v.email.trim(),
          phone,
          role: v.role,
        })
        .subscribe({
          next: (u) => {
            this.terminerEnvoi(`Compte créé. Une invitation a été envoyée à ${u.email}.`);
            this.aller(0);
          },
          error: (e: unknown) => this.echecEnvoi(e),
        });
    } else {
      const cible = p.utilisateur;
      this.api
        .updateUser(cible.id!, {
          firstName: v.firstName.trim(),
          lastName: v.lastName.trim(),
          email: v.email.trim() !== cible.email ? v.email.trim() : undefined,
          phone,
        })
        .subscribe({
          next: (u) => {
            this.utilisateurs.update((l) => l.map((x) => (x.id === u.id ? u : x)));
            if (this.estMoi(u)) this.auth.mettreAJourUtilisateur(u);
            this.terminerEnvoi('Utilisateur mis à jour.');
          },
          error: (e: unknown) => this.echecEnvoi(e),
        });
    }
  }

  protected changerStatut(u: User, valeur: string): void {
    const status = valeur as UserStatus;
    if (status === u.status) return;
    this.reinitialiserMessages();
    this.api.updateUserStatus(u.id!, { status }).subscribe({
      next: (maj) => {
        this.utilisateurs.update((l) => l.map((x) => (x.id === maj.id ? maj : x)));
        this.message.set(`Statut de ${maj.email} : ${LIBELLE_STATUT[maj.status!]}.`);
      },
      error: (e: unknown) => {
        this.erreur.set(messageErreur(e));
        this.charger(); // remet le sélecteur sur la valeur réelle
      },
    });
  }

  protected supprimer(u: User): void {
    if (!confirm(`Supprimer définitivement ${u.email} ?`)) return;
    this.reinitialiserMessages();
    this.api.deleteUser(u.id!).subscribe({
      next: () => {
        this.message.set(`${u.email} a été supprimé.`);
        if (this.utilisateurs().length === 1 && this.page() > 0) this.page.update((p) => p - 1);
        this.charger();
      },
      error: (e: unknown) => this.erreur.set(messageErreur(e)),
    });
  }

  private reinitialiserMessages(): void {
    this.erreur.set(null);
    this.message.set(null);
  }

  private terminerEnvoi(message: string): void {
    this.envoi.set(false);
    this.panneau.set(null);
    this.message.set(message);
  }

  private echecEnvoi(e: unknown): void {
    this.envoi.set(false);
    this.erreur.set(messageErreur(e));
  }
}
