import { Component, computed, inject, signal } from '@angular/core';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { RoleName } from '../../../api/generes/utilisateurs/model/roleName';
import { User } from '../../../api/generes/utilisateurs/model/user';
import { UserStatus } from '../../../api/generes/utilisateurs/model/userStatus';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { messageErreur } from '../erreurs';

@Component({
  selector: 'app-gestion-utilisateurs',
  templateUrl: './gestion-utilisateurs.html',
  styleUrl: '../administration.scss',
})
export class GestionUtilisateurs {
  private readonly api = inject(UsersService);
  private readonly auth = inject(AuthentificationService);

  protected readonly roles = Object.values(RoleName);
  protected readonly statuts = Object.values(UserStatus);
  protected readonly taille = 20;

  protected readonly utilisateurs = signal<User[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly role = signal<RoleName | undefined>(undefined);
  protected readonly statut = signal<UserStatus | undefined>(undefined);
  protected readonly chargement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly succes = signal<string | null>(null);
  protected readonly enCours = signal<string | null>(null);

  protected readonly nbPages = computed(() => Math.max(1, Math.ceil(this.total() / this.taille)));

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.listUsers(this.role(), this.statut(), this.page(), this.taille).subscribe({
      next: (r) => {
        this.utilisateurs.set(r.content ?? []);
        this.total.set(r.totalElements ?? 0);
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(messageErreur(e));
        this.chargement.set(false);
      },
    });
  }

  protected filtrerRole(valeur: string): void {
    this.role.set((valeur || undefined) as RoleName | undefined);
    this.page.set(0);
    this.charger();
  }

  protected filtrerStatut(valeur: string): void {
    this.statut.set((valeur || undefined) as UserStatus | undefined);
    this.page.set(0);
    this.charger();
  }

  protected aller(page: number): void {
    if (page < 0 || page >= this.nbPages()) return;
    this.page.set(page);
    this.charger();
  }

  protected estMoi(u: User): boolean {
    return !!u.id && u.id === this.auth.utilisateur()?.id;
  }

  protected nomComplet(u: User): string {
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || (u.email ?? '');
  }

  protected activer(u: User): void {
    this.changerStatut(u, UserStatus.Actif, `${this.nomComplet(u)} est activé.`);
  }

  protected suspendre(u: User): void {
    if (this.estMoi(u)) return;
    if (!window.confirm(`Suspendre ${this.nomComplet(u)} ?`)) return;
    this.changerStatut(u, UserStatus.Suspendu, `${this.nomComplet(u)} est suspendu.`);
  }

  protected supprimer(u: User): void {
    if (!u.id || this.estMoi(u)) return;
    if (!window.confirm(`Supprimer ${this.nomComplet(u)} ? Cette action est irréversible.`)) return;
    this.demarrer(u.id);
    this.api.deleteUser(u.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.succes.set(`${this.nomComplet(u)} est supprimé.`);
        // dernière ligne d'une page > 0 : on recule d'une page
        if (this.utilisateurs().length === 1 && this.page() > 0) this.page.update((p) => p - 1);
        this.charger();
      },
      error: (e) => this.echec(e),
    });
  }

  private changerStatut(u: User, status: UserStatus, message: string): void {
    if (!u.id) return;
    this.demarrer(u.id);
    this.api.updateUserStatus(u.id, { status }).subscribe({
      next: (maj) => {
        this.enCours.set(null);
        this.succes.set(message);
        this.utilisateurs.update((liste) => liste.map((x) => (x.id === maj.id ? maj : x)));
      },
      error: (e) => this.echec(e),
    });
  }

  private demarrer(id: string): void {
    this.enCours.set(id);
    this.succes.set(null);
    this.erreur.set(null);
  }

  private echec(e: unknown): void {
    this.enCours.set(null);
    // charger() efface l'erreur : on recharge d'abord, puis on affiche le message.
    if (e instanceof ErreurApi && e.statut === 404) this.charger();
    this.erreur.set(messageErreur(e, { 404: "Cet utilisateur n'existe plus." }));
  }
}
